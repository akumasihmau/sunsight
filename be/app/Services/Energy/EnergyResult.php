<?php

namespace App\Services\Energy;

/**
 * Hasil perhitungan energi, beserta asumsi yang dipakai.
 */
final readonly class EnergyResult
{
    public function __construct(
        public float $capacityKwp,
        public float $annualProductionKwh,
        public float $dailyIrradianceKwhPerSqm,
        public float $incidenceFactor,
        public float $performanceRatio,
        public string $irradianceSource,
        public string $irradiancePeriod,
    ) {}
}
