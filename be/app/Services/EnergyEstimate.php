<?php

namespace App\Services;

/**
 * Hasil kalkulasi energi beserta seluruh asumsi yang dipakainya.
 *
 * Asumsi dibawa keluar bersama angkanya supaya dapat dikembalikan ke klien,
 * disimpan ke basis data, dan dikutip di laporan tanpa perlu membaca konfigurasi
 * yang mungkin sudah berubah.
 */
final readonly class EnergyEstimate
{
    /**
     * @param  array<string, mixed>  $assumptions
     */
    public function __construct(
        public float $estimatedEnergyKwhPerDay,
        public float $dailyGhiKwhPerSqm,
        public float $roofOrientationDeg,
        public float $recommendedAzimuthDeg,
        public array $assumptions,
    ) {}
}
