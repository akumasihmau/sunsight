<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Memerlukan virtual environment Python yang sudah dibangun; lihat README.md.
 * Tanpa itu, seluruh test di sini akan gagal karena interpreter, bukan karena logika.
 */
class CvPipelineTest extends TestCase
{
    use RefreshDatabase;

    private const JAKARTA = ['lat' => -6.59, 'lng' => 106.80, 'zoom' => 19];

    /** @var array<int, array{0: float, 1: float}> */
    private const POLYGON = [
        [120.0, 100.0],
        [400.0, 96.0],
        [412.0, 350.0],
        [132.0, 362.0],
    ];

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('imagery.provider', 'sample');
        Storage::fake('public');
    }

    public function test_menolak_permintaan_tanpa_token(): void
    {
        $this->postJson('/api/cv/refine-polygon', [
            'image_id' => (string) Str::uuid(),
            'rough_polygon' => self::POLYGON,
        ])->assertStatus(401);
    }

    public function test_menolak_poligon_dengan_kurang_dari_tiga_titik_unik(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cv/refine-polygon', [
                'image_id' => $this->fetchImage($user),
                'rough_polygon' => [[10, 10], [10, 10], [20, 20]],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rough_polygon');
    }

    public function test_menolak_poligon_yang_bukan_pasangan_titik(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cv/refine-polygon', [
                'image_id' => $this->fetchImage($user),
                'rough_polygon' => [[10], [20], [30]],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rough_polygon');
    }

    public function test_poligon_presisi_berada_di_dalam_batas_citra(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/cv/refine-polygon', [
                'image_id' => $this->fetchImage($user),
                'rough_polygon' => self::POLYGON,
            ])
            ->assertOk()
            ->assertJsonStructure(['refined_polygon', 'mask_image_url']);

        $polygon = $response->json('refined_polygon');

        $this->assertGreaterThanOrEqual(3, count($polygon));

        foreach ($polygon as $point) {
            $this->assertGreaterThanOrEqual(0.0, $point[0]);
            $this->assertLessThanOrEqual(512.0, $point[0]);
            $this->assertGreaterThanOrEqual(0.0, $point[1]);
            $this->assertLessThanOrEqual(512.0, $point[1]);
        }
    }

    public function test_mask_perapian_tersimpan_sebagai_aset_turunan(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/cv/refine-polygon', [
                'image_id' => $this->fetchImage($user),
                'rough_polygon' => self::POLYGON,
            ])
            ->assertOk();

        $maskPath = $this->pathFromUrl($response->json('mask_image_url'));

        Storage::disk('public')->assertExists($maskPath);
        $this->assertDatabaseHas('imagery_assets', ['kind' => 'refine_mask', 'user_id' => $user->id]);
    }

    public function test_luas_area_tidak_pernah_melebihi_total(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/cv/detect-shadow', [
                'image_id' => $this->fetchImage($user),
                'refined_polygon' => self::POLYGON,
            ])
            ->assertOk()
            ->assertJsonStructure(['usable_area_sqm', 'shadow_area_sqm', 'total_area_sqm', 'shadow_mask_url']);

        $usable = $response->json('usable_area_sqm');
        $shadow = $response->json('shadow_area_sqm');
        $total = $response->json('total_area_sqm');

        $this->assertGreaterThanOrEqual(0.0, $usable);
        $this->assertGreaterThanOrEqual(0.0, $shadow);
        $this->assertGreaterThan(0.0, $total);
        $this->assertEqualsWithDelta($total, $usable + $shadow, 0.01);
        $this->assertLessThanOrEqual($total, $usable);
    }

    public function test_luas_dihitung_memakai_skala_dari_metadata_aset(): void
    {
        $user = User::factory()->create();
        $imageId = $this->fetchImage($user);

        $poligonKecil = [[100.0, 100.0], [200.0, 100.0], [200.0, 200.0], [100.0, 200.0]];

        $kecil = $this->actingAs($user, 'sanctum')->postJson('/api/cv/detect-shadow', [
            'image_id' => $imageId,
            'refined_polygon' => $poligonKecil,
        ])->json('total_area_sqm');

        $besar = $this->actingAs($user, 'sanctum')->postJson('/api/cv/detect-shadow', [
            'image_id' => $imageId,
            'refined_polygon' => [[100.0, 100.0], [400.0, 100.0], [400.0, 400.0], [100.0, 400.0]],
        ])->json('total_area_sqm');

        // 100x100 piksel pada 0.2966 m/px sekitar 880 m2; 300x300 sekitar 7900 m2.
        $this->assertEqualsWithDelta(880.0, $kecil, 40.0);
        $this->assertEqualsWithDelta(7918.0, $besar, 60.0);
    }

    public function test_mask_bayangan_tersimpan_sebagai_aset_turunan(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/cv/detect-shadow', [
                'image_id' => $this->fetchImage($user),
                'refined_polygon' => self::POLYGON,
            ])
            ->assertOk();

        Storage::disk('public')->assertExists($this->pathFromUrl($response->json('shadow_mask_url')));
        $this->assertDatabaseHas('imagery_assets', ['kind' => 'shadow_mask', 'user_id' => $user->id]);
    }

    public function test_citra_milik_user_lain_ditolak_tanpa_membocorkan_keberadaannya(): void
    {
        $pemilik = User::factory()->create();
        $penyusup = User::factory()->create();

        $imageId = $this->fetchImage($pemilik);

        $milikOrangLain = $this->actingAs($penyusup, 'sanctum')->postJson('/api/cv/refine-polygon', [
            'image_id' => $imageId,
            'rough_polygon' => self::POLYGON,
        ]);

        $tidakPernahAda = $this->actingAs($penyusup, 'sanctum')->postJson('/api/cv/refine-polygon', [
            'image_id' => (string) Str::uuid(),
            'rough_polygon' => self::POLYGON,
        ]);

        $milikOrangLain->assertStatus(404);
        $tidakPernahAda->assertStatus(404);
        $this->assertSame(
            $milikOrangLain->json('message'),
            $tidakPernahAda->json('message'),
            'Aset milik user lain tidak boleh dapat dibedakan dari aset yang tidak ada.',
        );
    }

    public function test_interpreter_yang_tidak_ada_menghasilkan_pesan_konfigurasi(): void
    {
        config()->set('cv.python', '/tidak/ada/python');

        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cv/refine-polygon', [
                'image_id' => $this->fetchImage($user),
                'rough_polygon' => self::POLYGON,
            ])
            ->assertStatus(500)
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'Interpreter Python'));
    }

    public function test_berkas_skrip_yang_tidak_ada_menghasilkan_pesan_bukan_kegagalan_kosong(): void
    {
        config()->set('cv.scripts.refine_polygon', '/tidak/ada/skrip.py');

        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/cv/refine-polygon', [
                'image_id' => $this->fetchImage($user),
                'rough_polygon' => self::POLYGON,
            ])
            ->assertStatus(500);

        $this->assertNotSame('', (string) $response->json('message'));
        $this->assertStringContainsString('tidak ditemukan', (string) $response->json('message'));
    }

    public function test_skrip_yang_melewati_batas_waktu_dihentikan_dan_dilaporkan(): void
    {
        $slow = (string) tempnam(sys_get_temp_dir(), 'sunsight_slow_');
        file_put_contents($slow, "sleep 10\n");

        config()->set('cv.python', '/bin/sh');
        config()->set('cv.scripts.refine_polygon', $slow);
        config()->set('cv.timeout', 1);

        try {
            $user = User::factory()->create();

            $this->actingAs($user, 'sanctum')
                ->postJson('/api/cv/refine-polygon', [
                    'image_id' => $this->fetchImage($user),
                    'rough_polygon' => self::POLYGON,
                ])
                ->assertStatus(500)
                ->assertJsonPath('message', fn (string $message) => str_contains($message, 'batas waktu'));
        } finally {
            if (is_file($slow)) {
                unlink($slow);
            }
        }
    }

    public function test_skrip_yang_keluar_dengan_kode_gagal_dilaporkan_beserta_pesannya(): void
    {
        $failing = (string) tempnam(sys_get_temp_dir(), 'sunsight_fail_');
        file_put_contents($failing, "echo 'poligon terlalu kecil' >&2\nexit 3\n");

        config()->set('cv.python', '/bin/sh');
        config()->set('cv.scripts.refine_polygon', $failing);

        try {
            $user = User::factory()->create();

            $this->actingAs($user, 'sanctum')
                ->postJson('/api/cv/refine-polygon', [
                    'image_id' => $this->fetchImage($user),
                    'rough_polygon' => self::POLYGON,
                ])
                ->assertStatus(500)
                ->assertJsonPath('message', fn (string $message) => str_contains($message, 'poligon terlalu kecil'));
        } finally {
            if (is_file($failing)) {
                unlink($failing);
            }
        }
    }

    private function fetchImage(User $user): string
    {
        return $this->actingAs($user, 'sanctum')
            ->postJson('/api/cv/fetch-osm', self::JAKARTA)
            ->json('image_id');
    }

    private function pathFromUrl(string $url): string
    {
        return Str::after($url, '/storage/');
    }
}
