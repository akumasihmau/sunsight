<?php

namespace App\Services\Imagery;

use RuntimeException;

/**
 * Membaca citra dari fixture lokal sehingga seluruh alur dapat dijalankan tanpa
 * jaringan. Fixture dipilih secara deterministik dari koordinat, sehingga lokasi
 * yang sama selalu menampilkan citra yang sama saat didemokan.
 */
class SampleImageryProvider implements ImageryProvider
{
    public function __construct(
        private readonly ImageryAssetStore $store,
    ) {}

    public function fetch(float $lat, float $lng, int $zoom, int $userId): ImageryResult
    {
        $fixture = $this->fixtureFor($lat, $lng);

        $binary = file_get_contents($fixture);

        if ($binary === false) {
            throw new RuntimeException("Fixture citra tidak dapat dibaca: {$fixture}");
        }

        $size = getimagesize($fixture);

        if ($size === false) {
            throw new RuntimeException("Fixture citra tidak dikenali: {$fixture}");
        }

        $asset = $this->store->store($userId, $binary);

        return new ImageryResult(
            imageId: $asset['imageId'],
            path: $asset['path'],
            url: $asset['url'],
            bbox: ImageryBoundingBox::forPoint($lat, $lng, $size[0], $zoom),
            width: $size[0],
            height: $size[1],
            metersPerPixel: ImageryBoundingBox::metersPerPixel($lat, $zoom),
        );
    }

    /**
     * @return array<int, string>
     */
    public function fixtures(): array
    {
        $directory = (string) config('imagery.fixtures');
        $files = glob($directory.'/*.png') ?: [];

        sort($files);

        if ($files === []) {
            throw new RuntimeException(
                "Tidak ada fixture citra di {$directory}. Jalankan tests/fixtures/imagery/make_fixtures.py.",
            );
        }

        return $files;
    }

    private function fixtureFor(float $lat, float $lng): string
    {
        $fixtures = $this->fixtures();

        return $fixtures[abs(crc32(sprintf('%.6f,%.6f', $lat, $lng))) % count($fixtures)];
    }
}
