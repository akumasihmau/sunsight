<?php

namespace App\Services\Ml;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Klien layanan model segmentasi bidang atap.
 *
 * Citra dikirim apa adanya sebagai multipart bersama ambang keyakinan. ROI tidak
 * dikirim karena yang diperiksa adalah seluruh tangkapan: antarmuka mengirim persis
 * area peta yang terlihat, dan `bbox` sudah mewakili batasnya.
 *
 * Batas waktunya diambil dari konfigurasi, bukan ditulis di sini, karena inferensi
 * berjalan di CPU dan lamanya bergantung pada mesin serta ukuran citra yang dipakai
 * layanan. Kegagalan transport dipetakan ke exception domain supaya pengendali dapat
 * menjawab 503 atau 504 sesuai kontrak, alih-alih meneruskan 500 yang tidak
 * menjelaskan apa pun kepada pemanggil.
 */
class MlClient
{
    private const PREDICT_PATH = '/api/v1/predict';

    /**
     * Menjalankan deteksi atas satu tangkapan.
     *
     * `minConfidence` hanya diteruskan; penyaringan deteksi tetap menjadi wewenang
     * layanan model, sehingga tidak ada dua ambang yang dapat berbeda diam-diam.
     */
    public function detect(string $binary, string $filename, ?float $minConfidence = null): RoofDetectionResult
    {
        $timeout = (int) config('services.ml.timeout');

        $request = Http::timeout($timeout)
            ->acceptJson()
            ->attach('file', $binary, $filename);

        if ($minConfidence !== null) {
            // Layanan model membaca ambang keyakinan dari *query string*, bukan dari
            // badan multipart. Dikirim sebagai field, nilainya akan diabaikan tanpa
            // jejak dan setiap permintaan memakai ambang bawaan 0,25 — pemanggil
            // meminta 0,9 tetapi tetap menerima deteksi 0,26.
            $request = $request->withQueryParameters(['min_confidence' => $minConfidence]);
        }

        try {
            $response = $request->post($this->baseUrl().self::PREDICT_PATH);
        } catch (ConnectionException $exception) {
            if (self::isTimeout($exception)) {
                throw MlTimeoutException::fromConnection($timeout, $exception);
            }

            throw MlUnavailableException::fromConnection($exception);
        }

        if (! $response->successful()) {
            throw MlUnavailableException::becauseOfStatus($response->status());
        }

        $payload = $response->json();

        if (! is_array($payload) || ($payload['success'] ?? false) !== true) {
            throw MlUnavailableException::becauseOfPayload();
        }

        return RoofDetectionResult::fromPayload($payload);
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.ml.url'), '/');
    }

    /**
     * Laravel melempar `ConnectionException` yang sama untuk koneksi yang ditolak
     * maupun untuk waktu tunggu yang habis, jadi keduanya hanya dapat dipisahkan dari
     * pesannya. Pemeriksaan ini disengaja longgar: salah tebak ke arah 503 masih
     * benar bagi pemanggil, sedangkan salah tebak ke arah 504 akan menyalahkan
     * layanan yang sebenarnya tidak pernah dihubungi.
     */
    private static function isTimeout(ConnectionException $exception): bool
    {
        $message = strtolower($exception->getMessage());

        return str_contains($message, 'timed out')
            || str_contains($message, 'timeout')
            || str_contains($message, 'curl error 28');
    }
}
