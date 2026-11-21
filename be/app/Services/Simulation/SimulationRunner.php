<?php

namespace App\Services\Simulation;

use App\Models\ImageryAsset;
use App\Models\Simulation;
use App\Models\SimulationRoof;
use App\Services\EnergyModel;
use App\Services\FinanceModel;
use App\Services\PanelLayout;
use App\Services\RoofGeometry;
use Illuminate\Database\Eloquent\Collection;

/**
 * Satu-satunya jalur perhitungan simulasi.
 *
 * Dipakai oleh `POST /simulate` maupun `POST /analyses`, sehingga angka yang
 * ditampilkan dan angka yang tersimpan mustahil menyimpang. Hasilnya berupa model
 * `Simulation` yang **belum** disimpan, lengkap dengan baris bidangnya: pemanggil
 * yang menentukan apakah ia disimpan, dan presenter yang menentukan bentuk
 * keluarannya. Karena itu `POST /simulate` dapat menjawab tanpa menulis apa pun.
 *
 * Hitungan dilakukan per bidang lalu diagregat. Itu bukan sekadar kerapian: tiap
 * bidang punya kemiringan, azimuth, dan modul sendiri, sehingga produksi dan biaya
 * modulnya berbeda, dan menjumlahkan kapasitas saja tidak cukup untuk memperoleh
 * produksi maupun belanja modal yang benar.
 */
