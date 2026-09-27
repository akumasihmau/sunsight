<?php

namespace App\Services;

use App\Services\Geometry\LayoutResult;
use App\Services\Geometry\RoofArea;

/**
 * Menata modul surya sebagai kisi di dalam area efektif bidang atap.
 *
 * Jumlah yang muat dihitung dari pertidaksamaan sebenarnya, bukan pembagian
 * sederhana: n modul ditambah n-1 jarak harus muat pada sisi itu. Jarak terakhir
 * tidak perlu dihitung, sehingga area sempit tetap dapat memuat satu modul.
 */
class PanelLayout
{
    /**
     * @param  array{length_m: float, width_m: float}  $module
     */
    public static function fit(
        RoofArea $area,
        array $module,
        string $orientation,
        float $clearanceM,
        int $requestedCount,
    ): LayoutResult {
        $portrait = $orientation !== 'landscape';

        // Sisi panjang modul diletakkan sejajar bubungan pada orientasi potret.
        $alongLength = $portrait ? $module['length_m'] : $module['width_m'];
        $alongWidth = $portrait ? $module['width_m'] : $module['length_m'];

        $columns = self::countThatFits($area->effectiveLengthM, $alongLength, $clearanceM);
        $rows = self::countThatFits($area->effectiveWidthM, $alongWidth, $clearanceM);

        $maxSlots = $columns * $rows;
        $installed = max(0, min($requestedCount, $maxSlots));

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

    private static function countThatFits(float $availableM, float $panelSideM, float $clearanceM): int
    {
        if ($panelSideM <= 0.0 || $availableM < $panelSideM) {
            return 0;
        }

        $step = $panelSideM + $clearanceM;

        return (int) floor(($availableM + $clearanceM) / $step);
    }
}
