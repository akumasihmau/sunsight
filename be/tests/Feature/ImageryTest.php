<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ImageryTest extends TestCase
{
    use RefreshDatabase;

    private const JAKARTA = ['lat' => -6.59, 'lng' => 106.80];

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('imagery.provider', 'sample');
        Storage::fake('public');
    }

    public function test_menolak_permintaan_tanpa_token(): void
    {
        $this->postJson('/api/cv/fetch-osm', self::JAKARTA)->assertStatus(401);
    }

    public function test_menolak_koordinat_di_luar_rentang(): void
    {
        $this->actingAsUser()->postJson('/api/cv/fetch-osm', ['lat' => 91, 'lng' => 106.8])
            ->assertStatus(422)
            ->assertJsonValidationErrors('lat');

        $this->actingAsUser()->postJson('/api/cv/fetch-osm', ['lat' => -6.59, 'lng' => 200])
            ->assertStatus(422)
            ->assertJsonValidationErrors('lng');
    }

    public function test_menolak_zoom_di_luar_batas(): void
    {
        $this->actingAsUser()->postJson('/api/cv/fetch-osm', self::JAKARTA + ['zoom' => 25])
            ->assertStatus(422)
            ->assertJsonValidationErrors('zoom');

        $this->actingAsUser()->postJson('/api/cv/fetch-osm', self::JAKARTA + ['zoom' => 4])
            ->assertStatus(422)
            ->assertJsonValidationErrors('zoom');
    }

    public function test_mengembalikan_identitas_aset_dan_bbox_sesuai_kontrak(): void
    {
        $response = $this->actingAsUser()->postJson('/api/cv/fetch-osm', self::JAKARTA);

        $response->assertOk()
            ->assertJsonStructure(['image_id', 'image_url', 'bbox', 'width', 'height', 'meters_per_pixel']);

        $this->assertTrue(Str::isUuid($response->json('image_id')), 'image_id harus UUID, bukan nama berkas.');
        $this->assertSame(512, $response->json('width'));
        $this->assertSame(512, $response->json('height'));

        [$minLng, $minLat, $maxLng, $maxLat] = $response->json('bbox');

        $this->assertLessThan($maxLng, $minLng, 'bbox harus berurutan [minLng, minLat, maxLng, maxLat].');
        $this->assertLessThan($maxLat, $minLat);
        $this->assertGreaterThan($minLng, self::JAKARTA['lng']);
        $this->assertLessThan($maxLng, self::JAKARTA['lng']);
        $this->assertGreaterThan($minLat, self::JAKARTA['lat']);
        $this->assertLessThan($maxLat, self::JAKARTA['lat']);

        $this->assertStringNotContainsString('tests/fixtures', (string) $response->json('image_url'));
    }

    public function test_meters_per_pixel_pada_zoom_19_sesuai_perhitungan_web_mercator(): void
    {
        $response = $this->actingAsUser()->postJson('/api/cv/fetch-osm', self::JAKARTA);

        // 156543.03392 * cos(-6.59 derajat) / 2^19 = 0.2966
        $this->assertEqualsWithDelta(0.2966, $response->json('meters_per_pixel'), 0.0148);
    }

    public function test_zoom_bawaan_dipakai_ketika_tidak_dikirim(): void
    {
        $tanpaZoom = $this->actingAsUser()->postJson('/api/cv/fetch-osm', self::JAKARTA);
        $zoom19 = $this->actingAsUser()->postJson('/api/cv/fetch-osm', self::JAKARTA + ['zoom' => 19]);

        $this->assertSame($zoom19->json('meters_per_pixel'), $tanpaZoom->json('meters_per_pixel'));
    }

    public function test_dua_permintaan_menghasilkan_identitas_aset_yang_berbeda(): void
    {
        $user = User::factory()->create();

        $pertama = $this->actingAs($user, 'sanctum')->postJson('/api/cv/fetch-osm', self::JAKARTA);
        $kedua = $this->actingAs($user, 'sanctum')->postJson('/api/cv/fetch-osm', self::JAKARTA);

        $this->assertNotSame($pertama->json('image_id'), $kedua->json('image_id'));
    }

    public function test_berkas_tersimpan_di_direktori_user_pemanggil(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/cv/fetch-osm', self::JAKARTA);

        $imageId = $response->json('image_id');
        $expectedPath = "imagery/{$user->id}/{$imageId}.png";

        Storage::disk('public')->assertExists($expectedPath);
        $this->assertStringContainsString("/storage/imagery/{$user->id}/", (string) $response->json('image_url'));
        $this->assertSame([$expectedPath], Storage::disk('public')->allFiles());
    }

    public function test_fixture_tidak_ikut_tertulis_ke_direktori_aset(): void
    {
        $this->actingAsUser()->postJson('/api/cv/fetch-osm', self::JAKARTA)->assertOk();

        $written = Storage::disk('public')->allFiles();

        $this->assertCount(1, $written);
        $this->assertStringStartsWith('imagery/', $written[0]);
        $this->assertStringNotContainsString('roof-', $written[0]);
    }

    private function actingAsUser(): static
    {
        return $this->actingAs(User::factory()->create(), 'sanctum');
    }
}
