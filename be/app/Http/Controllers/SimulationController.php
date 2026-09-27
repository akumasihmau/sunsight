<?php

namespace App\Http\Controllers;

use App\Http\Requests\LocationRequest;
use App\Http\Requests\SimulateRequest;
use App\Http\Requests\StoreSimulationRequest;
use App\Http\Resources\SimulationMetricsResource;
use App\Http\Resources\SimulationResource;
use App\Http\Resources\SimulationSummaryResource;
use App\Models\ImageryAsset;
use App\Models\Simulation;
use App\Services\Imagery\ImageryAssetStore;
use App\Services\Imagery\ImageryProvider;
use App\Services\RoofGeometry;
use App\Services\Simulation\SimulationCatalog;
use App\Services\Simulation\SimulationRunner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

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

    public function simulate(SimulateRequest $request): SimulationMetricsResource|JsonResponse
    {
        $asset = $this->assets->findFor(
            (int) $request->user()->getKey(),
            (string) $request->validated('image_id'),
        );

        if ($asset === null) {
            return $this->imageNotFound();
        }

        $problem = $this->rectProblem($request, $asset);

        if ($problem !== null) {
            return $problem;
        }

        return new SimulationMetricsResource($this->runner->run(
            userId: (int) $request->user()->getKey(),
            image: $asset,
            input: $request->simulationInput(),
        ));
    }

    public function store(StoreSimulationRequest $request): JsonResponse
    {
        $userId = (int) $request->user()->getKey();

        $asset = $this->assets->findFor($userId, (string) $request->validated('image_id'));

        if ($asset === null) {
            return $this->imageNotFound();
        }

        $problem = $this->rectProblem($request, $asset);

        if ($problem !== null) {
            return $problem;
        }

        // Angka hasil selalu dihitung di sini. Kunci hasil pada payload kiriman
        // tidak pernah dibaca, sehingga klien tidak dapat mengarang hasilnya.
        $simulation = $this->runner->run($userId, $asset, $request->simulationInput());
        $simulation->save();

        return response()->json([
            'message' => 'Simulation saved',
            'id' => $simulation->id,
            'capacity_kwp' => round((float) $simulation->capacity_kwp, 3),
            'payback_years' => $simulation->payback_years === null
                ? null
                : round((float) $simulation->payback_years, 2),
        ], 201);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $simulations = Simulation::query()
            ->where('user_id', $request->user()->getKey())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($this->perPage($request));

        return SimulationSummaryResource::collection($simulations);
    }

    public function show(Request $request, int $id): SimulationResource|JsonResponse
    {
        $simulation = $this->findOwned($request, $id);

        return $simulation === null ? $this->notFound() : new SimulationResource($simulation);
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
     * Persegi bidang atap harus berada di dalam citra.
     *
     * Diperiksa setelah aset diketahui, karena batasnya bergantung pada ukuran citra.
     * Sudut diperiksa, bukan hanya kotak pembatasnya, supaya persegi yang diputar
     * tidak dapat keluar citra pada salah satu sudutnya.
     */
    private function rectProblem(SimulateRequest $request, ImageryAsset $asset): ?JsonResponse
    {
        /** @var array{x: float, y: float, width: float, height: float, rotation_deg: float} $rect */
        $rect = $request->validated('roof_rect');

        foreach (RoofGeometry::corners($rect) as [$x, $y]) {
            $inside = $x >= -0.5
                && $y >= -0.5
                && $x <= (float) $asset->width + 0.5
                && $y <= (float) $asset->height + 0.5;

            if (! $inside) {
                return response()->json([
                    'message' => 'Persegi bidang atap berada di luar citra.',
                    'errors' => ['roof_rect' => ['Persegi bidang atap berada di luar citra.']],
                ], 422);
            }
        }

        return null;
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
