<?php

namespace Tests\Unit;

use App\Services\Geometry\PolygonGeometry;
use App\Services\RoofGeometry;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class RoofGeometryTest extends TestCase
{
    /** Persegi 60 x 40 piksel, yaitu 30 x 20 meter pada 0,5 m/px. */
    private const SQUARE = [[150, 150], [210, 150], [210, 190], [150, 190]];

    /** Tangkapan 512 x 512 piksel yang skalanya tepat 0,5 m/px. */
    private const BBOX = [106.8000000, -6.6023152, 106.8023151, -6.6000000];

    public function test_luas_dan_persegi_pembatas_diturunkan_dari_poligon(): void
    {
        $area = RoofGeometry::areaFromPolygon(self::SQUARE, 0.5, 0.5);

        $this->assertEqualsWithDelta(600.0, $area->totalAreaSqm, 0.01);
        $this->assertEqualsWithDelta(29.0, $area->roofLengthM, 0.01);
        $this->assertEqualsWithDelta(19.0, $area->roofWidthM, 0.01);
        $this->assertEqualsWithDelta(551.0, $area->effectiveAreaSqm, 0.01);
        $this->assertSame(0.0, $area->rotationDeg);
        $this->assertTrue($area->hasEffectivePolygon());
    }

    public function test_luas_sebanding_dengan_kuadrat_skala(): void
    {
        $kecil = RoofGeometry::areaFromPolygon(self::SQUARE, 0.5, 0.0);
        $besar = RoofGeometry::areaFromPolygon(self::SQUARE, 1.0, 0.0);

        $this->assertEqualsWithDelta(4.0, $besar->totalAreaSqm / $kecil->totalAreaSqm, 1e-9);
    }

    public function test_skala_nol_atau_negatif_ditolak(): void
    {
        $this->expectException(InvalidArgumentException::class);

        RoofGeometry::areaFromPolygon(self::SQUARE, 0.0, 0.5);
    }

    public function test_poligon_yang_tidak_membentuk_bidang_menghasilkan_nol(): void
    {
        // Dua titik, dan tiga titik yang berimpit: keduanya tidak membentuk bidang,
        // tetapi tetap masukan yang sah sehingga tidak boleh menggagalkan permintaan.
        foreach ([[[150, 150], [210, 150]], [[150, 150], [150, 150], [150, 150]]] as $ring) {
            $area = RoofGeometry::areaFromPolygon($ring, 0.5, 0.5);

            $this->assertSame(0.0, $area->totalAreaSqm);
            $this->assertSame(0.0, $area->effectiveAreaSqm);
            $this->assertSame(0.0, $area->roofLengthM);
            $this->assertSame([], $area->effectivePolygonPx);
            $this->assertNull($area->maskFrame());
        }
    }

    public function test_setback_yang_menghabiskan_bidang_menghasilkan_nol_bukan_negatif(): void
    {
        // Bidang 40 x 4 piksel: setback 5 meter (10 piksel) melebihi tingginya.
        $area = RoofGeometry::areaFromPolygon([[150, 150], [190, 150], [190, 154], [150, 154]], 0.5, 5.0);

        $this->assertSame(0.0, $area->effectiveAreaSqm);
        $this->assertEqualsWithDelta(40.0, $area->totalAreaSqm, 0.01);
        $this->assertSame(0.0, $area->roofLengthM);
        $this->assertSame([], $area->effectivePolygonPx);
        $this->assertNull($area->maskFrame());
    }

    public function test_luas_efektif_tidak_pernah_melebihi_luas_total(): void
    {
        foreach ([0.0, 0.5, 2.0] as $setback) {
            $area = RoofGeometry::areaFromPolygon(self::SQUARE, 0.5, $setback);

            $this->assertGreaterThanOrEqual(0.0, $area->effectiveAreaSqm);
            $this->assertLessThanOrEqual($area->totalAreaSqm, $area->effectiveAreaSqm);
        }
    }

    public function test_persegi_pembatas_mengikuti_arah_bidang_yang_diputar(): void
    {
        // Persegi panjang 60 x 20 piksel yang dimiringkan 20 derajat.
        $angle = deg2rad(20.0);
        $cos = cos($angle);
        $sin = sin($angle);
        $ring = [];

        foreach ([[-30, -10], [30, -10], [30, 10], [-30, 10]] as [$dx, $dy]) {
            $ring[] = [256.0 + $dx * $cos - $dy * $sin, 256.0 + $dx * $sin + $dy * $cos];
        }

        $area = RoofGeometry::areaFromPolygon($ring, 1.0, 0.0);

        $this->assertEqualsWithDelta(60.0, $area->roofLengthM, 1e-3);
        $this->assertEqualsWithDelta(20.0, $area->roofWidthM, 1e-3);
        $this->assertEqualsWithDelta(20.0, $area->rotationDeg, 1e-3);
    }

    public function test_poligon_geografis_berada_di_dalam_bbox_dan_tertutup(): void
    {
        $ring = RoofGeometry::ringLngLat(self::SQUARE, self::BBOX, 512, 512);

        $this->assertCount(5, $ring);
        $this->assertSame($ring[0], $ring[4]);
        $this->assertTrue(PolygonGeometry::isClosedRing($ring));

        foreach ($ring as [$lng, $lat]) {
            $this->assertGreaterThanOrEqual(self::BBOX[0], $lng);
            $this->assertLessThanOrEqual(self::BBOX[2], $lng);
            $this->assertGreaterThanOrEqual(self::BBOX[1], $lat);
            $this->assertLessThanOrEqual(self::BBOX[3], $lat);
        }
    }

    public function test_sudut_kiri_atas_piksel_menjadi_pojok_barat_laut(): void
    {
        [$lng, $lat] = RoofGeometry::ringLngLat([[0, 0]], self::BBOX, 512, 512)[0];

        $this->assertEqualsWithDelta(self::BBOX[0], $lng, 1e-9);
        $this->assertEqualsWithDelta(self::BBOX[3], $lat, 1e-9);
    }
}
