<?php

namespace App\Services;

use App\Services\Energy\EnergyResult;

/**
 * Produksi tahunan dari kapasitas terpasang.
 *
 * Tiga hal yang membedakannya dari perhitungan naif:
 *
 * 1. Iradiasi diambil dari sumber data nyata, bukan konstanta hardcoded.
 * 2. Performance ratio diterapkan, sehingga rugi karena suhu, kabel, inverter, dan
 *    kotoran ikut terhitung.
 * 3. Faktor sudut datang diintegrasikan per jam untuk dua belas bulan perwakilan,
 *    sehingga kemiringan **dan** azimuth benar-benar berpengaruh. Rata-rata tengah
 *    hari saja tidak dapat membedakan azimuth, karena pada tengah hari modul yang
 *    menghadap utara dan selatan sama-sama menerima sudut datang yang serupa.
 *
 * Batasannya disadari dan ikut dilaporkan: yang dimodelkan hanya komponen langsung
 * dengan bobot kosinus zenith sebagai proksi. Difusi langit, awan, dan efek spektral
 * tidak dimodelkan.
 */
class EnergyModel
{
    /** Hari pertengahan tiap bulan, dipakai menghitung deklinasi matahari. */
    private const MID_MONTH_DAYS = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];

    /** Jam yang dievaluasi, dari pagi sampai sore. */
    private const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

    /** Matahari di bawah ambang ini dianggap tidak menyumbang. */
    private const MIN_ELEVATION_DEG = 5.0;

    public function __construct(
        private readonly IrradianceProvider $irradiance,
    ) {}

    public function estimate(
        float $capacityKwp,
        float $tiltDeg,
        float $azimuthDeg,
        float $latitude,
        float $longitude,
    ): EnergyResult {
        $irradiance = $this->irradiance->dailyGhi($latitude, $longitude);

        // Faktor dibulatkan sebelum dipakai menghitung, bukan sesudah, supaya angka
        // yang dilaporkan benar-benar dapat diverifikasi ulang dari responsnya.
        $incidenceFactor = round(self::incidenceFactor($tiltDeg, $azimuthDeg, $latitude), 4);
        $performanceRatio = (float) config('plts.performance_ratio');

        $annualKwh = $capacityKwp
            * $irradiance->dailyGhiKwhPerSqm
            * $incidenceFactor
            * 365.0
            * $performanceRatio;

        return new EnergyResult(
            capacityKwp: round($capacityKwp, 3),
            annualProductionKwh: round($annualKwh, 2),
            dailyIrradianceKwhPerSqm: round($irradiance->dailyGhiKwhPerSqm, 4),
            incidenceFactor: $incidenceFactor,
            performanceRatio: $performanceRatio,
            irradianceSource: $irradiance->source,
            irradiancePeriod: $irradiance->period,
        );
    }

    /**
     * Faktor sudut datang **relatif terhadap bidang horizontal**.
     *
     * Nilainya 1,0 bila bidang miring menerima iradiasi langsung sebanyak bidang
     * datar pada lokasi yang sama, lebih dari 1,0 bila lebih baik, dan kurang dari
     * 1,0 bila lebih buruk. Normalisasi ini yang membuatnya sah dikalikan dengan
     * iradiasi horizontal dari NASA POWER; tanpa normalisasi, hasilnya terhitung
     * sekitar seperempat terlalu rendah.
     *
     * Bobotnya adalah kosinus sudut zenith, sebagai proksi banyaknya iradiasi
     * langsung yang tersedia pada jam itu. Penyebutnya adalah nilai yang sama untuk
     * bidang datar, sehingga faktor bidang datar tepat 1,0.
     */
    public static function incidenceFactor(float $tiltDeg, float $azimuthDeg, float $latitude): float
    {
        $tilt = deg2rad($tiltDeg);
        $moduleAzimuth = deg2rad($azimuthDeg);
        $latRad = deg2rad($latitude);

        $weighted = 0.0;
        $reference = 0.0;

        foreach (self::MID_MONTH_DAYS as $dayOfYear) {
            $declination = deg2rad(23.45 * sin(deg2rad(360.0 / 365.0 * (284 + $dayOfYear))));

            foreach (self::HOURS as $hour) {
                $hourAngle = deg2rad(15.0 * ($hour - 12));

                $sinElevation = sin($latRad) * sin($declination)
                    + cos($latRad) * cos($declination) * cos($hourAngle);

                $elevation = rad2deg(asin(max(-1.0, min(1.0, $sinElevation))));

                if ($elevation < self::MIN_ELEVATION_DEG) {
                    continue;
                }

                $zenith = deg2rad(90.0 - $elevation);

                // Azimut matahari dari utara searah jarum jam.
                $sunAzimuth = deg2rad(180.0) + atan2(
                    sin($hourAngle),
                    cos($hourAngle) * sin($latRad) - tan($declination) * cos($latRad),
                );

                $cosIncidence = cos($zenith) * cos($tilt)
                    + sin($zenith) * sin($tilt) * cos($sunAzimuth - $moduleAzimuth);

                // Bobot kosinus zenith: proksi iradiasi langsung yang tersedia.
                $weight = cos($zenith);

                $weighted += $weight * max(0.0, $cosIncidence);
                $reference += $weight * $weight;
            }
        }

        return $reference > 0.0 ? $weighted / $reference : 0.0;
    }
}
