<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk ringkas untuk daftar riwayat.
 *
 * Poligon dan blok asumsi sengaja tidak disertakan: keduanya berat dan tidak
 * dibutuhkan untuk menampilkan daftar. Detailnya tersedia lewat AnalysisResource.
 */
class AnalysisSummaryResource extends JsonResource
{
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
            'usable_area_sqm' => round((float) $this->resource->usable_area_sqm, 2),
            'shadow_area_sqm' => round((float) $this->resource->shadow_area_sqm, 2),
            'estimated_energy_kwh_per_day' => round((float) $this->resource->estimated_energy_kwh_per_day, 2),
            'roof_orientation_deg' => round((float) $this->resource->roof_orientation_deg, 2),
            'created_at' => $this->resource->created_at?->toISOString(),
        ];
    }
}
