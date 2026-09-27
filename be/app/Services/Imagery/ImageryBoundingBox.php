<?php

namespace App\Services\Imagery;

/**
 * Perhitungan Web Mercator untuk satu bidikan citra.
 *
 * Dipakai bersama oleh penyedia citra dan oleh klien frontend, jadi rumusnya
 * tidak boleh disalin ulang di tempat lain: nilai meters_per_pixel inilah yang
 * mengubah luas piksel menjadi meter persegi.
 */
final class ImageryBoundingBox
{
    /**
     * Resolusi Web Mercator pada zoom 0 dan lintang 0, dalam meter per piksel.
     */
    private const RESOLUTION_AT_ZOOM_0 = 156543.03392;

    private const METERS_PER_DEGREE_LATITUDE = 110574.0;

    private const METERS_PER_DEGREE_LONGITUDE_AT_EQUATOR = 111320.0;

    public static function metersPerPixel(float $lat, int $zoom): float
    {
        return self::RESOLUTION_AT_ZOOM_0 * cos(deg2rad($lat)) / (2 ** $zoom);
    }

    /**
     * Kotak pembatas yang berpusat pada satu titik dan mencakup tepat satu citra penuh.
     *
     * @return array{0: float, 1: float, 2: float, 3: float} Urutan [minLng, minLat, maxLng, maxLat].
     */
    public static function forPoint(float $lat, float $lng, int $sizePx, int $zoom): array
    {
        $radiusMeters = self::metersPerPixel($lat, $zoom) * $sizePx / 2;

        $deltaLat = $radiusMeters / self::METERS_PER_DEGREE_LATITUDE;
        $deltaLng = $radiusMeters / (self::METERS_PER_DEGREE_LONGITUDE_AT_EQUATOR * cos(deg2rad($lat)));

        return [$lng - $deltaLng, $lat - $deltaLat, $lng + $deltaLng, $lat + $deltaLat];
    }
}
