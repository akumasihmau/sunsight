<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\UploadedFile;

/**
 * Permintaan deteksi bidang atap atas satu tangkapan peta.
 *
 * Georeferensi datang dari klien dalam bentuk `bbox`, sedangkan skalanya dihitung
 * server. Pemeriksaan konsistensi bbox ada di `CaptureRequest` karena alur simpan
 * tanpa deteksi memakai angka yang sama; kelas ini hanya menambahkan berkas citra.
 */
class RoofDetectionRequest extends CaptureRequest
{
    /** Batas ukuran berkas, dalam kilobita. */
    public const MAX_FILE_KB = 10 * 1024;

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'file' => ['required', 'file', 'image', 'mimes:jpeg,png,webp', 'max:'.self::MAX_FILE_KB],
            'min_confidence' => ['sometimes', 'nullable', 'numeric', 'between:0,1'],
        ]);
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

    public function minConfidence(): ?float
    {
        $value = $this->validated('min_confidence');

        return $value === null ? null : (float) $value;
    }
}
