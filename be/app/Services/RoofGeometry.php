<?php

namespace App\Services;

use App\Services\Geometry\PixelGeoMapper;
use App\Services\Geometry\PolygonGeometry;
use App\Services\Geometry\RoofPolygonArea;
use InvalidArgumentException;

/**
 * Menurunkan geometri bidang atap dari poligon dalam koordinat piksel.
 *
 * Alurnya mengikuti kontrak: luas dihitung dari poligon apa adanya, poligon efektif
 * diperoleh dengan mengurangi setback, lalu dimensi dan rotasi diambil dari persegi
 * pembatas minimum poligon efektif tersebut. Talang (`gutter_m`) sengaja tidak ikut
 * dikurangi: sisi bawah kemiringan tidak dapat ditentukan dari citra nadir, sehingga
 * memotong salah satu sisi poligon hanya akan mengurangi luas secara sewenang-wenang.
 * Nilainya tetap divalidasi dan disimpan di tempat lain agar maksud pengguna terbaca.
 */
class RoofGeometry
{
    /**
     * @param  array<int, array{0: float|int, 1: float|int}>  $polygonPx
     */
    public static function areaFromPolygon(array $polygonPx, float $metersPerPixel, float $setbackM): RoofPolygonArea
    {
        if ($metersPerPixel <= 0.0) {
            throw new InvalidArgumentException('Skala meter per piksel harus lebih besar dari nol.');
        }

        $polygon = PolygonGeometry::closeRing($polygonPx);
        $squareMetersPerPixel = $metersPerPixel * $metersPerPixel;

        // Titik yang berimpit atau segaris tidak membentuk bidang, tetapi masukan
        // seperti itu tetap sah menurut kontrak — yang diperiksa hanyalah jumlah
        // titiknya. Karena itu jawabannya adalah bidang tanpa luas, bukan kegagalan
        // yang menyesatkan pemanggil menjadi mencari kesalahan di tempat lain.
        if (count(PolygonGeometry::openRing($polygon)) < 3) {
            return new RoofPolygonArea(
                roofLengthM: 0.0,
                roofWidthM: 0.0,
                rotationDeg: 0.0,
                totalAreaSqm: 0.0,
                effectiveAreaSqm: 0.0,
                effectivePolygonPx: [],
                frameCenterPx: PolygonGeometry::centroid($polygon),
                frameLengthPx: 0.0,
                frameWidthPx: 0.0,
            );
        }

        $totalAreaSqm = PolygonGeometry::area($polygon) * $squareMetersPerPixel;

        // Setback diubah ke satuan ring, bukan dikurangkan dalam meter: offset bekerja
        // pada koordinat piksel.
        $effective = PolygonGeometry::inset($polygon, $setbackM / $metersPerPixel);

        if ($effective === []) {
            return new RoofPolygonArea(
                roofLengthM: 0.0,
                roofWidthM: 0.0,
                rotationDeg: 0.0,
                totalAreaSqm: $totalAreaSqm,
                effectiveAreaSqm: 0.0,
                effectivePolygonPx: [],
                frameCenterPx: PolygonGeometry::centroid($polygon),
                frameLengthPx: 0.0,
                frameWidthPx: 0.0,
            );
        }

        $rectangle = PolygonGeometry::minAreaRectangle($effective, $metersPerPixel);

        // Luas efektif tidak pernah melebihi luas aslinya; selisih hanya mungkin
        // muncul dari pembulatan.
        $effectiveAreaSqm = min(PolygonGeometry::area($effective) * $squareMetersPerPixel, $totalAreaSqm);

        return new RoofPolygonArea(
            roofLengthM: $rectangle['length_m'],
            roofWidthM: $rectangle['width_m'],
            rotationDeg: $rectangle['rotation_deg'],
            totalAreaSqm: $totalAreaSqm,
            effectiveAreaSqm: $effectiveAreaSqm,
            effectivePolygonPx: $effective,
            frameCenterPx: $rectangle['center'],
            frameLengthPx: $rectangle['length'],
            frameWidthPx: $rectangle['width'],
        );
    }

    /**
     * Poligon bidang atap dalam koordinat geografis, sebagai ring tertutup siap
     * disimpan sebagai geometri maupun dikirim sebagai GeoJSON.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $polygonPx
     * @param  array{0: float, 1: float, 2: float, 3: float}  $bbox
     * @return array<int, array{0: float, 1: float}>
     */
    public static function ringLngLat(array $polygonPx, array $bbox, int $imageWidth, int $imageHeight): array
    {
        $ring = [];

        foreach ($polygonPx as $point) {
            $ring[] = PixelGeoMapper::toLngLat(
                [(float) $point[0], (float) $point[1]],
                $bbox,
                $imageWidth,
                $imageHeight,
            );
        }

        return PolygonGeometry::closeRing($ring);
    }
}
