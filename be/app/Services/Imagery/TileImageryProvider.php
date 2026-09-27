<?php

namespace App\Services\Imagery;

use App\Models\ImageryAsset;
use GdImage;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Menyusun citra dari ubin Web Mercator milik penyedia citra jaringan.
 *
 * Sumber citra masih menjadi pertanyaan terbuka, sehingga penyedia ini tidak
 * diaktifkan secara bawaan dan menolak berjalan tanpa IMAGERY_TILE_URL yang
 * dikonfigurasi secara sadar.
 */
class TileImageryProvider implements ImageryProvider
{
    private const TILE_SIZE = 256;

    public function __construct(
        private readonly ImageryAssetStore $store,
    ) {}

    public function fetch(float $lat, float $lng, int $zoom, int $userId): ImageryAsset
    {
        $template = (string) config('imagery.tile.url');

        if ($template === '') {
            throw new RuntimeException(
                'Penyedia citra jaringan belum dikonfigurasi. Set IMAGERY_TILE_URL, '
                .'atau pakai IMAGERY_PROVIDER=sample untuk menjalankan alur tanpa jaringan.',
            );
        }

        $size = (int) config('imagery.size');
        $tilesPerSide = (int) ceil($size / self::TILE_SIZE);
        [$firstX, $firstY] = self::tileFor($lat, $lng, $zoom);

        $canvas = imagecreatetruecolor($tilesPerSide * self::TILE_SIZE, $tilesPerSide * self::TILE_SIZE);

        for ($row = 0; $row < $tilesPerSide; $row++) {
            for ($column = 0; $column < $tilesPerSide; $column++) {
                $this->drawTile(
                    $canvas,
                    $template,
                    $zoom,
                    $firstX + $column,
                    $firstY + $row,
                    $column * self::TILE_SIZE,
                    $row * self::TILE_SIZE,
                );
            }
        }

        $cropped = imagecrop($canvas, ['x' => 0, 'y' => 0, 'width' => $size, 'height' => $size]);

        if ($cropped === false) {
            throw new RuntimeException('Citra tidak dapat dipotong ke ukuran yang diminta.');
        }

        ob_start();
        imagepng($cropped);
        $binary = (string) ob_get_clean();

        imagedestroy($canvas);
        imagedestroy($cropped);

        return $this->store->storeImagery(
            userId: $userId,
            pngBinary: $binary,
            lat: $lat,
            lng: $lng,
            zoom: $zoom,
            bbox: ImageryBoundingBox::forPoint($lat, $lng, $size, $zoom),
            metersPerPixel: ImageryBoundingBox::metersPerPixel($lat, $zoom),
        );
    }

    /**
     * Indeks ubin Web Mercator yang memuat satu titik.
     *
     * @return array{0: int, 1: int} Urutan [x, y].
     */
    public static function tileFor(float $lat, float $lng, int $zoom): array
    {
        $count = 2 ** $zoom;
        $latRad = deg2rad($lat);

        $x = (int) floor(($lng + 180.0) / 360.0 * $count);
        $y = (int) floor((1.0 - log(tan($latRad) + 1.0 / cos($latRad)) / M_PI) / 2.0 * $count);

        return [
            max(0, min($count - 1, $x)),
            max(0, min($count - 1, $y)),
        ];
    }

    private function drawTile(
        GdImage $canvas,
        string $template,
        int $zoom,
        int $x,
        int $y,
        int $destinationX,
        int $destinationY,
    ): void {
        $url = str_replace(['{z}', '{x}', '{y}'], [(string) $zoom, (string) $x, (string) $y], $template);

        $response = Http::withHeaders(['User-Agent' => (string) config('imagery.tile.user_agent')])
            ->timeout((int) config('imagery.tile.timeout'))
            ->get($url);

        if (! $response->successful()) {
            throw new RuntimeException("Ubin citra gagal diambil ({$response->status()}): {$url}");
        }

        $tile = imagecreatefromstring($response->body());

        if ($tile === false) {
            throw new RuntimeException("Ubin citra tidak dikenali: {$url}");
        }

        imagecopy($canvas, $tile, $destinationX, $destinationY, 0, 0, self::TILE_SIZE, self::TILE_SIZE);

        imagedestroy($tile);
    }
}
