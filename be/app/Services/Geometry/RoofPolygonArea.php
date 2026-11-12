<?php

namespace App\Services\Geometry;

/**
 * Geometri satu bidang atap hasil penurunan dari poligon.
 *
 * `roofLengthM` dan `roofWidthM` adalah sisi persegi pembatas **minimum** dari
 * poligon efektif, mengikuti penamaan pada antarmuka. Dimensi efektif tata letak
 * sama dengan keduanya, sedangkan luas efektif tetap luas poligon efektif — bukan
 * luas persegi pembatasnya — karena slot di luar poligon memang dibuang.
 *
 * Bingkai persegi disimpan dalam piksel karena di situlah slot ditempatkan, dan
 * poligon efektif disimpan bersama bingkainya supaya penyaringan slot tidak perlu
 * menebak hubungan keduanya.
 */
final readonly class RoofPolygonArea
{
    /**
     * @param  array<int, array{0: float, 1: float}>  $effectivePolygonPx  Ring efektif
     *         tertutup dalam piksel; kosong bila setback menghabiskan bidang.
     * @param  array{0: float, 1: float}  $frameCenterPx
     */
    public function __construct(
        public float $roofLengthM,
        public float $roofWidthM,
        public float $rotationDeg,
        public float $totalAreaSqm,
        public float $effectiveAreaSqm,
        public array $effectivePolygonPx,
        public array $frameCenterPx,
        public float $frameLengthPx,
        public float $frameWidthPx,
    ) {}

    /**
     * Bidang seperti yang dipahami mesin tata letak: dimensi efektif persegi
     * pembatas, dan luas efektif poligon.
     */
    public function toRoofArea(): RoofArea
    {
        return new RoofArea(
            roofLengthM: $this->roofLengthM,
            roofWidthM: $this->roofWidthM,
            totalAreaSqm: $this->totalAreaSqm,
            effectiveLengthM: $this->roofLengthM,
            effectiveWidthM: $this->roofWidthM,
            effectiveAreaSqm: $this->effectiveAreaSqm,
        );
    }

    /**
     * Apakah bidang ini menyisakan poligon efektif yang dapat dipakai.
     */
    public function hasEffectivePolygon(): bool
    {
        return $this->effectivePolygonPx !== [];
    }

    /**
     * Bingkai penempatan slot, dalam piksel.
     *
     * @return array{
     *     center: array{0: float, 1: float},
     *     length: float,
     *     width: float,
     *     rotation_deg: float,
     * }|null Null bila bidang tidak menyisakan poligon efektif.
     */
    public function maskFrame(): ?array
    {
        if (! $this->hasEffectivePolygon()) {
            return null;
        }

        return [
            'center' => $this->frameCenterPx,
            'length' => $this->frameLengthPx,
            'width' => $this->frameWidthPx,
            'rotation_deg' => $this->rotationDeg,
        ];
    }
}
