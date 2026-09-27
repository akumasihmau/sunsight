<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Asumsi kalkulasi
    |--------------------------------------------------------------------------
    |
    | Seluruh angka di bawah ini ikut disimpan bersama setiap analisis sehingga
    | hasilnya dapat direproduksi dan dapat dikutip di laporan. Mengubah nilai di
    | sini tidak mengubah arti analisis yang sudah tersimpan.
    |
    */

    // Efisiensi modul pada kondisi standar.
    'module_efficiency' => (float) env('SOLAR_MODULE_EFFICIENCY', 0.20),

    // Rasio performa sistem: kehilangan karena suhu, kabel, inverter, dan kotoran.
    'performance_ratio' => (float) env('SOLAR_PERFORMANCE_RATIO', 0.78),

    // Kemiringan panel yang diasumsikan, dalam derajat.
    'tilt_deg' => (float) env('SOLAR_TILT_DEG', 10.0),

    // Faktor penambah dari iradiasi bidang horizontal ke bidang miring.
    'tilt_factor' => (float) env('SOLAR_TILT_FACTOR', 1.05),

    /*
    |--------------------------------------------------------------------------
    | Iradiasi
    |--------------------------------------------------------------------------
    |
    | Nilai cadangan dipakai ketika sumber iradiasi tidak dapat dihubungi, dan
    | hasilnya ditandai sebagai cadangan agar tidak disalahartikan sebagai data
    | pengukuran.
    |
    */

    'fallback_daily_ghi' => (float) env('SOLAR_FALLBACK_DAILY_GHI', 4.8),

    'nasa_power' => [
        'url' => env('NASA_POWER_URL', 'https://power.larc.nasa.gov/api/temporal/climatology/point'),
        'timeout' => (int) env('NASA_POWER_TIMEOUT', 20),
        'parameter' => 'ALLSKY_SFC_SW_DWN',
        'community' => 'RE',
    ],

    // Iradiasi klimatologi nyaris tidak berubah, sehingga hasilnya disimpan sehari.
    'cache_ttl' => (int) env('SOLAR_CACHE_TTL', 86400),

];
