<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Penyedia citra
    |--------------------------------------------------------------------------
    |
    | `mapbox` adalah penyedia produk: citra satelit nadir sungguhan, diambil saat
    | diminta. Ia memerlukan MAPBOX_ACCESS_TOKEN dan gagal dengan pesan konfigurasi
    | bila tokennya kosong, bukan mengembalikan citra kosong.
    |
    | `sample` membaca fixture lokal sehingga seluruh alur dapat dijalankan tanpa
    | jaringan dan tanpa token. Berguna untuk pengujian dan untuk demo luring.
    |
    */

    'provider' => env('IMAGERY_PROVIDER', 'mapbox'),

    /*
    |--------------------------------------------------------------------------
    | Zoom
    |--------------------------------------------------------------------------
    */

    'zoom' => [
        'min' => 15,
        'max' => 20,
        'default' => 19,
    ],

    /*
    |--------------------------------------------------------------------------
    | Mapbox Static Images
    |--------------------------------------------------------------------------
    |
    | Satu permintaan mengembalikan satu citra untuk satu titik pada satu zoom,
    | berukuran `size` x `size` piksel. Proyeksinya Web Mercator, sama seperti
    | perhitungan piksel ke geografis di ImageryBoundingBox.
    |
    | ToS Mapbox mengizinkan penggunaan non-produksi (pengembangan, evaluasi,
    | pengujian, dan demonstrasi), melarang penghapusan tanda kepemilikan, dan
    | mensyaratkan lisensi komersial untuk penggunaan produksi pada aplikasi yang
    | berkaitan dengan real estate atau analytics. Atribusi karena itu dinyalakan.
    |
    */

    'mapbox' => [
        'base_url' => env('MAPBOX_BASE_URL', 'https://api.mapbox.com'),
        'token' => env('MAPBOX_ACCESS_TOKEN', ''),
        'username' => env('MAPBOX_USERNAME', 'mapbox'),
        'style' => env('MAPBOX_STYLE', 'satellite-v9'),
        'size' => (int) env('MAPBOX_IMAGE_SIZE', 1280),
        'timeout' => (int) env('MAPBOX_TIMEOUT', 30),
        'attribution' => true,
        'attribution_text' => '© Mapbox © Maxar',
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

    /*
    |--------------------------------------------------------------------------
    | Penyedia ubin alternatif
    |--------------------------------------------------------------------------
    |
    | Tidak dipakai produk, disimpan sebagai jalur alternatif bila penyedia static
    | image tidak dapat dipakai. Template memakai placeholder {z}, {x}, {y}.
    |
    */

    'tile' => [
        'url' => env('IMAGERY_TILE_URL', ''),
        'size' => (int) env('IMAGERY_TILE_SIZE', 512),
        'timeout' => (int) env('IMAGERY_TILE_TIMEOUT', 20),
        'user_agent' => env('IMAGERY_TILE_USER_AGENT', 'Sunsight/1.0 (tugas akhir; kontak: tim pengembang)'),
    ],

];
