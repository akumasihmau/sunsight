<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk ringkas untuk daftar riwayat simulasi.
 *
 * Hanya memuat yang dibutuhkan daftar: penanda, lokasi peta, jumlah bidang, dan
 * angka agregat yang menjadi ringkasan hasil.
 */
class SimulationSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $simulation = $this->resource;

        return [
            'id' => $simulation->id,
            // Dipakai dashboard sebagai nama proyek; tidak memengaruhi hitungan.
            'address' => $simulation->address,
            'center_point' => [
                'lat' => $simulation->center_lat,
                'lng' => $simulation->center_lng,
            ],
            // Dihitung lewat withCount() pada daftarnya; dihitung langsung hanya bila
            // resource ini dipakai tanpa query yang sudah menyiapkannya.
            'roof_count' => (int) ($simulation->roofs_count ?? $simulation->roofs()->count()),
            'capacity_kwp' => round((float) $simulation->capacity_kwp, 3),
            'annual_production_kwh' => round((float) $simulation->annual_production_kwh, 2),
            'monthly_saving_idr' => (int) $simulation->monthly_saving_idr,
            'payback_years' => $simulation->payback_years === null
                ? null
                : round((float) $simulation->payback_years, 2),
            'created_at' => $simulation->created_at?->toISOString(),
        ];
    }
}
