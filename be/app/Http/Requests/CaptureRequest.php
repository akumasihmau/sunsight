<?php

namespace App\Http\Requests;

use App\Services\Imagery\ImageryBoundingBox;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

/**
 * Georeferensi satu tampilan peta tanpa berkas citra.
 *
 * Dipakai dua alur: `POST /roof-detections` yang menambahkan berkas untuk model,
 * dan `POST /captures` yang hanya mencatat batas tampilan. Keduanya menurunkan luas
 * dan tata letak dari angka yang sama — `bbox`, `width`, `height` — sehingga
 * pemeriksaannya harus satu sumber. Bila aturan ini ditulis dua kali, satu alur dapat
 * menerima bbox yang ditolak alur lain, dan luas yang tersimpan menjadi tidak
 * sebanding antar-simulasi.
 */
class CaptureRequest extends FormRequest
{
    /** Rentang lintang maksimum satu tangkapan peta, dalam derajat. */
    public const MAX_LATITUDE_SPAN = 0.05;

    /**
     * Selisih maksimum skala lintang dan bujur, relatif terhadap yang terbesar.
     *
     * Pada proyeksi Web Mercator kedua skala hanya sama di ekuator; di lintang
     * Indonesia selisihnya kecil. Selisih yang jauh lebih besar berarti bbox tidak
     * berasal dari tangkapan yang ukurannya dikirim, dan luas apa pun yang dihitung
     * darinya akan salah tanpa terlihat.
     */
    public const SCALE_TOLERANCE = 0.02;

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
            'bbox' => ['required', 'json'],
            'width' => ['required', 'integer', 'between:64,4096'],
            'height' => ['required', 'integer', 'between:64,4096'],
            'zoom' => ['sometimes', 'nullable', 'integer', 'between:15,22'],
        ];
    }

    /**
     * Pemeriksaan bbox yang tidak dapat dinyatakan sebagai aturan bawaan.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                // Bila bentuk dasarnya belum sah, pesan susulan hanya menambah bising.
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $bbox = $this->decodeBbox();

                if ($bbox === null) {
                    $validator->errors()->add('bbox', 'Isi bbox harus empat angka.');

                    return;
                }

                [$minLng, $minLat, $maxLng, $maxLat] = $bbox;

                if ($minLng >= $maxLng || $minLat >= $maxLat) {
                    $validator->errors()->add(
                        'bbox',
                        'Urutan bbox harus [minLng, minLat, maxLng, maxLat].',
                    );

                    return;
                }

                if ($maxLat - $minLat > self::MAX_LATITUDE_SPAN) {
                    $validator->errors()->add(
                        'bbox',
                        'Rentang lintang bbox melebihi '.self::MAX_LATITUDE_SPAN.' derajat.',
                    );

                    return;
                }

                $scale = ImageryBoundingBox::metersPerPixelFromBbox(
                    bbox: $bbox,
                    width: (int) $this->input('width'),
                    height: (int) $this->input('height'),
                );

                if ($scale['lat'] <= 0.0 || $scale['lng'] <= 0.0) {
                    $validator->errors()->add('bbox', 'Skala bbox tidak dapat dihitung dari ukuran berkas.');

                    return;
                }

                $largest = max($scale['lat'], $scale['lng']);

                if (abs($scale['lat'] - $scale['lng']) / $largest > self::SCALE_TOLERANCE) {
                    $validator->errors()->add(
                        'bbox',
                        'bbox tidak konsisten dengan lebar dan tinggi berkas: skala lintang dan bujur '
                            .'berselisih lebih dari '.((int) (self::SCALE_TOLERANCE * 100)).'%.',
                    );
                }
            },
        ];
    }

    /**
     * Batas tangkapan dalam bentuk yang sudah pasti terbaca.
     *
     * @return array{0: float, 1: float, 2: float, 3: float}
     */
    public function bbox(): array
    {
        $bbox = $this->decodeBbox();

        if ($bbox === null) {
            throw ValidationException::withMessages(['bbox' => ['Isi bbox harus empat angka.']]);
        }

        return $bbox;
    }

    /**
     * @return array{0: float, 1: float, 2: float, 3: float}|null
     */
    private function decodeBbox(): ?array
    {
        $decoded = json_decode((string) $this->input('bbox'), true);

        if (! is_array($decoded) || count($decoded) !== 4) {
            return null;
        }

        $values = [];

        foreach ($decoded as $value) {
            if (! is_numeric($value)) {
                return null;
            }

            $values[] = (float) $value;
        }

        return [$values[0], $values[1], $values[2], $values[3]];
    }
}
