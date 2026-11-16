<?php

namespace Tests\Unit;

use App\Services\Geometry\PolygonGeometry;
use PHPUnit\Framework\TestCase;

class PolygonGeometryTest extends TestCase
{
    /** Persegi 100 x 60 piksel, titik sudut berlawanan jarum jam pada layar. */
    private const RECTANGLE = [[10, 20], [110, 20], [110, 80], [10, 80]];

    /** Bentuk L: 100 x 40 di atas ditambah 40 x 60 di kiri bawah. */
    private const L_SHAPE = [[0, 0], [100, 0], [100, 40], [40, 40], [40, 100], [0, 100]];

    public function test_luas_persegi_yang_diketahui(): void
    {
        $this->assertEqualsWithDelta(6000.0, PolygonGeometry::area(self::RECTANGLE), 1e-9);
    }

    public function test_luas_tidak_bergantung_pada_arah_putaran_maupun_titik_penutup(): void
    {
        $terbalik = array_reverse(self::RECTANGLE);

        $this->assertEqualsWithDelta(
            PolygonGeometry::area(self::RECTANGLE),
            PolygonGeometry::area($terbalik),
            1e-9,
        );

        $this->assertEqualsWithDelta(
            PolygonGeometry::area(self::RECTANGLE),
            PolygonGeometry::area(PolygonGeometry::closeRing(self::RECTANGLE)),
            1e-9,
        );
    }

    public function test_luas_ring_yang_bukan_poligon_adalah_nol(): void
    {
        $this->assertSame(0.0, PolygonGeometry::area([[0, 0], [10, 0]]));
        $this->assertSame(0.0, PolygonGeometry::area([]));
    }

    public function test_titik_berat_persegi_ada_di_tengahnya(): void
    {
        [$x, $y] = PolygonGeometry::centroid(self::RECTANGLE);

        $this->assertEqualsWithDelta(60.0, $x, 1e-9);
        $this->assertEqualsWithDelta(50.0, $y, 1e-9);
    }

    public function test_titik_berat_ring_tanpa_luas_memakai_rata_rata_titiknya(): void
    {
        [$x, $y] = PolygonGeometry::centroid([[0, 0], [10, 0], [20, 0]]);

        $this->assertEqualsWithDelta(10.0, $x, 1e-9);
        $this->assertEqualsWithDelta(0.0, $y, 1e-9);
    }

    public function test_titik_di_dalam_di_luar_dan_tepat_pada_tepi(): void
    {
        $this->assertTrue(PolygonGeometry::pointInPolygon(self::RECTANGLE, [60, 50]));
        $this->assertTrue(PolygonGeometry::pointInPolygon(self::RECTANGLE, [10, 20]));
        $this->assertTrue(PolygonGeometry::pointInPolygon(self::RECTANGLE, [10, 50]));

        $this->assertFalse(PolygonGeometry::pointInPolygon(self::RECTANGLE, [0, 0]));
        $this->assertFalse(PolygonGeometry::pointInPolygon(self::RECTANGLE, [110.5, 50]));
        $this->assertFalse(PolygonGeometry::pointInPolygon(self::RECTANGLE, [60, 80.5]));

        // Cekungan bentuk L: titik di dalam kotak pembatasnya, tetapi di luar bidang.
        $this->assertFalse(PolygonGeometry::pointInPolygon(self::L_SHAPE, [80, 80]));
        $this->assertTrue(PolygonGeometry::pointInPolygon(self::L_SHAPE, [20, 80]));
    }

    public function test_inset_menggeser_setiap_sisi_ke_dalam(): void
    {
        $hasil = PolygonGeometry::inset(self::RECTANGLE, 5.0);

        $this->assertCount(5, $hasil, 'Ring hasil harus tertutup.');
        $this->assertEqualsWithDelta(4500.0, PolygonGeometry::area($hasil), 1e-9);

        $this->assertEqualsWithDelta(15.0, $hasil[0][0], 1e-6);
        $this->assertEqualsWithDelta(25.0, $hasil[0][1], 1e-6);
        $this->assertEqualsWithDelta(105.0, $hasil[1][0], 1e-6);
        $this->assertEqualsWithDelta(25.0, $hasil[1][1], 1e-6);
        $this->assertEqualsWithDelta(105.0, $hasil[2][0], 1e-6);
        $this->assertEqualsWithDelta(75.0, $hasil[2][1], 1e-6);
        $this->assertEqualsWithDelta(15.0, $hasil[3][0], 1e-6);
        $this->assertEqualsWithDelta(75.0, $hasil[3][1], 1e-6);
        $this->assertSame($hasil[0], $hasil[4]);
    }

