<?php

namespace Tests\Unit;

use App\Services\EnergyModel;
use App\Services\Irradiance\NasaPowerProvider;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeIrradianceProvider;
use Tests\TestCase;

class EnergyModelTest extends TestCase
{
    private const JAKARTA = ['lat' => -6.59, 'lng' => 106.80];

    private const NEW_YORK = ['lat' => 40.71, 'lng' => -74.00];

    public function test_faktor_sudut_datang_bidang_datar_tepat_satu(): void
    {
        // Bidang datar adalah acuan; iradiasi NASA POWER juga besaran bidang datar.
        $this->assertEqualsWithDelta(1.0, EnergyModel::incidenceFactor(0.0, 0.0, -6.59), 1e-9);
        $this->assertEqualsWithDelta(1.0, EnergyModel::incidenceFactor(0.0, 180.0, -6.59), 1e-9);
        $this->assertEqualsWithDelta(1.0, EnergyModel::incidenceFactor(0.0, 90.0, 40.71), 1e-9);
    }

    public function test_di_lintang_selatan_menghadap_utara_lebih_baik(): void
    {
        $utara = EnergyModel::incidenceFactor(22.0, 0.0, self::JAKARTA['lat']);
        $selatan = EnergyModel::incidenceFactor(22.0, 180.0, self::JAKARTA['lat']);

        $this->assertGreaterThan($selatan, $utara, 'Di 6,6 derajat lintang selatan, matahari lebih sering berada di utara.');
    }

    public function test_di_lintang_utara_menghadap_selatan_lebih_baik(): void
    {
        $selatan = EnergyModel::incidenceFactor(22.0, 180.0, self::NEW_YORK['lat']);
        $utara = EnergyModel::incidenceFactor(22.0, 0.0, self::NEW_YORK['lat']);

        $this->assertGreaterThan($utara, $selatan);
    }

    public function test_kemiringan_yang_terlalu_curam_menurunkan_faktor(): void
    {
        $landai = EnergyModel::incidenceFactor(5.0, 0.0, self::JAKARTA['lat']);
        $sedang = EnergyModel::incidenceFactor(22.0, 0.0, self::JAKARTA['lat']);
        $curam = EnergyModel::incidenceFactor(45.0, 0.0, self::JAKARTA['lat']);

        // Di 6,6 derajat lintang selatan matahari nyaris di zenith, sehingga kemiringan
        // kecil ke utara sudah mendekati optimum dan kemiringan curam merugikan.
        $this->assertGreaterThan($sedang, $landai);
        $this->assertGreaterThan($curam, $sedang);
        $this->assertGreaterThan(0.9, $landai);
        $this->assertGreaterThan(0.0, $curam);
    }

    public function test_selisih_azimuth_kecil_hampir_tidak_berpengaruh(): void
    {
        $selatan = EnergyModel::incidenceFactor(22.0, 180.0, self::JAKARTA['lat']);
        $selatanSedikitBaratDaya = EnergyModel::incidenceFactor(22.0, 188.0, self::JAKARTA['lat']);

        $this->assertEqualsWithDelta($selatan, $selatanSedikitBaratDaya, 0.01);
    }

    public function test_hadap_timur_berada_di_antara_utara_dan_selatan(): void
    {
        $utara = EnergyModel::incidenceFactor(22.0, 0.0, self::JAKARTA['lat']);
        $timur = EnergyModel::incidenceFactor(22.0, 90.0, self::JAKARTA['lat']);
        $selatan = EnergyModel::incidenceFactor(22.0, 180.0, self::JAKARTA['lat']);

        $this->assertLessThan($utara, $timur);
        $this->assertGreaterThan($selatan, $timur);
    }

    public function test_produksi_sebanding_dengan_kapasitas(): void
    {
        $model = $this->model();

        $kecil = $model->estimate(5.0, 22.0, 180.0, self::JAKARTA['lat'], self::JAKARTA['lng']);
        $besar = $model->estimate(20.0, 22.0, 180.0, self::JAKARTA['lat'], self::JAKARTA['lng']);

        $this->assertEqualsWithDelta(4.0, $besar->annualProductionKwh / $kecil->annualProductionKwh, 0.001);
    }

    public function test_performance_ratio_nol_menghasilkan_produksi_nol(): void
    {
        config()->set('plts.performance_ratio', 0.0);

        $estimate = $this->model()->estimate(13.2, 22.0, 180.0, self::JAKARTA['lat'], self::JAKARTA['lng']);

        $this->assertSame(0.0, $estimate->annualProductionKwh);
    }

    public function test_performance_ratio_benar_benar_diterapkan(): void
    {
        config()->set('plts.performance_ratio', 0.80);

        $estimate = $this->model()->estimate(13.2, 22.0, 180.0, self::JAKARTA['lat'], self::JAKARTA['lng']);

        $harapan = 13.2 * 5.2 * $estimate->incidenceFactor * 365.0 * 0.80;

        $this->assertEqualsWithDelta($harapan, $estimate->annualProductionKwh, 0.5);
        $this->assertSame(0.8, $estimate->performanceRatio);
    }

    public function test_pemanggilan_berulang_memberi_angka_yang_sama(): void
    {
        $model = $this->model();

        $pertama = $model->estimate(13.2, 22.0, 188.0, self::JAKARTA['lat'], self::JAKARTA['lng']);
        $kedua = $model->estimate(13.2, 22.0, 188.0, self::JAKARTA['lat'], self::JAKARTA['lng']);

        $this->assertSame($pertama->annualProductionKwh, $kedua->annualProductionKwh);
        $this->assertSame($pertama->incidenceFactor, $kedua->incidenceFactor);
    }

    public function test_asumsi_membawa_sumber_dan_periode_iradiasi(): void
    {
        $estimate = $this->model()->estimate(13.2, 22.0, 180.0, self::JAKARTA['lat'], self::JAKARTA['lng']);

        $this->assertSame('NASA POWER', $estimate->irradianceSource);
        $this->assertSame('klimatologi tahunan', $estimate->irradiancePeriod);
        $this->assertSame(5.2, $estimate->dailyIrradianceKwhPerSqm);
    }

    public function test_iradiasi_yang_gagal_diambil_memakai_nilai_cadangan_yang_ditandai(): void
    {
        Cache::flush();
        Http::fake(['*' => Http::response('', 503)]);

        config()->set('solar.fallback_daily_ghi', 4.8);

        $estimate = (new EnergyModel(new NasaPowerProvider))->estimate(13.2, 22.0, 180.0, -6.59, 106.80);

        $this->assertSame(4.8, $estimate->dailyIrradianceKwhPerSqm);
        $this->assertStringContainsString('cadangan', $estimate->irradianceSource);
        $this->assertGreaterThan(0.0, $estimate->annualProductionKwh);
    }

    private function model(float $dailyGhi = 5.2): EnergyModel
    {
        return new EnergyModel(new FakeIrradianceProvider($dailyGhi));
    }
}
