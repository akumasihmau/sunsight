<?php

namespace App\Services\Cv;

/**
 * Batas antara aplikasi dan pemrosesan citra.
 *
 * Implementasi nyatanya menjalankan skrip Python sebagai proses terpisah, tetapi
 * seluruh aplikasi hanya bergantung pada antarmuka ini sehingga penggantinya
 * tidak menyentuh controller.
 */
interface CvClient
{
    /**
     * Merapikan poligon kasar menjadi poligon presisi batas atap.
     *
     * @param  string  $imagePath  Jalur absolut citra di disk.
     * @param  array<int, array{0: float, 1: float}>  $roughPolygon  Koordinat piksel.
     */
    public function refinePolygon(string $imagePath, array $roughPolygon): CvRefineResult;

    /**
     * Menaksir luas area atap yang tidak berbayang di dalam poligon presisi.
     *
     * @param  string  $imagePath  Jalur absolut citra di disk.
     * @param  array<int, array{0: float, 1: float}>  $refinedPolygon  Koordinat piksel.
     * @param  float  $metersPerPixel  Skala citra, dipakai mengubah luas piksel menjadi meter persegi.
     */
    public function detectShadow(string $imagePath, array $refinedPolygon, float $metersPerPixel): CvShadowResult;
}
