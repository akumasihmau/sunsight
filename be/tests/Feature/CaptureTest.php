<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Acuan tangkapan untuk bidang yang digambar pengguna.
 *
 * Simpan simulasi membutuhkan `image_id` karena luas dihitung dari skala tangkapan.
 * Sebelum endpoint ini ada, satu-satunya cara memperoleh `image_id` adalah menjalankan
 * model — sehingga proyek tidak dapat disimpan tanpa memindai atap.
 */
class CaptureTest extends TestCase
{
    use RefreshDatabase;

    /** Tangkapan uji 512 x 512 piksel dengan skala tepat 0,5 m/px. */
    private const BBOX = [106.8000000, -6.6023152, 106.8023151, -6.6000000];

    public function test_menolak_permintaan_tanpa_token(): void
    {
        $this->postJson('/api/captures', [])->assertStatus(401);
    }

    public function test_mencatat_georeferensi_tanpa_berkas_citra(): void
    {
        $response = $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/captures', [
                'bbox' => json_encode(self::BBOX),
                'width' => 512,
                'height' => 512,
                'zoom' => 19,
            ])
            ->assertStatus(201)
            ->assertJsonStructure(['image_id', 'image' => ['width', 'height', 'bbox', 'meters_per_pixel', 'zoom']]);

        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            (string) $response->json('image_id'),
        );

        // Skala diturunkan server, bukan dikirim klien.
        $this->assertEqualsWithDelta(0.5, (float) $response->json('image.meters_per_pixel'), 0.001);

        $this->assertDatabaseCount('imagery_assets', 1);
        $this->assertDatabaseHas('imagery_assets', [
            'path' => null,
            'kind' => 'capture',
            'width' => 512,
            'zoom' => 19,
        ]);
    }

    public function test_acuan_tangkapan_dapat_langsung_dipakai_menyimpan_simulasi(): void
    {
        $user = User::factory()->create();

        $capture = $this->actingAs($user, 'sanctum')
            ->postJson('/api/captures', [
                'bbox' => json_encode(self::BBOX),
                'width' => 512,
                'height' => 512,
                'zoom' => 19,
            ])
            ->assertStatus(201);

        // Bidang digambar sendiri: tanpa detection_id dan tanpa keyakinan model.
        $this->actingAs($user, 'sanctum')->postJson('/api/analyses', [
            'image_id' => $capture->json('image_id'),
            'roofs' => [[
                'label' => 'Bidang Gambar Sendiri',
                'detection_id' => null,
                'confidence' => null,
                'roof_polygon_px' => [[128, 128], [384, 128], [384, 384], [128, 384]],
                'setback_m' => 0.5,
                'gutter_m' => 0.6,
                'tilt_deg' => 22,
                'azimuth_deg' => 188,
                'module_key' => 'mono_perc_550',
                'orientation' => 'portrait',
                'clearance_m' => 0.03,
                'panel_count' => null,
            ]],
            'inverter_type' => 'string',
            'monthly_bill_idr' => 2_800_000,
            'tariff_key' => 'R2',
        ])->assertStatus(201)->assertJsonPath('result.roof_count', 1);
    }

    public function test_menolak_bbox_yang_tidak_berurutan(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/captures', [
                'bbox' => json_encode([106.81, -6.60, 106.80, -6.59]),
                'width' => 512,
                'height' => 512,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('bbox');
    }

    public function test_menolak_bbox_yang_tidak_konsisten_dengan_ukuran(): void
    {
        // Rentang bujur lima kali lebih lebar dari yang seharusnya, sehingga skala
        // lintang dan bujur berselisih jauh lebih dari 2%.
        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/captures', [
                'bbox' => json_encode([106.7900000, -6.6023152, 106.8123151, -6.6000000]),
                'width' => 512,
                'height' => 512,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('bbox');
    }

    public function test_menolak_ukuran_di_luar_rentang(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/captures', [
                'bbox' => json_encode(self::BBOX),
                'width' => 32,
                'height' => 512,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('width');
    }
}
