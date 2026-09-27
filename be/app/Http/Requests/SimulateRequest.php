<?php

namespace App\Http\Requests;

use App\Services\Simulation\SimulationCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Masukan simulasi.
 *
 * Perhatikan yang **tidak** ada di sini: kapasitas, produksi, penghematan, payback,
 * dan seluruh angka hasil lainnya. Klien hanya mengirim masukan; hasilnya selalu
 * dihitung server. Kunci hasil yang ikut terkirim akan diabaikan, bukan dipakai.
 */
class SimulateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'image_id' => ['required', 'string', 'uuid'],

            'roof_rect' => ['required', 'array'],
            'roof_rect.x' => ['required', 'numeric', 'min:0'],
            'roof_rect.y' => ['required', 'numeric', 'min:0'],
            'roof_rect.width' => ['required', 'numeric', 'gt:0'],
            'roof_rect.height' => ['required', 'numeric', 'gt:0'],
            'roof_rect.rotation_deg' => ['required', 'numeric', 'between:-45,45'],

            'setback_m' => ['required', 'numeric', 'between:0,5'],
            'gutter_m' => ['required', 'numeric', 'between:0,5'],
            'tilt_deg' => ['required', 'numeric', 'between:0,60'],
            'azimuth_deg' => ['required', 'numeric', 'between:0,360'],

            'module_key' => ['required', 'string', Rule::in(SimulationCatalog::moduleKeys())],
            'orientation' => ['required', 'string', Rule::in(['portrait', 'landscape'])],
            'clearance_m' => ['required', 'numeric', 'between:0,1'],
            // Kosong berarti isi seluruh slot maksimum. Batas atas diberi untuk
            // menjaga masukan yang ekstrem, bukan untuk memotong; pemotongan ke
            // jumlah slot dilakukan mesin tata letak.
            'panel_count' => ['present', 'nullable', 'integer', 'min:0', 'max:5000'],
            'inverter_type' => ['required', 'string', Rule::in(['string', 'micro'])],

            'monthly_bill_idr' => ['required', 'integer', 'min:0'],
            'tariff_key' => ['required', 'string', Rule::in(SimulationCatalog::tariffKeys())],
        ];
    }

    /**
     * Masukan simulasi tanpa kunci hasil, siap diteruskan ke perhitungan server.
     *
     * @return array<string, mixed>
     */
    public function simulationInput(): array
    {
        /** @var array<string, mixed> $validated */
        $validated = $this->validated();

        return $validated;
    }
}
