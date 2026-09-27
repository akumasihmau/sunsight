<?php

namespace Tests\Unit;

use App\Services\Irradiance\NasaPowerProvider;
use App\Services\SolarCalculator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeIrradianceProvider;
use Tests\TestCase;

/**
 * Kalkulasi harus murni: dapat diuji tanpa basis data dan tanpa jaringan.
 */
class SolarCalculatorTest extends TestCase
{
    private const JAKARTA = ['lat' => -6.59, 'lng' => 106.80];

    /** @var array<int, array{0: float, 1: float}> */
    private const POLYGON = [
        [106.799468, -6.595532],
        [106.799532, -6.595532],
        [106.799532, -6.595468],
        [106.799468, -6.595468],
        [106.799468, -6.595532],
    ];

    public function test_energi_mengikuti_rumus_yang_dipatok(): void
    {
        $estimate = $this->calculator()->estimate(
            usableAreaSqm: 45.5,
            polygon: self::POLYGON,
            latitude: self::JAKARTA['lat'],
            longitude: self::JAKARTA['lng'],
        );

        // 45.5 * 0.20 * 5.2 * 0.78 * 1.05 = 38.75508
        $this->assertEqualsWithDelta(38.76, $estimate->estimatedEnergyKwhPerDay, 0.01);
        $this->assertEqualsWithDelta(5.2, $estimate->dailyGhiKwhPerSqm, 0.001);
    }

    public function test_energi_sebanding_dengan_luas_area_terpakai(): void
    {
        $calculator = $this->calculator();

        $kecil = $calculator->estimate(10.0, self::POLYGON, self::JAKARTA['lat'], self::JAKARTA['lng']);
        $besar = $calculator->estimate(40.0, self::POLYGON, self::JAKARTA['lat'], self::JAKARTA['lng']);

        $this->assertEqualsWithDelta(
            4.0,
            $besar->estimatedEnergyKwhPerDay / $kecil->estimatedEnergyKwhPerDay,
            0.01,
            'Empat kali luas harus menghasilkan empat kali energi.',
        );
    }

    public function test_efisiensi_nol_menghasilkan_energi_nol(): void
    {
        config()->set('solar.module_efficiency', 0.0);

        $estimate = $this->calculator()->estimate(45.5, self::POLYGON, self::JAKARTA['lat'], self::JAKARTA['lng']);

        $this->assertSame(0.0, $estimate->estimatedEnergyKwhPerDay);
    }

    public function test_lintang_selatan_merekomendasikan_azimut_utara(): void
    {
        $estimate = $this->calculator()->estimate(45.5, self::POLYGON, -6.59, 106.80);

        $this->assertSame(0.0, $estimate->recommendedAzimuthDeg);
    }

    public function test_lintang_utara_merekomendasikan_azimut_selatan(): void
    {
        $estimate = $this->calculator()->estimate(45.5, self::POLYGON, 40.71, -74.00);

        $this->assertSame(180.0, $estimate->recommendedAzimuthDeg);
    }

    public function test_orientasi_atap_mengikuti_sumbu_utama_poligon(): void
    {
        // Kotak yang memanjang ke arah timur-barat: sumbunya mendekati 90 derajat.
        $memanjangTimurBarat = [
            [106.7990, -6.5955],
            [106.8000, -6.5955],
            [106.8000, -6.5954],
            [106.7990, -6.5954],
            [106.7990, -6.5955],
        ];

        // Kotak yang memanjang ke arah utara-selatan: sumbunya mendekati 0 derajat.
        $memanjangUtaraSelatan = [
            [106.7995, -6.5960],
            [106.7996, -6.5960],
            [106.7996, -6.5950],
            [106.7995, -6.5950],
            [106.7995, -6.5960],
        ];

        $calculator = $this->calculator();

        $timurBarat = $calculator->estimate(45.5, $memanjangTimurBarat, -6.59, 106.80);
        $utaraSelatan = $calculator->estimate(45.5, $memanjangUtaraSelatan, -6.59, 106.80);

        $this->assertEqualsWithDelta(90.0, $timurBarat->roofOrientationDeg, 1.0);
        $this->assertEqualsWithDelta(0.0, $utaraSelatan->roofOrientationDeg, 1.0);
        $this->assertGreaterThanOrEqual(0.0, $timurBarat->roofOrientationDeg);
        $this->assertLessThan(180.0, $timurBarat->roofOrientationDeg);
    }

