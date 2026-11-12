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

        // Dimensi, kemiringan, dan modul bidang pertama ikut dikirim supaya kartu
        // dashboard tidak menampilkan nol atau modul bawaan untuk proyek tersimpan.
        // Untuk simulasi banyak bidang, nilai ini mewakili bidang pertama.
        $primary = $simulation->roofs->first();

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
            // Angka agregat lain dipakai dashboard supaya kartu proyek tidak perlu
            // menghitung ulang apa pun dari ringkasan.
            'total_area_sqm' => round((float) $simulation->total_area_sqm, 2),
            'effective_area_sqm' => round((float) $simulation->effective_area_sqm, 2),
            'installed' => (int) $simulation->installed,
            'module_key' => $primary?->module_key,
            'roof_length_m' => $primary === null ? null : round((float) $primary->roof_length_m, 2),
            'roof_width_m' => $primary === null ? null : round((float) $primary->roof_width_m, 2),
            'tilt_deg' => $primary === null ? null : round((float) $primary->tilt_deg, 2),
            // Dipakai kartu dampak ekologis; tanpa keduanya dashboard membaca
            // `undefined` dan gagal saat memformat angka.
            'co2_reduction_kg_per_year' => round((float) $simulation->co2_reduction_kg_per_year, 2),
            'trees_equivalent' => (int) $simulation->trees_equivalent,
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
