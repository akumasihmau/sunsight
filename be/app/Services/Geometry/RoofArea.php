<?php

namespace App\Services\Geometry;

/**
 * Hasil penurunan luas dari persegi bidang atap.
 *
 * `roofLengthM` adalah sisi yang sejajar bubungan dan `roofWidthM` sisi kemiringan,
 * mengikuti penamaan pada antarmuka.
 */
final readonly class RoofArea
{
    public function __construct(
        public float $roofLengthM,
        public float $roofWidthM,
        public float $totalAreaSqm,
        public float $effectiveLengthM,
        public float $effectiveWidthM,
        public float $effectiveAreaSqm,
    ) {}
}
