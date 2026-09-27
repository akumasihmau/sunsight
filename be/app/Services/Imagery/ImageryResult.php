<?php

namespace App\Services\Imagery;

/**
 * Hasil satu akuisisi citra, sudah tersimpan dan siap dikembalikan ke klien.
 */
final readonly class ImageryResult
{
    /**
     * @param  array{0: float, 1: float, 2: float, 3: float}  $bbox  Urutan [minLng, minLat, maxLng, maxLat].
     */
    public function __construct(
        public string $imageId,
        public string $path,
        public string $url,
        public array $bbox,
        public int $width,
        public int $height,
        public float $metersPerPixel,
    ) {}
}
