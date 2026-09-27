<?php

namespace App\Services\Imagery;

use App\Models\ImageryAsset;
use Illuminate\Support\Facades\Http;

/**
 * Citra satelit nadir dari Mapbox Static Images.
 *
 * Satu permintaan mengembalikan satu citra untuk satu titik pada satu zoom,
 * sehingga bbox yang dilaporkan server dihitung sendiri dan pasti cocok dengan
 * citra yang diterima. Permintaan memakai bentuk `lng,lat,zoom` (bukan bentuk
 * bbox) supaya tanda kurung siku tidak perlu di-encode di dalam jalur URL.
 */
class MapboxImageryProvider implements ImageryProvider
{
    public function __construct(
        private readonly ImageryAssetStore $store,
    ) {}

    public function fetch(float $lat, float $lng, int $zoom, int $userId): ImageryAsset
    {
        $token = trim((string) config('imagery.mapbox.token'));

        if ($token === '') {
            throw new ImageryUnavailableException(
                'Penyedia citra belum dikonfigurasi. Set MAPBOX_ACCESS_TOKEN, '
                .'atau pakai IMAGERY_PROVIDER=sample untuk menjalankan alur tanpa citra satelit.',
            );
        }

        $size = (int) config('imagery.mapbox.size');

        $response = Http::timeout((int) config('imagery.mapbox.timeout'))
            ->get($this->url($lat, $lng, $zoom, $size, $token));

        if (! $response->successful()) {
            throw new ImageryUnavailableException(sprintf(
                'Penyedia citra menolak permintaan (%d). Periksa token dan cakupan wilayahnya.',
                $response->status(),
            ));
        }

        $binary = $response->body();

        if ($binary === '') {
            throw new ImageryUnavailableException('Penyedia citra mengembalikan isi kosong.');
        }

        return $this->store->storeImagery(
            userId: $userId,
            binary: $binary,
            lat: $lat,
            lng: $lng,
            zoom: $zoom,
            bbox: ImageryBoundingBox::forPoint($lat, $lng, $size, $zoom),
            metersPerPixel: ImageryBoundingBox::metersPerPixel($lat, $zoom),
        );
    }

    public function attribution(): string
    {
        return (string) config('imagery.mapbox.attribution_text');
    }

    private function url(float $lat, float $lng, int $zoom, int $size, string $token): string
    {
        return sprintf(
            '%s/styles/v1/%s/%s/static/%s,%s,%d/%dx%d?access_token=%s&attribution=%s',
            rtrim((string) config('imagery.mapbox.base_url'), '/'),
            (string) config('imagery.mapbox.username'),
            (string) config('imagery.mapbox.style'),
            rtrim(rtrim(sprintf('%.6F', $lng), '0'), '.'),
            rtrim(rtrim(sprintf('%.6F', $lat), '0'), '.'),
            $zoom,
            $size,
            $size,
            $token,
            config('imagery.mapbox.attribution') ? 'true' : 'false',
        );
    }
}
