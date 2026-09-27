<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Penyedia citra
    |--------------------------------------------------------------------------
    |
    | `sample` membaca fixture lokal sehingga seluruh alur dapat dijalankan tanpa
    | jaringan. `tile` mengambil ubin dari penyedia citra jaringan dan karena itu
    | memerlukan IMAGERY_TILE_URL.
    |
    */

    'provider' => env('IMAGERY_PROVIDER', 'sample'),

    /*
    |--------------------------------------------------------------------------
    | Ukuran citra
    |--------------------------------------------------------------------------
    |
    | Dipatok 512 x 512 piksel dan menjadi bagian dari kontrak API.
    |
    */

    'size' => 512,

    'zoom' => [
        'min' => 15,
        'max' => 20,
        'default' => 19,
    ],

    /*
    |--------------------------------------------------------------------------
    | Penyedia ubin jaringan
    |--------------------------------------------------------------------------
    |
    | Template URL memakai placeholder {z}, {x}, dan {y}. Sengaja tidak diberi
    | nilai bawaan: sumber citra masih menjadi pertanyaan terbuka, sehingga
    | penyedia harus dikonfigurasi secara sadar, bukan mewarisi pilihan diam-diam.
    |
    */

    'tile' => [
        'url' => env('IMAGERY_TILE_URL', ''),
        'timeout' => (int) env('IMAGERY_TILE_TIMEOUT', 20),
        'user_agent' => env('IMAGERY_TILE_USER_AGENT', 'Sunsight/1.0 (tugas akhir; kontak: tim pengembang)'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Fixture citra
    |--------------------------------------------------------------------------
    |
    | Berada di luar storage/app karena direktori itu diabaikan git seluruhnya,
    | sehingga fixture di sana tidak akan ada pada klon bersih.
    |
    */

    'fixtures' => base_path('tests/fixtures/imagery'),

];
