# API Contract — Sunsight

Kontrak ini adalah sumber kebenaran untuk bentuk *wire format* antara Frontend dan Backend.
Setiap perubahan bentuk payload, satuan, atau kode status harus mengubah berkas ini pada commit yang sama.

- **Base URL (development):** `http://localhost:8000/api`
- **Autentikasi:** Bearer token Sanctum pada header `Authorization: Bearer <token>`
- **Format:** JSON, `Content-Type: application/json` dan `Accept: application/json`
  (kecuali `POST /roof-detections` yang memakai `multipart/form-data`)
- **Timestamp:** string ISO 8601 UTC, contoh `2026-09-27T10:15:30.000000Z`

**Aturan yang paling penting, dan tidak boleh dilanggar oleh klien mana pun:** endpoint yang
menghasilkan angka (`/simulate`, `/analyses`) **selalu menghitung ulang di server**. Klien hanya mengirim
masukan. Bila klien mengirim kunci hasil sekaligus, kunci itu **diabaikan** — tidak ditolak, tetapi juga
tidak berpengaruh. Ini disengaja supaya angka kapasitas, produksi, penghematan, dan payback tidak pernah
berasal dari klien.

**Perubahan 2026-11-12 (branch `feat/studio`).** Studio tidak lagi mengambil citra dari server.
Antarmuka menampilkan peta ubinnya sendiri (Esri World Imagery), menangkap area yang terlihat, dan
mengirim tangkapan itu ke `POST /roof-detections`. Georeferensi datang dari klien dalam bentuk `bbox`,
tetapi skala, luas, tata letak, energi, dan finansial tetap dihitung server. Satu simulasi kini memuat
**banyak bidang atap** (`roofs[]`), bukan satu persegi.

## 1. Amplop Kesalahan

Backend selalu mengembalikan JSON untuk permintaan di bawah `/api/*` selama klien mengirim
`Accept: application/json`.

| Status | Kapan | Bentuk body |
| :---- | :---- | :---- |
| `401` | Token tidak ada, kedaluwarsa, sudah dicabut, atau kredensial login salah | `{"message": "..."}` |
| `404` | Sumber daya tidak ditemukan atau bukan milik pemanggil | `{"message": "..."}` |
| `413` | Berkas tangkapan melebihi batas ukuran | `{"message": "..."}` |
| `422` | Validasi masukan gagal | `{"message": "...", "errors": {"<field>": ["..."]}}` |
| `500` | Kesalahan tak terduga | `{"message": "..."}` |
| `503` | Layanan model tidak dapat dihubungi | `{"message": "..."}` |
| `504` | Layanan model melewati batas waktu | `{"message": "..."}` |

- Login gagal **selalu** `401` dengan pesan identik untuk email tidak terdaftar maupun password salah.
- Sumber daya milik user lain **selalu** `404`, bukan `403`.
- Masukan yang tidak valid **tidak pernah** menghasilkan `500`.

## 2. Ruang Koordinat dan Satuan

| Dipakai pada | Ruang | Format |
| :---- | :---- | :---- |
| `roof_polygon_px` (permintaan), `polygon_px`/`bbox_px` (respons deteksi) | Piksel tangkapan peta | `[[x, y], …]`, origin kiri-atas, x ke kanan, y ke bawah, satuan piksel berkas yang dikirim |
| `roof_polygon_px` (respons riwayat) | Piksel tangkapan asli | sama seperti di atas; disimpan agar hasil dapat dipertanggungjawabkan |
| `polygon_lnglat`, `roof_polygon` (respons) | Geografis | GeoJSON, `[[lng, lat], …]`, WGS84 |
| `bbox` (permintaan deteksi) | Geografis | `[minLng, minLat, maxLng, maxLat]`, WGS84 |

Konversi piksel ke geografis memakai `bbox` tangkapan:

```
lng = bbox[0] + (x / width)  * (bbox[2] - bbox[0])
lat = bbox[3] - (y / height) * (bbox[3] - bbox[1])
```

Skala diturunkan server dari `bbox` dan `height`, dengan proyeksi Web Mercator:

