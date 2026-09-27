<?php

namespace Database\Factories;

use App\Models\RoofAnalysis;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RoofAnalysis>
 */
class RoofAnalysisFactory extends Factory
{
    protected $model = RoofAnalysis::class;

    /**
     * Poligon contoh berukuran rumah: kotak ~7 x 7 meter di Jakarta.
     * Ring tertutup, urutan [lng, lat], berlawanan arah jarum jam sesuai RFC 7946.
     *
     * @var array<int, array{0: float, 1: float}>
     */
    public const DEFAULT_POLYGON = [
        [106.799468, -6.595532],
        [106.799532, -6.595532],
        [106.799532, -6.595468],
        [106.799468, -6.595468],
        [106.799468, -6.595532],
    ];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'center_lat' => -6.5955000,
            'center_lng' => 106.7995000,
            'usable_area_sqm' => 45.50,
            'shadow_area_sqm' => 5.00,
            'estimated_energy_kwh_per_day' => 36.90,
            'roof_orientation_deg' => 15.50,
            'recommended_azimuth_deg' => 0.00,
            'module_efficiency' => 0.2000,
            'performance_ratio' => 0.7800,
            'tilt_deg' => 10.00,
            'tilt_factor' => 1.0500,
            'irradiance_source' => 'NASA POWER',
            'irradiance_period' => 'climatology',
            'irradiance_kwh_per_sqm_day' => 5.200,
        ];
    }

    /**
     * Kolom geometri wajib terisi, jadi poligon dipasang sebelum baris disimpan.
     */
    public function configure(): static
    {
        return $this->afterMaking(
            fn (RoofAnalysis $analysis) => $analysis->setRoofPolygon(self::DEFAULT_POLYGON),
        );
    }

    /**
     * Mengganti poligon bawaan.
     *
     * @param  array<int, array{0: float, 1: float}>  $coordinates
     */
    public function polygon(array $coordinates): static
    {
        return $this->afterMaking(
            fn (RoofAnalysis $analysis) => $analysis->setRoofPolygon($coordinates),
        );
    }
}
