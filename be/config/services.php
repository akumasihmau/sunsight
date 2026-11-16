<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Layanan model segmentasi bidang atap
    |--------------------------------------------------------------------------
    |
    | Layanan terpisah (Python) yang menerima berkas citra dan mengembalikan poligon
    | bidang atap. Batas waktunya jauh lebih longgar daripada permintaan biasa karena
    | inferensinya berjalan di CPU: permintaan pertama setelah layanan dinyalakan
    | memerlukan sekitar 11-13 detik untuk pemanasan model, dan permintaan berikutnya
    | 3-8 detik untuk citra 1280 piksel. Nilai 60 detik memberi ruang bagi mesin yang
    | lebih lambat; 504 dijawab hanya setelah batas ini benar-benar terlampaui.
    |
    */

    'ml' => [
        'url' => env('ML_SERVICE_URL', 'http://127.0.0.1:8001'),
        // Rahasia bersama yang dibaca layanan model dari header `X-Api-Key`.
        // Kosong berarti header tidak dikirim, sehingga hanya cocok untuk layanan
        // model yang berjalan di mesin yang sama dan tidak meminta autentikasi.
        'key' => env('ML_SERVICE_KEY'),
        'timeout' => (int) env('ML_SERVICE_TIMEOUT', 60),
        // Parameter perapian poligon deteksi atap sebelum dikembalikan ke studio.
        // Dapat disetel lewat `.env` tanpa menyentuh kode maupun kontrak API.
        'postprocess' => [
            'simplify_tolerance_px' => (float) env('ML_SIMPLIFY_TOLERANCE_PX', 1.8),
            'rectangularity_threshold' => (float) env('ML_RECTANGULARITY_THRESHOLD', 0.80),
            'max_aspect_ratio' => (float) env('ML_MAX_ASPECT_RATIO', 5.0),
            'min_area_sqm' => (float) env('ML_MIN_AREA_SQM', 6.0),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Geocoding (Nominatim / OpenStreetMap)
    |--------------------------------------------------------------------------
    |
    | Pencarian alamat dilakukan server, bukan peramban: kebijakan Nominatim
    | mewajibkan identitas pemanggil yang jelas dan membatasi laju permintaan, dan
    | hasil yang sama tidak perlu diambil ulang. Wilayah dibatasi ke Kota Bogor
    | karena peta studio memang dibatasi di sana.
    |
    */

    'geocode' => [
        'url' => env('GEOCODE_URL', 'https://nominatim.openstreetmap.org'),
        'user_agent' => env('GEOCODE_USER_AGENT', 'Sunsight/1.0 (simulasi PLTS atap)'),
        'timeout' => (int) env('GEOCODE_TIMEOUT', 8),
        'limit' => (int) env('GEOCODE_LIMIT', 5),
        'cache_days' => (int) env('GEOCODE_CACHE_DAYS', 30),
        // Kotak wilayah Kota Bogor dalam urutan kontrak [minLng, minLat, maxLng, maxLat]:
        // lng 106,72-106,88 dan lat -6,68..-6,51.
        'viewbox' => [106.7200, -6.6800, 106.8800, -6.5100],
    ],

    /*
    |--------------------------------------------------------------------------
    | Login Google (OAuth 2.0)
    |--------------------------------------------------------------------------
    |
    | Kredensial aplikasi OAuth dari Google Cloud Console. `redirect` harus sama
    | persis dengan URI yang didaftarkan di console, karena Google menolak
    | pengalihan ke alamat lain. Nilai bawaannya diturunkan dari `APP_URL` supaya
    | pengembangan lokal tidak perlu mengisi variabel tambahan.
    |
    */

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL').'/api/auth/google-callback'),
    ],
];
