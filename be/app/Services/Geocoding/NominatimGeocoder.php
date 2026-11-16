<?php

namespace App\Services\Geocoding;

use App\Models\GeocodeCache;
use Illuminate\Support\Facades\Http;

/**
 * Pencarian alamat lewat Nominatim (OpenStreetMap), dengan cache di basis data.
 *
 * Pencarian dilakukan server, bukan peramban: kebijakan Nominatim mewajibkan
 * identitas pemanggil yang jelas dan membatasi laju permintaan per alamat IP.
 * Dengan satu pintu di sini, identitas itu dapat dipasang pada User-Agent,
 * hasil berulang dijawab dari cache, dan penyedia dapat diganti tanpa menyentuh
 * antarmuka.
 *
 * Wilayah dibatasi dengan `viewbox` + `bounded=1` ke Kota Bogor, sama dengan
 * batas peta studio. Permintaan di luar wilayah itu tidak akan mengembalikan
 * hasil, dan itu disengaja: menggeser peta ke luar cakupan citra hanya akan
 * menghasilkan pemindaian yang tidak berguna.
 */
final class NominatimGeocoder
{
    /** Minimal panjang kueri; dua huruf terlalu umum untuk dicari. */
    public const MIN_QUERY_LENGTH = 3;

    /** Batas panjang kueri; menjaga URL tetap wajar. */
    public const MAX_QUERY_LENGTH = 120;

    /**
     * Mencari alamat. Hasil kosong berarti "tidak ditemukan", bukan kegagalan.
     *
     * @return array<int, array{label: string, lat: float, lng: float, bbox: array{0: float, 1: float, 2: float, 3: float}, source: string}>
     *
     * @throws GeocodingUnavailableException
     */
    public function search(string $query): array
    {
        $normalised = $this->normalise($query);

        if (mb_strlen($normalised) < self::MIN_QUERY_LENGTH) {
            return [];
        }

        $hash = hash('sha256', $normalised);
        $cached = $this->fromCache($hash);

        if ($cached !== null) {
            return $cached;
        }

        $results = $this->fetch($normalised);
        $this->store($normalised, $hash, $results);

        return $results;
    }

    /**
     * Mencari alamat terdekat dari koordinat (reverse geocoding), dengan cache.
     *
     * @throws GeocodingUnavailableException
     */
    public function reverse(float $lat, float $lng): ?string
    {
        $normalised = sprintf('rev:%.5F,%.5F', $lat, $lng);
        $hash = hash('sha256', $normalised);
        $cached = $this->fromCache($hash);

        if ($cached !== null) {
            $firstLabel = $cached[0]['label'] ?? null;

            return is_string($firstLabel) && trim($firstLabel) !== '' ? trim($firstLabel) : null;
        }

        $label = $this->fetchReverse($lat, $lng);
        $this->store(
            $normalised,
            $hash,
            $label === null ? [] : [[
                'label' => $label,
                'lat' => $lat,
                'lng' => $lng,
                'bbox' => [$lng, $lat, $lng, $lat],
                'source' => 'nominatim',
            ]],
        );

        return $label;
    }

    /**
     * Kueri dinormalkan supaya "  Jl.  Pajajaran " dan "jl. pajajaran" berbagi
     * satu baris cache.
     */
    public function normalise(string $query): string
    {
        $collapsed = preg_replace('/\s+/u', ' ', trim($query)) ?? '';

        return mb_strtolower(mb_substr($collapsed, 0, self::MAX_QUERY_LENGTH));
    }

    /**
     * @return array<int, array{label: string, lat: float, lng: float, bbox: array{0: float, 1: float, 2: float, 3: float}, source: string}>|null
     */
    private function fromCache(string $hash): ?array
    {
        $days = (int) config('services.geocode.cache_days');

        $row = GeocodeCache::query()
            ->where('query_hash', $hash)
            ->where('fetched_at', '>=', now()->subDays($days))
            ->first();

        if ($row === null) {
            return null;
        }

        /** @var array<int, array<string, mixed>> $results */
        $results = $row->results;

        return $results;
    }

    /**
     * @param  array<int, array<string, mixed>>  $results
     */
    private function store(string $query, string $hash, array $results): void
    {
        GeocodeCache::query()->updateOrCreate(
            ['query_hash' => $hash],
            [
                'query' => $query,
                'results' => $results,
                'fetched_at' => now(),
            ],
        );
    }

