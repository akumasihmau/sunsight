<?php

namespace App\Services\Imagery;

use App\Models\ImageryAsset;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Satu-satunya tempat yang mengetahui tata letak berkas citra dan metadatanya.
 *
 * Aset selalu ditulis sebagai PNG sehingga ekstensinya tidak pernah menjadi tebakan
 * saat dibaca kembali, dan selalu berada di bawah direktori pemiliknya. Kepemilikan
 * ditegakkan dua kali: oleh kueri atas user_id, dan oleh letak berkasnya.
 */
class ImageryAssetStore
{
    private const DISK = 'public';

    private const DIRECTORY = 'imagery';

    private const EXTENSION = 'png';

    /**
     * Menyimpan citra dasar beserta georeferensinya.
     *
     * @param  array{0: float, 1: float, 2: float, 3: float}  $bbox
     */
    public function storeImagery(
        int $userId,
        string $pngBinary,
        float $lat,
        float $lng,
        int $zoom,
        array $bbox,
        float $metersPerPixel,
    ): ImageryAsset {
        return $this->persist($userId, $pngBinary, ImageryAsset::KIND_RAW, [
            'center_lat' => $lat,
            'center_lng' => $lng,
            'zoom' => $zoom,
            'bbox' => $bbox,
            'meters_per_pixel' => $metersPerPixel,
        ]);
    }

    /**
     * Menyimpan mask turunan yang tidak punya georeferensi.
     */
    public function storeDerived(int $userId, string $pngBinary, string $kind): ImageryAsset
    {
        return $this->persist($userId, $pngBinary, $kind, []);
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
    private function persist(int $userId, string $pngBinary, string $kind, array $attributes): ImageryAsset
    {
        $size = getimagesizefromstring($pngBinary);

        if ($size === false) {
            throw new RuntimeException('Aset citra bukan PNG yang dikenali.');
        }

        $imageId = (string) Str::uuid();
        $path = sprintf('%s/%d/%s.%s', self::DIRECTORY, $userId, $imageId, self::EXTENSION);

        if (! Storage::disk(self::DISK)->put($path, $pngBinary)) {
            throw new RuntimeException("Gagal menulis aset citra ke {$path}.");
        }

        return ImageryAsset::create([
            'image_id' => $imageId,
            'user_id' => $userId,
            'kind' => $kind,
            'path' => $path,
            'width' => $size[0],
            'height' => $size[1],
            ...$attributes,
        ]);
    }
}
