<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoofDetectionRequest;
use App\Services\Geometry\PolygonGeometry;
use App\Services\Imagery\ImageryAssetStore;
use App\Services\Imagery\ImageryBoundingBox;
use App\Services\Ml\MlClient;
use App\Services\RoofGeometry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;

/**
 * Deteksi bidang atap atas tangkapan peta yang dikirim antarmuka.
 *
 * Tangkapan tidak pernah disimpan: berkasnya hanya diteruskan ke layanan model, dan
 * yang tercatat hanyalah georeferensinya. Karena itu baris aset baru ditulis setelah
 * layanan model menjawab — deteksi yang gagal tidak meninggalkan aset yatim.
 *
 * Poligon hasil deteksi disederhanakan lalu dirapikan sebelum dikembalikan, dan ring
 * hasil kedua langkah itulah yang dipakai untuk menghitung luas, untuk dikirim, dan
 * untuk disimpan. Dengan begitu bidang yang dilihat pengguna, yang tercatat, dan yang
 * menjadi dasar kapasitas selalu menggambarkan bentuk yang sama.
 */
class RoofDetectionController extends Controller
{
    public function __construct(
        private readonly MlClient $ml,
        private readonly ImageryAssetStore $assets,
    ) {}

    public function __invoke(RoofDetectionRequest $request): JsonResponse
    {
        $userId = (int) $request->user()->getKey();

        /** @var UploadedFile $file */
        $file = $request->file('file');

        $bbox = $request->bbox();
        $width = (int) $request->validated('width');
        $height = (int) $request->validated('height');
        $zoom = $request->validated('zoom');
        $metersPerPixel = ImageryBoundingBox::metersPerPixelFromBbox($bbox, $width, $height)['lat'];

        $result = $this->ml->detect(
            binary: (string) $file->get(),
            filename: $file->getClientOriginalName(),
            minConfidence: $request->minConfidence(),
        );

        $asset = $this->assets->storeCapture(
            userId: $userId,
            width: $width,
            height: $height,
            zoom: $zoom === null ? null : (int) $zoom,
            bbox: $bbox,
            metersPerPixel: $metersPerPixel,
        );

        $roofs = [];
        $simplifyTolerance = (float) config('services.ml.postprocess.simplify_tolerance_px', 1.8);
        $rectangularityThreshold = (float) config('services.ml.postprocess.rectangularity_threshold', 0.80);
        $maxAspectRatio = (float) config('services.ml.postprocess.max_aspect_ratio', 5.0);
        $minAreaSqm = (float) config('services.ml.postprocess.min_area_sqm', 6.0);

        foreach ($result->detections as $detection) {
            // Ring dirapikan dan diregularisasi sekali di sini: luas, GeoJSON, dan yang
            // dikirim ke klien semuanya memakai ring sederhana yang sama.
            $polygon = PolygonGeometry::regularize(
                ring: $detection->polygon,
                simplifyTolerancePx: $simplifyTolerance,
                rectangularityThreshold: $rectangularityThreshold,
                maxAspectRatio: $maxAspectRatio,
            );

            // Poligon yang tersaring atau tidak membentuk bidang tidak dapat dipakai
            // menghitung apa pun; mengirimkannya hanya memaksa antarmuka menyaring ulang.
            if (count($polygon) < 4) {
                continue;
            }

            $polygonPx = PolygonGeometry::openRing($polygon);
            $areaSqm = round(PolygonGeometry::area($polygonPx) * $metersPerPixel ** 2, 2);

            if ($minAreaSqm > 0.0 && $areaSqm < $minAreaSqm) {
                continue;
            }

            $roofs[] = [
                'id' => $detection->id,
                'polygon_px' => $polygonPx,
                'polygon_lnglat' => RoofGeometry::ringLngLat($polygonPx, $bbox, $width, $height),
                'bbox_px' => $detection->bbox,
                'confidence' => round($detection->confidence, 4),
                'area_sqm' => $areaSqm,
            ];
        }

        // Urutan menurut keyakinan menurun: klien memilih dari yang paling meyakinkan.
        usort($roofs, static fn (array $a, array $b): int => $b['confidence'] <=> $a['confidence']);

        return response()->json([
            'image_id' => $asset->image_id,
            'detection_id' => $result->requestId,
            'model' => [
                'name' => $result->modelName,
                'version' => $result->modelVersion,
            ],
            'image' => [
                'width' => $width,
                'height' => $height,
                'bbox' => $bbox,
                'meters_per_pixel' => round($metersPerPixel, 4),
                'zoom' => $zoom === null ? null : (int) $zoom,
            ],
            'roofs' => $roofs,
        ]);
    }
}
