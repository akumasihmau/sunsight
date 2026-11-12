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
    /**
     * Toleransi penyederhanaan poligon, dalam piksel tangkapan.
     *
     * Mask model segmentasi sangat padat: satu tangkapan 512 piksel dengan 14 deteksi
     * menghasilkan lebih dari enam ribu titik, dan poligon terbesarnya sendiri
     * mencapai ribuan. Pada data nyata, toleransi 0,5 piksel memangkasnya menjadi
     * sekitar seperempat dengan galat luas di bawah 0,25%; toleransi 1,0 piksel
     * memberi kompresi jauh lebih besar tetapi galatnya menembus 1%, dan itu terlalu
     * mahal untuk angka yang menjadi dasar kapasitas terpasang.
     */
    private const SIMPLIFY_TOLERANCE_PX = 0.5;

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

        foreach ($result->detections as $detection) {
            // Ring dirapikan sekali di sini: luas, GeoJSON, dan yang dikirim ke klien
            // semuanya memakai ring sederhana yang sama.
            $polygon = PolygonGeometry::makeSimple(
                PolygonGeometry::simplify($detection->polygon, self::SIMPLIFY_TOLERANCE_PX),
            );

            // Poligon yang tidak membentuk bidang tidak dapat dipakai menghitung apa
            // pun; mengirimkannya hanya memaksa antarmuka menyaring hal yang sama.
            // Ring tertutup dengan tiga titik sudut berarti empat titik, syarat
            // minimum sebuah poligon yang sah.
            if (count($polygon) < 4) {
                continue;
            }

            $polygonPx = PolygonGeometry::openRing($polygon);

            $roofs[] = [
                'id' => $detection->id,
                'polygon_px' => $polygonPx,
                'polygon_lnglat' => RoofGeometry::ringLngLat($polygonPx, $bbox, $width, $height),
                'bbox_px' => $detection->bbox,
                'confidence' => round($detection->confidence, 4),
                'area_sqm' => round(PolygonGeometry::area($polygonPx) * $metersPerPixel ** 2, 2),
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
