<?php

namespace Tests\Feature;

use App\Models\RoofAnalysis;
use App\Models\User;
use App\Services\IrradianceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Support\FakeIrradianceProvider;
use Tests\TestCase;

class AnalysisHistoryTest extends TestCase
{
    use RefreshDatabase;

    /** @var array{lat: float, lng: float} */
    private const CENTER = ['lat' => -6.5955, 'lng' => 106.7995];

    /** @var array<int, array{0: float, 1: float}> */
    private const POLYGON = [
        [106.799468, -6.595532],
        [106.799532, -6.595532],
        [106.799532, -6.595468],
        [106.799468, -6.595468],
        [106.799468, -6.595532],
    ];

    protected function setUp(): void
    {
        parent::setUp();

        // Kalkulasi tidak boleh menyentuh jaringan saat diuji.
        $this->app->bind(IrradianceProvider::class, fn () => new FakeIrradianceProvider);
    }

    public function test_seluruh_endpoint_riwayat_menolak_permintaan_tanpa_token(): void
    {
        $this->postJson('/api/solar/calculate', [])->assertStatus(401);
        $this->getJson('/api/analyses')->assertStatus(401);
        $this->postJson('/api/analyses', [])->assertStatus(401);
        $this->getJson('/api/analyses/1')->assertStatus(401);
        $this->deleteJson('/api/analyses/1')->assertStatus(401);
    }

    public function test_kalkulasi_mengembalikan_energi_iradiasi_orientasi_dan_asumsi(): void
    {
        $response = $this->calculate(User::factory()->create());

        $response->assertOk()->assertJsonStructure([
            'usable_area_sqm',
            'daily_ghi_kwh_per_sqm',
            'estimated_energy_kwh_per_day',
            'roof_orientation_deg',
            'recommended_azimuth_deg',
            'assumptions' => [
                'module_efficiency',
                'performance_ratio',
                'tilt_deg',
                'tilt_factor',
                'irradiance_source',
                'irradiance_period',
                'irradiance_kwh_per_sqm_day',
            ],
        ]);

        $this->assertGreaterThan(0.0, $response->json('estimated_energy_kwh_per_day'));
    }

    public function test_kalkulasi_tidak_membuat_baris_riwayat(): void
    {
        $user = User::factory()->create();

        $this->calculate($user)->assertOk();

        $this->assertDatabaseCount('roof_analyses', 0);
    }

    public function test_menyimpan_analisis_menulis_satu_baris_beserta_asumsinya(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyses', $this->payload($user))
            ->assertStatus(201)
            ->assertJsonStructure(['message', 'id']);

        $this->assertDatabaseCount('roof_analyses', 1);

        $row = RoofAnalysis::query()->findOrFail($response->json('id'));

        $this->assertSame($user->id, $row->user_id);
        $this->assertSame('NASA POWER', $row->irradiance_source);
        $this->assertEqualsWithDelta(0.2, $row->module_efficiency, 0.0001);
        $this->assertNotNull($row->roofPolygonGeoJson());
    }