    public function test_poligon_merosot_tidak_menggagalkan_kalkulasi(): void
    {
        $estimate = $this->calculator()->estimate(45.5, [[106.8, -6.59]], -6.59, 106.80);

        $this->assertSame(0.0, $estimate->roofOrientationDeg);
        $this->assertGreaterThan(0.0, $estimate->estimatedEnergyKwhPerDay);
    }

    public function test_blok_asumsi_memuat_seluruh_kunci_yang_wajib_tersimpan(): void
    {
        $assumptions = $this->calculator()->estimate(45.5, self::POLYGON, -6.59, 106.80)->assumptions;

        $this->assertSame([
            'module_efficiency',
            'performance_ratio',
            'tilt_deg',
            'tilt_factor',
            'irradiance_source',
            'irradiance_period',
            'irradiance_kwh_per_sqm_day',
        ], array_keys($assumptions));

        $this->assertSame('NASA POWER', $assumptions['irradiance_source']);
        $this->assertSame('klimatologi tahunan', $assumptions['irradiance_period']);
    }

    public function test_pemanggilan_berulang_dengan_asumsi_tetap_menghasilkan_angka_yang_sama(): void
    {
        $calculator = $this->calculator();

        $pertama = $calculator->estimate(45.5, self::POLYGON, -6.59, 106.80);
        $kedua = $calculator->estimate(45.5, self::POLYGON, -6.59, 106.80);

        $this->assertSame($pertama->estimatedEnergyKwhPerDay, $kedua->estimatedEnergyKwhPerDay);
        $this->assertSame($pertama->roofOrientationDeg, $kedua->roofOrientationDeg);
        $this->assertSame($pertama->assumptions, $kedua->assumptions);
    }

    public function test_iradiasi_diambil_sekali_per_kalkulasi(): void
    {
        $irradiance = new FakeIrradianceProvider;

        (new SolarCalculator($irradiance))->estimate(45.5, self::POLYGON, -6.59, 106.80);

        $this->assertSame(1, $irradiance->calls);
    }

    public function test_nasa_power_membaca_nilai_klimatologi_tahunan(): void
    {
        Cache::flush();

        Http::fake([
            '*' => Http::response([
                'properties' => [
                    'parameter' => [
                        'ALLSKY_SFC_SW_DWN' => ['JAN' => 4.4, 'ANN' => 5.2, 'DEC' => 4.9],
                    ],
                ],
            ]),
        ]);

        $value = (new NasaPowerProvider)->dailyGhi(-6.59, 106.80);

        $this->assertEqualsWithDelta(5.2, $value->dailyGhiKwhPerSqm, 0.001);
        $this->assertSame('NASA POWER', $value->source);
        $this->assertSame('klimatologi tahunan', $value->period);
    }

    public function test_iradiasi_yang_gagal_diambil_memakai_nilai_cadangan_dan_ditandai(): void
    {
        Cache::flush();
        config()->set('solar.fallback_daily_ghi', 4.8);

        Http::fake(['*' => Http::response('', 503)]);

        $value = (new NasaPowerProvider)->dailyGhi(-6.59, 106.80);

        $this->assertSame(4.8, $value->dailyGhiKwhPerSqm);
        $this->assertStringContainsString('cadangan', $value->source);
        $this->assertStringContainsString('cadangan', $value->period);
    }

    public function test_iradiasi_kosong_dari_sumber_diperlakukan_sebagai_kegagalan(): void
    {
        Cache::flush();

        Http::fake([
            '*' => Http::response([
                'properties' => ['parameter' => ['ALLSKY_SFC_SW_DWN' => ['ANN' => -999.0]]],
            ]),
        ]);

        $value = (new NasaPowerProvider)->dailyGhi(-6.59, 106.80);

        $this->assertStringContainsString('cadangan', $value->source);
    }

    private function calculator(float $dailyGhi = 5.2): SolarCalculator
    {
        return new SolarCalculator(new FakeIrradianceProvider($dailyGhi));
    }
}
