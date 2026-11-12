<?php

namespace App\Services;

use App\Services\Finance\CostBreakdown;
use App\Services\Finance\FinanceResult;

/**
 * Belanja modal, penghematan, dan payback.
 *
 * Dua aturan yang membuat angkanya jujur:
 *
 * 1. Penghematan bulanan dibatasi tagihan listrik pengguna. Produksi yang melebihi
 *    konsumsi tidak dijual dengan harga penuh, jadi kelebihannya tidak diklaim
 *    sebagai penghematan.
 * 2. Reduksi karbon dihitung dari energi yang benar-benar menggantikan listrik dari
 *    jaringan, yaitu yang lebih kecil antara produksi dan konsumsi.
 *
 * Seluruh konstanta berasal dari config/plts.php dan ikut dilaporkan sebagai rincian.
 */
class FinanceModel
{
    /**
     * @param  array{key: string, label: string, idr_per_kwh: float}  $tariff
     * @param  array{price_idr: int}  $module
     */
    public static function capex(
        int $installedCount,
        array $module,
        string $inverterType,
        float $capacityKwp,
    ): CostBreakdown {
        $costs = config('plts.costs');

        return new CostBreakdown(
            modulesIdr: $installedCount * (int) $module['price_idr'],
            inverterIdr: $inverterType === 'micro'
                ? $installedCount * (int) $costs['inverter_idr_per_module']
                : (int) round($capacityKwp * (int) $costs['inverter_idr_per_kwp']),
            rackingIdr: $installedCount * (int) $costs['racking_idr_per_module'],
            installationIdr: (int) $costs['installation_idr'],
        );
    }

    /**
     * Menjumlahkan rincian biaya seluruh bidang menjadi belanja modal satu simulasi.
     *
     * Biaya instalasi bersifat tetap per simulasi, bukan per bidang, sehingga diambil
     * sekali dari rincian pertama alih-alih dijumlahkan. Perhitungan per bidangnya
     * tetap memakai `capex()`, jadi harga modul dan inverter tidak disalin ke sini.
     *
     * @param  array<int, CostBreakdown>  $breakdowns
     */
    public static function sumBreakdowns(array $breakdowns): CostBreakdown
    {
        $modulesIdr = 0;
        $inverterIdr = 0;
        $rackingIdr = 0;
        $installationIdr = 0;

        foreach ($breakdowns as $index => $breakdown) {
            $modulesIdr += $breakdown->modulesIdr;
            $inverterIdr += $breakdown->inverterIdr;
            $rackingIdr += $breakdown->rackingIdr;

            if ($index === 0) {
                $installationIdr = $breakdown->installationIdr;
            }
        }

        return new CostBreakdown(
            modulesIdr: $modulesIdr,
            inverterIdr: $inverterIdr,
            rackingIdr: $rackingIdr,
            installationIdr: $installationIdr,
        );
    }

    /**
     * @param  array{key: string, label: string, idr_per_kwh: float}  $tariff
     */
    public static function summarise(
        CostBreakdown $capex,
        float $annualProductionKwh,
        int $monthlyBillIdr,
        array $tariff,
    ): FinanceResult {
        $monthlyProductionValue = ($annualProductionKwh / 12.0) * $tariff['idr_per_kwh'];
        $monthlySavingIdr = (int) round(min($monthlyProductionValue, (float) $monthlyBillIdr));
        $annualSavingIdr = $monthlySavingIdr * 12;

        $paybackYears = $annualSavingIdr > 0
            ? round($capex->totalIdr() / $annualSavingIdr, 2)
            : null;

        $consumptionKwh = $tariff['idr_per_kwh'] > 0.0
            ? ($monthlyBillIdr / $tariff['idr_per_kwh']) * 12.0
            : 0.0;

        $displacedKwh = min($annualProductionKwh, $consumptionKwh);
        $co2Kg = $displacedKwh * (float) config('plts.co2_kg_per_kwh');
        $kgPerTree = (float) config('plts.co2_kg_per_tree_per_year');

        return new FinanceResult(
            capex: $capex,
            monthlySavingIdr: $monthlySavingIdr,
            annualSavingIdr: $annualSavingIdr,
            paybackYears: $paybackYears,
            tariffKey: $tariff['key'],
            tariffLabel: $tariff['label'],
            tariffIdrPerKwh: $tariff['idr_per_kwh'],
            monthlyBillIdr: $monthlyBillIdr,
            co2ReductionKgPerYear: round($co2Kg, 2),
            treesEquivalent: $kgPerTree > 0.0 ? (int) round($co2Kg / $kgPerTree) : 0,
        );
    }
}
