<?php

namespace App\Http\Controllers;

use App\Services\Geocoding\GeocodingUnavailableException;
use App\Services\Geocoding\NominatimGeocoder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pencarian alamat untuk menggeser peta studio.
 *
 * Dilakukan server supaya identitas pemanggil Nominatim jelas dan hasil berulang
 * dijawab dari cache, bukan dari jaringan.
 */
class GeocodeController extends Controller
{
    public function __invoke(Request $request, NominatimGeocoder $geocoder): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:'.NominatimGeocoder::MIN_QUERY_LENGTH, 'max:'.NominatimGeocoder::MAX_QUERY_LENGTH],
        ]);

        try {
            $results = $geocoder->search((string) $validated['q']);
        } catch (GeocodingUnavailableException $exception) {
            return response()->json(['message' => $exception->getMessage()], 503);
        }

        // Hasil kosong tetap 200: alamat yang tidak ditemukan bukan kegagalan, dan
        // antarmuka perlu membedakannya dari layanan yang mati.
        return response()->json([
            'query' => $geocoder->normalise((string) $validated['q']),
            'results' => $results,
        ]);
    }

    public function reverse(Request $request, NominatimGeocoder $geocoder): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];

        try {
            $label = $geocoder->reverse($lat, $lng);
        } catch (GeocodingUnavailableException $exception) {
            return response()->json(['message' => $exception->getMessage()], 503);
        }

        return response()->json([
            'lat' => $lat,
            'lng' => $lng,
            'label' => $label,
            'source' => 'nominatim',
        ]);
    }
}