    /**
     * @return array<int, array{label: string, lat: float, lng: float, bbox: array{0: float, 1: float, 2: float, 3: float}, source: string}>
     */
    private function fetch(string $query): array
    {
        /** @var array{0: float, 1: float, 2: float, 3: float} $box */
        $box = (array) config('services.geocode.viewbox');

        try {
            $response = Http::withHeaders([
                'User-Agent' => (string) config('services.geocode.user_agent'),
                'Accept-Language' => 'id',
            ])
                ->timeout((int) config('services.geocode.timeout'))
                ->get(rtrim((string) config('services.geocode.url'), '/').'/search', [
                    'format' => 'jsonv2',
                    'q' => $query,
                    'limit' => (int) config('services.geocode.limit'),
                    'countrycodes' => 'id',
                    // Nominatim menulis kotak sebagai `left,top,right,bottom`, yaitu
                    // [minLng, maxLat, maxLng, minLat]. Konfigurasi menyimpan urutan
                    // kontrak [minLng, minLat, maxLng, maxLat], jadi dua nilai ditukar.
                    'viewbox' => sprintf('%F,%F,%F,%F', $box[0], $box[3], $box[2], $box[1]),
                    'bounded' => 1,
                    'addressdetails' => 0,
                ]);
        } catch (\Illuminate\Http\Client\ConnectionException $exception) {
            // Timeout atau DNS gagal: layanan tidak dapat dihubungi, bukan masukan salah.
            throw new GeocodingUnavailableException(
                'Layanan pencarian alamat tidak dapat dihubungi.',
                previous: $exception,
            );
        }

        if (! $response->successful()) {
            throw new GeocodingUnavailableException(sprintf(
                'Layanan pencarian alamat menolak permintaan (%d).',
                $response->status(),
            ));
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            throw new GeocodingUnavailableException('Layanan pencarian alamat mengembalikan jawaban yang tidak dikenali.');
        }

        $results = [];

        foreach ($payload as $item) {
            if (! is_array($item) || ! isset($item['lat'], $item['lon'], $item['display_name'])) {
                continue;
            }

            $lat = (float) $item['lat'];
            $lng = (float) $item['lon'];

            // Nominatim mengirim `boundingbox` sebagai [minLat, maxLat, minLng, maxLng]
            // dalam bentuk teks; kontrak kita memakai urutan [minLng, minLat, maxLng, maxLat].
            $bbox = [$lng, $lat, $lng, $lat];

            if (isset($item['boundingbox']) && is_array($item['boundingbox']) && count($item['boundingbox']) === 4) {
                $bbox = [
                    (float) $item['boundingbox'][2],
                    (float) $item['boundingbox'][0],
                    (float) $item['boundingbox'][3],
                    (float) $item['boundingbox'][1],
                ];
            }

            $results[] = [
                'label' => (string) $item['display_name'],
                'lat' => $lat,
                'lng' => $lng,
                'bbox' => $bbox,
                'source' => 'nominatim',
            ];
        }

        return $results;
    }

    private function fetchReverse(float $lat, float $lng): ?string
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => (string) config('services.geocode.user_agent'),
                'Accept-Language' => 'id',
            ])
                ->timeout((int) config('services.geocode.timeout'))
                ->get(rtrim((string) config('services.geocode.url'), '/').'/reverse', [
                    'format' => 'jsonv2',
                    'lat' => $lat,
                    'lon' => $lng,
                    'zoom' => 18,
                    'addressdetails' => 1,
                ]);
        } catch (\Illuminate\Http\Client\ConnectionException $exception) {
            throw new GeocodingUnavailableException(
                'Layanan pencarian alamat tidak dapat dihubungi.',
                previous: $exception,
            );
        }

        if (! $response->successful()) {
            throw new GeocodingUnavailableException(sprintf(
                'Layanan pencarian alamat menolak permintaan (%d).',
                $response->status(),
            ));
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            return null;
        }

        $address = is_array($payload['address'] ?? null) ? $payload['address'] : [];
        $parts = [];

        foreach (['road', 'residential', 'pedestrian', 'neighbourhood', 'hamlet', 'suburb', 'village', 'city_district'] as $key) {
            $val = isset($address[$key]) ? trim((string) $address[$key]) : '';
            if ($val !== '' && ! in_array($val, $parts, true)) {
                $parts[] = $val;
            }
            if (count($parts) >= 2) {
                break;
            }
        }

        if ($parts === [] && isset($payload['display_name'])) {
            $segments = array_values(array_filter(array_map('trim', explode(',', (string) $payload['display_name']))));
            $parts = array_slice($segments, 0, 2);
        }

        if ($parts === []) {
            return null;
        }

        return mb_substr(implode(', ', $parts), 0, 120);
    }
}
