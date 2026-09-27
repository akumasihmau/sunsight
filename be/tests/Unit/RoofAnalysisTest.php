<?php

namespace Tests\Unit;

use App\Models\RoofAnalysis;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Menjaga kontrak tabel riwayat analisis: geometri benar-benar tersimpan sebagai
 * geometri PostGIS, luas dapat dihitung dalam meter persegi, dan blok asumsi
 * tidak dapat hilang.
 */
class RoofAnalysisTest extends TestCase
{
    use RefreshDatabase;

    public function test_poligon_tersimpan_sebagai_geometri_wgs84_yang_sah(): void
    {
        $analysis = RoofAnalysis::factory()->create();

        $row = DB::table('roof_analyses')
            ->where('id', $analysis->id)
            ->selectRaw('ST_IsValid(roof_polygon)::int as sah, ST_SRID(roof_polygon) as srid, GeometryType(roof_polygon) as jenis')
            ->first();

        $this->assertSame(1, (int) $row->sah, 'Poligon yang disimpan harus valid menurut PostGIS.');
        $this->assertSame(4326, (int) $row->srid);
        $this->assertSame('POLYGON', strtoupper($row->jenis));
    }

    public function test_luas_poligon_contoh_wajar_untuk_ukuran_rumah(): void
    {
        $analysis = RoofAnalysis::factory()->create();

        $area = $analysis->polygonAreaSqm();

        $this->assertNotNull($area);
        $this->assertGreaterThan(40.0, $area, 'Kotak ~7x7 meter seharusnya di atas 40 m2.');
        $this->assertLessThan(60.0, $area, 'Kotak ~7x7 meter seharusnya di bawah 60 m2.');
    }

    public function test_poligon_dapat_dibaca_kembali_sebagai_geojson_ring_tertutup(): void
    {
        $geoJson = RoofAnalysis::factory()->create()->roofPolygonGeoJson();

        $this->assertSame('Polygon', $geoJson['type']);

        $ring = $geoJson['coordinates'][0];
        $this->assertSame($ring[0], $ring[array_key_last($ring)], 'Ring GeoJSON harus tertutup.');
    }

    public function test_seluruh_asumsi_ikut_tersimpan_dan_dapat_dibaca_kembali(): void
    {
        $assumptions = RoofAnalysis::factory()->create()->fresh()->assumptions();

        $this->assertSame([
            'module_efficiency',
            'performance_ratio',
            'tilt_deg',
            'tilt_factor',
            'irradiance_source',
            'irradiance_period',
            'irradiance_kwh_per_sqm_day',
        ], array_keys($assumptions));

        $this->assertSame('NASA POWER', $assumptions['irradiance_source']);
    }

    public function test_nilai_numerik_dikembalikan_sebagai_float_bukan_teks(): void
    {
        $analysis = RoofAnalysis::factory()->create()->fresh();

        $this->assertIsFloat($analysis->usable_area_sqm);
        $this->assertIsFloat($analysis->shadow_area_sqm);
        $this->assertIsFloat($analysis->estimated_energy_kwh_per_day);
        $this->assertIsFloat($analysis->module_efficiency);
    }

    public function test_baris_tanpa_kolom_asumsi_ditolak_basis_data(): void
    {
        $user = User::factory()->create();

        $this->expectException(QueryException::class);

        DB::table('roof_analyses')->insert([
            'user_id' => $user->id,
            'roof_polygon' => DB::raw("ST_SetSRID(ST_GeomFromText('POLYGON((106.7994 -6.5955, 106.7995 -6.5955, 106.7995 -6.5954, 106.7994 -6.5955))'), 4326)"),
            'center_lat' => -6.5955000,
            'center_lng' => 106.7995000,
            'usable_area_sqm' => 10,
            'shadow_area_sqm' => 0,
            'estimated_energy_kwh_per_day' => 5,
            'roof_orientation_deg' => 0,
            'recommended_azimuth_deg' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_menghapus_user_menghapus_riwayat_analisisnya(): void
    {
        $analysis = RoofAnalysis::factory()->create();

        $analysis->user->delete();

        $this->assertDatabaseMissing('roof_analyses', ['id' => $analysis->id]);
    }
}
