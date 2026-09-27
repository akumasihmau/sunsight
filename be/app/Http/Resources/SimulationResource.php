<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk lengkap satu simulasi: masukan, hasil, dan asumsi yang dipakai.
 *
 * Asumsi ikut dikembalikan karena tarif, harga modul, dan performance ratio dapat
 * berubah di konfigurasi; simulasi lama harus tetap menampilkan angka seperti saat
 * dihitung, beserta dasar angkanya.
 */
class SimulationResource extends JsonResource
{
    /**
     * Kontrak menetapkan respons detail sebagai objek datar, bukan dibungkus `data`.
     *
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
            'id' => $simulation->id,
            'center_point' => [
                'lat' => $simulation->center_lat,
                'lng' => $simulation->center_lng,
            ],
            'roof_polygon' => $simulation->roofPolygonGeoJson(),
            'input' => [
                'roof_width_m' => round((float) $simulation->roof_width_m, 2),
                'roof_length_m' => round((float) $simulation->roof_length_m, 2),
                'rotation_deg' => round((float) $simulation->rotation_deg, 2),
                'setback_m' => round((float) $simulation->setback_m, 2),
                'gutter_m' => round((float) $simulation->gutter_m, 2),
                'tilt_deg' => round((float) $simulation->tilt_deg, 2),
                'azimuth_deg' => round((float) $simulation->azimuth_deg, 2),
                'module_key' => $simulation->module_key,
                'orientation' => $simulation->orientation,
                'clearance_m' => round((float) $simulation->clearance_m, 3),
                'panel_count' => (int) $simulation->panel_count,
                'inverter_type' => $simulation->inverter_type,
                'monthly_bill_idr' => (int) $simulation->monthly_bill_idr,
                'tariff_key' => $simulation->tariff_key,
            ],
            'result' => [
                'total_area_sqm' => round((float) $simulation->total_area_sqm, 2),
                'effective_area_sqm' => round((float) $simulation->effective_area_sqm, 2),
                'max_slots' => (int) $simulation->max_slots,
                'installed' => (int) $simulation->installed,
                'rows' => (int) $simulation->rows,
                'columns' => (int) $simulation->columns,
                'module_area_sqm' => round((float) $simulation->module_area_sqm, 2),
                'density_ratio' => round((float) $simulation->density_ratio, 4),
                'capacity_kwp' => round((float) $simulation->capacity_kwp, 3),
                'annual_production_kwh' => round((float) $simulation->annual_production_kwh, 2),
                'capex_total_idr' => (int) $simulation->capex_total_idr,
                'monthly_saving_idr' => (int) $simulation->monthly_saving_idr,
                'annual_saving_idr' => (int) $simulation->annual_saving_idr,
                'payback_years' => $simulation->payback_years === null
                    ? null
                    : round((float) $simulation->payback_years, 2),
                'co2_reduction_kg_per_year' => round((float) $simulation->co2_reduction_kg_per_year, 2),
                'trees_equivalent' => (int) $simulation->trees_equivalent,
            ],
            'assumptions' => [
                'daily_irradiance_kwh_per_sqm' => round((float) $simulation->daily_irradiance_kwh_per_sqm, 4),
                'irradiance_source' => $simulation->irradiance_source,
                'irradiance_period' => $simulation->irradiance_period,
                'incidence_factor' => round((float) $simulation->incidence_factor, 4),
                'performance_ratio' => round((float) $simulation->performance_ratio, 4),
                'tariff_key' => $simulation->tariff_key,
                'tariff_label' => $simulation->tariff_label,
                'tariff_idr_per_kwh' => round((float) $simulation->tariff_idr_per_kwh, 2),
                'capex_breakdown' => $simulation->capex_breakdown,
            ],
            'created_at' => $simulation->created_at?->toISOString(),
        ];
    }
}
