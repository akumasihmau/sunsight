<?php

namespace App\Models;

use App\Models\Concerns\StoresPolygonGeometry;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu simulasi PLTS tersimpan: masukan, hasil, dan asumsi yang dipakai.
 *
 * Hasil disimpan bersama asumsinya supaya simulasi lama tetap menampilkan angka
 * seperti saat dihitung, meskipun tarif atau harga modul di konfigurasi berubah.
 */
#[Fillable([
    'user_id',
    'imagery_asset_id',
    'center_lat',
    'center_lng',
    'roof_width_m',
    'roof_length_m',
    'rotation_deg',
    'setback_m',
    'gutter_m',
    'tilt_deg',
    'azimuth_deg',
    'module_key',
    'orientation',
    'clearance_m',
    'inverter_type',
    'panel_count',
    'monthly_bill_idr',
    'tariff_key',
    'total_area_sqm',
    'effective_area_sqm',
    'max_slots',
    'installed',
    'rows',
    'columns',
    'module_area_sqm',
    'density_ratio',
    'capacity_kwp',
    'annual_production_kwh',
    'capex_total_idr',
    'monthly_saving_idr',
    'annual_saving_idr',
    'payback_years',
    'co2_reduction_kg_per_year',
    'trees_equivalent',
    'daily_irradiance_kwh_per_sqm',
    'irradiance_source',
    'irradiance_period',
    'incidence_factor',
    'performance_ratio',
    'tariff_idr_per_kwh',
    'tariff_label',
    'capex_breakdown',
])]
class Simulation extends Model
{
    use StoresPolygonGeometry;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'center_lat' => 'float',
            'center_lng' => 'float',
            'roof_width_m' => 'float',
            'roof_length_m' => 'float',
            'rotation_deg' => 'float',
            'setback_m' => 'float',
            'gutter_m' => 'float',
            'tilt_deg' => 'float',
            'azimuth_deg' => 'float',
            'clearance_m' => 'float',
            'panel_count' => 'integer',
            'monthly_bill_idr' => 'integer',
            'total_area_sqm' => 'float',
            'effective_area_sqm' => 'float',
            'max_slots' => 'integer',
            'installed' => 'integer',
            'rows' => 'integer',
            'columns' => 'integer',
            'module_area_sqm' => 'float',
            'density_ratio' => 'float',
            'capacity_kwp' => 'float',
            'annual_production_kwh' => 'float',
            'capex_total_idr' => 'integer',
            'monthly_saving_idr' => 'integer',
            'annual_saving_idr' => 'integer',
            'payback_years' => 'float',
            'co2_reduction_kg_per_year' => 'float',
            'trees_equivalent' => 'integer',
            'daily_irradiance_kwh_per_sqm' => 'float',
            'incidence_factor' => 'float',
            'performance_ratio' => 'float',
            'tariff_idr_per_kwh' => 'float',
            'capex_breakdown' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function imageryAsset(): BelongsTo
    {
        return $this->belongsTo(ImageryAsset::class);
    }

    /**
     * @param  array<int, array{0: float, 1: float}>  $ring
     */
    public function setRoofPolygon(array $ring): static
    {
        return $this->setPolygon('roof_polygon', $ring);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function roofPolygonGeoJson(): ?array
    {
        return $this->polygonGeoJson('roof_polygon');
    }
}
