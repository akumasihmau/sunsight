<?php

namespace App\Http\Controllers;

use App\Http\Requests\CalculateSolarRequest;
use App\Http\Requests\StoreAnalysisRequest;
use App\Http\Resources\AnalysisResource;
use App\Http\Resources\AnalysisSummaryResource;
use App\Models\RoofAnalysis;
use App\Services\SolarCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SolarAnalysisController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function __construct(
        private readonly SolarCalculator $calculator,
    ) {}

    public function calculate(CalculateSolarRequest $request): JsonResponse
    {
        $estimate = $this->calculator->estimate(
            usableAreaSqm: $request->usableAreaSqm(),
            polygon: $request->polygon(),
            latitude: $request->latitude(),
            longitude: $request->longitude(),
        );

        // Tidak menyimpan apa pun. Penyimpanan hanya terjadi lewat store().
        return response()->json([
            'usable_area_sqm' => round($request->usableAreaSqm(), 2),
            'daily_ghi_kwh_per_sqm' => $estimate->dailyGhiKwhPerSqm,
            'estimated_energy_kwh_per_day' => $estimate->estimatedEnergyKwhPerDay,
            'roof_orientation_deg' => $estimate->roofOrientationDeg,
            'recommended_azimuth_deg' => $estimate->recommendedAzimuthDeg,
            'assumptions' => $estimate->assumptions,
        ]);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $analyses = RoofAnalysis::query()
            ->where('user_id', $request->user()->getKey())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($this->perPage($request));

        return AnalysisSummaryResource::collection($analyses);
    }

    public function store(StoreAnalysisRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $assumptions = $validated['assumptions'];

        $analysis = new RoofAnalysis([
            'user_id' => $request->user()->getKey(),
            'center_lat' => $validated['center_point']['lat'],
            'center_lng' => $validated['center_point']['lng'],
            'usable_area_sqm' => $validated['usable_area_sqm'],
            'shadow_area_sqm' => $validated['shadow_area_sqm'],
            'estimated_energy_kwh_per_day' => $validated['estimated_energy_kwh_per_day'],
            'roof_orientation_deg' => $validated['roof_orientation_deg'],
            'recommended_azimuth_deg' => $validated['recommended_azimuth_deg'],
            'module_efficiency' => $assumptions['module_efficiency'],
            'performance_ratio' => $assumptions['performance_ratio'],
            'tilt_deg' => $assumptions['tilt_deg'],
            'tilt_factor' => $assumptions['tilt_factor'],
            'irradiance_source' => $assumptions['irradiance_source'],
            'irradiance_period' => $assumptions['irradiance_period'],
            'irradiance_kwh_per_sqm_day' => $assumptions['irradiance_kwh_per_sqm_day'],
        ]);

        $analysis->setRoofPolygon($request->polygon());
        $analysis->save();

        return response()->json([
            'message' => 'Analysis saved',
            'id' => $analysis->id,
        ], 201);
    }

    public function show(Request $request, int $id): AnalysisResource|JsonResponse
    {
        $analysis = $this->findOwned($request, $id);

        return $analysis === null ? $this->notFound() : new AnalysisResource($analysis);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $analysis = $this->findOwned($request, $id);

        if ($analysis === null) {
            return $this->notFound();
        }

        $analysis->delete();

        return response()->json(['message' => 'Analysis deleted successfully']);
    }

    /**
     * Mencari riwayat milik pemanggil.
     *
     * Riwayat milik user lain diperlakukan sama seperti riwayat yang tidak ada,
     * sehingga keberadaannya tidak dapat diselidiki dari kode status.
     */
    private function findOwned(Request $request, int $id): ?RoofAnalysis
    {
        return RoofAnalysis::query()
            ->where('user_id', $request->user()->getKey())
            ->whereKey($id)
            ->first();
    }

    private function notFound(): JsonResponse
    {
        return response()->json(['message' => 'Analisis tidak ditemukan.'], 404);
    }

    /**
     * `limit` diterima sebagai alias `per_page` karena Laravel tidak mengenalinya sendiri.
     */
    private function perPage(Request $request): int
    {
        $requested = $request->integer('per_page') ?: $request->integer('limit') ?: self::DEFAULT_PER_PAGE;

        return max(1, min(self::MAX_PER_PAGE, (int) $requested));
    }
}
