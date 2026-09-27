<?php

namespace App\Services\Cv;

use Illuminate\Contracts\Process\ProcessResult;
use Illuminate\Process\Exceptions\ProcessTimedOutException as LaravelProcessTimedOutException;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Process\Exception\ProcessTimedOutException as SymfonyProcessTimedOutException;
use Symfony\Component\Process\Exception\RuntimeException as ProcessRuntimeException;

/**
 * Menjalankan pemrosesan citra lewat skrip Python sebagai proses terpisah.
 *
 * Kontrak CLI yang dipakai bersama oleh kelas ini dan oleh verifikasi manual:
 * argumen bernama, satu baris JSON di stdout, kode keluar nol untuk sukses, dan
 * kode keluar bukan nol beserta pesan di stderr untuk gagal. Mask ditulis ke
 * berkas yang ditunjuk pemanggil, bukan dikirim lewat stdout.
 */
class ProcessCvClient implements CvClient
{
    public function refinePolygon(string $imagePath, array $roughPolygon): CvRefineResult
    {
        $script = (string) config('cv.scripts.refine_polygon');
        $maskPath = $this->temporaryMaskPath();

        $result = $this->run($script, [
            '--image', $imagePath,
            '--polygon', $this->encode($roughPolygon),
            '--mask-out', $maskPath,
        ]);

        $payload = $this->decode($script, $result);

        return new CvRefineResult(
            refinedPolygon: $this->polygonFrom($script, $payload['refined_polygon'] ?? null),
            maskPng: $this->consumeMask($script, $maskPath),
        );
    }

    public function detectShadow(string $imagePath, array $refinedPolygon, float $metersPerPixel): CvShadowResult
    {
        $script = (string) config('cv.scripts.detect_shadow');
        $maskPath = $this->temporaryMaskPath();

        $result = $this->run($script, [
            '--image', $imagePath,
            '--polygon', $this->encode($refinedPolygon),
            '--meters-per-pixel', (string) $metersPerPixel,
            '--mask-out', $maskPath,
        ]);

        $payload = $this->decode($script, $result);

        $usable = $this->areaFrom($script, 'usable_area_sqm', $payload['usable_area_sqm'] ?? null);
        $shadow = $this->areaFrom($script, 'shadow_area_sqm', $payload['shadow_area_sqm'] ?? null);

        if ($usable + $shadow <= 0.0) {
            throw CvFailureException::invalidOutput($script, 'luas total nol');
        }

        return new CvShadowResult(
            usableAreaSqm: $usable,
            shadowAreaSqm: $shadow,
            maskPng: $this->consumeMask($script, $maskPath),
        );
    }

    /**
     * @param  array<int, string>  $arguments
     */
    private function run(string $script, array $arguments): ProcessResult
    {
        $python = (string) config('cv.python');
        $timeout = (int) config('cv.timeout');

        if (! is_file($script)) {
            throw CvFailureException::invalidOutput($script, 'berkas skrip tidak ditemukan');
        }

        try {
            $result = Process::timeout($timeout)->run([$python, $script, ...$arguments]);
        } catch (LaravelProcessTimedOutException|SymfonyProcessTimedOutException) {
            throw CvFailureException::timeout($script, $timeout);
        } catch (ProcessRuntimeException $e) {
            throw CvFailureException::interpreterUnavailable($python, $e);
        }

        if (! $result->successful()) {
            $exitCode = (int) $result->exitCode();
            $stderr = $result->errorOutput();

            // Shell melaporkan perintah yang tidak ditemukan sebagai kode keluar 127,
            // bukan sebagai exception, sehingga kasus interpreter hilang harus dikenali
            // dari kode keluarnya. Berlaku juga ketika CV_PYTHON berupa nama tanpa jalur.
            if ($exitCode === 127) {
                throw CvFailureException::interpreterUnavailable($python, null, $stderr);
            }

            throw CvFailureException::scriptFailed($script, $exitCode, $stderr);
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function decode(string $script, ProcessResult $result): array
    {
        // Baris terakhir dipakai karena peringatan pustaka dapat muncul lebih dulu di stdout,
        // sementara JSON hasil selalu dicetak skrip sebagai baris penutup.
        $lines = array_values(array_filter(
            preg_split('/\R/', trim($result->output())) ?: [],
            static fn (string $line): bool => trim($line) !== '',
        ));

        $decoded = $lines === [] ? null : json_decode($lines[array_key_last($lines)], true);

        if (! is_array($decoded)) {
            throw CvFailureException::invalidOutput($script, 'keluaran bukan JSON');
        }

        return $decoded;
    }

    /**
     * @return array<int, array{0: float, 1: float}>
     */
    private function polygonFrom(string $script, mixed $value): array
    {
        if (! is_array($value)) {
            throw CvFailureException::invalidOutput($script, 'poligon tidak ada pada keluaran');
        }

        $polygon = [];

        foreach ($value as $point) {
            if (! is_array($point) || count($point) !== 2 || ! is_numeric($point[0]) || ! is_numeric($point[1])) {
                throw CvFailureException::invalidOutput($script, 'titik poligon tidak berpasangan [x, y]');
            }

            $polygon[] = [(float) $point[0], (float) $point[1]];
        }

        if (count($polygon) < 3) {
            throw CvFailureException::invalidOutput($script, 'poligon kurang dari tiga titik');
        }

        return $polygon;
    }

    private function areaFrom(string $script, string $field, mixed $value): float
    {
        if (! is_numeric($value) || (float) $value < 0.0) {
            throw CvFailureException::invalidOutput($script, "nilai {$field} tidak sah");
        }

        return (float) $value;
    }

    private function consumeMask(string $script, string $maskPath): string
    {
        $isPresent = is_file($maskPath) && filesize($maskPath) > 0;

        $binary = $isPresent ? file_get_contents($maskPath) : false;

        if (is_file($maskPath)) {
            unlink($maskPath);
        }

        if ($binary === false) {
            throw CvFailureException::invalidOutput($script, 'mask tidak dihasilkan');
        }

        return $binary;
    }

    private function temporaryMaskPath(): string
    {
        // Ekstensi .png wajib: cv2.imwrite menentukan format keluaran dari ekstensi
        // berkas, sehingga berkas temporary tanpa ekstensi akan gagal ditulis.
        $path = sprintf(
            '%s/sunsight_mask_%s.png',
            sys_get_temp_dir(),
            bin2hex(random_bytes(8)),
        );

        if (! touch($path)) {
            throw CvFailureException::invalidOutput('mask', 'berkas sementara tidak dapat dibuat');
        }

        return $path;
    }

    /**
     * @param  array<int, array{0: float, 1: float}>  $polygon
     */
    private function encode(array $polygon): string
    {
        return json_encode($polygon, JSON_THROW_ON_ERROR);
    }
}
