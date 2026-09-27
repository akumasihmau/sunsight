<?php

namespace App\Models\Concerns;

use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;

/**
 * Menulis dan membaca kolom geometri PostGIS dari ring GeoJSON.
 *
 * Kolom geometri sengaja tidak fillable: tanpa ini, teks sembarang dapat ditulis
 * ke kolom geometri dan menghasilkan data yang diam-diam rusak.
 */
trait StoresPolygonGeometry
{
    /**
     * @param  array<int, array{0: float, 1: float}>  $ring  Ring GeoJSON tertutup, urutan [lng, lat].
     */
    public function setPolygon(string $column, array $ring): static
    {
        $json = json_encode(
            ['type' => 'Polygon', 'coordinates' => [$ring]],
            JSON_THROW_ON_ERROR,
        );

        // Disisipkan sebagai literal yang di-quote PDO, bukan disambung mentah,
        // supaya nilainya tidak pernah dapat mengubah bentuk perintah SQL.
        $this->attributes[$column] = new Expression(
            'ST_SetSRID(ST_GeomFromGeoJSON('.DB::getPdo()->quote($json).'), 4326)',
        );

        return $this;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function polygonGeoJson(string $column): ?array
    {
        if ($this->getKey() === null) {
            return null;
        }

        $geoJson = DB::table($this->getTable())
            ->where('id', $this->getKey())
            ->selectRaw("ST_AsGeoJSON({$column}) as geojson")
            ->value('geojson');

        return $geoJson === null ? null : json_decode($geoJson, true, flags: JSON_THROW_ON_ERROR);
    }
}