```
mpp_lat = (bbox[3] - bbox[1]) * 110574.0 / height          // meter per piksel menurut lintang
mpp_lng = (bbox[2] - bbox[0]) * 111320.0 * cos(lat tengah) / width
```

`mpp_lat` dan `mpp_lng` harus berselisih **paling banyak 2%**; bila lebih, permintaan ditolak `422`
karena `bbox` tidak konsisten dengan ukuran berkas. `meters_per_pixel` yang dipakai server adalah
`mpp_lat`. Klien **tidak pernah** mengirim `meters_per_pixel`.

| Field | Satuan |
| :---- | :---- |
| `*_area_sqm`, `*_m2` | meter persegi |
| semua `*_m` yang berdiri sendiri (setback, gutter, clearance, dimensi atap) | meter |
| `capacity_kwp` | kilowatt-peak |
| `annual_production_kwh` | kWh per tahun |
| `daily_irradiance_kwh_per_sqm` | kWh/m²/hari |
| `*_idr` | rupiah |
| `payback_years` | tahun, `null` bila tidak dapat dihitung |
| `tilt_deg` | 0–60, kemiringan bidang atap |
| `azimuth_deg` | 0–360 dari utara searah jarum jam |
| `meters_per_pixel` | meter per piksel |
| `rotation_deg` | −90 s.d. 90, sudut persegi pembatas minimum terhadap sumbu citra |

**Kemiringan dan azimuth adalah masukan pengguna, bukan hasil deteksi.** Dari satu citra nadir, arah
kemiringan tidak dapat ditentukan. Klien tidak boleh menampilkan keduanya sebagai "terdeteksi otomatis".

**`gutter_m` tidak diterapkan pada bidang berbentuk poligon bebas.** Sisi bawah kemiringan tidak dapat
ditentukan dari citra nadir, dan antarmuka pun tidak menerapkannya pada bidang non-persegi. Nilainya
tetap tersimpan pada masukan agar maksud pengguna terbaca kembali.

## 3. Autentikasi dan Pengguna

Endpoint publik: `/register`, `/login`. Sisanya butuh header `Authorization`.

### `POST /register`

Field: `name` (string, wajib, maks 255), `email` (string, wajib, unik), `password` (wajib, min 8, cocok dengan `password_confirmation`), `password_confirmation` (wajib).

```json
// 201 Created
{ "token": "1|R4nd0mPl41nT3xtT0k3n...", "user": { "id": 1, "name": "Rafid", "email": "rafid@example.com" } }
```

### `POST /login`

Field: `email`, `password`.

```json
// 200 OK
{ "token": "2|An0th3rPl41nT3xtT0k3n...", "user": { "id": 1, "name": "Rafid", "email": "rafid@example.com" } }

// 401 Unauthorized — sama untuk email tidak terdaftar maupun password salah
{ "message": "Email atau password salah." }
```

### `POST /logout`

```json
// 200 OK
{ "message": "Logged out" }
```

### `POST /forgot-password`

Field: `email`.

```json
// 200 OK
{ "message": "Tautan pemulihan sudah dikirim." }
```

### `POST /reset-password`

Field: `email`, `password`, `password_confirmation`, `token`.

```json
// 200 OK
{ "message": "Kata sandi berhasil diubah." }
```

### `GET /user`

```json
// 200 OK
{ "id": 1, "name": "Rafid", "email": "rafid@example.com" }
```

## 4. Lokasi dan Citra (tidak dipakai studio)

Endpoint ini tetap ada dan tetap bekerja, tetapi **alur studio tidak memakainya lagi**: antarmuka
menampilkan peta ubin sendiri dan menangkapnya di sisi klien. Dipakai untuk keperluan lain
(mis. mengambil satu bidikan citra kanonik) atau sebagai rujukan pengujian.

### `POST /location`

Mengambil citra satelit nadir untuk satu koordinat.

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `lat` | number | wajib, −90 s.d. 90 |
| `lng` | number | wajib, −180 s.d. 180 |
| `zoom` | integer | opsional, bawaan `19`, rentang 15 s.d. 20 |

