<?php

namespace App\Services\Imagery;

use App\Models\ImageryAsset;

/**
 * Citra dari fixture lokal sehingga seluruh alur dapat dijalankan tanpa jaringan
 * dan tanpa kredensial penyedia.
 *
 * Fixture adalah citra sintetis, bukan citra satelit. Atribusinya menyatakan itu
 * supaya tidak ada yang salah sangka saat alur didemokan dengan penyedia ini.
 * Fixture dipilih secara deterministik dari koordinat, sehingga lokasi yang sama
 * selalu menampilkan citra yang sama.
 */
class SampleImageryProvider implements ImageryProvider
{
    public function __construct(
        private readonly ImageryAssetStore $store,
    ) {}

    public function fetch(float $lat, float $lng, int $zoom, int $userId): ImageryAsset
    {
        $fixture = $this->fixtureFor($lat, $lng);

        $binary = file_get_contents($fixture);

        if ($binary === false) {
            throw new ImageryUnavailableException("Fixture citra tidak dapat dibaca: {$fixture}");
        }

        $size = getimagesize($fixture);

        if ($size === false) {
            throw new ImageryUnavailableException("Fixture citra tidak dikenali: {$fixture}");
        }

        return $this->store->storeImagery(
            userId: $userId,
            binary: $binary,
            lat: $lat,
            lng: $lng,
            zoom: $zoom,
            bbox: ImageryBoundingBox::forPoint($lat, $lng, $size[0], $zoom),
            metersPerPixel: ImageryBoundingBox::metersPerPixel($lat, $zoom),
        );
    }

    public function attribution(): string
    {
        return 'Citra contoh sintetis — bukan citra satelit';
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
            throw new ImageryUnavailableException(
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
