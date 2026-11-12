<?php

namespace App\Services\Ml;

/**
 * Satu bidang atap seperti yang dikembalikan layanan model.
 *
 * `areaPx` disimpan apa adanya sebagai jejak jawaban layanan, tetapi **tidak**
 * dipakai sebagai luas akhir: luas yang berlaku selalu dihitung ulang di server dari
 * poligon dan skala tangkapan, supaya angkanya dapat dipertanggungjawabkan.
 */
final readonly class RoofDetection
{
    /**
     * @param  array<int, array{0: float, 1: float}>  $polygon  Ring dalam piksel.
     * @param  array{x1: float, y1: float, x2: float, y2: float}  $bbox
     */
    public function __construct(
        public string $id,
        public string $className,
        public float $confidence,
        public array $bbox,
        public array $polygon,
        public float $areaPx,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function fromPayload(array $payload): self
    {
        $bbox = (array) ($payload['bbox'] ?? []);

        $polygon = [];

        foreach ((array) ($payload['polygon'] ?? []) as $point) {
            $point = (array) $point;
            $polygon[] = [(float) ($point[0] ?? 0.0), (float) ($point[1] ?? 0.0)];
        }

        return new self(
            id: (string) ($payload['id'] ?? ''),
            className: (string) ($payload['class_name'] ?? ''),
            confidence: (float) ($payload['confidence'] ?? 0.0),
            bbox: [
                'x1' => (float) ($bbox['x1'] ?? 0.0),
                'y1' => (float) ($bbox['y1'] ?? 0.0),
                'x2' => (float) ($bbox['x2'] ?? 0.0),
                'y2' => (float) ($bbox['y2'] ?? 0.0),
            ],
            polygon: $polygon,
            areaPx: (float) ($payload['area_px'] ?? 0.0),
        );
    }
}