```json
// 200 OK
{
  "image_id": "9f1c2d34-5e6a-4b7c-8d9e-0a1b2c3d4e5f",
  "image_url": "http://localhost:8000/storage/imagery/1/9f1c2d34-....jpg",
  "bbox": [106.797000, -6.598000, 106.802000, -6.593000],
  "width": 1280,
  "height": 1280,
  "meters_per_pixel": 0.1483,
  "attribution": "© Mapbox © Maxar"
}
```

- `bbox` selalu berurutan `[minLng, minLat, maxLng, maxLat]`.
- `image_id` adalah UUID dan satu-satunya cara merujuk aset pada endpoint berikutnya. Tidak ada `image_path`.
- `attribution` **wajib ditampilkan** di antarmuka bila citra ini dipakai.
- `meters_per_pixel` berasal dari server dan tidak boleh dihitung ulang oleh klien.

### Kegagalan penyedia citra

```json
// 500 Internal Server Error
{ "message": "Penyedia citra belum dikonfigurasi. Set MAPBOX_ACCESS_TOKEN." }
```

## 5. Deteksi Bidang Atap

### `POST /roof-detections`

Menjalankan model segmentasi pada tangkapan peta yang dikirim klien. Mengembalikan **semua** bidang atap
yang terdeteksi; klien yang memilih mana yang dipakai.

`Content-Type: multipart/form-data`, header `Authorization` tetap wajib.

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `file` | berkas | wajib; JPEG, PNG, atau WebP; ≤ 10 MB; ≤ 20 MP |
| `bbox` | string JSON | wajib; `"[minLng, minLat, maxLng, maxLat]"`; `minLng < maxLng`, `minLat < maxLat`; rentang lintang ≤ 0.05° |
| `width` | integer | wajib; lebar berkas dalam piksel, 64 s.d. 4096 |
| `height` | integer | wajib; tinggi berkas dalam piksel, 64 s.d. 4096 |
| `zoom` | integer | opsional; zoom peta yang ditangkap, 15 s.d. 22; disimpan untuk memuat ulang peta |
| `min_confidence` | number | opsional; 0 s.d. 1; bawaan `0.25` |

```json
// 200 OK
{
  "image_id": "c1a9e7d2-4f3b-4a2e-9b1c-8d7e6f5a4b3c",
  "detection_id": "req_184856c26e27",
  "model": { "name": "yolov8n-seg", "version": "roof-v1.0.0" },
  "image": {
    "width": 1280,
    "height": 832,
    "bbox": [106.8130, -6.6120, 106.8174, -6.6091],
    "meters_per_pixel": 0.2966,
    "zoom": 19
  },
  "roofs": [
    {
      "id": "det_a1b2c3d4",
      "polygon_px": [[412.5, 338.1], [601.2, 341.7], [598.4, 502.9], [409.8, 499.2]],
      "polygon_lnglat": [[106.8139, -6.6107], [106.8145, -6.6107], [106.8144, -6.6112], [106.8139, -6.6112]],
      "bbox_px": { "x1": 409.8, "y1": 338.1, "x2": 601.2, "y2": 502.9 },
      "confidence": 0.94,
      "area_sqm": 92.4
    }
  ]
}
```

Aturan yang mengikat:

- **Berkas tangkapan tidak disimpan.** Server hanya menyimpan georeferensi: `image_id` (UUID milik
  pemanggil), `bbox`, `width`, `height`, `meters_per_pixel`, `zoom`, dan titik tengah. Tidak ada berkas
  citra yang ditulis ke penyimpanan, karena tangkapan berasal dari penyedia ubin pihak ketiga.
- `area_sqm` dihitung server: `shoelace(polygon_px) × meters_per_pixel²`. Nilai `area_px` dari layanan
  model **tidak pernah** dipakai sebagai luas akhir.
- `roofs: []` bila model tidak menemukan bidang atap, dengan status `200` — bukan `404` dan bukan `500`.
- Urutan `roofs` menurut `confidence` menurun.
- `404` bila `image_id` tidak ada atau bukan milik pemanggil.
- `422` bila `bbox` tidak konsisten dengan `width`/`height` (selisih skala > 2%), berkas bukan gambar,
  atau dimensi di luar rentang.
- `413` bila berkas melebihi 10 MB.
- `503` bila layanan model tidak dapat dihubungi, `504` bila melewati batas waktu 15 detik.

