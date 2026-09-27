<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk lengkap satu riwayat analisis, termasuk poligon dan asumsi yang dipakai.
 *
 * Asumsi wajib ikut dikembalikan: tanpa itu angka energi tidak dapat
 * dipertanggungjawabkan saat detail dibuka kembali.
 */
class AnalysisResource extends JsonResource
{
    /**
     * Kontrak menetapkan respons detail sebagai objek datar, bukan dibungkus `data`.
     * Daftar riwayat tetap memakai pembungkus `data` beserta `meta` dan `links`
     * lewat AnalysisSummaryResource.
     *
     * @var string|null
     */
    public static $wrap = null;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'center_point' => [
                'lat' => $this->resource->center_lat,
                'lng' => $this->resource->center_lng,
            ],
            'roof_polygon' => $this->resource->roofPolygonGeoJson(),
            'usable_area_sqm' => round((float) $this->resource->usable_area_sqm, 2),
            'shadow_area_sqm' => round((float) $this->resource->shadow_area_sqm, 2),
            'estimated_energy_kwh_per_day' => round((float) $this->resource->estimated_energy_kwh_per_day, 2),
            'roof_orientation_deg' => round((float) $this->resource->roof_orientation_deg, 2),
            'recommended_azimuth_deg' => round((float) $this->resource->recommended_azimuth_deg, 2),
            'assumptions' => $this->resource->assumptions(),
            'created_at' => $this->resource->created_at?->toISOString(),
        ];
    }
}
