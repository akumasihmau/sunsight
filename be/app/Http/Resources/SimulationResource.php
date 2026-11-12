<?php

namespace App\Http\Resources;

use App\Models\Simulation;
use App\Models\SimulationRoof;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk bersama "detail simulasi" pada kontrak.
 *
 * Dipakai oleh `POST /simulate`, `POST /analyses`, dan `GET /analyses/{id}`, sehingga
 * ketiganya mustahil menampilkan angka yang berbeda. Masukan dan asumsi ikut
 * dikembalikan karena tarif, harga modul, dan performance ratio dapat berubah di
 * konfigurasi: simulasi lama harus tetap menampilkan angka seperti saat dihitung,
 * beserta dasar angkanya.
 *
 * Kontrak menetapkan respons detail sebagai objek datar, bukan dibungkus `data`.
 */
class SimulationResource extends JsonResource
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

        $data = [];

        // Simulasi yang belum disimpan belum punya identitas, dan kontrak tidak
        // memuat kunci `id` untuk `POST /simulate`.
        if ($simulation->exists) {
            $data['id'] = $simulation->id;
        }

        $data['center_point'] = [
            'lat' => $simulation->center_lat,
            'lng' => $simulation->center_lng,
        ];
        $data['map_zoom'] = $simulation->map_zoom;
        $data['roofs'] = $simulation->roofs
            ->map(static fn (SimulationRoof $roof): array => self::roof($roof))
            ->values()
            ->all();
        $data['input'] = self::input($simulation);
        $data['result'] = self::result($simulation);
        $data['assumptions'] = self::assumptions($simulation);
        $data['created_at'] = $simulation->created_at?->toISOString();

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private static function roof(SimulationRoof $roof): array
    {
        return [
            'label' => $roof->label,
            'detection_id' => $roof->detection_id,
            'confidence' => $roof->confidence === null ? null : round((float) $roof->confidence, 4),
            'roof_polygon' => $roof->roofPolygonGeoJson(),
            'roof_polygon_px' => $roof->roof_polygon_px,
            'input' => [
                'setback_m' => round((float) $roof->setback_m, 2),
                'gutter_m' => round((float) $roof->gutter_m, 2),
                'tilt_deg' => round((float) $roof->tilt_deg, 2),
                'azimuth_deg' => round((float) $roof->azimuth_deg, 2),
                'module_key' => $roof->module_key,
                'orientation' => $roof->orientation,
                'clearance_m' => round((float) $roof->clearance_m, 3),
                'panel_count' => $roof->panel_count === null ? null : (int) $roof->panel_count,
            ],
            'result' => [
                'roof_length_m' => round((float) $roof->roof_length_m, 2),
                'roof_width_m' => round((float) $roof->roof_width_m, 2),
                'rotation_deg' => round((float) $roof->rotation_deg, 2),
                'area_sqm' => round((float) $roof->total_area_sqm, 2),
                'effective_area_sqm' => round((float) $roof->effective_area_sqm, 2),
                'max_slots' => (int) $roof->max_slots,
                'installed' => (int) $roof->installed,
                'rows' => (int) $roof->rows,
                'columns' => (int) $roof->columns,
                'module_area_sqm' => round((float) $roof->module_area_sqm, 2),
                'density_ratio' => round((float) $roof->density_ratio, 4),
                'capacity_kwp' => round((float) $roof->capacity_kwp, 3),
                'annual_production_kwh' => round((float) $roof->annual_production_kwh, 2),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function input(Simulation $simulation): array
    {
        return [
            'inverter_type' => $simulation->inverter_type,
            'monthly_bill_idr' => (int) $simulation->monthly_bill_idr,
            'tariff_key' => $simulation->tariff_key,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function result(Simulation $simulation): array
    {
        return [
            'roof_count' => $simulation->roofs->count(),
            'total_area_sqm' => round((float) $simulation->total_area_sqm, 2),
            'effective_area_sqm' => round((float) $simulation->effective_area_sqm, 2),
            'max_slots' => (int) $simulation->max_slots,
            'installed' => (int) $simulation->installed,
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
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function assumptions(Simulation $simulation): array
    {
        return [
            'daily_irradiance_kwh_per_sqm' => round((float) $simulation->daily_irradiance_kwh_per_sqm, 4),
            'irradiance_source' => $simulation->irradiance_source,
            'irradiance_period' => $simulation->irradiance_period,
            'incidence_factor' => round((float) $simulation->incidence_factor, 4),
            'performance_ratio' => round((float) $simulation->performance_ratio, 4),
            'tariff_key' => $simulation->tariff_key,
            'tariff_label' => $simulation->tariff_label,
            'tariff_idr_per_kwh' => round((float) $simulation->tariff_idr_per_kwh, 2),
            'capex_breakdown' => $simulation->capex_breakdown,
        ];
    }
}
