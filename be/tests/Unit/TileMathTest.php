<?php

namespace Tests\Unit;

use App\Services\Imagery\TileImageryProvider;
use PHPUnit\Framework\TestCase;

/**
 * Matematika ubin Web Mercator. Bagian ini murni sehingga dapat diuji tanpa
 * jaringan, dan justru di sinilah kesalahan paling mahal bila salah: indeks ubin
 * yang keliru menghasilkan citra dari lokasi yang sama sekali berbeda.
 */
class TileMathTest extends TestCase
{
    public function test_indeks_ubin_jakarta_pada_zoom_19(): void
    {
        // x = (106.80 + 180) / 360 * 2^19                       = 417682.67 -> 417682
        // y = (1 - ln(tan(-6.59) + sec(-6.59)) / pi) / 2 * 2^19 = 271762.3  -> 271762
        [$x, $y] = TileImageryProvider::tileFor(-6.59, 106.80, 19);

        $this->assertSame(417682, $x);
        $this->assertSame(271762, $y);
    }

    public function test_titik_nol_derajat_pada_zoom_2(): void
    {
        [$x, $y] = TileImageryProvider::tileFor(0.0, 0.0, 2);

        $this->assertSame(2, $x);
        $this->assertSame(2, $y);
    }

    public function test_bujur_negatif_berada_di_belahan_kiri(): void
    {
        [$xBarat] = TileImageryProvider::tileFor(0.0, -90.0, 4);
        [$xTimur] = TileImageryProvider::tileFor(0.0, 90.0, 4);

        $this->assertLessThan($xTimur, $xBarat);
    }

    public function test_indeks_ubin_makin_besar_ke_arah_selatan(): void
    {
        [, $yUtara] = TileImageryProvider::tileFor(10.0, 0.0, 6);
        [, $ySelatan] = TileImageryProvider::tileFor(-10.0, 0.0, 6);

        $this->assertLessThan($ySelatan, $yUtara, 'Lintang selatan harus menghasilkan indeks y yang lebih besar.');
    }

    public function test_indeks_ubin_selalu_berada_dalam_batas_termasuk_di_dekat_kutub(): void
    {
        foreach ([1, 6, 19] as $zoom) {
            $batas = (2 ** $zoom) - 1;

            foreach ([[89.9, 0.0], [-89.9, 0.0], [0.0, 179.9], [0.0, -179.9]] as [$lat, $lng]) {
                [$x, $y] = TileImageryProvider::tileFor($lat, $lng, $zoom);

                $this->assertGreaterThanOrEqual(0, $x, "x keluar batas pada zoom {$zoom}.");
                $this->assertLessThanOrEqual($batas, $x, "x keluar batas pada zoom {$zoom}.");
                $this->assertGreaterThanOrEqual(0, $y, "y keluar batas pada zoom {$zoom}.");
                $this->assertLessThanOrEqual($batas, $y, "y keluar batas pada zoom {$zoom}.");
            }
        }
    }
}