    public function test_inset_tanpa_jarak_mengembalikan_ring_apa_adanya(): void
    {
        $hasil = PolygonGeometry::inset(self::RECTANGLE, 0.0);

        $this->assertEqualsWithDelta(6000.0, PolygonGeometry::area($hasil), 1e-9);
    }

    public function test_inset_yang_menghabiskan_bidang_dikembalikan_kosong(): void
    {
        // Tinggi bidang 60 dan setback 40 dari tiap sisi: sisi atas dan bawah melewati
        // satu sama lain, sehingga hasilnya bukan bidang lagi.
        $this->assertSame([], PolygonGeometry::inset(self::RECTANGLE, 40.0));
    }

    public function test_inset_bidang_cekung_tetap_berada_di_dalam_bidang_asal(): void
    {
        $hasil = PolygonGeometry::inset(self::L_SHAPE, 5.0);

        $this->assertNotSame([], $hasil);
        // 90 x 30 ditambah 30 x 60.
        $this->assertEqualsWithDelta(4500.0, PolygonGeometry::area($hasil), 1e-9);

        foreach (PolygonGeometry::openRing($hasil) as $titik) {
            $this->assertTrue(
                PolygonGeometry::pointInPolygon(self::L_SHAPE, $titik),
                'Titik hasil inset harus berada di dalam bidang asal.',
            );
        }
    }

    public function test_persegi_pembatas_minimum_untuk_persegi_sejajar_sumbu(): void
    {
        $kotak = PolygonGeometry::minAreaRectangle(self::RECTANGLE);

        $this->assertEqualsWithDelta(100.0, $kotak['length'], 1e-6);
        $this->assertEqualsWithDelta(60.0, $kotak['width'], 1e-6);
        $this->assertEqualsWithDelta(0.0, $kotak['rotation_deg'], 1e-6);
        $this->assertEqualsWithDelta(60.0, $kotak['center'][0], 1e-6);
        $this->assertEqualsWithDelta(50.0, $kotak['center'][1], 1e-6);
    }

    public function test_persegi_pembatas_minimum_memakai_skala_untuk_satuannya(): void
    {
        $kotak = PolygonGeometry::minAreaRectangle(self::RECTANGLE, 2.0);

        $this->assertEqualsWithDelta(200.0, $kotak['length_m'], 1e-6);
        $this->assertEqualsWithDelta(120.0, $kotak['width_m'], 1e-6);
        // Pusat tetap dalam satuan ring.
        $this->assertEqualsWithDelta(60.0, $kotak['center'][0], 1e-6);
    }

    public function test_persegi_pembatas_minimum_untuk_persegi_yang_diputar(): void
    {
        $kotak = PolygonGeometry::minAreaRectangle(self::rotatedRectangle(30.0), 1.0);

        $this->assertEqualsWithDelta(100.0, $kotak['length'], 1e-3);
        $this->assertEqualsWithDelta(60.0, $kotak['width'], 1e-3);
        $this->assertEqualsWithDelta(30.0, $kotak['rotation_deg'], 1e-3);
        $this->assertEqualsWithDelta(200.0, $kotak['center'][0], 1e-3);
        $this->assertEqualsWithDelta(150.0, $kotak['center'][1], 1e-3);
    }

    public function test_persegi_pembatas_minimum_untuk_ring_segaris(): void
    {
        $kotak = PolygonGeometry::minAreaRectangle([[0, 0], [10, 0], [20, 0]]);

        $this->assertEqualsWithDelta(20.0, $kotak['length'], 1e-9);
        $this->assertSame(0.0, $kotak['width']);
        $this->assertSame(0.0, $kotak['rotation_deg']);
        $this->assertEqualsWithDelta(10.0, $kotak['center'][0], 1e-9);
    }

    public function test_penyederhanaan_membuang_titik_yang_segaris(): void
    {
        $ring = self::noisyRectangle(0.0, 100);

        $this->assertCount(400, $ring);

        $hasil = PolygonGeometry::simplify($ring, 0.5);

        $this->assertGreaterThanOrEqual(4, count($hasil));
        $this->assertCount(4, PolygonGeometry::openRing($hasil), 'Hanya empat titik sudut yang tersisa.');
        $this->assertEqualsWithDelta(160000.0, PolygonGeometry::area($hasil), 1e-6);
    }

