<?php

namespace App\Http\Requests;

use App\Services\Imagery\ImageryBoundingBox;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Permintaan deteksi bidang atap atas satu tangkapan peta.
 *
 * Georeferensi datang dari klien dalam bentuk `bbox`, sedangkan skalanya dihitung
 * server. Pemeriksaan konsistensi bbox dilakukan di sini, bukan di pengendali,
 * karena bbox yang tidak cocok dengan ukuran berkas bukan kegagalan sistem melainkan
 * masukan yang salah — hasilnya harus 422 dengan field yang dapat ditunjuk.
 */
class RoofDetectionRequest extends FormRequest
{
    /** Batas ukuran berkas, dalam kilobita. */
    public const MAX_FILE_KB = 10 * 1024;

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
            'file' => ['required', 'file', 'image', 'mimes:jpeg,png,webp', 'max:'.self::MAX_FILE_KB],
            'bbox' => ['required', 'json'],
            'width' => ['required', 'integer', 'between:64,4096'],
            'height' => ['required', 'integer', 'between:64,4096'],
            'zoom' => ['sometimes', 'nullable', 'integer', 'between:15,22'],
            'min_confidence' => ['sometimes', 'nullable', 'numeric', 'between:0,1'],
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
     * Batas ukuran berkas dijawab 413, bukan 422.
     *
     * Kontrak membedakan keduanya: 422 berarti permintaannya yang salah, 413 berarti
     * berkasnya sendiri yang terlalu besar. Tanpa pemisahan ini klien akan mengira ia
     * salah mengirim bentuk permintaan, lalu mencoba memperbaiki hal yang tidak salah.
     */
    protected function failedValidation(Validator $validator): void
    {
        $file = $this->file('file');
        $size = $file instanceof UploadedFile ? $file->getSize() : false;

        if ($size !== false && $size > self::MAX_FILE_KB * 1024 && $validator->errors()->has('file')) {
            throw new HttpResponseException(response()->json([
                'message' => 'Berkas tangkapan melebihi batas '.(self::MAX_FILE_KB / 1024).' MB.',
            ], 413));
        }

        parent::failedValidation($validator);
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

    public function minConfidence(): ?float
    {
        $value = $this->validated('min_confidence');

        return $value === null ? null : (float) $value;
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
