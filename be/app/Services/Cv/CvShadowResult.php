<?php

namespace App\Services\Cv;

/**
 * Hasil deteksi bayangan. Selalu berlaku usable + shadow = total, karena kedua
 * nilai dihitung dari piksel yang sama di dalam poligon presisi.
 */
final readonly class CvShadowResult
{
    public function __construct(
        public float $usableAreaSqm,
        public float $shadowAreaSqm,
        public string $maskPng,
    ) {}

    public function totalAreaSqm(): float
    {
        return $this->usableAreaSqm + $this->shadowAreaSqm;
    }
}