## 6. Simulasi

Satu simulasi memuat **satu atau lebih bidang atap**. Setiap bidang punya geometri, masukan, dan hasilnya
sendiri; simulasi menyimpan agregatnya.

### Bentuk bersama "detail simulasi"

Dipakai oleh `POST /simulate` (tanpa `id`, tanpa `message`), `POST /analyses` (dengan `message`), dan
`GET /analyses/{id}`.

```json
{
  "id": 12,
  "message": "Simulation saved",
  "center_point": { "lat": -6.611, "lng": 106.815 },
  "map_zoom": 19,
  "roofs": [
    {
      "label": "Bidang Atap Utama",
      "detection_id": "det_a1b2c3d4",
      "confidence": 0.94,
      "roof_polygon": { "type": "Polygon", "coordinates": [[[106.8139, -6.6107], [106.8145, -6.6107], [106.8144, -6.6112], [106.8139, -6.6112], [106.8139, -6.6107]]] },
      "roof_polygon_px": [[412.5, 338.1], [601.2, 341.7], [598.4, 502.9], [409.8, 499.2]],
      "input": {
        "setback_m": 0.5, "gutter_m": 0.6, "tilt_deg": 22.0, "azimuth_deg": 188.0,
        "module_key": "mono_perc_550", "orientation": "portrait",
        "clearance_m": 0.03, "panel_count": 20
      },
      "result": {
        "roof_length_m": 12.46, "roof_width_m": 7.42, "rotation_deg": -4.0,
        "area_sqm": 92.37, "effective_area_sqm": 66.62,
        "max_slots": 20, "installed": 20, "rows": 5, "columns": 4,
        "module_area_sqm": 51.67, "density_ratio": 0.7755,
        "capacity_kwp": 11.0, "annual_production_kwh": 13829.81
      }
    }
  ],
  "input": { "inverter_type": "string", "monthly_bill_idr": 2800000, "tariff_key": "R2" },
  "result": {
    "roof_count": 1,
    "total_area_sqm": 92.37, "effective_area_sqm": 66.62,
    "max_slots": 20, "installed": 20,
    "module_area_sqm": 51.67, "density_ratio": 0.7755,
    "capacity_kwp": 11.0, "annual_production_kwh": 13829.81,
    "capex_total_idr": 72200000,
    "monthly_saving_idr": 1959223, "annual_saving_idr": 23510676,
    "payback_years": 3.07,
    "co2_reduction_kg_per_year": 11063.85, "trees_equivalent": 503
  },
  "assumptions": {
    "daily_irradiance_kwh_per_sqm": 4.8324,
    "irradiance_source": "NASA POWER",
    "irradiance_period": "klimatologi tahunan",
    "incidence_factor": 0.891,
    "performance_ratio": 0.8,
    "tariff_key": "R2",
    "tariff_label": "R-2 / 3.500-5.500 VA",
    "tariff_idr_per_kwh": 1700,
    "capex_breakdown": { "modules_idr": 37000000, "inverter_idr": 13200000, "racking_idr": 7000000, "installation_idr": 15000000 }
  },
  "created_at": "2026-09-27T10:15:30.000000Z"
}
```

`result` pada tingkat simulasi adalah **agregat** dari seluruh `roofs`: luas, slot, dan `installed`
dijumlahkan; `capacity_kwp` dan produksi dijumlahkan; CAPEX, penghematan, dan payback dihitung ulang dari
agregat tersebut, bukan dirata-ratakan dari bidang.

### Bentuk payload simulasi

Dipakai oleh `POST /simulate` dan `POST /analyses` (identik).