class SimulationRunner
{
    public function __construct(
        private readonly EnergyModel $energy,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     */
    public function run(int $userId, ImageryAsset $image, array $input): Simulation
    {
        $tariff = SimulationCatalog::tariff((string) $input['tariff_key']);
        $inverterType = (string) $input['inverter_type'];

        $metersPerPixel = (float) $image->meters_per_pixel;
        $bbox = (array) $image->bbox;
        $imageWidth = (int) $image->width;
        $imageHeight = (int) $image->height;

        // Masukan global studio. Nilai bawaannya sudah diisi permintaan, tetapi
        // dibaca di sini supaya jalur hitung dan jalur simpan tidak dapat berbeda.
        $sunHour = (float) ($input['sun_hour'] ?? 12.0);
        $extraTilt = (float) ($input['extra_tilt'] ?? 10.0);
        $shadingLossPct = (float) ($input['shading_loss_pct'] ?? 0.0);

        $roofs = [];
        $breakdowns = [];
        $energies = [];

        $totalAreaSqm = 0.0;
        $effectiveAreaSqm = 0.0;
        $moduleAreaSqm = 0.0;
        $capacityKwp = 0.0;
        $annualProductionKwh = 0.0;
        $weightedIncidence = 0.0;
        $maxSlots = 0;
        $installed = 0;
        $rows = 0;
        $columns = 0;

        foreach ($input['roofs'] as $roofInput) {
            /** @var array<string, mixed> $roofInput */
            $module = SimulationCatalog::module((string) $roofInput['module_key']);
            $polygonPx = self::ring((array) $roofInput['roof_polygon_px']);

            $polygon = RoofGeometry::areaFromPolygon(
                polygonPx: $polygonPx,
                metersPerPixel: $metersPerPixel,
                setbackM: (float) $roofInput['setback_m'],
            );

            $alignToAzimuth = ($roofInput['align_to_azimuth'] ?? false) === true;
            $gridRotation = $alignToAzimuth
                ? self::gridRotation(
                    (float) $roofInput['azimuth_deg'],
                    (float) ($roofInput['facet_rotation_deg'] ?? 0.0),
                )
                : 0.0;

            $layout = PanelLayout::fit(
                area: $polygon->toRoofArea(),
                module: $module,
                orientation: (string) $roofInput['orientation'],
                clearanceM: (float) $roofInput['clearance_m'],
                requestedCount: $roofInput['panel_count'] === null ? null : (int) $roofInput['panel_count'],
                // Bidang yang habis oleh setback tidak punya poligon untuk disaring,
                // dan kisi persegi pembatasnya juga nol sehingga tidak ada slot.
                maskPolygon: $polygon->hasEffectivePolygon() ? $polygon->effectivePolygonPx : null,
                maskFrame: $polygon->maskFrame(),
                obstaclePolygons: array_map(
                    static fn (array $obstacle): array => $obstacle['polygon_px'],
                    (array) ($roofInput['obstacles'] ?? []),
                ),
                gridRotationDeg: $gridRotation,
                populated: ($roofInput['is_solar_populated'] ?? true) !== false,
            );

            $energy = $this->energy->estimate(
                capacityKwp: $layout->installed * (float) $module['power_w'] / 1000.0,
                tiltDeg: (float) $roofInput['tilt_deg'],
                azimuthDeg: (float) $roofInput['azimuth_deg'],
                extraTiltDeg: $extraTilt,
                sunHour: $sunHour,
                inverterType: $inverterType,
                shadingLossPct: $shadingLossPct,
            );

            $breakdowns[] = FinanceModel::capex(
                installedCount: $layout->installed,
                module: $module,
                inverterType: $inverterType,
                capacityKwp: $energy->capacityKwp,
            );

            $energies[] = $energy;

            $roof = new SimulationRoof([
                'label' => $roofInput['label'] ?? null,
                'detection_id' => $roofInput['detection_id'] ?? null,
                'confidence' => $roofInput['confidence'] ?? null,
                // Ring dalam piksel disimpan apa adanya supaya tata letak, luas, dan
                // gambar yang dilihat pengguna dapat ditelusuri kembali tanpa citra.
                'roof_polygon_px' => $polygonPx,
                'shape' => $roofInput['shape'] ?? null,
                'align_to_azimuth' => $roofInput['align_to_azimuth'] ?? null,
                'is_solar_populated' => $roofInput['is_solar_populated'] ?? null,
                'has_hvac' => $roofInput['has_hvac'] ?? null,
                'has_skylight' => $roofInput['has_skylight'] ?? null,
                'slot_overrides' => $roofInput['slot_overrides'] ?? null,
                'obstacles' => $roofInput['obstacles'] ?? [],
                'facet_rotation_deg' => (float) ($roofInput['facet_rotation_deg'] ?? 0.0),
                'roof_width_m' => round($polygon->roofWidthM, 2),
                'roof_length_m' => round($polygon->roofLengthM, 2),
                'rotation_deg' => round($polygon->rotationDeg, 2),
                'setback_m' => (float) $roofInput['setback_m'],
                'gutter_m' => (float) $roofInput['gutter_m'],
                'tilt_deg' => (float) $roofInput['tilt_deg'],
                'azimuth_deg' => (float) $roofInput['azimuth_deg'],
                'module_key' => (string) $roofInput['module_key'],
                'orientation' => (string) $roofInput['orientation'],
                'clearance_m' => (float) $roofInput['clearance_m'],
                'panel_count' => $roofInput['panel_count'] === null ? null : (int) $roofInput['panel_count'],
                'total_area_sqm' => round($polygon->totalAreaSqm, 2),
                'effective_area_sqm' => round($polygon->effectiveAreaSqm, 2),
                'max_slots' => $layout->maxSlots,
                'installed' => $layout->installed,
                'rows' => $layout->rows,
                'columns' => $layout->columns,
                'module_area_sqm' => $layout->moduleAreaSqm,
                'density_ratio' => $layout->densityRatio,
                'capacity_kwp' => $energy->capacityKwp,
                'annual_production_kwh' => $energy->annualProductionKwh,
            ]);

            // Geometri disimpan apa adanya dari pengguna, bukan poligon efektifnya:
            // yang harus dapat ditelusuri kembali adalah bidang yang dipilih pengguna,
            // dan setback dapat berubah tanpa menggambar ulang bidangnya.
            $roof->setRoofPolygon(RoofGeometry::ringLngLat($polygonPx, $bbox, $imageWidth, $imageHeight));

            $roofs[] = $roof;

            $totalAreaSqm += round($polygon->totalAreaSqm, 2);
            $effectiveAreaSqm += round($polygon->effectiveAreaSqm, 2);
            $moduleAreaSqm += $layout->moduleAreaSqm;
            $capacityKwp += $energy->capacityKwp;
            $annualProductionKwh += $energy->annualProductionKwh;
            $weightedIncidence += $energy->capacityKwp * $energy->incidenceFactor;
            $maxSlots += $layout->maxSlots;
            $installed += $layout->installed;
            $rows += $layout->rows;
            $columns += $layout->columns;
        }

        $capex = FinanceModel::sumBreakdowns($breakdowns);

        $finance = FinanceModel::summarise(
            capex: $capex,
            annualProductionKwh: $annualProductionKwh,
            monthlyBillIdr: (int) $input['monthly_bill_idr'],
            tariff: $tariff,
        );

        // Jam matahari puncak dan rugi sistem sama untuk seluruh bidang karena
        // keduanya masukan global. Yang berbeda hanyalah faktor sudut datang, dan itu
        // dirata-ratakan dengan bobot kapasitas supaya bidang yang lebih besar lebih
        // menentukan.
        $first = $energies[0];

        $simulation = new Simulation([
            'user_id' => $userId,
            'imagery_asset_id' => $image->getKey(),
            'center_lat' => $image->center_lat,
            'center_lng' => $image->center_lng,
            'address' => $input['address'] ?? null,
            'map_zoom' => $image->zoom,
            'sun_hour' => $sunHour,
            'extra_tilt_deg' => $extraTilt,
            'inverter_type' => $inverterType,
            'monthly_bill_idr' => (int) $input['monthly_bill_idr'],
            'tariff_key' => (string) $input['tariff_key'],
            'total_area_sqm' => round($totalAreaSqm, 2),
            'effective_area_sqm' => round($effectiveAreaSqm, 2),
            'max_slots' => $maxSlots,
            'installed' => $installed,
            'rows' => $rows,
            'columns' => $columns,
            'module_area_sqm' => round($moduleAreaSqm, 2),
            'density_ratio' => $effectiveAreaSqm > 0.0
                ? round($moduleAreaSqm / $effectiveAreaSqm, 4)
                : 0.0,
            'capacity_kwp' => round($capacityKwp, 3),
            'annual_production_kwh' => round($annualProductionKwh, 2),
            'capex_total_idr' => $capex->totalIdr(),
            'monthly_saving_idr' => $finance->monthlySavingIdr,
            'annual_saving_idr' => $finance->annualSavingIdr,
            'payback_years' => $finance->paybackYears,
            'co2_reduction_kg_per_year' => $finance->co2ReductionKgPerYear,
            'trees_equivalent' => $finance->treesEquivalent,
            'daily_irradiance_kwh_per_sqm' => $first->dailyIrradianceKwhPerSqm,
            'irradiance_source' => $first->irradianceSource,
            'irradiance_period' => $first->irradiancePeriod,
            'incidence_factor' => $capacityKwp > 0.0
                ? $weightedIncidence / $capacityKwp
                : $first->incidenceFactor,
            'performance_ratio' => $first->performanceRatio,
            'tariff_idr_per_kwh' => $finance->tariffIdrPerKwh,
            'tariff_label' => $finance->tariffLabel,
            'capex_breakdown' => $capex->toArray(),
        ]);

        // Model yang belum tersimpan belum punya waktu simpan, sedangkan bentuk
        // bersama pada kontrak selalu memuatnya. Diisi sekarang, dan Eloquent memakai
        // nilai ini apa adanya saat barisnya benar-benar disimpan.
        $simulation->created_at = now();

        $simulation->setRelation('roofs', new Collection($roofs));

        return $simulation;
    }

    /**
     * Putaran kisi modul terhadap atap, mengikuti aturan studio.
     *
     * Antarmuka memutar kisi sebesar `azimuth - 180 - rotasi pengguna`, lalu
     * menormalkannya ke rentang -180..180 derajat. Aturan yang sama dipakai di sini
     * supaya kedua sisi menyusun modul pada arah yang sama.
     */
    public static function gridRotation(float $azimuthDeg, float $facetRotationDeg): float
    {
        $rotation = fmod($azimuthDeg - 180.0 - $facetRotationDeg, 360.0);

        if ($rotation > 180.0) {
            $rotation -= 360.0;
        } elseif ($rotation < -180.0) {
            $rotation += 360.0;
        }

        return $rotation;
    }

    /**
     * @param  array<int, array{0: float|int, 1: float|int}>  $ring
     * @return array<int, array{0: float, 1: float}>
     */
    private static function ring(array $ring): array
    {
        return array_map(
            static fn (array $point): array => [(float) $point[0], (float) $point[1]],
            array_values($ring),
        );
    }
}
