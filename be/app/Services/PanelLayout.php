<?php

namespace App\Services;

use App\Services\Geometry\LayoutResult;
use App\Services\Geometry\PolygonGeometry;
use App\Services\Geometry\RoofArea;

/**
 * Menata modul surya sebagai kisi di dalam area efektif bidang atap.
 *
 * Jumlah yang muat dihitung dari pertidaksamaan sebenarnya, bukan pembagian
 * sederhana: n modul ditambah n-1 jarak harus muat pada sisi itu. Jarak terakhir
 * tidak perlu dihitung, sehingga area sempit tetap dapat memuat satu modul.
 *
 * Kisi selalu berbentuk persegi, sedangkan bidang atap nyata berbentuk poligon
 * bebas. Karena itu kisi dibentuk di dalam persegi pembatas minimum poligon efektif,
 * lalu slot yang titik tengahnya jatuh di luar poligon itu dibuang. Dengan begitu
 * jumlah terpasang tidak pernah menghitung modul yang sebenarnya berdiri di luar
 * atap, dan luas efektif yang dipakai sebagai dasar kerapatan tetap luas poligon,
 * bukan luas perseginya.
 */
class PanelLayout
{
    /**
     * @param  array{length_m: float, width_m: float}  $module
     * @param  int|null  $requestedCount  Null berarti isi seluruh slot yang muat.
     * @param  array<int, array{0: float, 1: float}>|null  $maskPolygon  Poligon efektif
     *         bidang dalam piksel, mis. dari `RoofPolygonArea::effectivePolygonPx`.
     *         Null berarti kisi dipakai seluruhnya.
     * @param  array{
     *     center: array{0: float, 1: float},
     *     length: float,
     *     width: float,
     *     rotation_deg: float,
     * }|null  $maskFrame  Persegi pembatas minimum poligon itu, dalam piksel, mis. dari
     *   `RoofPolygonArea::maskFrame()`. Diperlukan hanya bila `$maskPolygon` diisi,
     *   karena kisi tidak dapat ditempatkan tanpa letak dan arah perseginya.
     */
    public static function fit(
        RoofArea $area,
        array $module,
        string $orientation,
        float $clearanceM,
        ?int $requestedCount,
        ?array $maskPolygon = null,
        ?array $maskFrame = null,
    ): LayoutResult {
        $portrait = $orientation !== 'landscape';

        // Sisi panjang modul diletakkan sejajar bubungan pada orientasi potret.
        $alongLength = $portrait ? $module['length_m'] : $module['width_m'];
        $alongWidth = $portrait ? $module['width_m'] : $module['length_m'];

        $columns = self::countThatFits($area->effectiveLengthM, $alongLength, $clearanceM);
        $rows = self::countThatFits($area->effectiveWidthM, $alongWidth, $clearanceM);

        $maxSlots = $maskPolygon === null || $maskFrame === null
            ? $columns * $rows
            : self::slotsInsideMask(
                columns: $columns,
                rows: $rows,
                area: $area,
                alongLengthM: $alongLength,
                alongWidthM: $alongWidth,
                clearanceM: $clearanceM,
                polygon: $maskPolygon,
                frame: $maskFrame,
            );

        $installed = $requestedCount === null
            ? $maxSlots
            : max(0, min($requestedCount, $maxSlots));

        $moduleAreaSqm = $installed * $module['length_m'] * $module['width_m'];

        return new LayoutResult(
            maxSlots: $maxSlots,
            installed: $installed,
            rows: $rows,
            columns: $columns,
            moduleAreaSqm: round($moduleAreaSqm, 2),
            densityRatio: $area->effectiveAreaSqm > 0.0
                ? round($moduleAreaSqm / $area->effectiveAreaSqm, 4)
                : 0.0,
        );
    }

