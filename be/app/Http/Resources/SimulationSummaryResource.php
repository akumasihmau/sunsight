<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk ringkas untuk daftar riwayat simulasi.
 */
class SimulationSummaryResource extends JsonResource
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
            'capacity_kwp' => round((float) $this->resource->capacity_kwp, 3),
            'annual_production_kwh' => round((float) $this->resource->annual_production_kwh, 2),
            'monthly_saving_idr' => (int) $this->resource->monthly_saving_idr,
            'payback_years' => $this->resource->payback_years === null
                ? null
                : round((float) $this->resource->payback_years, 2),
            'created_at' => $this->resource->created_at?->toISOString(),
        ];
    }
}
