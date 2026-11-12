<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Satu hasil pencarian alamat yang pernah diambil dari Nominatim.
 *
 * Disimpan karena Nominatim membatasi laju permintaan dan melarang pengambilan
 * berulang untuk kueri yang sama. Baris lama dipakai ulang; yang kedaluwarsa
 * diambil ulang saat diminta.
 */
#[Fillable([
    'query',
    'query_hash',
    'results',
    'fetched_at',
])]
class GeocodeCache extends Model
{
    /**
     * Nama tabel dipatok eksplisit: bentuk jamak otomatis Laravel menghasilkan
     * `geocode_caches`, sedangkan migrasinya membuat `geocode_cache`.
     */
    protected $table = 'geocode_cache';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'results' => 'array',
            'fetched_at' => 'datetime',
        ];
    }
}
