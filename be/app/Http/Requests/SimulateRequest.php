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

    /**
     * Rintangan terbanyak per bidang.
     *
     * Satu bidang dapat memiliki ratusan slot, tetapi hanya slot yang benar-benar
     * ditandai rintangan yang dikirim. Batas ini menjaga badan permintaan tetap wajar.
     */
    public const MAX_OBSTACLES = 512;

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

            // Masukan global studio yang memengaruhi produksi seluruh bidang.
            // Nilai bawaannya sama dengan posisi awal antarmuka.
            'sun_hour' => ['sometimes', 'nullable', 'numeric', 'between:6,18'],
            'extra_tilt' => ['sometimes', 'nullable', 'numeric', 'between:0,20'],

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

            // Rotasi yang diterapkan pengguna pada poligon. Dipakai server untuk
            // menyelaraskan kisi modul dengan azimuth; tidak mengubah luas.
            'roofs.*.facet_rotation_deg' => ['sometimes', 'nullable', 'numeric', 'between:-45,45'],

            // Rintangan dikirim sebagai geometri slot, bukan indeks baris/kolom,
            // karena kisi server tidak identik dengan kisi antarmuka.
            'roofs.*.obstacles' => ['sometimes', 'nullable', 'array', 'max:'.self::MAX_OBSTACLES],
            'roofs.*.obstacles.*.type' => ['required', 'string', Rule::in(['hvac', 'skylight', 'empty'])],
            'roofs.*.obstacles.*.polygon_px' => ['required', 'array', 'min:3'],
            'roofs.*.obstacles.*.polygon_px.*' => ['required', 'array', 'size:2'],
            'roofs.*.obstacles.*.polygon_px.*.0' => ['required', 'numeric'],
            'roofs.*.obstacles.*.polygon_px.*.1' => ['required', 'numeric'],

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

        // Nilai bawaan disamakan dengan posisi awal studio supaya klien yang belum
        // mengirim masukan ini tetap menghasilkan angka seperti sebelumnya.
        $validated['sun_hour'] = (float) ($validated['sun_hour'] ?? 12.0);
        $validated['extra_tilt'] = (float) ($validated['extra_tilt'] ?? 10.0);

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

            // Rintangan dirapikan dengan aturan yang sama seperti bidang: ring yang
            // menyilang tidak dapat dipakai menguji singgungan badan modul.
            $obstacles = [];

            foreach ((array) ($roof['obstacles'] ?? []) as $obstacle) {
                $obstacleRing = PolygonGeometry::makeSimple(array_map(
                    static fn (array $point): array => [(float) $point[0], (float) $point[1]],
                    (array) ($obstacle['polygon_px'] ?? []),
                ));

                // Tiga titik sudut — ring tertutup berisi empat titik — adalah minimum
                // bidang yang sah. Rintangan yang runtuh tidak mengecualikan apa pun.
                if (count($obstacleRing) < 4) {
                    continue;
                }

                $obstacles[] = [
                    'type' => (string) $obstacle['type'],
                    'polygon_px' => PolygonGeometry::openRing($obstacleRing),
                ];
            }

            $roof['obstacles'] = $obstacles;
            $roof['facet_rotation_deg'] = (float) ($roof['facet_rotation_deg'] ?? 0.0);

            $validated['roofs'][] = $roof;
        }

        return $validated;
    }
}
