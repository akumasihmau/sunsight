<?php

namespace Tests\Unit;

use App\Services\Geometry\RoofArea;
use App\Services\PanelLayout;
use App\Services\Simulation\SimulationCatalog;
use Tests\TestCase;

class PanelLayoutTest extends TestCase
{
    /**
     * Area efektif 6,5 x 3 m. Modul 550 W berukuran 2,278 x 1,134 m.
     */
    private static function area(float $lengthM = 6.5, float $widthM = 3.0): RoofArea
    {
        return new RoofArea(
            roofLengthM: $lengthM + 1.0,
            roofWidthM: $widthM + 2.0,
            totalAreaSqm: ($lengthM + 1.0) * ($widthM + 2.0),
            effectiveLengthM: $lengthM,
            effectiveWidthM: $widthM,
            effectiveAreaSqm: $lengthM * $widthM,
        );
    }

    public function test_kisi_dihitung_dari_pertidaksamaan_sebenarnya(): void
    {
        $layout = PanelLayout::fit(self::area(), SimulationCatalog::module('mono_perc_550'), 'portrait', 0.03, 99);

        // Potret: 2 kolom (2 x 2,278 + jarak) dan 2 baris (2 x 1,134 + jarak).
        $this->assertSame(2, $layout->columns);
        $this->assertSame(2, $layout->rows);
        $this->assertSame(4, $layout->maxSlots);
    }

    public function test_orientasi_lanskap_menukar_sisi_modul(): void
    {
        $layout = PanelLayout::fit(self::area(), SimulationCatalog::module('mono_perc_550'), 'landscape', 0.03, 99);

        $this->assertSame(5, $layout->columns);
        $this->assertSame(1, $layout->rows);
        $this->assertSame(5, $layout->maxSlots);
    }

    public function test_area_yang_lebih_kecil_dari_satu_modul_tidak_memuat_modul(): void
    {
        $layout = PanelLayout::fit(self::area(1.0, 1.0), SimulationCatalog::module('mono_perc_550'), 'portrait', 0.03, 10);

        $this->assertSame(0, $layout->maxSlots);
        $this->assertSame(0, $layout->installed);
        $this->assertSame(0.0, $layout->moduleAreaSqm);
    }

    public function test_jumlah_terpasang_dipotong_ke_jumlah_slot_maksimum(): void
    {
        $layout = PanelLayout::fit(self::area(), SimulationCatalog::module('mono_perc_550'), 'portrait', 0.03, 100);

        $this->assertSame(4, $layout->installed);
    }

    public function test_jumlah_terpasang_negatif_menjadi_nol(): void
    {
        $layout = PanelLayout::fit(self::area(), SimulationCatalog::module('mono_perc_550'), 'portrait', 0.03, -5);

        $this->assertSame(0, $layout->installed);
    }

    public function test_jumlah_terpasang_dihormati_bila_di_bawah_maksimum(): void
    {
        $layout = PanelLayout::fit(self::area(), SimulationCatalog::module('mono_perc_550'), 'portrait', 0.03, 3);

        $this->assertSame(3, $layout->installed);
        $this->assertSame(4, $layout->maxSlots);
    }

    public function test_jarak_antar_panel_yang_lebih_besar_tidak_menambah_jumlah_slot(): void
    {
        $rapat = PanelLayout::fit(self::area(), SimulationCatalog::module('mono_perc_550'), 'portrait', 0.0, 99);
        $lebar = PanelLayout::fit(self::area(), SimulationCatalog::module('mono_perc_550'), 'portrait', 0.5, 99);

        $this->assertGreaterThanOrEqual($lebar->maxSlots, $rapat->maxSlots);
    }

    public function test_luas_modul_dan_kerapatan_dihitung_dari_jumlah_terpasang(): void
    {
        $layout = PanelLayout::fit(self::area(), SimulationCatalog::module('mono_perc_550'), 'portrait', 0.03, 4);

        // 4 modul x 2,278 x 1,134 = 10,33 m2 dari area efektif 19,5 m2.
        $this->assertEqualsWithDelta(10.33, $layout->moduleAreaSqm, 0.01);
        $this->assertEqualsWithDelta(0.5299, $layout->densityRatio, 0.001);
    }
}
