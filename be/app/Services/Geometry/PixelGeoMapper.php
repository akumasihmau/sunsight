<?php

namespace App\Services\Geometry;

/**
 * Padanan sisi server dari konversi piksel ke geografis yang dipakai antarmuka.
 *
 * Pemetaan linier lewat bbox hanya sahih untuk rentang satu bidikan citra, karena
 * citra memakai proyeksi Web Mercator. Dipakai untuk menyimpan poligon bidang atap
 * dalam koordinat geografis.
 */
final class PixelGeoMapper
{
    /**
     * @param  array{0: float, 1: float}  $point  [x, y] dalam piksel.
     * @param  array{0: float, 1: float, 2: float, 3: float}  $bbox  [minLng, minLat, maxLng, maxLat].
     * @return array{0: float, 1: float} [lng, lat]
     */
    public static function toLngLat(array $point, array $bbox, int $imageWidth, int $imageHeight): array
    {
        [$minLng, $minLat, $maxLng, $maxLat] = $bbox;
        [$x, $y] = $point;

        return [
            $minLng + ($x / $imageWidth) * ($maxLng - $minLng),
            // Sumbu y citra tumbuh ke bawah, sedangkan lintang mengecil ke bawah.
            $maxLat - ($y / $imageHeight) * ($maxLat - $minLat),
        ];
    }
}
