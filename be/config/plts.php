<?php

/*
|--------------------------------------------------------------------------
| Katalog PLTS: modul, tarif, dan biaya
|--------------------------------------------------------------------------
|
| Seluruh angka finansial berada di sini supaya dapat dikutip, diuji, dan diubah
| tanpa menyentuh logika. Setiap blok mencantumkan dasarnya.
|
| PENTING: nilai biaya di bawah ini adalah asumsi yang diwarisi dari prototipe
| pembanding dan belum diverifikasi terhadap penawaran pemasang sungguhan.
| Ganti dengan penawaran nyata sebelum angkanya dipakai di laporan, lalu perbarui
| catatan dasarnya. Tarif juga harus dicocokkan dengan keputusan tarif PLN terbaru.
|
*/

return [

    /*
    |--------------------------------------------------------------------------
    | Preset modul surya
    |--------------------------------------------------------------------------
    |
    | Efisiensi TIDAK disimpan di sini dengan sengaja: nilainya dihitung dari
    | daya dibagi luas, sehingga tidak mungkin menyimpang dari dimensinya sendiri.
    |
    */

    'modules' => [
        'mono_perc_550' => [
            'label' => '550 W Mono PERC Bifacial',
            'power_w' => 550,
            'length_m' => 2.278,
            'width_m' => 1.134,
            'price_idr' => 1850000,
            'note' => 'Dimensi dan harga adalah asumsi prototipe pembanding; cocokkan dengan lembar data modul.',
        ],
        'compact_450' => [
            'label' => '450 W Compact All-Black',
            'power_w' => 450,
            'length_m' => 1.906,
            'width_m' => 1.134,
            'price_idr' => 1520000,
            'note' => 'Dimensi dan harga adalah asumsi prototipe pembanding; cocokkan dengan lembar data modul.',
        ],
        'bifacial_580' => [
            'label' => '580 W Bifacial Dual-Glass',
            'power_w' => 580,
            'length_m' => 2.382,
            'width_m' => 1.134,
            'price_idr' => 2100000,
            'note' => 'Dimensi dan harga adalah asumsi prototipe pembanding; cocokkan dengan lembar data modul.',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Tarif listrik PLN
    |--------------------------------------------------------------------------
    |
    | Nilai rujukan. Wajib dicocokkan dengan keputusan tarif PLN yang berlaku
    | sebelum angkanya dikutip di laporan.
    |
    */

    'tariffs' => [
        'R1' => [
            'label' => 'R-1 / 1.300 VA',
            'idr_per_kwh' => 1444.70,
            'year' => 2024,
        ],
        'R2' => [
            'label' => 'R-2 / 3.500-5.500 VA',
            'idr_per_kwh' => 1700.00,
            'year' => 2024,
        ],
        'B2' => [
            'label' => 'B-2 / Bisnis > 6.600 VA',
            'idr_per_kwh' => 1444.70,
            'year' => 2024,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Biaya sistem
    |--------------------------------------------------------------------------
    |
    | Rupiah. Harga modul melekat pada preset modul di atas.
    |
    */

    'costs' => [
        'inverter_idr_per_kwp' => 1_200_000,      // inverter string
        'inverter_idr_per_module' => 1_100_000,   // mikroinverter, dihitung per modul
        'racking_idr_per_module' => 350_000,
        'installation_idr' => 15_000_000,         // instalasi, net metering, dan SLO
    ],

    /*
    |--------------------------------------------------------------------------
    | Asumsi energi dan lingkungan
    |--------------------------------------------------------------------------
    |
    | Model produksi mengikuti perhitungan studio, bukan sumber iradiasi eksternal:
    | produksi = kapasitas x jam matahari puncak x 365 x faktor sudut datang x
    | faktor rugi sistem. Seluruh faktor dilaporkan di respons supaya angkanya dapat
    | dihitung ulang dari asumsi yang dikembalikan.
    */

    'energy' => [
        // Rugi suhu, kabel, kotoran, dan penuaan dalam satu angka.
        'system_loss_ratio' => (float) env('PLTS_SYSTEM_LOSS_RATIO', 0.82),

        // Efisiensi inverter menurut arsitekturnya.
        'inverter_efficiency' => [
            'string' => 0.984,
            'micro' => 0.975,
        ],

        // Puncak kurva efisiensi terhadap kemiringan dan azimuth.
        'optimal_tilt_deg' => 22.0,
        'optimal_azimuth_deg' => 188.0,

        // Jam matahari puncak pada penggeser posisi matahari studio.
        'peak_sun_hours' => [
            'morning' => 3.8,
            'noon' => 4.85,
            'afternoon' => 3.9,
            'morning_hour' => 9.0,
            'afternoon_hour' => 15.0,
        ],

        // Bonus membersihkan diri dari hujan pada dudukan yang dimiringkan.
        'racking_bonus' => [
            'max_deg' => 20.0,
            'ratio' => 0.02,
        ],
    ],

    // Faktor emisi jaringan PLN. Prototipe pembanding menyebut "Standar ESDM".
    'co2_kg_per_kwh' => (float) env('PLTS_CO2_KG_PER_KWH', 0.80),

    // Serapan karbon per pohon per tahun.
    'co2_kg_per_tree_per_year' => (float) env('PLTS_CO2_KG_PER_TREE_YEAR', 22.0),

    /*
    |--------------------------------------------------------------------------
    | Batas masukan
    |--------------------------------------------------------------------------
    |
    | Dipakai validasi sekaligus pengisian awal antarmuka.
    |
    */

    'limits' => [
        'setback_m' => ['min' => 0.0, 'max' => 5.0],
        'gutter_m' => ['min' => 0.0, 'max' => 5.0],
        'tilt_deg' => ['min' => 0.0, 'max' => 60.0],
        'azimuth_deg' => ['min' => 0.0, 'max' => 360.0],
        'clearance_m' => ['min' => 0.0, 'max' => 1.0],
        'rotation_deg' => ['min' => -45.0, 'max' => 45.0],
    ],

    'defaults' => [
        'module_key' => 'mono_perc_550',
        'tariff_key' => 'R2',
        'orientation' => 'portrait',
        'inverter_type' => 'string',
        'setback_m' => 0.5,
        'gutter_m' => 0.6,
        'tilt_deg' => 22.0,
        'azimuth_deg' => 188.0,
        'clearance_m' => 0.03,
        'monthly_bill_idr' => 2_800_000,
    ],

];