    public function test_penyederhanaan_menjaga_luas_pada_data_yang_berisik(): void
    {
        $ring = self::noisyRectangle(0.3, 100);
        $luasAwal = PolygonGeometry::area($ring);

        $hasil = PolygonGeometry::simplify($ring, 0.5);

        $galat = abs(PolygonGeometry::area($hasil) - $luasAwal) / $luasAwal;

        $this->assertLessThan(0.005, $galat, 'Galat luas harus di bawah 0,5%.');
    }

    public function test_penyederhanaan_tidak_pernah_menyisakan_kurang_dari_empat_titik(): void
    {
        $tipis = [[0, 0], [10, 0.01], [20, -0.02], [30, 0.01], [40, 0]];

        $hasil = PolygonGeometry::simplify($tipis, 0.5);

        $this->assertGreaterThanOrEqual(4, count($hasil));
        $this->assertGreaterThanOrEqual(3, count(PolygonGeometry::openRing($hasil)));

        // Toleransi nol berarti tidak ada yang disederhanakan.
        $utuh = PolygonGeometry::simplify($tipis, 0.0);

        $this->assertEqualsWithDelta(PolygonGeometry::area($tipis), PolygonGeometry::area($utuh), 1e-9);
    }

    public function test_ring_dapat_ditutup_dan_dibuka_kembali(): void
    {
        $this->assertTrue(PolygonGeometry::isClosedRing(PolygonGeometry::closeRing(self::RECTANGLE)));
        $this->assertFalse(PolygonGeometry::isClosedRing(self::RECTANGLE));
        $this->assertEquals(self::RECTANGLE, PolygonGeometry::openRing(PolygonGeometry::closeRing(self::RECTANGLE)));
    }

    public function test_poligon_menyilang_dirapikan_menjadi_ring_sederhana(): void
    {
        // Bowtie: dua segitiga yang saling menyilang. Kontur mask model memang dapat
        // berbentuk seperti ini, dan PostGIS menolaknya sebagai ring tidak sah.
        $bowtie = [[0, 0], [100, 100], [100, 0], [0, 100]];

        $hasil = PolygonGeometry::makeSimple($bowtie);

        $this->assertGreaterThanOrEqual(4, count($hasil), 'Ring tertutup minimal tiga titik sudut.');
        $this->assertTrue(PolygonGeometry::isClosedRing($hasil));
        $this->assertSame(0, self::crossings($hasil));
        $this->assertGreaterThan(0.0, PolygonGeometry::area($hasil));
    }

    public function test_titik_yang_terulang_pada_ring_dirapikan(): void
    {
        // Ring yang menyentuh dirinya sendiri di satu titik; bagi PostGIS itu tetap
        // pelanggaran, walaupun luasnya tidak terpengaruh.
        $pinched = [[0, 0], [100, 0], [100, 100], [50, 50], [0, 100], [50, 50]];

        $hasil = PolygonGeometry::makeSimple($pinched);

        $this->assertSame(0, self::crossings($hasil));
        $this->assertGreaterThan(0.0, PolygonGeometry::area($hasil));
    }

    public function test_ring_yang_sudah_sederhana_tidak_berubah(): void
    {
        $hasil = PolygonGeometry::makeSimple(self::RECTANGLE);

        $this->assertEqualsWithDelta(6000.0, PolygonGeometry::area($hasil), 1e-9);
        $this->assertSame(0, self::crossings($hasil));
    }

    public function test_poligon_yang_tidak_dapat_diselamatkan_menjadi_kosong(): void
    {
        $this->assertSame([], PolygonGeometry::makeSimple([[0, 0], [0, 0], [0, 0]]));
        $this->assertSame([], PolygonGeometry::makeSimple([]));
        $this->assertSame([], PolygonGeometry::makeSimple([[0, 0], [1, 1]]));
    }

    public function test_bidang_nyata_dari_mask_menjadi_ring_sederhana(): void
    {
        foreach (self::realRings() as $index => $ring) {
            $simple = PolygonGeometry::makeSimple($ring);

            $this->assertNotSame([], $simple, "Ring {$index} harus dapat dirapikan.");
            $this->assertTrue(PolygonGeometry::isClosedRing($simple), "Ring {$index} harus tertutup.");
            $this->assertSame(0, self::crossings($simple), "Ring {$index} harus sederhana.");
            $this->assertGreaterThan(0.0, PolygonGeometry::area($simple));

            // Perapian bersifat idempoten: ring yang sudah rapi tidak berubah lagi.
            $ulang = PolygonGeometry::makeSimple($simple);

            $this->assertEqualsWithDelta(
                PolygonGeometry::area($simple),
                PolygonGeometry::area($ulang),
                1e-6,
                "Ring {$index} harus stabil setelah dirapikan sekali.",
            );
        }
    }