```json
{
  "image_id": "c1a9e7d2-4f3b-4a2e-9b1c-8d7e6f5a4b3c",
  "roofs": [
    {
      "label": "Bidang Atap Utama",
      "detection_id": "det_a1b2c3d4",
      "confidence": 0.94,
      "roof_polygon_px": [[412.5, 338.1], [601.2, 341.7], [598.4, 502.9], [409.8, 499.2]],
      "setback_m": 0.5,
      "gutter_m": 0.6,
      "tilt_deg": 22,
      "azimuth_deg": 188,
      "module_key": "mono_perc_550",
      "orientation": "portrait",
      "clearance_m": 0.03,
      "panel_count": null
    }
  ],
  "inverter_type": "string",
  "monthly_bill_idr": 2800000,
  "tariff_key": "R2"
}
```

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `image_id` | string | wajib, UUID milik pemanggil |
| `roofs` | array | wajib, 1 s.d. 12 bidang |
| `roofs[].label` | string \| null | opsional, maks 80 |
| `roofs[].detection_id` | string \| null | opsional, maks 64; jejak hasil deteksi |
| `roofs[].confidence` | number \| null | opsional, 0 s.d. 1 |
| `roofs[].roof_polygon_px` | array | wajib, ≥ 3 titik, tiap titik `[x, y]`; seluruh titik di dalam batas citra |
| `roofs[].setback_m` | number | wajib, 0 s.d. 5 |
| `roofs[].gutter_m` | number | wajib, 0 s.d. 5; tersimpan, tidak diterapkan pada poligon |
| `roofs[].tilt_deg` | number | wajib, 0 s.d. 60 |
| `roofs[].azimuth_deg` | number | wajib, 0 s.d. 360 |
| `roofs[].module_key` | string | wajib, salah satu kunci dari `GET /options` |
| `roofs[].orientation` | string | wajib, `portrait` atau `landscape` |
| `roofs[].clearance_m` | number | wajib, 0 s.d. 1 |
| `roofs[].panel_count` | integer \| null | wajib ada; `null` = isi seluruh slot yang muat; bila angka, 0 s.d. 5000 dan dipotong ke slot maksimum bidang itu |
| `inverter_type` | string | wajib, `string` atau `micro` |
| `monthly_bill_idr` | integer | wajib, ≥ 0 |
| `tariff_key` | string | wajib, salah satu kunci dari `GET /options` |
| `address` | string \| null | opsional, maks 160; label lokasi, tidak memengaruhi hitungan |
| `roofs[].shape` | string \| null | opsional; `rectangle`, `l-shape`, `trapezoid`, `custom_polygon` |
| `roofs[].align_to_azimuth` | boolean \| null | opsional; keadaan tampilan |
| `roofs[].is_solar_populated` | boolean \| null | opsional; apakah tata letak sudah disusun |
| `roofs[].has_hvac` | boolean \| null | opsional; penanda rintangan bidang |
| `roofs[].has_skylight` | boolean \| null | opsional; penanda rintangan bidang |
| `roofs[].slot_overrides` | object \| null | opsional; peta `<baris>_<kolom>` → `active`/`skylight`/`hvac`/`empty` |

Kunci keadaan tampilan di atas tidak memengaruhi perhitungan. Nilainya disimpan apa adanya
supaya simulasi dapat dibuka kembali persis seperti saat disimpan.

### `POST /simulate`

Menghitung simulasi lengkap. **Tidak menyimpan apa pun.** Respons memakai bentuk bersama
"detail simulasi" tanpa `id` dan tanpa `message`.

### `GET /options`

Katalog yang dipakai antarmuka untuk mengisi pilihan, sehingga klien tidak pernah menyalin konstanta.

```json
// 200 OK
{
  "modules": [
    { "key": "mono_perc_550", "label": "550 W Mono PERC Bifacial", "power_w": 550, "length_m": 2.278, "width_m": 1.134, "efficiency": 0.2129, "price_idr": 1850000 }
  ],
  "tariffs": [
    { "key": "R2", "label": "R-2 / 3.500-5.500 VA", "idr_per_kwh": 1700, "year": 2024 }
  ],
  "defaults": { "module_key": "mono_perc_550", "tariff_key": "R2", "orientation": "portrait", "inverter_type": "string" }
}
```

### Cara server menurunkan tata letak dari poligon

Diperlukan karena `PanelLayout` bekerja pada persegi. Untuk tiap bidang:

1. `area_sqm` = luas poligon apa adanya (shoelace) × `meters_per_pixel²`.
2. `effective_polygon` = poligon yang di-*inset* ke dalam sebesar `setback_m` (offset tiap sisi, sambungan
   mitre). Bila hasilnya runtuh, luas efektif `0`.
