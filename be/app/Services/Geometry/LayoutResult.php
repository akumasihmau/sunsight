<?php

namespace App\Services\Geometry;

/**
 * Hasil penataan modul di dalam area efektif.
 */
final readonly class LayoutResult
{
    public function __construct(
        public int $maxSlots,
        public int $installed,
        public int $rows,
        public int $columns,
        public float $moduleAreaSqm,
        public float $densityRatio,
    ) {}
}
