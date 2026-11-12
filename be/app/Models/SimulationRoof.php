<?php

namespace App\Models;

use App\Models\Concerns\StoresPolygonGeometry;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu bidang atap di dalam sebuah simulasi.
 *
 * Barisnya memuat geometri bidang apa adanya dari hasil deteksi, masukan yang
 * dipilih pengguna untuk bidang itu, dan hasil hitungan server untuknya. Disimpan
 * per bidang karena keseluruhan simulasi tidak dapat menggantikannya: label, jejak
 * deteksi, dan kemiringan tiap bidang berbeda satu sama lain.
 */
#[Fillable([
    'label',
    'detection_id',
    'shape',
    'model_version',
    'confidence',
    'roof_polygon_px',
    'roof_width_m',
    'roof_length_m',
    'rotation_deg',
    'setback_m',
    'gutter_m',
    'tilt_deg',
    'azimuth_deg',
    'facet_rotation_deg',
    'module_key',
    'orientation',
    'clearance_m',
    'panel_count',
    'align_to_azimuth',
    'is_solar_populated',
    'has_hvac',
    'has_skylight',
    'slot_overrides',
    'obstacles',
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
])]
class SimulationRoof extends Model
{
    use StoresPolygonGeometry;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'confidence' => 'float',
            'roof_polygon_px' => 'array',
            'roof_width_m' => 'float',
            'roof_length_m' => 'float',
            'rotation_deg' => 'float',
            'setback_m' => 'float',
            'gutter_m' => 'float',
            'tilt_deg' => 'float',
            'azimuth_deg' => 'float',
            'facet_rotation_deg' => 'float',
            'panel_count' => 'integer',
            'align_to_azimuth' => 'boolean',
            'is_solar_populated' => 'boolean',
            'has_hvac' => 'boolean',
            'has_skylight' => 'boolean',
            'slot_overrides' => 'array',
            'obstacles' => 'array',
            'effective_area_sqm' => 'float',
            'max_slots' => 'integer',
            'installed' => 'integer',
            'rows' => 'integer',
            'columns' => 'integer',
            'module_area_sqm' => 'float',
            'density_ratio' => 'float',
            'capacity_kwp' => 'float',
            'annual_production_kwh' => 'float',
        ];
    }

    public function simulation(): BelongsTo
    {
        return $this->belongsTo(Simulation::class);
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
