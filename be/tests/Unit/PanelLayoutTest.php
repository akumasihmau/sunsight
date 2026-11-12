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

    public function test_slot_yang_jatuh_di_luar_poligon_efektif_tidak_dihitung(): void
    {
        // Area efektif 5 x 5 meter, ditempatkan pada bingkai 10 x 10 piksel: dua
        // piksel mewakili satu meter.
        $area = new RoofArea(
            roofLengthM: 5.0,
            roofWidthM: 5.0,
            totalAreaSqm: 25.0,
            effectiveLengthM: 5.0,
            effectiveWidthM: 5.0,
            effectiveAreaSqm: 25.0,
        );

        $tanpaSaring = PanelLayout::fit($area, SimulationCatalog::module('mono_perc_550'), 'portrait', 0.0, null);

        // Separuh kiri bingkai saja yang merupakan bagian dari bidang.
        $separuhKiri = [[0.0, 0.0], [5.0, 0.0], [5.0, 10.0], [0.0, 10.0]];

        $denganSaring = PanelLayout::fit(
            area: $area,
            module: SimulationCatalog::module('mono_perc_550'),
            orientation: 'portrait',
            clearanceM: 0.0,
            requestedCount: null,
            maskPolygon: $separuhKiri,
            maskFrame: ['center' => [5.0, 5.0], 'length' => 10.0, 'width' => 10.0, 'rotation_deg' => 0.0],
        );

        $this->assertSame(2, $tanpaSaring->columns);
        $this->assertSame(4, $tanpaSaring->rows);
        $this->assertSame(8, $tanpaSaring->maxSlots);

        // Kolom kiri berpusat di x = 2,278 dan kolom kanan di x = 6,834.
        $this->assertSame(4, $denganSaring->maxSlots);
        $this->assertSame(4, $denganSaring->installed);
        $this->assertSame(2, $denganSaring->columns, 'Jumlah kolom kisi tidak berubah oleh penyaringan.');
    }
}
