<?php

namespace App\Http\Requests;

use App\Services\Geometry\PolygonGeometry;
use App\Services\Simulation\SimulationCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Masukan simulasi: satu citra dan satu sampai dua belas bidang atap.
 *
 * Perhatikan yang **tidak** ada di sini: kapasitas, produksi, penghematan, payback,
 * dan seluruh angka hasil lainnya. Klien hanya mengirim masukan; hasilnya selalu
 * dihitung server. Kunci hasil yang ikut terkirim akan diabaikan, bukan dipakai.
 *
 * Aturan bidang ditulis per kolom (`roofs.*.`) supaya kesalahan dapat ditunjuk tepat
 * ke bidang yang salah, bukan sekadar "roofs tidak valid".
 */
class SimulateRequest extends FormRequest
{
    /**
     * Bidang atap terbanyak dalam satu simulasi.
     *
     * Batas ini melindungi perhitungan dari citra yang seluruhnya dianggap atap,
     * bukan membatasi penggunaan yang wajar: atap rumah tinggal jarang lebih dari
     * beberapa bidang.
     */
    public const MAX_ROOFS = 12;

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

            'roofs' => ['required', 'array', 'min:1', 'max:'.self::MAX_ROOFS],

            'roofs.*.label' => ['sometimes', 'nullable', 'string', 'max:80'],
            'roofs.*.detection_id' => ['sometimes', 'nullable', 'string', 'max:64'],
            'roofs.*.confidence' => ['sometimes', 'nullable', 'numeric', 'between:0,1'],

            'roofs.*.roof_polygon_px' => ['required', 'array', 'min:3'],
            'roofs.*.roof_polygon_px.*' => ['required', 'array', 'size:2'],
            'roofs.*.roof_polygon_px.*.0' => ['required', 'numeric'],
            'roofs.*.roof_polygon_px.*.1' => ['required', 'numeric'],

            'roofs.*.setback_m' => ['required', 'numeric', 'between:0,5'],
            // Talang tidak diterapkan pada poligon bebas, tetapi tetap wajib dikirim
            // supaya maksud pengguna tersimpan dan terbaca kembali.
            'roofs.*.gutter_m' => ['required', 'numeric', 'between:0,5'],
            'roofs.*.tilt_deg' => ['required', 'numeric', 'between:0,60'],
            'roofs.*.azimuth_deg' => ['required', 'numeric', 'between:0,360'],

            'roofs.*.module_key' => ['required', 'string', Rule::in(SimulationCatalog::moduleKeys())],
            'roofs.*.orientation' => ['required', 'string', Rule::in(['portrait', 'landscape'])],
            'roofs.*.clearance_m' => ['required', 'numeric', 'between:0,1'],
            // Kosong berarti isi seluruh slot maksimum. Batas atas diberi untuk
            // menjaga masukan yang ekstrem, bukan untuk memotong; pemotongan ke
            // jumlah slot dilakukan mesin tata letak.
            'roofs.*.panel_count' => ['present', 'nullable', 'integer', 'min:0', 'max:5000'],

            // Keadaan tampilan studio, disimpan agar simulasi dapat dibuka kembali
            // persis seperti saat disimpan. Opsional supaya klien lain tetap dapat
            // menyimpan tanpa mengirimnya.
            'roofs.*.shape' => ['sometimes', 'nullable', 'string', Rule::in(['rectangle', 'l-shape', 'trapezoid', 'custom_polygon'])],
            'roofs.*.align_to_azimuth' => ['sometimes', 'nullable', 'boolean'],
            'roofs.*.is_solar_populated' => ['sometimes', 'nullable', 'boolean'],
            'roofs.*.has_hvac' => ['sometimes', 'nullable', 'boolean'],
            'roofs.*.has_skylight' => ['sometimes', 'nullable', 'boolean'],
            'roofs.*.slot_overrides' => ['sometimes', 'nullable', 'array'],
            'roofs.*.slot_overrides.*' => ['string', Rule::in(['active', 'skylight', 'hvac', 'empty'])],

            // Label lokasi seperti yang diketik pengguna; tidak memengaruhi hitungan.
            'address' => ['sometimes', 'nullable', 'string', 'max:160'],

            'inverter_type' => ['required', 'string', Rule::in(['string', 'micro'])],

            'monthly_bill_idr' => ['required', 'integer', 'min:0'],
            'tariff_key' => ['required', 'string', Rule::in(SimulationCatalog::tariffKeys())],
        ];
    }

    /**
     * Masukan simulasi tanpa kunci hasil, siap diteruskan ke perhitungan server.
     *
     * Poligon tiap bidang dirapikan di sini, sekali, sebelum dipakai apa pun. Dua
     * alasan yang keduanya bukan kosmetik:
     *
     * 1. PostGIS menolak poligon yang menyilang atau menyentuh dirinya sendiri, dan
     *    pengguna dapat menggeser verteks sampai bentuknya menyilang.
     * 2. Shoelace atas ring yang menyilang menghitung sebagian luas dua kali atau
     *    saling menghapus, padahal luas itulah dasar kapasitas dan payback.
     *
     * Ring hasil perapian dipakai untuk segalanya — luas, GeoJSON, dan
     * `roof_polygon_px` yang disimpan — sehingga tidak ada dua versi bidang yang
     * dapat saling menyimpang.
     *
     * @return array<string, mixed>
     */
    public function simulationInput(): array
    {
        /** @var array<string, mixed> $validated */
        $validated = $this->validated();

        /** @var array<int, array<string, mixed>> $roofs */
        $roofs = $validated['roofs'];

        $validated['roofs'] = [];

        foreach ($roofs as $index => $roof) {
            $ring = PolygonGeometry::makeSimple(array_map(
                static fn (array $point): array => [(float) $point[0], (float) $point[1]],
                (array) $roof['roof_polygon_px'],
            ));

            if (count($ring) < 4) {
                throw ValidationException::withMessages([
                    "roofs.{$index}.roof_polygon_px" => [
                        'Poligon bidang atap tidak membentuk bidang yang sah.',
                    ],
                ]);
            }

            // Ring piksel disimpan dan dikirim terbuka; titik penutup hanya syarat
            // ring GeoJSON.
            $roof['roof_polygon_px'] = PolygonGeometry::openRing($ring);
            $validated['roofs'][] = $roof;
        }

        return $validated;
    }
}
