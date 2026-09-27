<?php

namespace App\Support;

final class Polygon
{
    /**
     * Menghitung titik yang benar-benar berbeda.
     *
     * Dipakai untuk menegakkan syarat minimal tiga titik unik pada kontrak API,
     * karena aturan validasi bawaan hanya dapat menghitung jumlah elemen.
     *
     * @param  array<int, mixed>  $points
     */
    public static function uniquePointCount(array $points): int
    {
        $unique = [];

        foreach ($points as $point) {
            if (! is_array($point) || count($point) !== 2) {
                continue;
            }

            $unique[sprintf('%.6F,%.6F', (float) $point[0], (float) $point[1])] = true;
        }

        return count($unique);
    }
}
