<?php

namespace Tests\Unit;

use App\Services\EnergyModel;
use Tests\TestCase;

/**
 * Model produksi mengikuti rumus studio: jam matahari puncak x faktor sudut datang x
 * rugi sistem. Setiap faktor diuji terpisah supaya angka yang dilaporkan dapat
 * dihitung ulang dari responsnya sendiri.
 */
class EnergyModelTest extends TestCase
{
    public function test_jam_matahari_puncak_mengikuti_posisi_matahari(): void
    {
        $this->assertSame(3.8, EnergyModel::peakSunHours(9.0));
        $this->assertSame(3.9, EnergyModel::peakSunHours(15.0));
        $this->assertSame(4.85, EnergyModel::peakSunHours(12.0));
        $this->assertSame(4.85, EnergyModel::peakSunHours(6.0));
        $this->assertSame(4.85, EnergyModel::peakSunHours(18.0));
    }

    public function test_kemiringan_optimal_memberi_faktor_satu(): void
    {
        $this->assertEqualsWithDelta(1.0, EnergyModel::pitchFactor(22.0), 1e-9);
        $this->assertGreaterThan(EnergyModel::pitchFactor(45.0), EnergyModel::pitchFactor(22.0));
        $this->assertGreaterThanOrEqual(0.85, EnergyModel::pitchFactor(90.0));
    }

    public function test_azimuth_optimal_memberi_faktor_satu(): void
    {
        $this->assertEqualsWithDelta(1.0, EnergyModel::azimuthFactor(188.0), 1e-9);
        $this->assertLessThan(1.0, EnergyModel::azimuthFactor(0.0));
        $this->assertGreaterThanOrEqual(0.82, EnergyModel::azimuthFactor(360.0));
    }

    public function test_bonus_dudukan_sebanding_dengan_sudut_ekstra(): void
    {
        $this->assertEqualsWithDelta(1.0, EnergyModel::rackingBonus(0.0), 1e-9);
        $this->assertEqualsWithDelta(1.01, EnergyModel::rackingBonus(10.0), 1e-9);
        $this->assertEqualsWithDelta(1.02, EnergyModel::rackingBonus(20.0), 1e-9);
    }

    public function test_produksi_sebanding_dengan_kapasitas(): void
    {
        $model = new EnergyModel;

        $kecil = $model->estimate(5.0, 22.0, 188.0, 10.0, 12.0, 'string');
        $besar = $model->estimate(20.0, 22.0, 188.0, 10.0, 12.0, 'string');

        $this->assertEqualsWithDelta(4.0, $besar->annualProductionKwh / $kecil->annualProductionKwh, 1e-4);
    }

    public function test_produksi_dapat_dihitung_ulang_dari_asumsinya(): void
    {
        $estimate = (new EnergyModel)->estimate(13.2, 22.0, 188.0, 10.0, 12.0, 'string');

        $harapan = 13.2
            * $estimate->dailyIrradianceKwhPerSqm
            * 365.0
            * $estimate->incidenceFactor
            * $estimate->performanceRatio;

        $this->assertEqualsWithDelta($harapan, $estimate->annualProductionKwh, 0.01);
        $this->assertEqualsWithDelta(4.85, $estimate->dailyIrradianceKwhPerSqm, 1e-9);
        $this->assertSame('Jam matahari puncak studio', $estimate->irradianceSource);
        $this->assertSame('asumsi pengguna', $estimate->irradiancePeriod);
    }

    public function test_inverter_mikro_memakai_efisiensi_lebih_rendah(): void
    {
        $model = new EnergyModel;

        $string = $model->estimate(13.2, 22.0, 188.0, 10.0, 12.0, 'string');
        $micro = $model->estimate(13.2, 22.0, 188.0, 10.0, 12.0, 'micro');

        $this->assertEqualsWithDelta(0.8069, $string->performanceRatio, 1e-9);
        $this->assertEqualsWithDelta(0.7995, $micro->performanceRatio, 1e-9);
        $this->assertGreaterThan($micro->annualProductionKwh, $string->annualProductionKwh);
    }

    public function test_pagi_menghasilkan_produksi_lebih_rendah_daripada_tengah_hari(): void
    {
        $model = new EnergyModel;

        $pagi = $model->estimate(13.2, 22.0, 188.0, 10.0, 9.0, 'string');
        $siang = $model->estimate(13.2, 22.0, 188.0, 10.0, 12.0, 'string');

        $this->assertLessThan($siang->annualProductionKwh, $pagi->annualProductionKwh);
    }

    public function test_sudut_ekstra_menambah_produksi(): void
    {
        $model = new EnergyModel;

        $tanpa = $model->estimate(13.2, 22.0, 188.0, 0.0, 12.0, 'string');
        $dengan = $model->estimate(13.2, 22.0, 188.0, 20.0, 12.0, 'string');

        $this->assertGreaterThan($tanpa->annualProductionKwh, $dengan->annualProductionKwh);
    }

    public function test_kapasitas_nol_menghasilkan_produksi_nol(): void
    {
        $estimate = (new EnergyModel)->estimate(0.0, 22.0, 188.0, 10.0, 12.0, 'string');

        $this->assertSame(0.0, $estimate->annualProductionKwh);
        $this->assertSame(0.0, $estimate->capacityKwp);
    }
}
