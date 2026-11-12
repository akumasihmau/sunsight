<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Satu simulasi PLTS tersimpan: agregat dari seluruh bidang atapnya.
 *
 * Geometri, masukan teknis, dan hasil tata letak tiap bidang berada di
 * `SimulationRoof`; yang disimpan di sini adalah masukan global dan angka agregat
 * yang dihitung dari seluruh bidang.
 *
 * Hasil disimpan bersama asumsinya supaya simulasi lama tetap menampilkan angka
 * seperti saat dihitung, meskipun tarif atau harga modul di konfigurasi berubah.
 */
#[Fillable([
    'user_id',
    'imagery_asset_id',
    'center_lat',
    'center_lng',
    'address',
    'map_zoom',
    'sun_hour',
    'extra_tilt_deg',
    'inverter_type',
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
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'center_lat' => 'float',
            'center_lng' => 'float',
            'map_zoom' => 'integer',
            'sun_hour' => 'float',
            'extra_tilt_deg' => 'float',
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
     * Bidang atap simulasi, berurutan seperti saat dikirim pengguna.
     *
     * Urutannya dipatok, bukan diserahkan pada basis data: tanpa itu, daftar bidang
     * dapat berubah urutan antar pemanggilan, dan antarmuka yang mencocokkan bidang
     * berdasarkan posisinya akan salah menampilkan hasil.
     */
    public function roofs(): HasMany
    {
        return $this->hasMany(SimulationRoof::class)->orderBy('id');
    }
}
