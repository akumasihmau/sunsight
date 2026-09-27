<?php

namespace App\Services\Simulation;

use InvalidArgumentException;

/**
 * Membaca katalog modul dan tarif dari konfigurasi.
 *
 * Antarmuka mengambil pilihannya lewat `GET /options` dari sini juga, sehingga
 * klien tidak pernah menyalin konstanta dan tidak mungkin menyimpang dari server.
 */
class SimulationCatalog
{
    /**
     * @return array<string, mixed>
     */
    public static function module(string $key): array
    {
        $module = config("plts.modules.{$key}");

        if (! is_array($module)) {
            throw new InvalidArgumentException("Preset modul tidak dikenal: {$key}.");
        }

        return $module + [
            'key' => $key,
            // Efisiensi diturunkan, bukan disimpan, supaya tidak mungkin menyimpang
            // dari daya dan dimensinya sendiri.
            'efficiency' => self::efficiency($module),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function tariff(string $key): array
    {
        $tariff = config("plts.tariffs.{$key}");

        if (! is_array($tariff)) {
            throw new InvalidArgumentException("Golongan tarif tidak dikenal: {$key}.");
        }

        return $tariff + ['key' => $key];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function moduleKeys(): array
    {
        return array_keys((array) config('plts.modules'));
    }

    /**
     * @return array<int, string>
     */
    public static function tariffKeys(): array
    {
        return array_keys((array) config('plts.tariffs'));
    }

    /**
     * @return array<string, mixed>
     */
    public static function options(): array
    {
        $modules = [];

        foreach (self::moduleKeys() as $key) {
            $modules[] = self::module($key);
        }

        $tariffs = [];

        foreach (self::tariffKeys() as $key) {
            $tariffs[] = self::tariff($key);
        }

        return [
            'modules' => $modules,
            'tariffs' => $tariffs,
            'defaults' => (array) config('plts.defaults'),
            'limits' => (array) config('plts.limits'),
        ];
    }

    /**
     * @param  array<string, mixed>  $module
     */
    private static function efficiency(array $module): float
    {
        $areaSqm = (float) $module['length_m'] * (float) $module['width_m'];

        if ($areaSqm <= 0.0) {
            return 0.0;
        }

        // Daya puncak pada 1000 W/m2 dibagi luas modul.
        return round(((float) $module['power_w'] / 1000.0) / $areaSqm, 4);
    }
}
