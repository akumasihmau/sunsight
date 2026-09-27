<?php

namespace App\Http\Controllers;

use App\Http\Requests\FetchOsmRequest;
use App\Services\Imagery\ImageryProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComputerVisionController extends Controller
{
    public function __construct(
        private readonly ImageryProvider $imagery,
    ) {}

    public function fetchOsm(FetchOsmRequest $request): JsonResponse
    {
        $result = $this->imagery->fetch(
            lat: (float) $request->validated('lat'),
            lng: (float) $request->validated('lng'),
            zoom: $request->zoom(),
            userId: (int) $request->user()->getKey(),
        );

        return response()->json([
            'image_id' => $result->imageId,
            'image_url' => $result->url,
            'bbox' => $result->bbox,
            'width' => $result->width,
            'height' => $result->height,
            'meters_per_pixel' => round($result->metersPerPixel, 4),
        ]);
    }

    public function refinePolygon(Request $request)
    {
        // TODO: Terima poligon kasar, jalankan script Python (GrabCut/Edge Detection), return poligon presisi
    }

    public function detectShadow(Request $request)
    {
        // TODO: Terima poligon presisi, jalankan script Python untuk deteksi area gelap, return luas area bersih
    }
}
