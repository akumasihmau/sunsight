<?php

namespace App\Http\Controllers;

use App\Http\Requests\CaptureRequest;
use App\Services\Imagery\ImageryAssetStore;
use App\Services\Imagery\ImageryBoundingBox;
use Illuminate\Http\JsonResponse;

/**
 * Mencatat georeferensi tampilan peta tanpa menjalankan model.
 *
 * Studio mengizinkan pengguna menggambar bidang sendiri; alur itu tidak memanggil
 * layanan model, tetapi simpan tetap membutuhkan acuan tangkapan untuk mengubah
 * poligon layar menjadi meter. Endpoint ini menulis acuan itu — baris aset yang sama
 * dengan yang dibuat `POST /roof-detections`, hanya tanpa berkas citra.
 *
 * Tidak ada citra tangkapan yang disimpan, sama seperti alur deteksi: yang dicatat
 * hanyalah batas, ukuran, zoom, dan skala.
 */
class CaptureController extends Controller
{
    public function __construct(private readonly ImageryAssetStore $assets) {}

    public function __invoke(CaptureRequest $request): JsonResponse
    {
        $bbox = $request->bbox();
        $width = (int) $request->validated('width');
        $height = (int) $request->validated('height');
        $zoom = $request->validated('zoom');
        $metersPerPixel = ImageryBoundingBox::metersPerPixelFromBbox($bbox, $width, $height)['lat'];

        $asset = $this->assets->storeCapture(
            userId: (int) $request->user()->getKey(),
            width: $width,
            height: $height,
            zoom: $zoom === null ? null : (int) $zoom,
            bbox: $bbox,
            metersPerPixel: $metersPerPixel,
        );

        return response()->json([
            'image_id' => $asset->image_id,
            'image' => [
                'width' => $width,
                'height' => $height,
                'bbox' => $bbox,
                'meters_per_pixel' => round($metersPerPixel, 4),
                'zoom' => $zoom === null ? null : (int) $zoom,
            ],
        ], 201);
    }
}
