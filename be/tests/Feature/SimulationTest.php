<?php

namespace Tests\Feature;

use App\Models\Simulation;
use App\Models\SimulationRoof;
use App\Models\User;
use App\Services\Geometry\PolygonGeometry;
use App\Services\Imagery\ImageryAssetStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class SimulationTest extends TestCase
{
    use RefreshDatabase;

    /** Tangkapan uji 512 x 512 piksel dengan skala tepat 0,5 m/px. */
    private const BBOX = [106.8000000, -6.6023152, 106.8023151, -6.6000000];

    private const MPP = 0.5;

    /** Persegi 60 x 40 piksel, yaitu 30 x 20 meter. */
    private const POLYGON = [[150, 150], [210, 150], [210, 190], [150, 190]];

    /** Persegi kedua yang berjarak cukup jauh untuk menjadi bidang terpisah. */
    private const POLYGON_SECOND = [[280, 150], [340, 150], [340, 190], [280, 190]];

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    public function test_seluruh_endpoint_menolak_permintaan_tanpa_token(): void
    {
        $this->postJson('/api/location', ['lat' => -6.59, 'lng' => 106.80])->assertStatus(401);
        $this->getJson('/api/options')->assertStatus(401);
        $this->postJson('/api/roof-detections', [])->assertStatus(401);
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

    public function test_simulasi_membalas_bentuk_detail_yang_dipakai_bersama(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user))
            ->assertOk()
            ->assertJsonStructure([
                'center_point' => ['lat', 'lng'],
                'map_zoom',
                'roofs' => [[
                    'label',
                    'detection_id',
                    'confidence',
                    'roof_polygon' => ['type', 'coordinates'],
                    'roof_polygon_px',
                    'input' => ['setback_m', 'gutter_m', 'tilt_deg', 'azimuth_deg', 'module_key', 'orientation', 'clearance_m', 'panel_count'],
                    'result' => [
                        'roof_length_m', 'roof_width_m', 'rotation_deg', 'area_sqm', 'effective_area_sqm',
                        'max_slots', 'installed', 'rows', 'columns', 'module_area_sqm', 'density_ratio',
                        'capacity_kwp', 'annual_production_kwh',
                    ],
                ]],
                'input' => ['inverter_type', 'monthly_bill_idr', 'tariff_key'],
                'result' => [
                    'roof_count', 'total_area_sqm', 'effective_area_sqm', 'max_slots', 'installed',
                    'module_area_sqm', 'density_ratio', 'capacity_kwp', 'annual_production_kwh',
                    'capex_total_idr', 'monthly_saving_idr', 'annual_saving_idr', 'payback_years',
                    'co2_reduction_kg_per_year', 'trees_equivalent',
                ],
                'assumptions' => [
                    'daily_irradiance_kwh_per_sqm', 'irradiance_source', 'irradiance_period',
                    'incidence_factor', 'performance_ratio', 'tariff_key', 'tariff_label',
                    'tariff_idr_per_kwh', 'capex_breakdown',
                ],
                'created_at',
            ]);

        // Simulasi tanpa simpan tidak punya identitas, jadi kontrak tidak memuatnya.
        $this->assertArrayNotHasKey('id', $response->json());
        $this->assertArrayNotHasKey('message', $response->json());
        $this->assertSame('Polygon', $response->json('roofs.0.roof_polygon.type'));
        $this->assertSame(19, $response->json('map_zoom'));
        $this->assertSame(1, $response->json('result.roof_count'));
    }

    public function test_simulasi_tidak_menyimpan_apa_pun(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/simulate', $this->payload($user))->assertOk();

        $this->assertDatabaseCount('simulations', 0);
        $this->assertDatabaseCount('simulation_roofs', 0);
    }

    public function test_angka_hasil_kiriman_klien_diabaikan(): void
    {
        $user = User::factory()->create();

        $payload = $this->payload($user);
        // Kunci hasil pada tingkat bidang maupun simulasi tidak pernah dibaca.
        $payload['roofs'][0]['result'] = ['installed' => 9999, 'capacity_kwp' => 9999];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $payload + [
                'capacity_kwp' => 9999,
                'annual_production_kwh' => 999999,
                'monthly_saving_idr' => 999999999,
                'payback_years' => 0.1,
            ])
            ->assertOk();

        // 24 modul x 550 W = 13,2 kWp, bukan angka karangan klien.
        $this->assertSame(13.2, $response->json('roofs.0.result.capacity_kwp'));
        $this->assertSame(24, $response->json('roofs.0.result.installed'));
        $this->assertSame(13.2, $response->json('result.capacity_kwp'));
        $this->assertNotSame(0.1, $response->json('result.payback_years'));
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
            ->assertJsonPath('message', 'Simulation saved')
            ->assertJsonStructure(['message', 'id', 'center_point', 'roofs', 'result', 'assumptions']);

        $row = Simulation::query()->findOrFail($response->json('id'));

        $this->assertSame($user->id, $row->user_id);
        $this->assertEqualsWithDelta(13.2, $row->capacity_kwp, 0.001);
        $this->assertGreaterThan(0.1, $row->payback_years);
        $this->assertSame(24, $row->installed);
        $this->assertSame(1, $row->roofs()->count());

        $roof = $row->roofs()->sole();

        $this->assertSame('Bidang Atap Utama', $roof->label);
        $this->assertSame(24, $roof->installed);
        $this->assertNotNull($roof->roofPolygonGeoJson());
        $this->assertSame(self::POLYGON, $roof->roof_polygon_px);
    }

    public function test_kapasitas_sama_dengan_jumlah_terpasang_kali_daya_modul(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/simulate', $this->payload($user))->assertOk();

        $this->assertSame(24, $response->json('roofs.0.result.installed'));
        $this->assertEqualsWithDelta(
            24 * 550 / 1000,
            (float) $response->json('roofs.0.result.capacity_kwp'),
            0.001,
        );
    }

    public function test_invarian_luas_dan_slot_selalu_terjaga(): void
    {
        $user = User::factory()->create();

        $body = $this->actingAs($user, 'sanctum')->postJson('/api/simulate', $this->payload($user))->json();

        $bidang = $body['roofs'][0];

        $this->assertLessThanOrEqual($bidang['result']['area_sqm'], $bidang['result']['effective_area_sqm']);
        $this->assertGreaterThanOrEqual(0.0, $bidang['result']['effective_area_sqm']);
        $this->assertLessThanOrEqual($bidang['result']['max_slots'], $bidang['result']['installed']);

        $this->assertLessThanOrEqual($body['result']['total_area_sqm'], $body['result']['effective_area_sqm']);
        $this->assertLessThanOrEqual($body['result']['max_slots'], $body['result']['installed']);
        $this->assertSame($bidang['result']['installed'], $body['result']['installed']);
        $this->assertLessThanOrEqual(
            $body['input']['monthly_bill_idr'],
            $body['result']['monthly_saving_idr'],
        );
    }

    public function test_jumlah_panel_kosong_mengisi_seluruh_slot_yang_muat(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => [self::roof(['panel_count' => null])]]))
            ->assertOk();

        $this->assertSame($response->json('roofs.0.result.max_slots'), $response->json('roofs.0.result.installed'));
        $this->assertGreaterThan(0, $response->json('roofs.0.result.installed'));
    }

    public function test_jumlah_panel_kosong_tersimpan_sebagai_kosong(): void
    {
        $user = User::factory()->create();

        $id = $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyses', $this->payload($user, ['roofs' => [self::roof(['panel_count' => null])]]))
            ->assertStatus(201)
            ->json('id');

        // Maksud pengguna harus terbaca kembali, bukan tergantikan angka besar.
        $this->assertNull(SimulationRoof::query()->where('simulation_id', $id)->sole()->panel_count);
        $this->assertNull($this->actingAs($user, 'sanctum')->getJson("/api/analyses/{$id}")->json('roofs.0.input.panel_count'));
    }

    public function test_jumlah_panel_yang_tidak_masuk_akal_ditolak(): void
    {
        $user = User::factory()->create();

        // 10000 pernah dipakai klien sebagai penanda "isi maksimum" dan ditolak di sini.
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => [self::roof(['panel_count' => 10000])]]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('roofs.0.panel_count');
    }

    public function test_jumlah_panel_wajib_ada_walau_boleh_kosong(): void
    {
        $user = User::factory()->create();

        $roof = self::roof();
        unset($roof['panel_count']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => [$roof]]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('roofs.0.panel_count');
    }

    public function test_menolak_preset_modul_atau_tarif_yang_tidak_dikenal(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => [self::roof(['module_key' => 'modul_karangan'])]]))
            ->assertStatus(422)->assertJsonValidationErrors('roofs.0.module_key');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['tariff_key' => 'R9']))
            ->assertStatus(422)->assertJsonValidationErrors('tariff_key');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => [self::roof(['orientation' => 'miring'])]]))
            ->assertStatus(422)->assertJsonValidationErrors('roofs.0.orientation');
    }

    public function test_menolak_kemiringan_dan_azimuth_di_luar_rentang(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => [self::roof(['tilt_deg' => 80])]]))
            ->assertStatus(422)->assertJsonValidationErrors('roofs.0.tilt_deg');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => [self::roof(['azimuth_deg' => 400])]]))
            ->assertStatus(422)->assertJsonValidationErrors('roofs.0.azimuth_deg');
    }

    public function test_menolak_poligon_yang_keluar_dari_citra(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roofs' => [self::roof(polygon: [[400, 400], [520, 400], [520, 520], [400, 520]])],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('roofs.0.roof_polygon_px');
    }

    public function test_menolak_poligon_yang_tidak_membentuk_bidang(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roofs' => [self::roof(polygon: [[150, 150], [210, 150]])],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('roofs.0.roof_polygon_px');
    }

    public function test_menolak_lebih_dari_dua_belas_bidang(): void
    {
        $user = User::factory()->create();

        $roofs = array_fill(0, 13, self::roof());

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => $roofs]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('roofs');
    }

    public function test_menolak_citra_milik_user_lain_tanpa_membocorkan_keberadaannya(): void
    {
        $pemilik = User::factory()->create();
        $penyusup = User::factory()->create();

        $milikOrangLain = $this->actingAs($penyusup, 'sanctum')
            ->postJson('/api/simulate', $this->payloadWithImage($this->imageId($pemilik)));
        $tidakPernahAda = $this->actingAs($penyusup, 'sanctum')
            ->postJson('/api/simulate', $this->payloadWithImage((string) Str::uuid()));

        $milikOrangLain->assertStatus(404);
        $tidakPernahAda->assertStatus(404);
        $this->assertSame($milikOrangLain->json('message'), $tidakPernahAda->json('message'));
    }

    public function test_dua_bidang_diagregat_dan_tersimpan_sebagai_dua_baris(): void
    {
        $user = User::factory()->create();

        $id = $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyses', $this->payload($user, [
                'roofs' => [
                    self::roof(),
                    self::roof(['label' => 'Bidang Kedua', 'detection_id' => 'det_uji_2', 'confidence' => 0.81], self::POLYGON_SECOND),
                ],
            ]))
            ->assertStatus(201)
            ->json('id');

        $detail = $this->actingAs($user, 'sanctum')->getJson("/api/analyses/{$id}")->assertOk();

        $this->assertCount(2, $detail->json('roofs'));
        $this->assertSame(2, $detail->json('result.roof_count'));
        $this->assertSame(48, $detail->json('result.installed'));

        // Dua bidang berukuran sama: luas dan kapasitasnya tepat dua kali satu bidang.
        $this->assertEqualsWithDelta(1200.0, (float) $detail->json('result.total_area_sqm'), 0.01);
        $this->assertEqualsWithDelta(26.4, (float) $detail->json('result.capacity_kwp'), 0.001);
        $this->assertSame(2, SimulationRoof::query()->where('simulation_id', $id)->count());
    }

    public function test_gutter_tidak_mengurangi_luas_poligon(): void
    {
        $user = User::factory()->create();

        $tanpaTalang = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => [self::roof(['gutter_m' => 0.0])]]))
            ->assertOk();

        $denganTalang = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => [self::roof(['gutter_m' => 5.0])]]))
            ->assertOk();

        // Talang tersimpan sebagai maksud pengguna, tetapi tidak memotong bidang.
        $this->assertEqualsWithDelta(
            (float) $tanpaTalang->json('roofs.0.result.effective_area_sqm'),
            (float) $denganTalang->json('roofs.0.result.effective_area_sqm'),
            1e-6,
        );
        $this->assertEqualsWithDelta(5.0, (float) $denganTalang->json('roofs.0.input.gutter_m'), 1e-6);
    }

    public function test_bidang_yang_habis_oleh_setback_tidak_menghasilkan_kapasitas(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roofs' => [self::roof(['setback_m' => 5.0], [[150, 150], [190, 150], [190, 154], [150, 154]])],
            ]))
            ->assertOk();

        $this->assertEqualsWithDelta(40.0, (float) $response->json('roofs.0.result.area_sqm'), 0.01);
        $this->assertEqualsWithDelta(0.0, (float) $response->json('roofs.0.result.effective_area_sqm'), 0.01);
        $this->assertSame(0, $response->json('roofs.0.result.installed'));
        $this->assertSame(0, $response->json('result.max_slots'));
        $this->assertEqualsWithDelta(0.0, (float) $response->json('result.capacity_kwp'), 1e-9);

        // Belanja modal instalasi tetap dihitung walaupun tidak ada modul yang muat.
        $this->assertGreaterThan(0, $response->json('result.capex_total_idr'));
    }

    public function test_menolak_poligon_yang_tidak_dapat_dirapikan_menjadi_bidang(): void
    {
        $user = User::factory()->create();

        // Tiga titik yang berimpit tidak dapat dirapikan menjadi poligon yang sah,
        // sehingga tidak ada yang dapat disimpan maupun dihitung.
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roofs' => [self::roof(polygon: [[150, 150], [150, 150], [150, 150]])],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('roofs.0.roof_polygon_px');
    }

    public function test_kesepuluh_bidang_nyata_tersimpan_sebagai_poligon_yang_sah(): void
    {
        /** @var array{
         *     bbox: array{0: float, 1: float, 2: float, 3: float},
         *     width: int,
         *     height: int,
         *     meters_per_pixel: float,
         *     rings: array<int, array<int, array{0: float, 1: float}>>,
         * } $fixture
         */
        $fixture = json_decode(
            (string) file_get_contents(base_path('tests/fixtures/roof-mask-rings.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        $metersPerPixel = (float) $fixture['meters_per_pixel'];

        $user = User::factory()->create();

        $imageId = app(ImageryAssetStore::class)->storeCapture(
            userId: (int) $user->getKey(),
            width: (int) $fixture['width'],
            height: (int) $fixture['height'],
            zoom: 19,
            bbox: $fixture['bbox'],
            metersPerPixel: $metersPerPixel,
        )->image_id;

        $roofs = [];

        foreach ($fixture['rings'] as $index => $ring) {
            $roofs[] = self::roof(['label' => "Bidang {$index}"], $ring);
        }

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyses', [
                'image_id' => $imageId,
                'roofs' => $roofs,
                'inverter_type' => 'string',
                'monthly_bill_idr' => 2_800_000,
                'tariff_key' => 'R2',
            ])
            ->assertStatus(201);

        $this->assertSame(10, $response->json('result.roof_count'));

        $baris = SimulationRoof::query()
            ->where('simulation_id', $response->json('id'))
            ->orderBy('id')
            ->get();

        $this->assertCount(10, $baris);

        foreach ($baris as $index => $roof) {
            $check = DB::selectOne(
                'select ST_IsValid(roof_polygon) as sah, ST_IsValidReason(roof_polygon) as alasan,
                        ST_NPoints(roof_polygon) as jumlah
                 from simulation_roofs where id = ?',
                [$roof->id],
            );

            $this->assertTrue(
                (bool) $check->sah,
                "Bidang {$index}: roof_polygon harus sah menurut PostGIS ({$check->alasan}).",
            );
            $this->assertGreaterThanOrEqual(
                4,
                (int) $check->jumlah,
                "Bidang {$index}: ring GeoJSON harus punya minimal empat titik.",
            );

            // Luas yang dilaporkan harus berasal dari ring yang benar-benar disimpan.
            $luasRing = PolygonGeometry::area((array) $roof->roof_polygon_px);
            $this->assertEqualsWithDelta(
                (float) $roof->total_area_sqm,
                $luasRing * $metersPerPixel ** 2,
                max(0.005 * (float) $roof->total_area_sqm, 1e-6),
                "Bidang {$index}: area_sqm harus sama dengan luas ring yang disimpan.",
            );

            // Satu ring untuk semuanya: yang dikirim balik sama dengan yang disimpan.
            $this->assertEquals($roof->roof_polygon_px, $response->json("roofs.{$index}.roof_polygon_px"));

            // Bidang yang dibersihkan tetap menyisakan ruang untuk modul.
            $this->assertGreaterThan(0, $roof->installed, "Bidang {$index}: harus ada modul yang terpasang.");
        }
    }

    public function test_payback_kosong_bila_tidak_ada_produksi(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, ['roofs' => [self::roof(['panel_count' => 0])]]))
            ->assertOk();

        $this->assertSame(0, $response->json('roofs.0.result.installed'));
        $this->assertSame(0, $response->json('result.monthly_saving_idr'));
        $this->assertNull($response->json('result.payback_years'));
    }

    public function test_daftar_hanya_memuat_simulasi_milik_user_aktif(): void
    {
        $user = User::factory()->create();
        $lain = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/analyses', $this->payload($user))->assertStatus(201);
        $this->actingAs($user, 'sanctum')->postJson('/api/analyses', $this->payload($user, [
            'roofs' => [self::roof(), self::roof([], self::POLYGON_SECOND)],
        ]))->assertStatus(201);
        $this->actingAs($lain, 'sanctum')->postJson('/api/analyses', $this->payload($lain))->assertStatus(201);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/analyses')->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertSame(2, $response->json('meta.total'));
        $this->assertSame(2, $response->json('data.0.roof_count'));
        $this->assertSame(1, $response->json('data.1.roof_count'));
        $response->assertJsonStructure(['data' => [['id', 'center_point' => ['lat', 'lng'], 'roof_count', 'capacity_kwp', 'annual_production_kwh', 'monthly_saving_idr', 'payback_years', 'created_at']]]);
    }

    public function test_ukuran_halaman_dan_alias_limit_dihormati(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/analyses', $this->payload($user));

        $this->assertSame(1, $this->actingAs($user, 'sanctum')->getJson('/api/analyses?per_page=1')->json('meta.per_page'));
        $this->assertSame(1, $this->actingAs($user, 'sanctum')->getJson('/api/analyses?limit=1')->json('meta.per_page'));
    }

    public function test_detail_memuat_bidang_masukan_hasil_dan_asumsi(): void
    {
        $user = User::factory()->create();

        $id = $this->actingAs($user, 'sanctum')->postJson('/api/analyses', $this->payload($user))->json('id');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/analyses/{$id}")
            ->assertOk();

        $this->assertSame($id, $response->json('id'));
        $this->assertSame(19, $response->json('map_zoom'));
        $this->assertSame('Bidang Atap Utama', $response->json('roofs.0.label'));
        $this->assertSame('det_uji_1', $response->json('roofs.0.detection_id'));
        $this->assertEqualsWithDelta(0.94, (float) $response->json('roofs.0.confidence'), 0.0001);
        $this->assertEquals(self::POLYGON, $response->json('roofs.0.roof_polygon_px'));
        $this->assertSame('Polygon', $response->json('roofs.0.roof_polygon.type'));
        $this->assertCount(5, $response->json('roofs.0.roof_polygon.coordinates.0'));
        $this->assertEqualsWithDelta(22.0, (float) $response->json('roofs.0.input.tilt_deg'), 0.01);
        $this->assertSame('mono_perc_550', $response->json('roofs.0.input.module_key'));
        $this->assertEqualsWithDelta(600.0, (float) $response->json('roofs.0.result.area_sqm'), 0.01);
        $this->assertSame('Jam matahari puncak studio', $response->json('assumptions.irradiance_source'));
        $this->assertNotNull($response->json('created_at'));
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
        // Baris bidang ikut terhapus lewat kunci asing, bukan tertinggal sebagai yatim.
        $this->assertDatabaseMissing('simulation_roofs', ['simulation_id' => $id]);
    }

    public function test_menghapus_simulasi_milik_user_lain_tidak_mengubah_apa_pun(): void
    {
        $pemilik = User::factory()->create();
        $penyusup = User::factory()->create();

        $id = $this->actingAs($pemilik, 'sanctum')->postJson('/api/analyses', $this->payload($pemilik))->json('id');

        $this->actingAs($penyusup, 'sanctum')->deleteJson("/api/analyses/{$id}")->assertStatus(404);

        $this->assertDatabaseHas('simulations', ['id' => $id]);
        $this->assertDatabaseHas('simulation_roofs', ['simulation_id' => $id]);
    }

    public function test_simulasi_tersimpan_dapat_diperbarui_tanpa_menambah_baris(): void
    {
        $user = User::factory()->create();

        $created = $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyses', $this->payload($user))
            ->assertCreated();

        $id = (int) $created->json('id');

        $updated = $this->actingAs($user, 'sanctum')
            ->patchJson("/api/analyses/{$id}", $this->payload($user, [
                'address' => 'Alamat Baru',
                'roofs' => [self::roof(['panel_count' => 12])],
            ]))
            ->assertOk()
            ->assertJsonPath('message', 'Simulation updated')
            ->assertJsonPath('id', $id)
            ->assertJsonPath('address', 'Alamat Baru');

        $this->assertSame(12, (int) $updated->json('result.installed'));
        $this->assertDatabaseCount('simulations', 1);
        $this->assertDatabaseCount('simulation_roofs', 1);
        $this->assertDatabaseHas('simulation_roofs', [
            'simulation_id' => $id,
            'installed' => 12,
        ]);
    }

    public function test_memperbarui_simulasi_milik_orang_lain_menghasilkan_404(): void
    {
        $pemilik = User::factory()->create();
        $penyusup = User::factory()->create();

        $id = $this->actingAs($pemilik, 'sanctum')
            ->postJson('/api/analyses', $this->payload($pemilik))
            ->json('id');

        $this->actingAs($penyusup, 'sanctum')
            ->patchJson("/api/analyses/{$id}", $this->payload($penyusup))
            ->assertStatus(404);

        $this->assertDatabaseHas('simulations', ['id' => $id, 'address' => null]);
    }

    public function test_rintangan_mengecualikan_modul_yang_bersinggungan(): void
    {
        $user = User::factory()->create();

        $tanpaRintangan = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roofs' => [self::roof(['panel_count' => null])],
            ]))
            ->assertOk();

        // Setengah kiri bidang ditandai HVAC: modul di sana tidak boleh dipasang.
        $denganRintangan = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roofs' => [self::roof([
                    'panel_count' => null,
                    'obstacles' => [[
                        'type' => 'hvac',
                        'polygon_px' => [[150, 150], [180, 150], [180, 190], [150, 190]],
                    ]],
                ])],
            ]))
            ->assertOk();

        $this->assertGreaterThan(
            0,
            (int) $denganRintangan->json('result.installed'),
            'Sisa bidang kanan masih dapat menampung modul.',
        );
        $this->assertLessThan(
            (int) $tanpaRintangan->json('result.installed'),
            (int) $denganRintangan->json('result.installed'),
        );
        $this->assertSame(
            (int) $tanpaRintangan->json('result.max_slots'),
            (int) $denganRintangan->json('result.max_slots'),
            'Slot maksimum tetap menggambarkan kisi sebelum rintangan.',
        );
    }

    public function test_bidang_tanpa_modul_tetap_menyimpan_slot_maksimum(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roofs' => [self::roof([
                    'panel_count' => null,
                    'is_solar_populated' => false,
                ])],
            ]))
            ->assertOk();

        $this->assertSame(0, (int) $response->json('result.installed'));
        $this->assertSame(0.0, (float) $response->json('result.capacity_kwp'));
        $this->assertSame(0.0, (float) $response->json('result.annual_production_kwh'));
        $this->assertGreaterThan(0, (int) $response->json('result.max_slots'));
    }

    public function test_jam_matahari_dan_sudut_dudukan_memengaruhi_produksi(): void
    {
        $user = User::factory()->create();
        $roofs = [self::roof(['panel_count' => 24])];

        $siang = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roofs' => $roofs,
                'sun_hour' => 12,
                'extra_tilt' => 0,
            ]))
            ->assertOk();

        $pagi = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roofs' => $roofs,
                'sun_hour' => 9,
                'extra_tilt' => 0,
            ]))
            ->assertOk();

        $miring = $this->actingAs($user, 'sanctum')
            ->postJson('/api/simulate', $this->payload($user, [
                'roofs' => $roofs,
                'sun_hour' => 12,
                'extra_tilt' => 20,
            ]))
            ->assertOk();

        $this->assertLessThan(
            (float) $siang->json('result.annual_production_kwh'),
            (float) $pagi->json('result.annual_production_kwh'),
        );
        $this->assertGreaterThan(
            (float) $siang->json('result.annual_production_kwh'),
            (float) $miring->json('result.annual_production_kwh'),
        );
        $this->assertSame(4.85, (float) $siang->json('assumptions.daily_irradiance_kwh_per_sqm'));
        $this->assertSame(3.8, (float) $pagi->json('assumptions.daily_irradiance_kwh_per_sqm'));
    }

    public function test_masukan_studio_terbaca_kembali_dari_simulasi_tersimpan(): void
    {
        $user = User::factory()->create();

        $id = $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyses', $this->payload($user, [
                'sun_hour' => 15,
                'extra_tilt' => 20,
                'roofs' => [self::roof([
                    'facet_rotation_deg' => 12.5,
                    'obstacles' => [[
                        'type' => 'skylight',
                        'polygon_px' => [[160, 150], [180, 150], [180, 170], [160, 170]],
                    ]],
                ])],
            ]))
            ->assertCreated()
            ->json('id');

        $detail = $this->actingAs($user, 'sanctum')->getJson("/api/analyses/{$id}")->assertOk();

        $this->assertSame(15.0, (float) $detail->json('input.sun_hour'));
        $this->assertSame(20.0, (float) $detail->json('input.extra_tilt'));
        $this->assertEqualsWithDelta(12.5, (float) $detail->json('roofs.0.facet_rotation_deg'), 1e-9);
        $this->assertSame('skylight', $detail->json('roofs.0.obstacles.0.type'));
        $this->assertCount(4, $detail->json('roofs.0.obstacles.0.polygon_px'));
        $this->assertSame('Jam matahari puncak studio', $detail->json('assumptions.irradiance_source'));
    }

    public function test_ringkasan_membawa_modul_dan_dimensi_bidang_pertama(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/analyses', $this->payload($user))->assertCreated();

        $summary = $this->actingAs($user, 'sanctum')->getJson('/api/analyses')->assertOk();

        $this->assertSame('mono_perc_550', $summary->json('data.0.module_key'));
        $this->assertEqualsWithDelta(29.0, (float) $summary->json('data.0.roof_length_m'), 0.01);
        $this->assertEqualsWithDelta(19.0, (float) $summary->json('data.0.roof_width_m'), 0.01);
        $this->assertEqualsWithDelta(22.0, (float) $summary->json('data.0.tilt_deg'), 0.01);

        // Kartu dampak ekologis membaca kedua nilai ini; hilangnya salah satunya
        // membuat dashboard gagal memformat angka, bukan sekadar tampil kosong.
        $this->assertIsNumeric($summary->json('data.0.co2_reduction_kg_per_year'));
        $this->assertIsInt($summary->json('data.0.trees_equivalent'));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(User $user, array $overrides = []): array
    {
        return array_merge([
            'image_id' => $this->imageId($user),
            'roofs' => [self::roof()],
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
        return $this->payload(User::factory()->create(), ['image_id' => $imageId]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @param  array<int, array{0: float|int, 1: float|int}>  $polygon
     * @return array<string, mixed>
     */
    private static function roof(array $overrides = [], array $polygon = self::POLYGON): array
    {
        return array_merge([
            'label' => 'Bidang Atap Utama',
            'detection_id' => 'det_uji_1',
            'confidence' => 0.94,
            'roof_polygon_px' => $polygon,
            'setback_m' => 0.5,
            'gutter_m' => 0.6,
            'tilt_deg' => 22.0,
            'azimuth_deg' => 188.0,
            'module_key' => 'mono_perc_550',
            'orientation' => 'portrait',
            'clearance_m' => 0.03,
            'panel_count' => 24,
        ], $overrides);
    }

    private function imageId(User $user): string
    {
        return app(ImageryAssetStore::class)->storeCapture(
            userId: (int) $user->getKey(),
            width: 512,
            height: 512,
            zoom: 19,
            bbox: self::BBOX,
            metersPerPixel: self::MPP,
        )->image_id;
    }

    private function actingAsUser(): static
    {
        return $this->actingAs(User::factory()->create(), 'sanctum');
    }
}
