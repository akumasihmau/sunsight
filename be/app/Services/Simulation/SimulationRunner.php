<?php

namespace App\Services\Simulation;

use App\Models\ImageryAsset;
use App\Models\Simulation;
use App\Services\EnergyModel;
use App\Services\FinanceModel;
use App\Services\PanelLayout;
use App\Services\RoofGeometry;

/**
 * Satu-satunya jalur perhitungan simulasi.
 *
 * Dipakai oleh `POST /simulate` maupun `POST /analyses`, sehingga angka yang
 * ditampilkan dan angka yang tersimpan mustahil menyimpang. Hasilnya berupa model
 * Simulation yang belum disimpan: pemanggil yang menentukan apakah ia disimpan,
 * dan presenter yang menentukan bentuk keluarannya.
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
        $module = SimulationCatalog::module((string) $input['module_key']);
        $tariff = SimulationCatalog::tariff((string) $input['tariff_key']);

        $area = RoofGeometry::areaFromRect(
            rect: $input['roof_rect'],
            metersPerPixel: (float) $image->meters_per_pixel,
            setbackM: (float) $input['setback_m'],
            gutterM: (float) $input['gutter_m'],
        );

        $layout = PanelLayout::fit(
            area: $area,
            module: $module,
            orientation: (string) $input['orientation'],
            clearanceM: (float) $input['clearance_m'],
            requestedCount: $input['panel_count'] === null ? null : (int) $input['panel_count'],
        );

        $capacityKwp = $layout->installed * (float) $module['power_w'] / 1000.0;

        $energy = $this->energy->estimate(
            capacityKwp: $capacityKwp,
            tiltDeg: (float) $input['tilt_deg'],
            azimuthDeg: (float) $input['azimuth_deg'],
            latitude: (float) $image->center_lat,
            longitude: (float) $image->center_lng,
        );

        $capex = FinanceModel::capex(
            installedCount: $layout->installed,
            module: $module,
            inverterType: (string) $input['inverter_type'],
            capacityKwp: $energy->capacityKwp,
        );

        $finance = FinanceModel::summarise(
            capex: $capex,
            annualProductionKwh: $energy->annualProductionKwh,
            monthlyBillIdr: (int) $input['monthly_bill_idr'],
            tariff: $tariff,
        );

        $simulation = new Simulation([
            'user_id' => $userId,
            'imagery_asset_id' => $image->getKey(),
            'center_lat' => $image->center_lat,
            'center_lng' => $image->center_lng,
            'roof_width_m' => $area->roofWidthM,
            'roof_length_m' => $area->roofLengthM,
            'rotation_deg' => (float) $input['roof_rect']['rotation_deg'],
            'setback_m' => (float) $input['setback_m'],
            'gutter_m' => (float) $input['gutter_m'],
            'tilt_deg' => (float) $input['tilt_deg'],
            'azimuth_deg' => (float) $input['azimuth_deg'],
            'module_key' => (string) $input['module_key'],
            'orientation' => (string) $input['orientation'],
            'clearance_m' => (float) $input['clearance_m'],
            'inverter_type' => (string) $input['inverter_type'],
            'panel_count' => $input['panel_count'] === null ? null : (int) $input['panel_count'],
            'monthly_bill_idr' => (int) $input['monthly_bill_idr'],
            'tariff_key' => (string) $input['tariff_key'],
            'total_area_sqm' => $area->totalAreaSqm,
            'effective_area_sqm' => $area->effectiveAreaSqm,
            'max_slots' => $layout->maxSlots,
            'installed' => $layout->installed,
            'rows' => $layout->rows,
            'columns' => $layout->columns,
            'module_area_sqm' => $layout->moduleAreaSqm,
            'density_ratio' => $layout->densityRatio,
            'capacity_kwp' => $energy->capacityKwp,
            'annual_production_kwh' => $energy->annualProductionKwh,
            'capex_total_idr' => $finance->capex->totalIdr(),
            'monthly_saving_idr' => $finance->monthlySavingIdr,
            'annual_saving_idr' => $finance->annualSavingIdr,
            'payback_years' => $finance->paybackYears,
            'co2_reduction_kg_per_year' => $finance->co2ReductionKgPerYear,
            'trees_equivalent' => $finance->treesEquivalent,
            'daily_irradiance_kwh_per_sqm' => $energy->dailyIrradianceKwhPerSqm,
            'irradiance_source' => $energy->irradianceSource,
            'irradiance_period' => $energy->irradiancePeriod,
            'incidence_factor' => $energy->incidenceFactor,
            'performance_ratio' => $energy->performanceRatio,
            'tariff_idr_per_kwh' => $finance->tariffIdrPerKwh,
            'tariff_label' => $finance->tariffLabel,
            'capex_breakdown' => $finance->capex->toArray(),
        ]);

        $simulation->setRoofPolygon(RoofGeometry::polygonLngLat(
            rect: $input['roof_rect'],
            bbox: (array) $image->bbox,
            imageWidth: (int) $image->width,
            imageHeight: (int) $image->height,
        ));

        return $simulation;
    }
}
