<?php

namespace App\Models;

use Database\Factories\RoofAnalysisFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;

/**
 * Satu hasil analisis atap beserta asumsi yang dipakai saat menghitungnya.
 *
 * `roof_polygon` sengaja TIDAK fillable. Kolom geometri hanya dapat ditulis lewat
 * setRoofPolygon(), sehingga tidak ada jalur yang bisa menuliskan teks sembarang
 * ke kolom geometri dan menghasilkan data yang diam-diam rusak.
 */
#[Fillable([
    'user_id',
    'center_lat',
    'center_lng',
    'usable_area_sqm',
    'shadow_area_sqm',
    'estimated_energy_kwh_per_day',
    'roof_orientation_deg',
    'recommended_azimuth_deg',
    'module_efficiency',
    'performance_ratio',
    'tilt_deg',
    'tilt_factor',
    'irradiance_source',
    'irradiance_period',
    'irradiance_kwh_per_sqm_day',
])]
class RoofAnalysis extends Model
{
    /** @use HasFactory<RoofAnalysisFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'center_lat' => 'float',
            'center_lng' => 'float',
            'usable_area_sqm' => 'float',
            'shadow_area_sqm' => 'float',
            'estimated_energy_kwh_per_day' => 'float',
            'roof_orientation_deg' => 'float',
            'recommended_azimuth_deg' => 'float',
            'module_efficiency' => 'float',
            'performance_ratio' => 'float',
            'tilt_deg' => 'float',
            'tilt_factor' => 'float',
            'irradiance_kwh_per_sqm_day' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Menuliskan poligon ke kolom geometri.
     *
     * @param  array<int, array{0: float, 1: float}>  $coordinates  Ring GeoJSON tertutup, urutan [lng, lat].
     */
    public function setRoofPolygon(array $coordinates): self
    {
        $this->attributes['roof_polygon'] = self::geoJsonExpression($coordinates);

        return $this;
    }

    /**
     * Blok asumsi yang wajib ikut dikembalikan bersama hasil analisis.
     *
     * @return array<string, mixed>
     */
    public function assumptions(): array
    {
        return [
            'module_efficiency' => $this->module_efficiency,
            'performance_ratio' => $this->performance_ratio,
            'tilt_deg' => $this->tilt_deg,
            'tilt_factor' => $this->tilt_factor,
            'irradiance_source' => $this->irradiance_source,
            'irradiance_period' => $this->irradiance_period,
            'irradiance_kwh_per_sqm_day' => $this->irradiance_kwh_per_sqm_day,
        ];
    }

    /**
     * Poligon dalam bentuk objek GeoJSON, dibaca langsung dari PostGIS.
     *
     * @return array<string, mixed>|null
     */
    public function roofPolygonGeoJson(): ?array
    {
        if ($this->getKey() === null) {
            return null;
        }

        $geoJson = DB::table('roof_analyses')
            ->where('id', $this->getKey())
            ->selectRaw('ST_AsGeoJSON(roof_polygon) as geojson')
            ->value('geojson');

        return $geoJson === null ? null : json_decode($geoJson, true, flags: JSON_THROW_ON_ERROR);
    }

    /**
     * Luas poligon dalam meter persegi, dihitung PostGIS dari geografi.
     */
    public function polygonAreaSqm(): ?float
    {
        if ($this->getKey() === null) {
            return null;
        }

        $area = DB::table('roof_analyses')
            ->where('id', $this->getKey())
            ->selectRaw('ST_Area(roof_polygon::geography)::float8 as area')
            ->value('area');

        return $area === null ? null : (float) $area;
    }

    /**
     * Ungkapan SQL yang mengubah ring GeoJSON menjadi geometri WGS84.
     *
     * `coordinates` pada Polygon adalah daftar ring, sehingga ring masukan
     * dibungkus satu tingkat sebelum diserialkan.
     *
     * GeoJSON disisipkan sebagai literal yang di-quote PDO, bukan disambung mentah,
     * supaya nilainya tidak pernah dapat mengubah bentuk perintah SQL.
     *
     * @param  array<int, array{0: float, 1: float}>  $coordinates
     */
    private static function geoJsonExpression(array $coordinates): Expression
    {
        $json = json_encode(
            ['type' => 'Polygon', 'coordinates' => [$coordinates]],
            JSON_THROW_ON_ERROR,
        );

        return new Expression(
            'ST_SetSRID(ST_GeomFromGeoJSON('.DB::getPdo()->quote($json).'), 4326)',
        );
    }
}
