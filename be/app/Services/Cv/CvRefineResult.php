<?php

namespace App\Services\Cv;

/**
 * Hasil perapian poligon: poligon presisi dalam koordinat piksel, beserta mask
 * dalam bentuk PNG yang belum disimpan ke disk mana pun.
 */
final readonly class CvRefineResult
{
    /**
     * @param  array<int, array{0: float, 1: float}>  $refinedPolygon  Koordinat piksel.
     */
    public function __construct(
        public array $refinedPolygon,
        public string $maskPng,
    ) {}
}
