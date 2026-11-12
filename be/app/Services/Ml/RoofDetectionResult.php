<?php

namespace App\Services\Ml;

/**
 * Jawaban satu pemanggilan layanan model.
 *
 * Yang disimpan hanyalah yang dipakai pemanggil: identitas permintaan untuk jejak,
 * nama dan versi model untuk ditampilkan, dan daftar bidangnya. Ukuran citra yang
 * dilaporkan layanan tidak disimpan karena jawabannya sudah dinyatakan dalam ruang
 * piksel berkas yang dikirim — ukuran yang dikirim server yang berlaku, dan itulah
 * yang dipakai menghitung skala.
 */
final readonly class RoofDetectionResult
{
    /**
     * @param  array<int, RoofDetection>  $detections
     */
    public function __construct(
        public string $requestId,
        public string $modelName,
        public string $modelVersion,
        public array $detections,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function fromPayload(array $payload): self
    {
        $data = (array) ($payload['data'] ?? []);
        $meta = (array) ($payload['meta'] ?? []);

        $detections = [];

        foreach ((array) ($data['detections'] ?? []) as $detection) {
            $detections[] = RoofDetection::fromPayload((array) $detection);
        }

        return new self(
            requestId: (string) ($payload['request_id'] ?? ''),
            modelName: (string) ($meta['model'] ?? ''),
            modelVersion: (string) ($meta['model_version'] ?? ''),
            detections: $detections,
        );
    }
}
