<?php

namespace App\Services\Finance;

/**
 * Hasil finansial dan lingkungan satu simulasi.
 */
final readonly class FinanceResult
{
    public function __construct(
        public CostBreakdown $capex,
        public int $monthlySavingIdr,
        public int $annualSavingIdr,
        public ?float $paybackYears,
        public string $tariffKey,
        public string $tariffLabel,
        public float $tariffIdrPerKwh,
        public int $monthlyBillIdr,
        public float $co2ReductionKgPerYear,
        public int $treesEquivalent,
    ) {}
}
