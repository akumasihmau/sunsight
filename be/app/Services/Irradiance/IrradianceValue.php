<?php

namespace App\Services\Irradiance;

/**
 * Iradiasi harian beserta asal dan periodenya.
 *
 * Asal dan periode dibawa bersama nilainya karena keduanya wajib ikut tersimpan
 * pada setiap analisis: angka energi tanpa keterangan sumber tidak dapat
 * dipertanggungjawabkan.
 */
final readonly class IrradianceValue
{
    public function __construct(
        public float $dailyGhiKwhPerSqm,
        public string $source,
        public string $period,
    ) {}
}
