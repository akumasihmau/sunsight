<?php

namespace App\Services\Imagery;

use App\Models\ImageryAsset;

interface ImageryProvider
{
    /**
     * Mengambil citra nadir untuk satu titik dan menyimpannya sebagai aset milik user.
     *
     * @param  float  $lat  Lintang, -90 s.d. 90.
     * @param  float  $lng  Bujur, -180 s.d. 180.
     * @param  int  $zoom  Tingkat perbesaran.
     * @param  int  $userId  Pemilik aset; menentukan direktori penyimpanan.
     */
    public function fetch(float $lat, float $lng, int $zoom, int $userId): ImageryAsset;

    /**
     * Teks atribusi yang wajib ditampilkan antarmuka.
     *
     * Penyedia komersial melarang penghapusan tanda kepemilikannya, sehingga
     * atribusi diperlakukan sebagai bagian dari respons, bukan hiasan.
     */
    public function attribution(): string;
}
