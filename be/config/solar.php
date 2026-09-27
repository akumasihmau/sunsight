<?php

/*
|--------------------------------------------------------------------------
| Sumber iradiasi
|--------------------------------------------------------------------------
|
| Berkas ini hanya mengurus sumber data iradiasi. Asumsi sistem dan seluruh
| angka finansial berada di config/plts.php, supaya tidak ada nilai yang
| didefinisikan di dua tempat.
|
*/

return [

    /*
    |--------------------------------------------------------------------------
    | Nilai cadangan
    |--------------------------------------------------------------------------
    |
    | Dipakai ketika sumber iradiasi tidak dapat dihubungi. Hasilnya ditandai
    | sebagai cadangan agar tidak disalahartikan sebagai data pengukuran.
    |
    */

    'fallback_daily_ghi' => (float) env('SOLAR_FALLBACK_DAILY_GHI', 4.8),

    /*
    |--------------------------------------------------------------------------
    | NASA POWER
    |--------------------------------------------------------------------------
    |
    | Parameter ALLSKY_SFC_SW_DWN pada komunitas RE bersatuan kWh/m2/hari, dan
    | nilai ANN adalah rata-rata klimatologi tahunan.
    |
    */

    'nasa_power' => [
        'url' => env('NASA_POWER_URL', 'https://power.larc.nasa.gov/api/temporal/climatology/point'),
        'timeout' => (int) env('NASA_POWER_TIMEOUT', 20),
        'parameter' => 'ALLSKY_SFC_SW_DWN',
        'community' => 'RE',
    ],

    // Iradiasi klimatologi nyaris tidak berubah, sehingga hasilnya disimpan sehari.
    'cache_ttl' => (int) env('SOLAR_CACHE_TTL', 86400),

];