    public function test_erosi_bidang_nyata_mengecil_secara_monoton(): void
    {
        // Skala tangkapan tempat kesepuluh ring diambil.
        $metersPerPixel = 0.2946;

        foreach (self::realRings() as $index => $ring) {
            $simple = PolygonGeometry::makeSimple($ring);
            $total = PolygonGeometry::area($simple);

            $satuMeter = self::insetArea($simple, 1.0 / $metersPerPixel);
            $setengahMeter = self::insetArea($simple, 0.5 / $metersPerPixel);
            $duaPuluhSentimeter = self::insetArea($simple, 0.2 / $metersPerPixel);

            $this->assertGreaterThan(0.0, $satuMeter, "Ring {$index}: setback 1,0 m masih harus menyisakan bidang.");
            $this->assertLessThan($setengahMeter, $satuMeter, "Ring {$index}: setback lebih besar harus menyisakan luas lebih kecil.");
            $this->assertLessThan($duaPuluhSentimeter, $setengahMeter, "Ring {$index}: setback harus monoton.");
            $this->assertLessThan($total, $duaPuluhSentimeter, "Ring {$index}: luas efektif tidak boleh melampaui luas bidang.");
        }
    }

    public function test_min_area_rectangle_corners_mengembalikan_empat_sudut_presisi(): void
    {
        $rotated = self::rotatedRectangle(32.0);
        $corners = PolygonGeometry::minAreaRectangleCorners($rotated);

        $this->assertCount(4, $corners);
        $this->assertEqualsWithDelta(PolygonGeometry::area($rotated), PolygonGeometry::area($corners), 1.0);
    }

    public function test_regularize_merapikan_mask_blobby_dan_membuang_kontur_memanjang(): void
    {
        // Mask blobby: persegi 100 x 80 dengan gangguan tepi +-4 px dan 12 titik per sisi.
        $blobby = [];
        $corners = [[50.0, 50.0], [150.0, 50.0], [150.0, 130.0], [50.0, 130.0]];

        foreach ($corners as $index => $corner) {
            $next = $corners[($index + 1) % 4];
            $len = sqrt(($next[0] - $corner[0]) ** 2 + ($next[1] - $corner[1]) ** 2);
            $nx = -($next[1] - $corner[1]) / $len;
            $ny = ($next[0] - $corner[0]) / $len;

            for ($step = 0; $step < 12; $step++) {
                $t = $step / 12;
                $offset = 4.0 * sin($t * M_PI);
                $blobby[] = [
                    $corner[0] + ($next[0] - $corner[0]) * $t + $nx * $offset,
                    $corner[1] + ($next[1] - $corner[1]) * $t + $ny * $offset,
                ];
            }
        }

        $regularized = PolygonGeometry::regularize($blobby, 1.8, 0.80, 5.0);

        $this->assertCount(5, $regularized, 'Persegi blobby harus dirapikan menjadi 4 sudut siku (ring tertutup 5 titik).');
        $this->assertTrue(PolygonGeometry::isClosedRing($regularized));
        $this->assertSame(0, self::crossings($regularized));

        // Bentuk L tetap dipertahankan (tidak dipaksa menjadi kotak penuh).
        $lRegularized = PolygonGeometry::regularize(self::L_SHAPE, 1.8, 0.80, 5.0);
        $this->assertCount(6, PolygonGeometry::openRing($lRegularized));
        $this->assertEqualsWithDelta(PolygonGeometry::area(self::L_SHAPE), PolygonGeometry::area($lRegularized), 1.0);

        // Kontur memanjang seperti jalan (rasio aspek 30:1 > 5.0) disaring.
        $roadLike = [[0.0, 0.0], [300.0, 0.0], [300.0, 10.0], [0.0, 10.0]];
        $this->assertSame([], PolygonGeometry::regularize($roadLike, 1.8, 0.80, 5.0));
    }

    /**
     * Kesepuluh ring mask sungguhan, disimpan sebagai fixture supaya perilakunya
     * dapat diuji ulang tanpa memanggil layanan model.
     *
     * @return array<int, array<int, array{0: float, 1: float}>>
     */
    private static function realRings(): array
    {
        $path = dirname(__DIR__).'/fixtures/roof-mask-rings.json';

        /** @var array{rings: array<int, array<int, array{0: float, 1: float}>>} $data */
        $data = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);

