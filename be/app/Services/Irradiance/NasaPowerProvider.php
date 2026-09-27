<?php

namespace App\Services\Irradiance;

use App\Services\IrradianceProvider;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Iradiasi dari klimatologi NASA POWER.
 *
 * Nilainya stabil antar tahun, sehingga disimpan di cache dan tidak diambil ulang
 * untuk setiap analisis. Bila sumber tidak dapat dihubungi, nilai cadangan dari
 * konfigurasi dipakai dan sumbernya ditandai sebagai cadangan: permintaan tidak
 * digagalkan, tetapi hasilnya tidak boleh disalahartikan sebagai data pengukuran.
 */
class NasaPowerProvider implements IrradianceProvider
{
    public function dailyGhi(float $lat, float $lng): IrradianceValue
    {
        $cached = Cache::remember(
            $this->cacheKey($lat, $lng),
            (int) config('solar.cache_ttl'),
            fn (): ?float => $this->fetch($lat, $lng),
        );

        if ($cached === null) {
            return new IrradianceValue(
                dailyGhiKwhPerSqm: (float) config('solar.fallback_daily_ghi'),
                source: 'NASA POWER (cadangan)',
                period: 'nilai cadangan konfigurasi',
            );
        }

        return new IrradianceValue(
            dailyGhiKwhPerSqm: $cached,
            source: 'NASA POWER',
            period: 'klimatologi tahunan',
        );
    }

    private function fetch(float $lat, float $lng): ?float
    {
        try {
            $response = Http::timeout((int) config('solar.nasa_power.timeout'))
                ->get((string) config('solar.nasa_power.url'), [
                    'parameters' => (string) config('solar.nasa_power.parameter'),
                    'community' => (string) config('solar.nasa_power.community'),
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'format' => 'JSON',
                ]);
        } catch (Throwable) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $annual = $response->json(
            'properties.parameter.'.config('solar.nasa_power.parameter').'.ANN',
        );

        return is_numeric($annual) && (float) $annual > 0.0 ? (float) $annual : null;
    }

    private function cacheKey(float $lat, float $lng): string
    {
        return sprintf('solar:ghi:%0.3f:%0.3f', $lat, $lng);
    }
}
