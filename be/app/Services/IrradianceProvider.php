<?php

namespace App\Services;

use App\Services\Irradiance\IrradianceValue;

interface IrradianceProvider
{
    /**
     * Iradiasi harian rata-rata di bidang horizontal, dalam kWh/m2/hari.
     */
    public function dailyGhi(float $lat, float $lng): IrradianceValue;
}