        return $data['rings'];
    }

    private static function insetArea(array $ring, float $distance): float
    {
        $inset = PolygonGeometry::inset($ring, $distance);

        return $inset === [] ? 0.0 : PolygonGeometry::area($inset);
    }

    /**
     * Jumlah pasangan sisi tak bersebelahan yang benar-benar bersilangan.
     *
     * Ditulis ulang di sini dengan sengaja: uji ini harus gagal bila perbaikan di
     * kelasnya salah, jadi tidak boleh memakai pemeriksa yang sama.
     *
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     */
    private static function crossings(array $ring): int
    {
        $points = array_values($ring);

        if (count($points) > 3 && self::samePointTest($points[0], $points[count($points) - 1])) {
            array_pop($points);
        }

        $count = count($points);
        $crossings = 0;

        $cross = static fn (array $a, array $b, array $p): float => ($b[0] - $a[0]) * ($p[1] - $a[1]) - ($b[1] - $a[1]) * ($p[0] - $a[0]);

        for ($i = 0; $i < $count; $i++) {
            $next = ($i + 1) % $count;

            for ($j = $i + 1; $j < $count; $j++) {
                $nextOther = ($j + 1) % $count;

                if ($j === $next || $nextOther === $i) {
                    continue;
                }

                $d1 = $cross($points[$j], $points[$nextOther], $points[$i]);
                $d2 = $cross($points[$j], $points[$nextOther], $points[$next]);
                $d3 = $cross($points[$i], $points[$next], $points[$j]);
                $d4 = $cross($points[$i], $points[$next], $points[$nextOther]);

                $straddlesFirst = ($d1 > 0 && $d2 < 0) || ($d1 < 0 && $d2 > 0);
                $straddlesSecond = ($d3 > 0 && $d4 < 0) || ($d3 < 0 && $d4 > 0);

                if ($straddlesFirst && $straddlesSecond) {
                    $crossings++;
                }
            }
        }

        return $crossings;
    }

    /**
     * @param  array{0: float|int, 1: float|int}  $a
     * @param  array{0: float|int, 1: float|int}  $b
     */
    private static function samePointTest(array $a, array $b): bool
    {
        return abs($a[0] - $b[0]) <= 1e-7 && abs($a[1] - $b[1]) <= 1e-7;
    }

    /**
     * Persegi 100 x 60 piksel yang diputar terhadap pusat (200, 150).
     *
     * @return array<int, array{0: float, 1: float}>
     */
    private static function rotatedRectangle(float $degrees): array
    {
        $angle = deg2rad($degrees);
        $cos = cos($angle);
        $sin = sin($angle);
        $ring = [];

        foreach ([[-50, -30], [50, -30], [50, 30], [-50, 30]] as [$dx, $dy]) {
            $ring[] = [
                200.0 + $dx * $cos - $dy * $sin,
                150.0 + $dx * $sin + $dy * $cos,
            ];
        }

        return $ring;
    }

    /**
     * Persegi 400 x 400 yang tiap sisinya diisi titik interpolasi, dengan gangguan
     * tegak lurus sebesar amplitudo tertentu.
     *
     * @return array<int, array{0: float, 1: float}>
     */
    private static function noisyRectangle(float $amplitude, int $perSide): array
    {
        $corners = [[0.0, 0.0], [400.0, 0.0], [400.0, 400.0], [0.0, 400.0]];
        $ring = [];

        foreach ($corners as $index => $corner) {
            $next = $corners[($index + 1) % 4];
            $length = sqrt(($next[0] - $corner[0]) ** 2 + ($next[1] - $corner[1]) ** 2);

            // Normal tegak lurus sisi, dipakai untuk menggeser titik ke luar atau ke dalam.
            $normalX = -($next[1] - $corner[1]) / $length;
            $normalY = ($next[0] - $corner[0]) / $length;

            for ($step = 0; $step < $perSide; $step++) {
                $t = $step / $perSide;
                $offset = $amplitude * sin($t * 2 * M_PI);

                $ring[] = [
                    $corner[0] + ($next[0] - $corner[0]) * $t + $normalX * $offset,
                    $corner[1] + ($next[1] - $corner[1]) * $t + $normalY * $offset,
                ];
            }
        }

        return $ring;
    }
}
