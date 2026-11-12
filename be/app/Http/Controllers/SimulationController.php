<?php

namespace App\Http\Controllers;

use App\Http\Requests\LocationRequest;
use App\Http\Requests\SimulateRequest;
use App\Http\Requests\StoreSimulationRequest;
use App\Http\Resources\SimulationResource;
use App\Http\Resources\SimulationSummaryResource;
use App\Models\ImageryAsset;
use App\Models\Simulation;
use App\Services\Geometry\PolygonGeometry;
use App\Services\Imagery\ImageryAssetStore;
use App\Services\Imagery\ImageryProvider;
use App\Services\Simulation\SimulationCatalog;
use App\Services\Simulation\SimulationRunner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class SimulationController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function __construct(
        private readonly ImageryProvider $imagery,
        private readonly ImageryAssetStore $assets,
        private readonly SimulationRunner $runner,
    ) {}

    public function location(LocationRequest $request): JsonResponse
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
            'meters_per_pixel' => round((float) $asset->meters_per_pixel, 4),
            'attribution' => $this->imagery->attribution(),
        ]);
    }

    public function options(): JsonResponse
    {
        return response()->json(SimulationCatalog::options());
    }

    /**
     * Hitung simulasi lengkap tanpa menyimpan apa pun.
     */
    public function simulate(SimulateRequest $request): SimulationResource|JsonResponse
    {
        $simulation = $this->calculate($request);

        return $simulation instanceof JsonResponse
            ? $simulation
            : new SimulationResource($simulation);
    }

    /**
     * Hitung ulang lalu simpan sebagai riwayat.
     *
     * Simulasi dan seluruh baris bidangnya ditulis dalam satu transaksi: simulasi
     * yang tersimpan tanpa bidangnya tidak dapat ditampilkan, sehingga tidak boleh
     * pernah ada.
     */
    public function store(StoreSimulationRequest $request): JsonResponse
    {
        $simulation = $this->calculate($request);

        if ($simulation instanceof JsonResponse) {
            return $simulation;
        }

        DB::transaction(function () use ($simulation): void {
            $simulation->save();

            foreach ($simulation->roofs as $roof) {
                $roof->simulation_id = $simulation->getKey();
                $roof->save();
            }
        });

        $body = (new SimulationResource($simulation))->resolve($request);

        // `message` ditempel langsung, bukan lewat `additional()`: pada resource tanpa
        // pembungkus, `additional()` justru menambahkan pembungkus `data`, sedangkan
        // bentuk bersama pada kontrak adalah objek datar.
        return response()->json(array_merge(['message' => 'Simulation saved'], $body), 201);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $simulations = Simulation::query()
            ->where('user_id', $request->user()->getKey())
            ->withCount('roofs')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($this->perPage($request));

        return SimulationSummaryResource::collection($simulations);
    }

    public function show(Request $request, int $id): SimulationResource|JsonResponse
    {
        $simulation = $this->findOwned($request, $id);

        if ($simulation === null) {
            return $this->notFound();
        }

        $simulation->load('roofs');

        return new SimulationResource($simulation);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $simulation = $this->findOwned($request, $id);

        if ($simulation === null) {
            return $this->notFound();
        }

        $simulation->delete();

        return response()->json(['message' => 'Simulation deleted successfully']);
    }

    /**
     * Menghitung simulasi, atau mengembalikan kesalahan yang menghalanginya.
     *
     * Dipakai baik oleh jalur hitung maupun jalur simpan, sehingga keduanya tidak
     * mungkin memakai masukan, citra, atau aturan yang berbeda.
     */
    private function calculate(SimulateRequest $request): Simulation|JsonResponse
    {
        $userId = (int) $request->user()->getKey();

        $asset = $this->assets->findFor($userId, (string) $request->validated('image_id'));

        if ($asset === null) {
            return $this->imageNotFound();
        }

        $problem = $this->polygonProblem($request, $asset);

        if ($problem !== null) {
            return $problem;
        }

        // Angka hasil selalu dihitung di sini. Kunci hasil pada payload kiriman tidak
        // pernah dibaca, sehingga klien tidak dapat mengarang hasilnya.
        return $this->runner->run($userId, $asset, $this->simulationInput($request));
    }

    /**
     * Seluruh titik poligon bidang atap harus berada di dalam citra.
     *
     * Diperiksa setelah aset diketahui karena batasnya bergantung pada ukuran
     * tangkapan. Titik di luar citra berarti bidangnya tidak dapat dipetakan kembali
     * ke koordinat geografis, dan itu masukan yang salah, bukan kesalahan sistem.
     */
    private function polygonProblem(SimulateRequest $request, ImageryAsset $asset): ?JsonResponse
    {
        /** @var array<int, array<string, mixed>> $roofs */
        $roofs = $request->validated('roofs');

        $width = (float) $asset->width;
        $height = (float) $asset->height;
        $errors = [];

        foreach ($roofs as $index => $roof) {
            /** @var array<int, array{0: float|int, 1: float|int}> $polygon */
            $polygon = $roof['roof_polygon_px'] ?? [];

            // Ring yang menyilang dirinya sendiri masih dapat dirapikan, tetapi ring
            // yang tidak menyisakan bidang tidak dapat dihitung sama sekali.
            if (count(PolygonGeometry::openRing(PolygonGeometry::makeSimple($polygon))) < 3) {
                $errors["roofs.{$index}.roof_polygon_px"] = [
                    'Poligon bidang atap tidak membentuk bidang.',
                ];

                continue;
            }

            foreach ($polygon as $point) {
                $x = (float) $point[0];
                $y = (float) $point[1];

                if ($x < -0.5 || $y < -0.5 || $x > $width + 0.5 || $y > $height + 0.5) {
                    $errors["roofs.{$index}.roof_polygon_px"] = [
                        'Seluruh titik poligon bidang atap harus berada di dalam citra.',
                    ];

                    continue 2;
                }
            }
        }

        if ($errors === []) {
            return null;
        }

        return response()->json([
            'message' => 'Poligon bidang atap berada di luar citra.',
            'errors' => $errors,
        ], 422);
    }

    /**
     * Masukan simulasi dengan ring yang sudah dirapikan.
     *
     * Pengguna dapat menggeser verteks sampai poligonnya menyilang. Ring seperti itu
     * tidak dapat disimpan sebagai geometri yang sah, sehingga dirapikan sekali di
     * sini: perhitungan, GeoJSON, dan baris tersimpan memakai ring yang sama.
     *
     * @return array<string, mixed>
     */
    private function simulationInput(SimulateRequest $request): array
    {
        $input = $request->simulationInput();

        /** @var array<int, array<string, mixed>> $roofs */
        $roofs = $input['roofs'];

        $input['roofs'] = array_map(
            static function (array $roof): array {
                $roof['roof_polygon_px'] = PolygonGeometry::openRing(
                    PolygonGeometry::makeSimple((array) $roof['roof_polygon_px']),
                );

                return $roof;
            },
            $roofs,
        );

        return $input;
    }

    /**
     * Simulasi milik user lain diperlakukan sama seperti simulasi yang tidak ada.
     */
    private function findOwned(Request $request, int $id): ?Simulation
    {
        return Simulation::query()
            ->where('user_id', $request->user()->getKey())
            ->whereKey($id)
            ->first();
    }

    private function imageNotFound(): JsonResponse
    {
        return response()->json(['message' => 'Citra tidak ditemukan.'], 404);
    }

    private function notFound(): JsonResponse
    {
        return response()->json(['message' => 'Simulasi tidak ditemukan.'], 404);
    }

    private function perPage(Request $request): int
    {
        $requested = $request->integer('per_page') ?: $request->integer('limit') ?: self::DEFAULT_PER_PAGE;

        return max(1, min(self::MAX_PER_PAGE, (int) $requested));
    }
}
