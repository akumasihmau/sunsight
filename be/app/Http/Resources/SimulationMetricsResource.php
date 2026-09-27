<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk bersarang untuk respons `POST /simulate`.
 *
 * Hanya memuat hasil hitungan; masukan tidak diulang karena pemanggil sudah tahu
 * apa yang ia kirim.
 */
class SimulationMetricsResource extends JsonResource
{
    /**
     * @var string|null
     */
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $simulation = $this->resource;

        return [
            'geometry' => [
                'roof_width_m' => round((float) $simulation->roof_width_m, 2),
                'roof_length_m' => round((float) $simulation->roof_length_m, 2),
                'total_area_sqm' => round((float) $simulation->total_area_sqm, 2),
                'effective_area_sqm' => round((float) $simulation->effective_area_sqm, 2),
            ],
            'layout' => [
                'max_slots' => (int) $simulation->max_slots,
                'installed' => (int) $simulation->installed,
                'rows' => (int) $simulation->rows,
                'columns' => (int) $simulation->columns,
                'module_area_sqm' => round((float) $simulation->module_area_sqm, 2),
                'density_ratio' => round((float) $simulation->density_ratio, 4),
            ],
            'energy' => [
                'capacity_kwp' => round((float) $simulation->capacity_kwp, 3),
                'annual_production_kwh' => round((float) $simulation->annual_production_kwh, 2),
                'daily_irradiance_kwh_per_sqm' => round((float) $simulation->daily_irradiance_kwh_per_sqm, 4),
                'incidence_factor' => round((float) $simulation->incidence_factor, 4),
                'performance_ratio' => round((float) $simulation->performance_ratio, 4),
                'irradiance_source' => $simulation->irradiance_source,
                'irradiance_period' => $simulation->irradiance_period,
            ],
            'finance' => [
                'capex_total_idr' => (int) $simulation->capex_total_idr,
                'capex_breakdown' => $simulation->capex_breakdown,
                'monthly_saving_idr' => (int) $simulation->monthly_saving_idr,
                'annual_saving_idr' => (int) $simulation->annual_saving_idr,
                'payback_years' => $simulation->payback_years === null
                    ? null
                    : round((float) $simulation->payback_years, 2),
                'tariff_key' => $simulation->tariff_key,
                'tariff_label' => $simulation->tariff_label,
                'tariff_idr_per_kwh' => round((float) $simulation->tariff_idr_per_kwh, 2),
                'monthly_bill_idr' => (int) $simulation->monthly_bill_idr,
                'co2_reduction_kg_per_year' => round((float) $simulation->co2_reduction_kg_per_year, 2),
                'trees_equivalent' => (int) $simulation->trees_equivalent,
            ],
        ];
    }
}