    public function test_simpan_menolak_payload_tanpa_blok_asumsi(): void
    {
        $user = User::factory()->create();
        $payload = $this->payload($user);
        unset($payload['assumptions']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyses', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('assumptions');
    }

    public function test_simpan_menolak_asumsi_yang_tidak_lengkap(): void
    {
        $user = User::factory()->create();
        $payload = $this->payload($user);
        unset($payload['assumptions']['irradiance_kwh_per_sqm_day']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyses', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('assumptions.irradiance_kwh_per_sqm_day');
    }

    public function test_simpan_menolak_poligon_dengan_kurang_dari_tiga_titik_unik(): void
    {
        $user = User::factory()->create();
        $payload = $this->payload($user);
        $payload['polygon'] = [[106.8, -6.59], [106.8, -6.59], [106.8, -6.59]];

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyses', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('polygon');
    }

    public function test_daftar_hanya_memuat_riwayat_milik_user_aktif(): void
    {
        $user = User::factory()->create();
        $lain = User::factory()->create();

        RoofAnalysis::factory()->count(2)->create(['user_id' => $user->id]);
        RoofAnalysis::factory()->count(3)->create(['user_id' => $lain->id]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/analyses')->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertSame(2, $response->json('meta.total'));
        $this->assertSame(1, $response->json('meta.current_page'));
    }

    public function test_ukuran_halaman_yang_diminta_dihormati(): void
    {
        $user = User::factory()->create();
        RoofAnalysis::factory()->count(3)->create(['user_id' => $user->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/analyses?per_page=2')
            ->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertSame(2, $response->json('meta.per_page'));
        $this->assertSame(3, $response->json('meta.total'));
    }

    public function test_limit_diterima_sebagai_alias_per_page(): void
    {
        $user = User::factory()->create();
        RoofAnalysis::factory()->count(3)->create(['user_id' => $user->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/analyses?limit=1')
            ->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame(1, $response->json('meta.per_page'));
    }

    public function test_ukuran_halaman_di_atas_batas_dipangkas(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/analyses?per_page=5000')
            ->assertOk();

        $this->assertSame(100, $response->json('meta.per_page'));
    }

    public function test_detail_memuat_poligon_luas_dan_asumsi(): void
    {
        $user = User::factory()->create();
        $analysis = RoofAnalysis::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/analyses/{$analysis->id}")
            ->assertOk()
            ->assertJsonStructure([
                'id',
                'center_point' => ['lat', 'lng'],
                'roof_polygon' => ['type', 'coordinates'],
                'usable_area_sqm',
                'shadow_area_sqm',
                'estimated_energy_kwh_per_day',
                'roof_orientation_deg',
                'recommended_azimuth_deg',
                'assumptions',
                'created_at',
            ]);

        $this->assertSame('Polygon', $response->json('roof_polygon.type'));
        $this->assertNotEmpty($response->json('roof_polygon.coordinates.0'));
        $this->assertArrayHasKey('irradiance_source', $response->json('assumptions'));
    }

    public function test_detail_riwayat_milik_user_lain_tidak_dapat_dibedakan_dari_yang_tidak_ada(): void
    {
        $pemilik = User::factory()->create();
        $penyusup = User::factory()->create();
        $analysis = RoofAnalysis::factory()->create(['user_id' => $pemilik->id]);

        $milikOrangLain = $this->actingAs($penyusup, 'sanctum')->getJson("/api/analyses/{$analysis->id}");
        $tidakAda = $this->actingAs($penyusup, 'sanctum')->getJson('/api/analyses/999999');

        $milikOrangLain->assertStatus(404);
        $tidakAda->assertStatus(404);
        $this->assertSame($milikOrangLain->json('message'), $tidakAda->json('message'));
    }

    public function test_menghapus_riwayat_milik_user_lain_tidak_mengubah_apa_pun(): void
    {
        $pemilik = User::factory()->create();
        $penyusup = User::factory()->create();
        $analysis = RoofAnalysis::factory()->create(['user_id' => $pemilik->id]);

        $this->actingAs($penyusup, 'sanctum')
            ->deleteJson("/api/analyses/{$analysis->id}")
            ->assertStatus(404);

        $this->assertDatabaseHas('roof_analyses', ['id' => $analysis->id]);
    }

    public function test_menghapus_riwayat_milik_sendiri_menghilangkan_barisnya(): void
    {
        $user = User::factory()->create();
        $analysis = RoofAnalysis::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/analyses/{$analysis->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Analysis deleted successfully');

        $this->assertDatabaseMissing('roof_analyses', ['id' => $analysis->id]);
    }

    public function test_id_yang_bukan_angka_menghasilkan_404_bukan_500(): void
    {
        $user = User::factory()->create();

        // Tanpa batasan angka pada parameter rute, nilai non-numerik berakhir sebagai
        // TypeError dan membocorkan jejak internal aplikasi.
        $this->actingAs($user, 'sanctum')->getJson('/api/analyses/bukan-angka')->assertStatus(404);
        $this->actingAs($user, 'sanctum')->deleteJson('/api/analyses/bukan-angka')->assertStatus(404);
    }

    private function calculate(User $user): TestResponse
    {
        return $this->actingAs($user, 'sanctum')->postJson('/api/solar/calculate', [
            'usable_area_sqm' => 45.5,
            'center_point' => self::CENTER,
            'polygon' => self::POLYGON,
        ]);
    }

    /**
     * Payload simpan dibangun dari respons kalkulasi nyata, sehingga test ini
     * mengikuti alur yang benar-benar dipakai frontend.
     *
     * @return array<string, mixed>
     */
    private function payload(User $user): array
    {
        $calculated = $this->calculate($user)->assertOk()->json();

        return [
            'usable_area_sqm' => $calculated['usable_area_sqm'],
            'shadow_area_sqm' => 5.0,
            'center_point' => self::CENTER,
            'polygon' => self::POLYGON,
            'estimated_energy_kwh_per_day' => $calculated['estimated_energy_kwh_per_day'],
            'roof_orientation_deg' => $calculated['roof_orientation_deg'],
            'recommended_azimuth_deg' => $calculated['recommended_azimuth_deg'],
            'assumptions' => $calculated['assumptions'],
        ];
    }
}
