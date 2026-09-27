<?php

namespace Tests\Feature;

use App\Models\Simulation;
use App\Models\User;
use App\Services\IrradianceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Support\FakeIrradianceProvider;
use Tests\TestCase;

class SimulationTest extends TestCase
{
    use RefreshDatabase;

    private const JAKARTA = ['lat' => -6.59, 'lng' => 106.80, 'zoom' => 19];

    /** Persegi bidang atap di dalam citra fixture berukuran 512 x 512. */
    private const RECT = ['x' => 100, 'y' => 100, 'width' => 300, 'height' => 200, 'rotation_deg' => 0];

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        // Simulasi tidak boleh menyentuh jaringan saat diuji.
        $this->app->bind(IrradianceProvider::class, fn () => new FakeIrradianceProvider);
    }

    public function test_seluruh_endpoint_menolak_permintaan_tanpa_token(): void
    {
        $this->postJson('/api/location', self::JAKARTA)->assertStatus(401);
        $this->getJson('/api/options')->assertStatus(401);
        $this->postJson('/api/simulate', [])->assertStatus(401);
        $this->getJson('/api/analyses')->assertStatus(401);
        $this->postJson('/api/analyses', [])->assertStatus(401);
        $this->getJson('/api/analyses/1')->assertStatus(401);
        $this->deleteJson('/api/analyses/1')->assertStatus(401);
    }

    public function test_katalog_mengembalikan_modul_tarif_dan_nilai_bawaan(): void
    {
        $response = $this->actingAsUser()->getJson('/api/options')->assertOk();

        $response->assertJsonStructure([
            'modules' => [['key', 'label', 'power_w', 'length_m', 'width_m', 'efficiency', 'price_idr']],
            'tariffs' => [['key', 'label', 'idr_per_kwh', 'year']],
            'defaults',
            'limits',
        ]);

        $this->assertGreaterThan(0, count($response->json('modules')));
        $this->assertEqualsWithDelta(1700.0, collect($response->json('tariffs'))->firstWhere('key', 'R2')['idr_per_kwh'], 0.01);
    }

    public function test_efisiensi_modul_diturunkan_dari_daya_dan_luasnya(): void
    {
        $modules = collect($this->actingAsUser()->getJson('/api/options')->json('modules'));

        $modul = $modules->firstWhere('key', 'mono_perc_550');
        $harapan = ($modul['power_w'] / 1000) / ($modul['length_m'] * $modul['width_m']);

        $this->assertEqualsWithDelta($harapan, $modul['efficiency'], 0.0001);
    }

    public function test_simulasi_mengembalikan_empat_kelompok_hasil(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user))
            ->assertOk()
            ->assertJsonStructure([
                'geometry' => ['roof_width_m', 'roof_length_m', 'total_area_sqm', 'effective_area_sqm'],
                'layout' => ['max_slots', 'installed', 'rows', 'columns', 'module_area_sqm', 'density_ratio'],
                'energy' => ['capacity_kwp', 'annual_production_kwh', 'daily_irradiance_kwh_per_sqm', 'incidence_factor', 'performance_ratio', 'irradiance_source', 'irradiance_period'],
                'finance' => ['capex_total_idr', 'capex_breakdown', 'monthly_saving_idr', 'annual_saving_idr', 'payback_years', 'tariff_key', 'co2_reduction_kg_per_year', 'trees_equivalent'],
            ]);
    }

    public function test_simulasi_tidak_menyimpan_apa_pun(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/simulate', $this->payload($user))->assertOk();

        $this->assertDatabaseCount('simulations', 0);
    }

    public function test_angka_hasil_kiriman_klien_diabaikan(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user) + [
                'capacity_kwp' => 9999,
                'annual_production_kwh' => 999999,
                'monthly_saving_idr' => 999999999,
                'payback_years' => 0.1,
            ])
            ->assertOk();

        // 24 modul x 550 W = 13,2 kWp, bukan angka karangan klien.
        $this->assertSame(13.2, $response->json('energy.capacity_kwp'));
        $this->assertNotSame(9999, $response->json('energy.capacity_kwp'));
        $this->assertNotSame(0.1, $response->json('finance.payback_years'));
    }

    public function test_menyimpan_simulasi_menulis_hasil_hitungan_server(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyses', $this->payload($user) + [
                'capacity_kwp' => 9999,
                'payback_years' => 0.1,
            ])
            ->assertStatus(201)
            ->assertJsonStructure(['message', 'id', 'capacity_kwp', 'payback_years']);

        $row = Simulation::query()->findOrFail($response->json('id'));

        $this->assertSame($user->id, $row->user_id);
        $this->assertSame(13.2, $row->capacity_kwp);
        $this->assertNotSame(9999.0, $row->capacity_kwp);
        $this->assertGreaterThan(0.1, $row->payback_years);
        $this->assertNotNull($row->roofPolygonGeoJson());
        $this->assertSame(24, $row->installed);
    }

    public function test_kapasitas_sama_dengan_jumlah_terpasang_kali_daya_modul(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/simulate', $this->payload($user))->assertOk();

        $this->assertSame(24, $response->json('layout.installed'));
        $this->assertEqualsWithDelta(
            24 * 550 / 1000,
            $response->json('energy.capacity_kwp'),
            0.001,
        );
    }

    public function test_invarian_luas_dan_slot_selalu_terjaga(): void
    {
        $user = User::factory()->create();

        $body = $this->actingAs($user, 'sanctum')->postJson('/api/simulate', $this->payload($user))->json();

        $this->assertLessThanOrEqual($body['geometry']['total_area_sqm'], $body['geometry']['effective_area_sqm']);
        $this->assertGreaterThanOrEqual(0.0, $body['geometry']['effective_area_sqm']);
        $this->assertLessThanOrEqual($body['layout']['max_slots'], $body['layout']['installed']);
        $this->assertLessThanOrEqual(
            $body['finance']['monthly_bill_idr'],
            $body['finance']['monthly_saving_idr'],
        );
    }

    public function test_jumlah_panel_yang_diminta_dipotong_ke_slot_maksimum(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['panel_count' => 5000]))
            ->assertOk();

        $this->assertSame($response->json('layout.max_slots'), $response->json('layout.installed'));
    }

    public function test_menolak_preset_modul_atau_tarif_yang_tidak_dikenal(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['module_key' => 'modul_karangan']))
            ->assertStatus(422)->assertJsonValidationErrors('module_key');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['tariff_key' => 'R9']))
            ->assertStatus(422)->assertJsonValidationErrors('tariff_key');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['orientation' => 'miring']))
            ->assertStatus(422)->assertJsonValidationErrors('orientation');
    }

    public function test_menolak_kemiringan_dan_azimuth_di_luar_rentang(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['tilt_deg' => 80]))
            ->assertStatus(422)->assertJsonValidationErrors('tilt_deg');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['azimuth_deg' => 400]))
            ->assertStatus(422)->assertJsonValidationErrors('azimuth_deg');
    }

    public function test_menolak_persegi_yang_keluar_dari_citra(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roof_rect' => ['x' => 400, 'y' => 400, 'width' => 300, 'height' => 300, 'rotation_deg' => 0],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('roof_rect');
    }

    public function test_menerima_persegi_yang_diputar_selama_masih_di_dalam_citra(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roof_rect' => ['x' => 150, 'y' => 150, 'width' => 200, 'height' => 100, 'rotation_deg' => 20],
            ]))
            ->assertOk();
    }

    public function test_menolak_citra_milik_user_lain_tanpa_membocorkan_keberadaannya(): void
    {
        $pemilik = User::factory()->create();
        $penyusup = User::factory()->create();

        $imageId = $this->imageId($pemilik);

        $milikOrangLain = $this->actingAs($penyusup, 'sanctum')
            ->postJson('/api/simulate', $this->payloadWithImage($imageId));
        $tidakPernahAda = $this->actingAs($penyusup, 'sanctum')
            ->postJson('/api/simulate', $this->payloadWithImage((string) Str::uuid()));

        $milikOrangLain->assertStatus(404);
        $tidakPernahAda->assertStatus(404);
        $this->assertSame($milikOrangLain->json('message'), $tidakPernahAda->json('message'));
    }

    public function test_daftar_hanya_memuat_simulasi_milik_user_aktif(): void
    {
        $user = User::factory()->create();
        $lain = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/analyses', $this->payload($user))->assertStatus(201);
        $this->actingAs($user, 'sanctum')->postJson('/api/analyses', $this->payload($user))->assertStatus(201);
        $this->actingAs($lain, 'sanctum')->postJson('/api/analyses', $this->payload($lain))->assertStatus(201);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/analyses')->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertSame(2, $response->json('meta.total'));
    }

    public function test_ukuran_halaman_dan_alias_limit_dihormati(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/analyses', $this->payload($user));

        $this->assertSame(1, $this->actingAs($user, 'sanctum')->getJson('/api/analyses?per_page=1')->json('meta.per_page'));
        $this->assertSame(1, $this->actingAs($user, 'sanctum')->getJson('/api/analyses?limit=1')->json('meta.per_page'));
    }

    public function test_detail_memuat_masukan_hasil_dan_asumsi(): void
    {
        $user = User::factory()->create();

        $id = $this->actingAs($user, 'sanctum')->postJson('/api/analyses', $this->payload($user))->json('id');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/analyses/{$id}")
            ->assertOk()
            ->assertJsonStructure([
                'id',
                'center_point' => ['lat', 'lng'],
                'roof_polygon' => ['type', 'coordinates'],
                'input' => ['tilt_deg', 'azimuth_deg', 'module_key', 'tariff_key'],
                'result' => ['capacity_kwp', 'annual_production_kwh', 'monthly_saving_idr', 'payback_years'],
                'assumptions' => ['daily_irradiance_kwh_per_sqm', 'irradiance_source', 'performance_ratio', 'capex_breakdown'],
                'created_at',
            ]);

        $this->assertSame('Polygon', $response->json('roof_polygon.type'));
        $this->assertEqualsWithDelta(22.0, $response->json('input.tilt_deg'), 0.01);
        $this->assertSame('NASA POWER', $response->json('assumptions.irradiance_source'));
    }

    public function test_detail_simulasi_milik_user_lain_tidak_dapat_dibedakan_dari_yang_tidak_ada(): void
    {
        $pemilik = User::factory()->create();
        $penyusup = User::factory()->create();

        $id = $this->actingAs($pemilik, 'sanctum')->postJson('/api/analyses', $this->payload($pemilik))->json('id');

        $milikOrangLain = $this->actingAs($penyusup, 'sanctum')->getJson("/api/analyses/{$id}");
        $tidakAda = $this->actingAs($penyusup, 'sanctum')->getJson('/api/analyses/999999');

        $milikOrangLain->assertStatus(404);
        $tidakAda->assertStatus(404);
        $this->assertSame($milikOrangLain->json('message'), $tidakAda->json('message'));
    }

    public function test_id_yang_bukan_angka_menghasilkan_404_bukan_500(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/analyses/bukan-angka')->assertStatus(404);
        $this->actingAs($user, 'sanctum')->deleteJson('/api/analyses/bukan-angka')->assertStatus(404);
    }

    public function test_menghapus_simulasi_milik_sendiri_menghilangkan_barisnya(): void
    {
        $user = User::factory()->create();

        $id = $this->actingAs($user, 'sanctum')->postJson('/api/analyses', $this->payload($user))->json('id');

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/analyses/{$id}")
            ->assertOk()
            ->assertJsonPath('message', 'Simulation deleted successfully');

        $this->assertDatabaseMissing('simulations', ['id' => $id]);
    }

    public function test_menghapus_simulasi_milik_user_lain_tidak_mengubah_apa_pun(): void
    {
        $pemilik = User::factory()->create();
        $penyusup = User::factory()->create();

        $id = $this->actingAs($pemilik, 'sanctum')->postJson('/api/analyses', $this->payload($pemilik))->json('id');

        $this->actingAs($penyusup, 'sanctum')->deleteJson("/api/analyses/{$id}")->assertStatus(404);

        $this->assertDatabaseHas('simulations', ['id' => $id]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(User $user, array $overrides = []): array
    {
        return array_merge([
            'image_id' => $this->imageId($user),
            'roof_rect' => self::RECT,
            'setback_m' => 0.5,
            'gutter_m' => 0.6,
            'tilt_deg' => 22.0,
            'azimuth_deg' => 188.0,
            'module_key' => 'mono_perc_550',
            'orientation' => 'portrait',
            'clearance_m' => 0.03,
            'panel_count' => 24,
            'inverter_type' => 'string',
            'monthly_bill_idr' => 2_800_000,
            'tariff_key' => 'R2',
        ], $overrides);
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadWithImage(string $imageId): array
    {
        return array_merge($this->payload(User::factory()->create()), ['image_id' => $imageId]);
    }

    private function imageId(User $user): string
    {
        return (string) $this->actingAs($user, 'sanctum')->postJson('/api/location', self::JAKARTA)->json('image_id');
    }

    private function actingAsUser(): static
    {
        return $this->actingAs(User::factory()->create(), 'sanctum');
    }
}
