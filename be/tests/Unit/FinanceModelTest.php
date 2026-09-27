<?php

namespace Tests\Unit;

use App\Services\Finance\CostBreakdown;
use App\Services\FinanceModel;
use Tests\TestCase;

class FinanceModelTest extends TestCase
{
    private const BILL_IDR = 2_800_000;

    private static function capex(): CostBreakdown
    {
        return new CostBreakdown(
            modulesIdr: 44_400_000,
            inverterIdr: 15_840_000,
            rackingIdr: 8_400_000,
            installationIdr: 15_000_000,
        );
    }

    public function test_rincian_capex_menjumlah_tepat_ke_totalnya(): void
    {
        $capex = self::capex();

        $this->assertSame(83_640_000, $capex->totalIdr());
        $this->assertSame($capex->totalIdr(), array_sum($capex->toArray()));
    }

    public function test_capex_dihitung_dari_komponen_konfigurasi(): void
    {
        $capex = FinanceModel::capex(
            installedCount: 24,
            module: ['price_idr' => 1_850_000],
            inverterType: 'string',
            capacityKwp: 13.2,
        );

        $this->assertSame(44_400_000, $capex->modulesIdr);
        $this->assertSame(15_840_000, $capex->inverterIdr);
        $this->assertSame(8_400_000, $capex->rackingIdr);
        $this->assertSame(15_000_000, $capex->installationIdr);
    }

    public function test_mikroinverter_dihitung_per_modul_bukan_per_kwp(): void
    {
        $capex = FinanceModel::capex(
            installedCount: 24,
            module: ['price_idr' => 1_850_000],
            inverterType: 'micro',
            capacityKwp: 13.2,
        );

        $this->assertSame(24 * 1_100_000, $capex->inverterIdr);
    }

    public function test_penghematan_bulanan_dibatasi_tagihan_listrik(): void
    {
        // Produksi bulanan bernilai sekitar Rp 2,27 juta, tagihan hanya Rp 500 ribu.
        $finance = FinanceModel::summarise(
            capex: self::capex(),
            annualProductionKwh: 16_000.0,
            monthlyBillIdr: 500_000,
            tariff: ['key' => 'R2', 'label' => 'R-2', 'idr_per_kwh' => 1700.0],
        );

        $this->assertSame(500_000, $finance->monthlySavingIdr);
        $this->assertSame(6_000_000, $finance->annualSavingIdr);
    }

    public function test_penghematan_memakai_rata_rata_produksi_bulanan_bila_di_bawah_tagihan(): void
    {
        $finance = FinanceModel::summarise(
            capex: self::capex(),
            annualProductionKwh: 16_000.0,
            monthlyBillIdr: self::BILL_IDR,
            tariff: ['key' => 'R2', 'label' => 'R-2', 'idr_per_kwh' => 1700.0],
        );

        $this->assertSame(2_266_667, $finance->monthlySavingIdr);
        $this->assertSame(27_200_004, $finance->annualSavingIdr);
    }

    public function test_payback_adalah_capex_dibagi_penghematan_tahunan(): void
    {
        $finance = FinanceModel::summarise(
            capex: self::capex(),
            annualProductionKwh: 16_000.0,
            monthlyBillIdr: self::BILL_IDR,
            tariff: ['key' => 'R2', 'label' => 'R-2', 'idr_per_kwh' => 1700.0],
        );

        $this->assertEqualsWithDelta(
            $finance->capex->totalIdr() / $finance->annualSavingIdr,
            $finance->paybackYears,
            0.01,
        );
    }

    public function test_tanpa_modul_terpasang_tidak_ada_penghematan_dan_payback_tidak_terdefinisi(): void
    {
        $finance = FinanceModel::summarise(
            capex: FinanceModel::capex(0, ['price_idr' => 1_850_000], 'string', 0.0),
            annualProductionKwh: 0.0,
            monthlyBillIdr: self::BILL_IDR,
            tariff: ['key' => 'R2', 'label' => 'R-2', 'idr_per_kwh' => 1700.0],
        );

        $this->assertSame(0, $finance->monthlySavingIdr);
        $this->assertSame(0, $finance->annualSavingIdr);
        $this->assertNull($finance->paybackYears);
        $this->assertSame(15_000_000, $finance->capex->totalIdr(), 'Tanpa modul, hanya biaya instalasi yang tersisa.');
    }

    public function test_tarif_yang_dipilih_benar_benar_mengubah_penghematan(): void
    {
        $murah = FinanceModel::summarise(
            self::capex(),
            16_000.0,
            self::BILL_IDR,
            ['key' => 'B2', 'label' => 'B-2', 'idr_per_kwh' => 1444.70],
        );
        $mahal = FinanceModel::summarise(
            self::capex(),
            16_000.0,
            self::BILL_IDR,
            ['key' => 'R2', 'label' => 'R-2', 'idr_per_kwh' => 1700.0],
        );

        $this->assertGreaterThan($murah->monthlySavingIdr, $mahal->monthlySavingIdr);
        $this->assertSame('R2', $mahal->tariffKey);
        $this->assertSame(1700.0, $mahal->tariffIdrPerKwh);
    }

    public function test_reduksi_karbon_memakai_energi_yang_benar_benar_menggantikan_listrik(): void
    {
        // Konsumsi 2,8 juta / 1700 x 12 = 19.764,7 kWh, jadi seluruh produksi 16.000 kWh terpakai.
        $finance = FinanceModel::summarise(
            self::capex(),
            16_000.0,
            self::BILL_IDR,
            ['key' => 'R2', 'label' => 'R-2', 'idr_per_kwh' => 1700.0],
        );

        $this->assertEqualsWithDelta(16_000.0 * 0.80, $finance->co2ReductionKgPerYear, 0.01);
        $this->assertSame(582, $finance->treesEquivalent);
    }

    public function test_produksi_yang_melebihi_konsumsi_tidak_dihitung_sebagai_pengurangan_karbon(): void
    {
        // Produksi 40.000 kWh jauh melebihi konsumsi 19.764,7 kWh.
        $finance = FinanceModel::summarise(
            self::capex(),
            40_000.0,
            self::BILL_IDR,
            ['key' => 'R2', 'label' => 'R-2', 'idr_per_kwh' => 1700.0],
        );

        $konsumsi = (self::BILL_IDR / 1700.0) * 12.0;

        $this->assertEqualsWithDelta($konsumsi * 0.80, $finance->co2ReductionKgPerYear, 0.01);
        $this->assertLessThan(40_000.0 * 0.80, $finance->co2ReductionKgPerYear);
    }
}