3. `roof_length_m`, `roof_width_m`, `rotation_deg` = persegi pembatas **minimum** (rotated calipers) dari
   `effective_polygon`.
4. Tata letak grid `baris × kolom` dihitung di dalam persegi itu, lalu **hanya modul yang
   seluruh badannya berada di dalam `effective_polygon` yang dihitung** — keempat sudutnya
   diuji, bukan hanya titik tengahnya, karena modul 2,3 x 1,1 m dapat berpusat di dalam
   bidang sementara separuh badannya menggantung di luar atap. Jadi `installed` tidak
   pernah melebih-lebihkan luas yang benar-benar tersedia.

`effective_area_sqm` = luas `effective_polygon`, bukan luas persegi pembatasnya.
`effective_area_sqm` tidak pernah negatif dan tidak pernah melebihi `area_sqm`.

**Antarmuka memakai aturan pemasangan yang sama**, sehingga jumlah modul dan kapasitas
yang ditampilkan sebelum menyimpan mendekati — dan pada bidang tunggal sama persis dengan —
yang tersimpan. Diukur pada tangkapan nyata (setback 0,5 m):

| Kasus | Antarmuka | Server |
| :---- | :---- | :---- |
| Satu bidang 489,23 m² | 138 modul, 75,9 kWp | 138 modul, 75,9 kWp |
| Dua bidang (489,23 + 249,31 m²) | 138 + 65 = 203 modul, 111,7 kWp | 138 + 62 = 200 modul, 110 kWp |

Luas kedua sisi bertemu persis (489,23 m²; efektif 445,3 m²). Sisa selisih pada bidang kedua
(65 vs 62 modul) berasal dari cara menyusun kisi: antarmuka menyusun modul langsung di dalam
poligon, sedangkan server menyusun kisi di dalam persegi pembatas minimum lalu menyaring modul
yang seluruh badannya muat. Selisihnya di bawah 5% dan tidak pernah membuat server memasang
lebih banyak modul daripada yang muat. Bila salah satu sisi mengubah aturan pemasangan, kedua
angka harus diperiksa ulang bersama.

### Invarian hasil

- `installed` tidak pernah melebihi `max_slots`.
- `panel_count: null` mengisi seluruh slot yang muat, dan pada riwayat tersimpan `input.panel_count` tetap
  `null` sehingga maksud pengguna terbaca kembali.
- `monthly_saving_idr` **tidak pernah melebihi** `monthly_bill_idr`.
- `payback_years` bernilai `null` bila penghematan tahunan nol.
- `capacity_kwp = installed × power_w / 1000`.
- Seluruh nilai di atas dihitung server. Kunci hasil pada payload kiriman diabaikan.

## 7. Riwayat Simulasi

### `POST /analyses`

Payload **identik dengan** `POST /simulate`. Perhatikan: **tidak ada kunci hasil** pada payload ini.
Server menghitung ulang, lalu menyimpan hasil hitungannya sendiri.

```json
// 201 Created — bentuk bersama "detail simulasi" dengan `message` dan `id`
{ "message": "Simulation saved", "id": 12, "center_point": { "lat": -6.611, "lng": 106.815 }, "roofs": [ … ], "result": { … } }
```

### `GET /analyses`

Query: `page` (bawaan 1), `per_page` (bawaan 10, maks 100), `limit` (alias `per_page`).

```json
// 200 OK
{
  "data": [
    {
      "id": 12,
      "center_point": { "lat": -6.59, "lng": 106.8 },
      "roof_count": 2,
      "total_area_sqm": 92.37,
      "effective_area_sqm": 66.62,
      "installed": 20,
      "co2_reduction_kg_per_year": 11063.85,
      "trees_equivalent": 503,
      "capacity_kwp": 11,
      "annual_production_kwh": 13829.81,
      "monthly_saving_idr": 1959223,
      "payback_years": 3.07,
      "created_at": "2026-09-27T10:15:30.000000Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 10, "total": 1, "last_page": 1 },
  "links": { "first": "...", "last": "...", "prev": null, "next": null }
}
```

### `GET /analyses/{id}`

