<?php

namespace Tests\Feature;

use App\Models\GeocodeCache;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Pencarian alamat lewat Nominatim.
 *
 * Yang diuji adalah perilaku yang terlihat klien: bentuk hasil, batas wilayah, cache,
 * dan pemetaan kegagalan. Panggilan jaringan selalu dipalsukan supaya pengujian tidak
 * bergantung pada layanan pihak ketiga.
 */
class GeocodeTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsUser(): static
    {
        return $this->actingAs(User::factory()->create(), 'sanctum');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function nominatimPayload(): array
    {
        return [
            [
                'display_name' => 'Jalan Pajajaran No. 42, Bogor Tengah, Kota Bogor',
                'lat' => '-6.595038',
                'lon' => '106.797241',
                'boundingbox' => ['-6.5960', '-6.5940', '106.7960', '106.7980'],
            ],
        ];
    }

    public function test_membutuhkan_token(): void
    {
        $this->getJson('/api/geocode?q=pajajaran')->assertStatus(401);
    }

    public function test_menolak_kueri_terlalu_pendek(): void
    {
        $this->actingAsUser()
            ->getJson('/api/geocode?q=jl')
            ->assertStatus(422)
            ->assertJsonValidationErrors('q');
    }

    public function test_mengembalikan_hasil_dengan_urutan_bbox_kontrak(): void
    {
        Http::fake([
            '*/search*' => Http::response($this->nominatimPayload(), 200),
        ]);

        $response = $this->actingAsUser()
            ->getJson('/api/geocode?q=Jl.%20Pajajaran%2042')
            ->assertOk();

        $response->assertJsonCount(1, 'results');
        $response->assertJsonPath('results.0.label', 'Jalan Pajajaran No. 42, Bogor Tengah, Kota Bogor');
        $response->assertJsonPath('results.0.lat', -6.595038);
        $response->assertJsonPath('results.0.lng', 106.797241);
        // bbox Nominatim [minLat,maxLat,minLng,maxLng] diubah ke [minLng,minLat,maxLng,maxLat].
        $response->assertJsonPath('results.0.bbox', [106.796, -6.596, 106.798, -6.594]);
        $response->assertJsonPath('results.0.source', 'nominatim');
    }

    public function test_membatasi_pencarian_ke_wilayah_bogor(): void
    {
        Http::fake(['*/search*' => Http::response([], 200)]);

        $this->actingAsUser()->getJson('/api/geocode?q=monas%20jakarta')->assertOk();

        Http::assertSent(function ($request) {
            $url = urldecode($request->url());

            return str_contains($url, 'bounded=1')
                && str_contains($url, 'countrycodes=id')
                // viewbox [minLng,minLat,maxLng,maxLat] ditulis Nominatim sebagai
                // left,top,right,bottom.
                && str_contains($url, '106.720000,-6.510000,106.880000,-6.680000');
        });
    }

    public function test_mengirim_identitas_pemanggil(): void
    {
        Http::fake(['*/search*' => Http::response([], 200)]);

        $this->actingAsUser()->getJson('/api/geocode?q=pajajaran')->assertOk();

        Http::assertSent(fn ($request) => str_contains($request->header('User-Agent')[0] ?? '', 'Sunsight'));
    }

    public function test_hasil_disimpan_dan_dipakai_ulang(): void
    {
        Http::fake(['*/search*' => Http::response($this->nominatimPayload(), 200)]);

        $this->actingAsUser()->getJson('/api/geocode?q=pajajaran')->assertOk();
        $this->assertSame(1, GeocodeCache::query()->count());

        // Kueri yang sama dengan spasi berlebih dan huruf besar berbeda harus dijawab
        // cache: normalisasi membuat keduanya berbagi satu hash.
        $this->actingAsUser()->getJson('/api/geocode?q=%20%20PAJajaran%20%20')->assertOk();

        Http::assertSentCount(1);
        $this->assertSame(1, GeocodeCache::query()->count());
    }

    public function test_cache_kedaluwarsa_diambil_ulang(): void
    {
        Http::fake(['*/search*' => Http::response($this->nominatimPayload(), 200)]);

        $this->actingAsUser()->getJson('/api/geocode?q=pajajaran')->assertOk();

        GeocodeCache::query()->update(['fetched_at' => now()->subDays(60)]);

        $this->actingAsUser()->getJson('/api/geocode?q=pajajaran')->assertOk();

        Http::assertSentCount(2);
    }

    public function test_alamat_tidak_ditemukan_bukan_kegagalan(): void
    {
        Http::fake(['*/search*' => Http::response([], 200)]);

        $this->actingAsUser()
            ->getJson('/api/geocode?q=alamat%20yang%20tidak%20ada')
            ->assertOk()
            ->assertJsonCount(0, 'results');
    }

    public function test_layanan_mati_menghasilkan_503(): void
    {
        Http::fake(['*/search*' => Http::response('', 500)]);

        $this->actingAsUser()
            ->getJson('/api/geocode?q=pajajaran')
            ->assertStatus(503);
    }

    public function test_koneksi_gagal_menghasilkan_503(): void
    {
        Http::fake(['*/search*' => fn () => throw new ConnectionException('timeout')]);

        $this->actingAsUser()
            ->getJson('/api/geocode?q=pajajaran')
            ->assertStatus(503);
    }
}
