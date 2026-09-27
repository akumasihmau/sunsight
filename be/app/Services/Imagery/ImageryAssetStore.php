<?php

namespace App\Services\Imagery;

use App\Models\ImageryAsset;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Satu-satunya tempat yang mengetahui tata letak berkas citra dan metadatanya.
 *
 * Ekstensi berkas ditentukan dari tipe MIME sungguhan, bukan dipaksa. Penyedia
 * citra raster mengembalikan JPEG, sehingga menamainya `.png` membuat ekstensi
 * berbohong dan merusak apa pun yang mempercayainya. Ekstensi yang dipakai
 * dicatat di metadata aset, dan pembacaan kembali memakai catatan itu.
 *
 * Berkas selalu berada di bawah direktori pemiliknya, sehingga kepemilikan
 * ditegakkan dua kali: oleh kueri atas user_id, dan oleh letak berkasnya.
 */
class ImageryAssetStore
{
    private const DISK = 'public';

    private const DIRECTORY = 'imagery';

    /**
     * @param  array{0: float, 1: float, 2: float, 3: float}  $bbox
     */
    public function storeImagery(
        int $userId,
        string $binary,
        float $lat,
        float $lng,
        int $zoom,
        array $bbox,
        float $metersPerPixel,
    ): ImageryAsset {
        return $this->persist($userId, $binary, ImageryAsset::KIND_RAW, [
            'center_lat' => $lat,
            'center_lng' => $lng,
            'zoom' => $zoom,
            'bbox' => $bbox,
            'meters_per_pixel' => $metersPerPixel,
        ]);
    }

    /**
     * Menyimpan mask atau turunan lain yang tidak punya georeferensi.
     */
    public function storeDerived(int $userId, string $binary, string $kind): ImageryAsset
    {
        return $this->persist($userId, $binary, $kind, []);
    }

    /**
     * Mencari aset milik user tertentu.
     *
     * Mengembalikan null baik ketika aset tidak ada maupun ketika aset itu milik
     * user lain, sehingga keberadaan aset orang lain tidak dapat dibedakan.
     */
    public function findFor(int $userId, string $imageId, string $kind = ImageryAsset::KIND_RAW): ?ImageryAsset
    {
        if (! Str::isUuid($imageId)) {
            return null;
        }

        return ImageryAsset::query()
            ->where('user_id', $userId)
            ->where('image_id', $imageId)
            ->where('kind', $kind)
            ->first();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function persist(int $userId, string $binary, string $kind, array $attributes): ImageryAsset
    {
        $image = getimagesizefromstring($binary);

        if ($image === false) {
            throw new RuntimeException('Isi citra bukan berkas gambar yang dikenali.');
        }

        [$extension, $mimeType] = self::describe($image['mime'] ?? '');

        $imageId = (string) Str::uuid();
        $path = sprintf('%s/%d/%s.%s', self::DIRECTORY, $userId, $imageId, $extension);

        if (! Storage::disk(self::DISK)->put($path, $binary)) {
            throw new RuntimeException("Gagal menulis aset citra ke {$path}.");
        }

        return ImageryAsset::create([
            'image_id' => $imageId,
            'user_id' => $userId,
            'kind' => $kind,
            'path' => $path,
            'extension' => $extension,
            'mime_type' => $mimeType,
            'width' => $image[0],
            'height' => $image[1],
            ...$attributes,
        ]);
    }

    /**
     * @return array{0: string, 1: string}
     */
    private static function describe(string $mimeType): array
    {
        return match ($mimeType) {
            'image/jpeg' => ['jpg', 'image/jpeg'],
            'image/png' => ['png', 'image/png'],
            'image/webp' => ['webp', 'image/webp'],
            default => throw new RuntimeException(
                "Tipe citra tidak didukung: {$mimeType}. Diharapkan JPEG, PNG, atau WebP.",
            ),
        };
    }
}
