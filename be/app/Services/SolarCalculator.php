<?php

namespace App\Services;

/**
 * Kalkulasi energi harian dari luas area terpakai.
 *
 * Seluruh konstanta berasal dari config/solar.php dan dibawa keluar pada blok
 * asumsi, sehingga angka energi selalu dapat ditelusuri kembali ke asumsinya.
 *
 * Batasan yang disadari: kemiringan panel diasumsikan seragam dan tidak berasal
 * dari pengukuran, dan orientasi atap dihitung sebagai orientasi sumbu poligon.
 * Arah kemiringan atap tidak dapat ditentukan dari citra nadir.
 */
class SolarCalculator
{
    public function __construct(
        private readonly IrradianceProvider $irradiance,
    ) {}

    /**
     * @param  array<int, array{0: float, 1: float}>  $polygon  Ring GeoJSON tertutup, urutan [lng, lat].
     */
    public function estimate(
        float $usableAreaSqm,
        array $polygon,
        float $latitude,
        float $longitude,
    ): EnergyEstimate {
        $irradiance = $this->irradiance->dailyGhi($latitude, $longitude);

        $assumptions = [
            'module_efficiency' => (float) config('solar.module_efficiency'),
            'performance_ratio' => (float) config('solar.performance_ratio'),
            'tilt_deg' => (float) config('solar.tilt_deg'),
            'tilt_factor' => (float) config('solar.tilt_factor'),
            'irradiance_source' => $irradiance->source,
            'irradiance_period' => $irradiance->period,
            'irradiance_kwh_per_sqm_day' => $irradiance->dailyGhiKwhPerSqm,
        ];

        $energy = $usableAreaSqm
            * $assumptions['module_efficiency']
            * $irradiance->dailyGhiKwhPerSqm
            * $assumptions['performance_ratio']
            * $assumptions['tilt_factor'];

        return new EnergyEstimate(
            estimatedEnergyKwhPerDay: round($energy, 2),
            dailyGhiKwhPerSqm: round($irradiance->dailyGhiKwhPerSqm, 3),
            roofOrientationDeg: round($this->roofOrientationDeg($polygon, $latitude), 2),
            recommendedAzimuthDeg: $latitude < 0.0 ? 0.0 : 180.0,
            assumptions: $assumptions,
        );
    }

    /**
     * Orientasi sumbu utama poligon, 0-180 derajat dari utara searah jarum jam.
     *
     * Dihitung sebagai sumbu utama sebaran titik sudut (analisis komponen utama).
     * Sumbu ini tidak punya arah hadap, sehingga hasilnya dinyatakan dalam rentang
     * 0-180 dan bukan 0-360.
     *
     * @param  array<int, array{0: float, 1: float}>  $polygon
     */
    private function roofOrientationDeg(array $polygon, float $latitude): float
    {
        $points = $this->uniquePoints($polygon);

        if (count($points) < 2) {
            return 0.0;
        }

        // Bujur diskalakan agar satu derajat bujur dan satu derajat lintang
        // mewakili jarak yang sebanding pada lintang ini.
        $longitudeScale = cos(deg2rad($latitude));

        $count = count($points);
        $meanX = 0.0;
        $meanY = 0.0;

        foreach ($points as [$lng, $lat]) {
            $meanX += $lng * $longitudeScale;
            $meanY += $lat;
        }

        $meanX /= $count;
        $meanY /= $count;

        $xx = 0.0;
        $yy = 0.0;
        $xy = 0.0;

        foreach ($points as [$lng, $lat]) {
            $dx = $lng * $longitudeScale - $meanX;
            $dy = $lat - $meanY;

            $xx += $dx * $dx;
            $yy += $dy * $dy;
            $xy += $dx * $dy;
        }

        if ($xx + $yy <= 1e-18) {
            return 0.0;
        }

        $angle = 0.5 * atan2(2 * $xy, $xx - $yy);

        // Sumbu (cos, sin) pada bidang timur-utara diubah menjadi azimut kompas,
        // lalu dilipat ke rentang 0-180 karena sumbu tidak punya arah hadap.
        $bearing = rad2deg(atan2(cos($angle), sin($angle)));

        return fmod(fmod($bearing, 180.0) + 180.0, 180.0);
    }

    /**
     * @param  array<int, array{0: float, 1: float}>  $polygon
     * @return array<int, array{0: float, 1: float}>
     */
    private function uniquePoints(array $polygon): array
    {
        $unique = [];

        foreach ($polygon as $point) {
            if (! is_array($point) || count($point) !== 2) {
                continue;
            }

            $key = sprintf('%.12F,%.12F', (float) $point[0], (float) $point[1]);

            if (array_key_exists($key, $unique)) {
                continue;
            }

            $unique[$key] = [(float) $point[0], (float) $point[1]];
        }

        return array_values($unique);
    }
}