    /**
     * Jumlah slot yang titik tengahnya berada di dalam poligon efektif.
     *
     * Kisi dihitung dalam meter sedangkan penempatannya dalam piksel, jadi skalanya
     * diambil dari bingkai itu sendiri: panjang bingkai dibagi panjang efektif.
     * Dengan begitu kisi meter dan kisi piksel selalu menggambarkan susunan yang sama.
     *
     * @param  array<int, array{0: float, 1: float}>  $polygon
     * @param  array{
     *     center: array{0: float, 1: float},
     *     length: float,
     *     width: float,
     *     rotation_deg: float,
     * }  $frame
     */
    private static function slotsInsideMask(
        int $columns,
        int $rows,
        RoofArea $area,
        float $alongLengthM,
        float $alongWidthM,
        float $clearanceM,
        array $polygon,
        array $frame,
    ): int {
        if ($columns === 0 || $rows === 0
            || $area->effectiveLengthM <= 0.0
            || $frame['length'] <= 0.0
            || $frame['width'] <= 0.0) {
            return 0;
        }

        $scale = $frame['length'] / $area->effectiveLengthM;

        $panelLengthPx = $alongLengthM * $scale;
        $panelWidthPx = $alongWidthM * $scale;
        $gapPx = $clearanceM * $scale;

        $angle = deg2rad($frame['rotation_deg']);
        $cos = cos($angle);
        $sin = sin($angle);

        // Sisi panjang modul ditempatkan sejajar sisi panjang bingkai.
        $halfLengthPx = $frame['length'] / 2.0;
        $halfWidthPx = $frame['width'] / 2.0;

        $inside = 0;

        for ($column = 0; $column < $columns; $column++) {
            $localX = ($column + 0.5) * $panelLengthPx + $column * $gapPx - $halfLengthPx;

            for ($row = 0; $row < $rows; $row++) {
                $localY = ($row + 0.5) * $panelWidthPx + $row * $gapPx - $halfWidthPx;

                $centerX = $frame['center'][0] + $localX * $cos - $localY * $sin;
                $centerY = $frame['center'][1] + $localX * $sin + $localY * $cos;

                // Seluruh badan modul harus berada di dalam bidang, bukan hanya titik
                // tengahnya: modul yang separuh menggantung di luar atap tidak dapat
                // dipasang. Karena itu keempat sudutnya diuji.
                if (self::moduleFitsInside($polygon, $centerX, $centerY, $panelLengthPx, $panelWidthPx, $cos, $sin)) {
                    $inside++;
                }
            }
        }

        return $inside;
    }

    /**
     * Apakah seluruh badan satu modul berada di dalam bidang.
     *
     * Titik tengah saja tidak cukup: modul berukuran 2,3 x 1,1 m dapat berpusat di
     * dalam poligon sementara separuh badannya menggantung di luar atap. Karena itu
     * keempat sudut diuji, memakai arah bingkai yang sama dengan kisi.
     *
     * @param  array<int, array{0: float, 1: float}>  $polygon
     */
    private static function moduleFitsInside(
        array $polygon,
        float $centerX,
        float $centerY,
        float $panelLengthPx,
        float $panelWidthPx,
        float $cos,
        float $sin,
    ): bool {
        $halfLength = $panelLengthPx / 2.0;
        $halfWidth = $panelWidthPx / 2.0;

        foreach ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [$sx, $sy]) {
            $dx = $sx * $halfLength;
            $dy = $sy * $halfWidth;

            $x = $centerX + $dx * $cos - $dy * $sin;
            $y = $centerY + $dx * $sin + $dy * $cos;

            if (! PolygonGeometry::pointInPolygon($polygon, [$x, $y])) {
                return false;
            }
        }

        return PolygonGeometry::pointInPolygon($polygon, [$centerX, $centerY]);
    }

    private static function countThatFits(float $availableM, float $panelSideM, float $clearanceM): int
    {
        if ($panelSideM <= 0.0 || $availableM < $panelSideM) {
            return 0;
        }

        $step = $panelSideM + $clearanceM;

        return (int) floor(($availableM + $clearanceM) / $step);
    }
}
