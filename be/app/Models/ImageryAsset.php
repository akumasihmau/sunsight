<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Satu berkas citra yang tersimpan, beserta metadata yang dibutuhkan server.
 *
 * Citra dasar menyimpan georeferensi (titik tengah, zoom, bbox, skala). Turunan
 * seperti mask tidak, karena tidak ada koordinat yang melekat padanya.
 */
#[Fillable([
    'image_id',
    'user_id',
    'kind',
    'path',
    'extension',
    'mime_type',
    'width',
    'height',
    'meters_per_pixel',
    'center_lat',
    'center_lng',
    'zoom',
    'bbox',
])]
class ImageryAsset extends Model
{
    public const KIND_RAW = 'raw';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'width' => 'integer',
            'height' => 'integer',
            'meters_per_pixel' => 'float',
            'center_lat' => 'float',
            'center_lng' => 'float',
            'zoom' => 'integer',
            'bbox' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function url(): string
    {
        return Storage::disk('public')->url($this->path);
    }

    public function absolutePath(): string
    {
        return Storage::disk('public')->path($this->path);
    }
}
