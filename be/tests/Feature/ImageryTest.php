<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Imagery\ImageryAssetStore;
use App\Services\Imagery\ImageryUnavailableException;
use App\Services\Imagery\MapboxImageryProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ImageryTest extends TestCase
{
    use RefreshDatabase;

    private const JAKARTA = ['lat' => -6.59, 'lng' => 106.80, 'zoom' => 19];

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    public function test_menolak_permintaan_tanpa_token(): void
    {
        $this->postJson('/api/location', self::JAKARTA)->assertStatus(401);
    }

    public function test_mengembalikan_citra_beserta_skala_dan_atribusi(): void
    {
        $response = $this->actingAsUser()->postJson('/api/location', self::JAKARTA);

        $response->assertOk()->assertJsonStructure([
            'image_id', 'image_url', 'bbox', 'width', 'height', 'meters_per_pixel', 'attribution',
        ]);

        $this->assertTrue(Str::isUuid($response->json('image_id')));
        $this->assertNotSame('', (string) $response->json('attribution'), 'Atribusi wajib ada.');

        [$minLng, $minLat, $maxLng, $maxLat] = $response->json('bbox');

        $this->assertLessThan($maxLng, $minLng);
        $this->assertLessThan($maxLat, $minLat);
        $this->assertGreaterThan($minLng, self::JAKARTA['lng']);
        $this->assertLessThan($maxLng, self::JAKARTA['lng']);
        $this->assertGreaterThan($minLat, self::JAKARTA['lat']);
        $this->assertLessThan($maxLat, self::JAKARTA['lat']);
    }

    public function test_skala_pada_zoom_19_sesuai_perhitungan_web_mercator(): void
    {
        $response = $this->actingAsUser()->postJson('/api/location', self::JAKARTA);

        // 156543.03392 * cos(-6.59 derajat) / 2^19 = 0.2966
        $this->assertEqualsWithDelta(0.2966, $response->json('meters_per_pixel'), 0.0148);
    }

    public function test_menolak_koordinat_dan_zoom_di_luar_batas(): void
    {
        $this->actingAsUser()->postJson('/api/location', ['lat' => 91, 'lng' => 106.8])
            ->assertStatus(422)->assertJsonValidationErrors('lat');

        $this->actingAsUser()->postJson('/api/location', ['lat' => -6.59, 'lng' => 200])
            ->assertStatus(422)->assertJsonValidationErrors('lng');

        $this->actingAsUser()->postJson('/api/location', array_merge(self::JAKARTA, ['zoom' => 25]))
            ->assertStatus(422)->assertJsonValidationErrors('zoom');
    }

    public function test_berkas_tersimpan_di_direktori_pemilik_dengan_ekstensi_yang_jujur(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/location', self::JAKARTA);

        $imageId = $response->json('image_id');

        // Fixture adalah PNG, jadi ekstensi dan tipe MIME-nya harus menyatakan PNG.
        Storage::disk('public')->assertExists("imagery/{$user->id}/{$imageId}.png");

        $this->assertDatabaseHas('imagery_assets', [
            'image_id' => $imageId,
            'user_id' => $user->id,
            'extension' => 'png',
            'mime_type' => 'image/png',
            'kind' => 'raw',
        ]);
    }

    public function test_penyedia_mapbox_menyimpan_jpeg_dengan_ekstensi_jpg(): void
    {
        config()->set('imagery.mapbox.token', 'pk.uji');

        // Gaya raster mengembalikan JPEG. Sebelumnya berkas seperti ini ditulis
        // dengan nama .png sehingga ekstensinya berbohong tentang isinya.
        Http::fake(['*' => Http::response(self::jpegBytes(), 200, ['Content-Type' => 'image/jpeg'])]);

        $user = User::factory()->create();

        $asset = (new MapboxImageryProvider(app(ImageryAssetStore::class)))
            ->fetch(-6.59, 106.80, 19, $user->id);

        $this->assertSame('jpg', $asset->extension);
        $this->assertSame('image/jpeg', $asset->mime_type);
        $this->assertStringEndsWith('.jpg', $asset->path);
        Storage::disk('public')->assertExists($asset->path);
    }

    public function test_permintaan_mapbox_memakai_gaya_satelit_dan_koordinat_yang_diminta(): void
    {
        config()->set('imagery.mapbox.token', 'pk.uji');

        Http::fake(['*' => Http::response(self::jpegBytes(), 200, ['Content-Type' => 'image/jpeg'])]);

        $user = User::factory()->create();

        (new MapboxImageryProvider(app(ImageryAssetStore::class)))->fetch(-6.59, 106.80, 19, $user->id);

        Http::assertSent(function (Request $request): bool {
            return str_contains($request->url(), '/styles/v1/mapbox/satellite-v9/static/106.8,-6.59,19/')
                && str_contains($request->url(), 'access_token=pk.uji')
                && ! str_contains($request->url(), 'attribution=false');
        });
    }

    public function test_penyedia_mapbox_tanpa_token_gagal_dengan_pesan_konfigurasi(): void
    {
        config()->set('imagery.mapbox.token', '');

        $this->expectException(ImageryUnavailableException::class);
        $this->expectExceptionMessageMatches('/MAPBOX_ACCESS_TOKEN/');

        (new MapboxImageryProvider(app(ImageryAssetStore::class)))
            ->fetch(-6.59, 106.80, 19, User::factory()->create()->id);
    }

    public function test_endpoint_lokasi_meneruskan_pesan_konfigurasi_ke_klien(): void
    {
        config()->set('imagery.provider', 'mapbox');
        config()->set('imagery.mapbox.token', '');

        $this->actingAsUser()
            ->postJson('/api/location', self::JAKARTA)
            ->assertStatus(500)
            ->assertJsonPath('message', fn (string $message) => str_contains($message, 'MAPBOX_ACCESS_TOKEN'));
    }

    private function actingAsUser(): static
    {
        return $this->actingAs(User::factory()->create(), 'sanctum');
    }

    private static function jpegBytes(): string
    {
        $image = imagecreatetruecolor(16, 16);

        ob_start();
        imagejpeg($image);
        $bytes = (string) ob_get_clean();

        imagedestroy($image);

        return $bytes;
    }
}
