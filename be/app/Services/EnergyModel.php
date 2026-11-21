<?php

namespace App\Services;

use App\Services\Energy\EnergyResult;

/**
 * Produksi tahunan dengan rumus yang dipakai studio.
 *
 * Rumusnya sengaja dibuat identik dengan pratinjau antarmuka supaya angka yang
 * dibaca pengguna sebelum menyimpan sama dengan angka yang tersimpan:
 *
 *     produksi = kapasitas x jam matahari puncak x 365 x faktor sudut datang x rugi sistem
 *
 * Faktor sudut datang menggabungkan tiga hal yang semuanya dapat dibaca kembali dari
 * respons: kecocokan kemiringan terhadap puncak 22°, kecocokan azimuth terhadap 188°,
 * dan bonus membersihkan diri dari hujan pada dudukan yang dimiringkan. Rugi sistem
 * menggabungkan rugi suhu, kabel, kotoran, dan efisiensi inverter.
 *
 * Batasannya disadari: yang dimodelkan adalah produksi pada jam matahari puncak,
 * bukan integrasi per jam terhadap iradiasi lokasi. Jam matahari puncak berasal dari
 * penggeser studio, sehingga nilainya masukan pengguna, bukan pengukuran.
 */
class EnergyModel
{
    /**
     * Jam matahari puncak untuk posisi matahari pada penggeser studio.
     */
    public static function peakSunHours(float $sunHour): float
    {
        $peak = config('plts.energy.peak_sun_hours');

        if ($sunHour >= ($peak['morning_hour'] ?? 9.0) - 0.5
            && $sunHour <= ($peak['morning_hour'] ?? 9.0) + 0.5) {
            return (float) $peak['morning'];
        }

        if ($sunHour >= ($peak['afternoon_hour'] ?? 15.0) - 0.5
            && $sunHour <= ($peak['afternoon_hour'] ?? 15.0) + 0.5) {
            return (float) $peak['afternoon'];
        }

        return (float) $peak['noon'];
    }

    /**
     * Faktor kecocokan kemiringan, 1,0 pada kemiringan optimal.
     */
    public static function pitchFactor(float $tiltDeg): float
    {
        $optimal = (float) config('plts.energy.optimal_tilt_deg');
        $factor = cos(deg2rad($tiltDeg - $optimal));

        return max(0.85, min(1.0, 0.92 + $factor * 0.08));
    }

    /**
     * Faktor kecocokan azimuth, 1,0 pada azimuth optimal (Utara 0° untuk Kota Bogor 6,6° LS).
     * Memakai jarak sudut melingkar 360° agar 355° dan 5° sama-sama berdeviasi 5°.
     */
    public static function azimuthFactor(float $azimuthDeg): float
    {
        $optimal = (float) config('plts.energy.optimal_azimuth_deg');
        $rawDiff = abs(fmod($azimuthDeg - $optimal + 360.0, 360.0));
        $deviation = min($rawDiff, 360.0 - $rawDiff);

        return max(0.82, min(1.0, 1.0 - ($deviation / 180.0) * 0.15));
    }

    /**
     * Bonus membersihkan diri dari hujan pada dudukan yang dimiringkan.
     */
    public static function rackingBonus(float $extraTiltDeg): float
    {
        $bonus = config('plts.energy.racking_bonus');
        $maxDeg = (float) ($bonus['max_deg'] ?? 20.0);
        $ratio = (float) ($bonus['ratio'] ?? 0.02);

        if ($maxDeg <= 0.0) {
            return 1.0;
        }

        return 1.0 + ($extraTiltDeg / $maxDeg) * $ratio;
    }

    public function estimate(
        float $capacityKwp,
        float $tiltDeg,
        float $azimuthDeg,
        float $extraTiltDeg,
        float $sunHour,
        string $inverterType,
        float $shadingLossPct = 0.0,
    ): EnergyResult {
        $peakSunHours = self::peakSunHours($sunHour);
        $incidenceFactor = round(
            self::pitchFactor($tiltDeg)
            * self::azimuthFactor($azimuthDeg)
            * self::rackingBonus($extraTiltDeg),
            4,
        );

        $inverterEfficiency = config('plts.energy.inverter_efficiency')[$inverterType]
            ?? config('plts.energy.inverter_efficiency')['string'];
        $shadingFactor = max(0.5, min(1.0, 1.0 - ($shadingLossPct / 100.0)));
        $performanceRatio = round(
            (float) config('plts.energy.system_loss_ratio') * (float) $inverterEfficiency * $shadingFactor,
            4,
        );

        $annualKwh = $capacityKwp
            * $peakSunHours
            * 365.0
            * $incidenceFactor
            * $performanceRatio;

        return new EnergyResult(
            capacityKwp: round($capacityKwp, 3),
            annualProductionKwh: round($annualKwh, 2),
            // Jam matahari puncak setara dengan kWh/m2/hari pada 1 kW/m2 (ISO 9060 / IEC 61724-1).
            dailyIrradianceKwhPerSqm: $peakSunHours,
            incidenceFactor: $incidenceFactor,
            performanceRatio: $performanceRatio,
            irradianceSource: (string) config('plts.energy.irradiance_source', 'NASA POWER & Global Solar Atlas (Kota Bogor)'),
            irradiancePeriod: (string) config('plts.energy.irradiance_period', 'Klimatologi 2001–2024'),
        );
    }
}
