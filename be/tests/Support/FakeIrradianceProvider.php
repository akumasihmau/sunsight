<?php

namespace Tests\Support;

use App\Services\Irradiance\IrradianceValue;
use App\Services\IrradianceProvider;

/**
 * Pengganti sumber iradiasi sehingga kalkulasi dapat diuji tanpa jaringan.
 */
class FakeIrradianceProvider implements IrradianceProvider
{
    public int $calls = 0;

    public function __construct(
        private readonly float $dailyGhi = 5.2,
        private readonly string $source = 'NASA POWER',
        private readonly string $period = 'klimatologi tahunan',
    ) {}

    public function dailyGhi(float $lat, float $lng): IrradianceValue
    {
        $this->calls++;

        return new IrradianceValue($this->dailyGhi, $this->source, $this->period);
    }
}
