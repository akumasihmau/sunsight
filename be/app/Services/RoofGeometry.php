<?php

namespace App\Services;

use App\Services\Geometry\PixelGeoMapper;
use App\Services\Geometry\RoofArea;
use InvalidArgumentException;

/**
 * Menurunkan luas bidang atap dari persegi dalam koordinat piksel.
 *
 * Persegi punya sumbu sendiri, sehingga `width` dan `height` adalah dimensi
 * sebenarnya dan rotasi tidak mengubah luas. Yang dikurangi adalah setback pada
 * seluruh sisi, ditambah jalur talang pada satu sisi kemiringan.
 */
class RoofGeometry
{
    /**
     * @param  array{x: float, y: float, width: float, height: float, rotation_deg: float}  $rect
     */
    public static function areaFromRect(array $rect, float $metersPerPixel, float $setbackM, float $gutterM): RoofArea
    {
        if ($metersPerPixel <= 0.0) {
            throw new InvalidArgumentException('Skala meter per piksel harus lebih besar dari nol.');
        }

        if ($rect['width'] <= 0.0 || $rect['height'] <= 0.0) {
            throw new InvalidArgumentException('Dimensi persegi bidang atap harus lebih besar dari nol.');
        }

        $roofLengthM = $rect['width'] * $metersPerPixel;
        $roofWidthM = $rect['height'] * $metersPerPixel;

        // Setback berlaku keliling, talang hanya pada satu sisi kemiringan.
        $effectiveLengthM = max(0.0, $roofLengthM - 2 * $setbackM);
        $effectiveWidthM = max(0.0, $roofWidthM - 2 * $setbackM - $gutterM);

        return new RoofArea(
            roofLengthM: round($roofLengthM, 2),
            roofWidthM: round($roofWidthM, 2),
            totalAreaSqm: round($roofLengthM * $roofWidthM, 2),
            effectiveLengthM: round($effectiveLengthM, 2),
            effectiveWidthM: round($effectiveWidthM, 2),
            effectiveAreaSqm: round($effectiveLengthM * $effectiveWidthM, 2),
        );
    }

    /**
     * Keempat sudut persegi dalam koordinat piksel, sebagai ring tertutup.
     *
     * Rotasi dinyatakan searah jarum jam terhadap pusat persegi; sumbu y citra
     * tumbuh ke bawah sehingga putaran layar biasa memakai tanda positif.
     *
     * @param  array{x: float, y: float, width: float, height: float, rotation_deg: float}  $rect
     * @return array<int, array{0: float, 1: float}>
     */
    public static function corners(array $rect): array
    {
        $centerX = $rect['x'] + $rect['width'] / 2;
        $centerY = $rect['y'] + $rect['height'] / 2;
        $halfWidth = $rect['width'] / 2;
        $halfHeight = $rect['height'] / 2;

        $angle = deg2rad($rect['rotation_deg']);
        $cos = cos($angle);
        $sin = sin($angle);

        $corners = [];

        foreach ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [$sx, $sy]) {
            $dx = $sx * $halfWidth;
            $dy = $sy * $halfHeight;

            $corners[] = [
                $centerX + $dx * $cos - $dy * $sin,
                $centerY + $dx * $sin + $dy * $cos,
            ];
        }

        $corners[] = $corners[0];

        return $corners;
    }

    /**
     * Poligon bidang atap dalam koordinat geografis, siap disimpan sebagai geometri.
     *
     * @param  array{x: float, y: float, width: float, height: float, rotation_deg: float}  $rect
     * @param  array{0: float, 1: float, 2: float, 3: float}  $bbox
     * @return array<int, array{0: float, 1: float}>
     */
    public static function polygonLngLat(array $rect, array $bbox, int $imageWidth, int $imageHeight): array
    {
        return array_map(
            static fn (array $corner): array => PixelGeoMapper::toLngLat($corner, $bbox, $imageWidth, $imageHeight),
            self::corners($rect),
        );
    }
}
