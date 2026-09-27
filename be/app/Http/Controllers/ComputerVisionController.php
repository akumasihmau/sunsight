<?php

namespace App\Http\Controllers;

use App\Http\Requests\DetectShadowRequest;
use App\Http\Requests\FetchOsmRequest;
use App\Http\Requests\RefinePolygonRequest;
use App\Models\ImageryAsset;
use App\Services\Cv\CvClient;
use App\Services\Imagery\ImageryAssetStore;
use App\Services\Imagery\ImageryProvider;
use Illuminate\Http\JsonResponse;

class ComputerVisionController extends Controller
{
    public function __construct(
        private readonly ImageryProvider $imagery,
        private readonly ImageryAssetStore $assets,
        private readonly CvClient $cv,
    ) {}

    public function fetchOsm(FetchOsmRequest $request): JsonResponse
    {
        $asset = $this->imagery->fetch(
            lat: (float) $request->validated('lat'),
            lng: (float) $request->validated('lng'),
            zoom: $request->zoom(),
            userId: (int) $request->user()->getKey(),
        );

        return response()->json([
            'image_id' => $asset->image_id,
            'image_url' => $asset->url(),
            'bbox' => $asset->bbox,
            'width' => $asset->width,
            'height' => $asset->height,
            'meters_per_pixel' => round($asset->meters_per_pixel, 4),
        ]);
    }

    public function refinePolygon(RefinePolygonRequest $request): JsonResponse
    {
        $userId = (int) $request->user()->getKey();
        $asset = $this->assets->findFor($userId, (string) $request->validated('image_id'));

        if ($asset === null) {
            return $this->imageNotFound();
        }

        $result = $this->cv->refinePolygon($asset->absolutePath(), $request->polygon());

        $mask = $this->assets->storeDerived($userId, $result->maskPng, ImageryAsset::KIND_REFINE_MASK);

        return response()->json([
            'refined_polygon' => $result->refinedPolygon,
            'mask_image_url' => $mask->url(),
        ]);
    }

    public function detectShadow(DetectShadowRequest $request): JsonResponse
    {
        $userId = (int) $request->user()->getKey();
        $asset = $this->assets->findFor($userId, (string) $request->validated('image_id'));

        if ($asset === null) {
            return $this->imageNotFound();
        }

        // Skala berasal dari metadata aset, bukan dari klien, sehingga luas yang
        // dilaporkan tidak dapat dipengaruhi oleh pemanggil.
        $result = $this->cv->detectShadow(
            imagePath: $asset->absolutePath(),
            refinedPolygon: $request->polygon(),
            metersPerPixel: (float) $asset->meters_per_pixel,
        );

        $mask = $this->assets->storeDerived($userId, $result->maskPng, ImageryAsset::KIND_SHADOW_MASK);

        return response()->json([
            'usable_area_sqm' => round($result->usableAreaSqm, 2),
            'shadow_area_sqm' => round($result->shadowAreaSqm, 2),
            'total_area_sqm' => round($result->totalAreaSqm(), 2),
            'shadow_mask_url' => $mask->url(),
        ]);
    }

    private function imageNotFound(): JsonResponse
    {
        return response()->json(['message' => 'Citra tidak ditemukan.'], 404);
    }
}
