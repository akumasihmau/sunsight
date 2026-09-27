<?php

namespace App\Services\Imagery;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Satu-satunya tempat yang mengetahui tata letak berkas citra di disk.
 *
 * Aset selalu ditulis sebagai PNG agar ekstensinya tidak pernah menjadi tebakan
 * saat dibaca kembali, dan selalu berada di bawah direktori pemiliknya. Kepemilikan
 * karena itu ditegakkan oleh letak berkas, bukan oleh kolom di basis data.
 */
class ImageryAssetStore
{
    private const DISK = 'public';

    private const DIRECTORY = 'imagery';

    private const EXTENSION = 'png';

    /**
     * @return array{imageId: string, path: string, url: string}
     */
    public function store(int $userId, string $pngBinary): array
    {
        $imageId = (string) Str::uuid();
        $path = $this->path($userId, $imageId);

        if (! Storage::disk(self::DISK)->put($path, $pngBinary)) {
            throw new RuntimeException("Gagal menulis aset citra ke {$path}.");
        }

        return [
            'imageId' => $imageId,
            'path' => $path,
            'url' => $this->url($path),
        ];
    }

    public function path(int $userId, string $imageId): string
    {
        return sprintf('%s/%d/%s.%s', self::DIRECTORY, $userId, $imageId, self::EXTENSION);
    }

    public function url(string $path): string
    {
        return Storage::disk(self::DISK)->url($path);
    }

    /**
     * Mencari aset milik user tertentu.
     *
     * Mengembalikan null baik ketika aset tidak ada maupun ketika aset itu milik
     * user lain, sehingga keberadaan aset orang lain tidak dapat dibedakan.
     */
    public function findFor(int $userId, string $imageId): ?string
    {
        if (! Str::isUuid($imageId)) {
            return null;
        }

        $path = $this->path($userId, $imageId);

        return Storage::disk(self::DISK)->exists($path) ? $path : null;
    }
}
