<?php

namespace App\Services\Finance;

/**
 * Rincian belanja modal, dalam rupiah.
 */
final readonly class CostBreakdown
{
    public function __construct(
        public int $modulesIdr,
        public int $inverterIdr,
        public int $rackingIdr,
        public int $installationIdr,
    ) {}

    public function totalIdr(): int
    {
        return $this->modulesIdr + $this->inverterIdr + $this->rackingIdr + $this->installationIdr;
    }

    /**
     * @return array<string, int>
     */
    public function toArray(): array
    {
        return [
            'modules_idr' => $this->modulesIdr,
            'inverter_idr' => $this->inverterIdr,
            'racking_idr' => $this->rackingIdr,
            'installation_idr' => $this->installationIdr,
        ];
    }
}
