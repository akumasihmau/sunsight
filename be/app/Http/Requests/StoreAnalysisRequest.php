<?php

namespace App\Http\Requests;

class StoreAnalysisRequest extends PolygonRequest
{
    /**
     * Field asumsi yang wajib ikut tersimpan agar angka energi dapat direproduksi.
     *
     * @var array<string, array<int, string>>
     */
    private const ASSUMPTION_RULES = [
        'assumptions.module_efficiency' => ['required', 'numeric', 'between:0,1'],
        'assumptions.performance_ratio' => ['required', 'numeric', 'between:0,1'],
        'assumptions.tilt_deg' => ['required', 'numeric', 'between:0,90'],
        'assumptions.tilt_factor' => ['required', 'numeric', 'gt:0'],
        'assumptions.irradiance_source' => ['required', 'string', 'max:255'],
        'assumptions.irradiance_period' => ['required', 'string', 'max:255'],
        'assumptions.irradiance_kwh_per_sqm_day' => ['required', 'numeric', 'gt:0'],
    ];

    protected function polygonField(): string
    {
        return 'polygon';
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'usable_area_sqm' => ['required', 'numeric', 'gt:0'],
            'shadow_area_sqm' => ['required', 'numeric', 'min:0'],
            'center_point' => ['required', 'array'],
            'center_point.lat' => ['required', 'numeric', 'between:-90,90'],
            'center_point.lng' => ['required', 'numeric', 'between:-180,180'],
            'polygon' => ['required', 'array', 'min:3'],
            'polygon.*' => ['array', 'size:2'],
            'polygon.*.*' => ['numeric'],
            'estimated_energy_kwh_per_day' => ['required', 'numeric', 'min:0'],
            'roof_orientation_deg' => ['required', 'numeric', 'between:0,180'],
            'recommended_azimuth_deg' => ['required', 'numeric', 'between:0,360'],
            'assumptions' => ['required', 'array'],
            ...self::ASSUMPTION_RULES,
        ];
    }
}