Objek datar (tidak dibungkus `data`), memakai bentuk bersama "detail simulasi". Memuat seluruh geometri
bidang, masukan, hasil, dan asumsi yang dipakai. `map_zoom` dipakai antarmuka untuk memuat ulang peta pada
tampilan yang sama; bila `null`, antarmuka memakai zoom bawaannya.

`address` adalah label lokasi yang diketik pengguna, dan `imagery` memuat georeferensi
tangkapan (`image_id`, `width`, `height`, `bbox`, `meters_per_pixel`, `zoom`). Keduanya dipakai
antarmuka untuk membuka kembali simulasi: bidang dibangun ulang dari `roof_polygon_px` asli
bersama `imagery`, sehingga bentuk atap dan posisinya kembali sama seperti saat disimpan.
Karena itu `imagery` **wajib** ada pada simulasi yang dibuat lewat alur studio.

Tiap bidang pada `roofs[]` juga memuat keadaan tampilan yang dikirim klien saat menyimpan:
`shape`, `align_to_azimuth`, `is_solar_populated`, `has_hvac`, `has_skylight`, dan
`slot_overrides`. Nilainya `null` bila klien tidak mengirimnya.

`id` yang bukan milik pemanggil menghasilkan `404` yang identik dengan `id` yang tidak ada.

### `DELETE /analyses/{id}`

```json
// 200 OK
{ "message": "Simulation deleted successfully" }
```

## 7b. Pencarian Alamat

### `GET /geocode`

Mencari alamat di wilayah Kota Bogor. Pencarian dilakukan backend, bukan peramban:
kebijakan Nominatim mewajibkan identitas pemanggil yang jelas dan membatasi laju
permintaan, dan hasil yang sama tidak perlu diambil ulang dari jaringan.

| Query | Aturan |
| :---- | :---- |
| `q` | wajib, 3 s.d. 120 karakter; kueri dinormalkan (huruf kecil, spasi dirapikan) |

```json
// 200 OK
{
  "query": "jl. pajajaran 42",
  "results": [
    {
      "label": "Jalan Pajajaran No. 42, Bogor Tengah, Kota Bogor",
      "lat": -6.595038,
      "lng": 106.797241,
      "bbox": [106.796, -6.596, 106.798, -6.594],
      "source": "nominatim"
    }
  ]
}
```

- `results: []` berarti alamat tidak ditemukan — tetap `200`, bukan `404`.
- `bbox` selalu `[minLng, minLat, maxLng, maxLat]`.
- Hasil dibatasi ke wilayah Kota Bogor (`viewbox` + `bounded=1`); permintaan di luar
  wilayah itu tidak mengembalikan hasil.
- Hasil disimpan di `geocode_cache` selama 30 hari; kueri yang sama dijawab dari cache.
- `422` bila `q` kurang dari 3 karakter; `503` bila layanan pencarian tidak dapat dihubungi.
- Route dibatasi `throttle:30,1` per pengguna.
- Atribusi "© OpenStreetMap contributors" wajib ditampilkan bersama hasil.

## 8. Ringkasan Endpoint

| Endpoint | Method | Auth | Sukses |
| :---- | :---- | :---- | :---- |
| `/register` | POST | — | `201` |
| `/login` | POST | — | `200` |
| `/forgot-password` | POST | — | `200` |
| `/reset-password` | POST | — | `200` |
| `/logout` | POST | Bearer | `200` |
| `/user` | GET | Bearer | `200` |
| `/location` | POST | Bearer | `200` |
| `/options` | GET | Bearer | `200` |
| `/roof-detections` | POST | Bearer | `200` |
| `/geocode` | GET | Bearer | `200` |
| `/simulate` | POST | Bearer | `200` |
| `/analyses` | GET | Bearer | `200` |
| `/analyses` | POST | Bearer | `201` |
| `/analyses/{id}` | GET | Bearer | `200` |
| `/analyses/{id}` | DELETE | Bearer | `200` |

Endpoint produk lama (`/cv/fetch-osm`, `/cv/refine-polygon`, `/cv/detect-shadow`, `/solar/calculate`)
**sudah tidak ada** dan tidak boleh dipakai lagi. Kontrak lama yang memakai `roof_rect` (satu persegi per
simulasi) **sudah tidak berlaku**.
