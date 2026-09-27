<?php

namespace Tests\Unit;

use App\Services\RoofGeometry;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class RoofGeometryTest extends TestCase
{
    /** @var array{x: float, y: float, width: float, height: float, rotation_deg: float} */
    private const RECT = ['x' => 100.0, 'y' => 100.0, 'width' => 100.0, 'height' => 50.0, 'rotation_deg' => 0.0];

    public function test_luas_diturunkan_dari_skala_dan_dikurangi_setback_serta_talang(): void
    {
        // 100 x 50 piksel pada 0,5 m/px = 50 x 25 m. Setback 1 m keliling, talang 1 m di sisi lebar.
        $area = RoofGeometry::areaFromRect(self::RECT, 0.5, 1.0, 1.0);

        $this->assertSame(50.0, $area->roofLengthM);
        $this->assertSame(25.0, $area->roofWidthM);
        $this->assertSame(1250.0, $area->totalAreaSqm);
        $this->assertSame(48.0, $area->effectiveLengthM);
        $this->assertSame(22.0, $area->effectiveWidthM);
        $this->assertSame(1056.0, $area->effectiveAreaSqm);
    }

    public function test_luas_total_sebanding_dengan_kuadrat_skala(): void
    {
        $kecil = RoofGeometry::areaFromRect(self::RECT, 0.5, 0.0, 0.0);
        $besar = RoofGeometry::areaFromRect(self::RECT, 1.0, 0.0, 0.0);

        $this->assertSame(4.0, $besar->totalAreaSqm / $kecil->totalAreaSqm);
    }

    public function test_skala_nol_atau_negatif_ditolak(): void
    {
        $this->expectException(InvalidArgumentException::class);

        RoofGeometry::areaFromRect(self::RECT, 0.0, 0.5, 0.5);
    }

    public function test_dimensi_nol_ditolak(): void
    {
        $this->expectException(InvalidArgumentException::class);

        RoofGeometry::areaFromRect(['x' => 0.0, 'y' => 0.0, 'width' => 0.0, 'height' => 10.0, 'rotation_deg' => 0.0], 0.5, 0.0, 0.0);
    }

    public function test_setback_yang_menghabiskan_bidang_menghasilkan_nol_bukan_negatif(): void
    {
        // Lebar bidang 25 m; setback 20 m keliling plus talang 1 m melebihi separuh lebarnya.
        $area = RoofGeometry::areaFromRect(self::RECT, 0.5, 20.0, 1.0);

        $this->assertSame(0.0, $area->effectiveWidthM);
        $this->assertSame(0.0, $area->effectiveAreaSqm);
        $this->assertGreaterThan(0.0, $area->totalAreaSqm);
    }

    public function test_rotasi_tidak_mengubah_luas(): void
    {
        $datar = RoofGeometry::areaFromRect(self::RECT, 0.5, 0.5, 0.6);
        $miring = RoofGeometry::areaFromRect(
            array_merge(self::RECT, ['rotation_deg' => 30.0]),
            0.5,
            0.5,
            0.6,
        );
        $tegak = RoofGeometry::areaFromRect(
            array_merge(self::RECT, ['rotation_deg' => 90.0]),
            0.5,
            0.5,
            0.6,
        );

        $this->assertSame($datar->totalAreaSqm, $miring->totalAreaSqm);
        $this->assertSame($datar->totalAreaSqm, $tegak->totalAreaSqm);
        $this->assertSame($datar->effectiveAreaSqm, $miring->effectiveAreaSqm);
        $this->assertSame(25.0, $tegak->roofWidthM, 'Rotasi tidak menukar sisi persegi.');
        $this->assertSame(50.0, $tegak->roofLengthM);
    }

    public function test_sudut_persegi_tanpa_rotasi_berada_di_tempat_yang_benar(): void
    {
        $corners = RoofGeometry::corners(self::RECT);

        $this->assertCount(5, $corners, 'Ring harus tertutup.');
        $this->assertSame([100.0, 100.0], $corners[0]);
        $this->assertSame([200.0, 100.0], $corners[1]);
        $this->assertSame([200.0, 150.0], $corners[2]);
        $this->assertSame([100.0, 150.0], $corners[3]);
        $this->assertSame($corners[0], $corners[4], 'Titik terakhir harus sama dengan titik pertama.');
    }

    public function test_rotasi_memutar_persegi_terhadap_pusatnya(): void
    {
        // Persegi 100x50 berpusat di (150, 125). Diputar 90 derajat, sisi 100 menjadi tegak.
        $corners = RoofGeometry::corners(array_merge(self::RECT, ['rotation_deg' => 90.0]));

        $xs = array_column($corners, 0);
        $ys = array_column($corners, 1);

        $this->assertEqualsWithDelta(125.0, min($xs), 1e-6);
        $this->assertEqualsWithDelta(175.0, max($xs), 1e-6);
        $this->assertEqualsWithDelta(75.0, min($ys), 1e-6);
        $this->assertEqualsWithDelta(175.0, max($ys), 1e-6);
    }

    public function test_poligon_geografis_berada_di_dalam_bbox_dan_tertutup(): void
    {
        $bbox = [106.7993, -6.5907, 106.8007, -6.5893];

        $ring = RoofGeometry::polygonLngLat(self::RECT, $bbox, 512, 512);

        $this->assertCount(5, $ring);
        $this->assertSame($ring[0], $ring[4]);

        foreach ($ring as [$lng, $lat]) {
            $this->assertGreaterThanOrEqual($bbox[0], $lng);
            $this->assertLessThanOrEqual($bbox[2], $lng);
            $this->assertGreaterThanOrEqual($bbox[1], $lat);
            $this->assertLessThanOrEqual($bbox[3], $lat);
        }
    }
}
