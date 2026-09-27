# API Contract — Sunsight

Kontrak ini adalah sumber kebenaran untuk bentuk *wire format* antara Frontend dan Backend.
Setiap perubahan bentuk payload, satuan, atau kode status harus mengubah berkas ini pada commit yang sama.

- **Base URL (development):** `http://localhost:8000/api`
- **Autentikasi:** Bearer token Sanctum pada header `Authorization: Bearer <token>`
- **Format:** JSON, `Content-Type: application/json` dan `Accept: application/json`
- **Timestamp:** string ISO 8601 UTC, contoh `2026-09-27T10:15:30.000000Z`

**Aturan yang paling penting, dan tidak boleh dilanggar oleh klien mana pun:** endpoint yang
menghasilkan angka (`/simulate`, `/analyses`) **selalu menghitung ulang di server**. Klien hanya mengirim
masukan. Bila klien mengirim kunci hasil sekaligus, kunci itu **diabaikan** — tidak ditolak, tetapi juga
tidak berpengaruh. Ini disengaja supaya angka kapasitas, produksi, penghematan, dan payback tidak pernah
berasal dari klien.

## 1. Amplop Kesalahan

Backend selalu mengembalikan JSON untuk permintaan di bawah `/api/*`.

| Status | Kapan | Bentuk body |
| :---- | :---- | :---- |
| `401` | Token tidak ada, kedaluwarsa, sudah dicabut, atau kredensial login salah | `{"message": "..."}` |
| `404` | Sumber daya tidak ditemukan atau bukan milik pemanggil | `{"message": "..."}` |
| `422` | Validasi masukan gagal | `{"message": "...", "errors": {"<field>": ["..."]}}` |
| `500` | Kesalahan tak terduga, termasuk kegagalan penyedia citra | `{"message": "..."}` |

- Login gagal **selalu** `401` dengan pesan identik untuk email tidak terdaftar maupun password salah.
- Sumber daya milik user lain **selalu** `404`, bukan `403`.
- Masukan yang tidak valid **tidak pernah** menghasilkan `500`.

## 2. Ruang Koordinat dan Satuan

| Dipakai pada | Ruang | Format |
| :---- | :---- | :---- |
| `roof_rect` | Piksel citra | `{"x", "y", "width", "height", "rotation_deg"}`, origin kiri-atas |
| `roof_polygon` (respons riwayat) | Geografis | GeoJSON, `[[lng, lat], ...]`, WGS84 |

Konversi piksel ke geografis memakai `bbox` dari `/location` dan proyeksi Web Mercator:

```
lng = bbox[0] + (x / width)  * (bbox[2] - bbox[0])
lat = bbox[3] - (y / height) * (bbox[3] - bbox[1])
```

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

**Kemiringan dan azimuth adalah masukan pengguna, bukan hasil deteksi.** Dari satu citra nadir, arah
kemiringan tidak dapat ditentukan. Klien tidak boleh menampilkan keduanya sebagai "terdeteksi otomatis".

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

### `GET /user`

```json
// 200 OK
{ "id": 1, "name": "Rafid", "email": "rafid@example.com" }
```

## 4. Lokasi dan Citra

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
  "bbox": [-6.598000, 106.797000, -6.593000, 106.802000],
  "width": 1280,
  "height": 1280,
  "meters_per_pixel": 0.1483,
  "attribution": "© Mapbox © Maxar"
}
```

- `bbox` selalu berurutan `[minLng, minLat, maxLng, maxLat]`.
- `image_id` adalah UUID dan satu-satunya cara merujuk aset pada endpoint berikutnya. Tidak ada `image_path`.
- `attribution` **wajib ditampilkan** di antarmuka. ToS penyedia citra melarang penghapusan tanda kepemilikan.
- `meters_per_pixel` berasal dari server dan tidak boleh dihitung ulang oleh klien.

### Kegagalan penyedia citra

```json
// 500 Internal Server Error
{ "message": "Penyedia citra belum dikonfigurasi. Set MAPBOX_ACCESS_TOKEN." }
```

## 5. Simulasi

### `POST /simulate`

Menghitung simulasi lengkap. **Tidak menyimpan apa pun.**

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `image_id` | string | wajib, UUID milik pemanggil |
| `roof_rect.x`, `.y` | number | wajib, ≥ 0, sudut kiri-atas persegi dalam piksel |
| `roof_rect.width`, `.height` | number | wajib, > 0 |
| `roof_rect.rotation_deg` | number | wajib, −45 s.d. 45, putaran searah jarum jam terhadap pusat persegi |
| `setback_m` | number | wajib, 0 s.d. 5, jarak aman dari tepi bidang |
| `gutter_m` | number | wajib, 0 s.d. 5, lebar jalur talang pada sisi bawah |
| `tilt_deg` | number | wajib, 0 s.d. 60 |
| `azimuth_deg` | number | wajib, 0 s.d. 360 |
| `module_key` | string | wajib, salah satu kunci dari `GET /options` |
| `orientation` | string | wajib, `portrait` atau `landscape` |
| `clearance_m` | number | wajib, 0 s.d. 1 |
| `panel_count` | integer \| null | wajib ada; `null` berarti isi seluruh slot yang muat; bila angka, 0 s.d. 5000 dan dipotong ke jumlah slot maksimum |
| `inverter_type` | string | wajib, `string` atau `micro` |
| `monthly_bill_idr` | integer | wajib, ≥ 0 |
| `tariff_key` | string | wajib, salah satu kunci dari `GET /options` |

```json
// 200 OK — nilai di bawah ini berasal dari satu permintaan sungguhan, bukan karangan.
// Bidang atap 12,46 x 7,42 m di Jakarta (-6.59, 106.80), 20 modul 550 W terpasang.
{
  "geometry": {
    "roof_width_m": 7.42,
    "roof_length_m": 12.46,
    "total_area_sqm": 92.37,
    "effective_area_sqm": 66.62
  },
  "layout": {
    "max_slots": 20,
    "installed": 20,
    "rows": 5,
    "columns": 4,
    "module_area_sqm": 51.67,
    "density_ratio": 0.7755
  },
  "energy": {
    "capacity_kwp": 11,
    "annual_production_kwh": 13829.81,
    "daily_irradiance_kwh_per_sqm": 4.8324,
    "incidence_factor": 0.891,
    "performance_ratio": 0.8,
    "irradiance_source": "NASA POWER",
    "irradiance_period": "klimatologi tahunan"
  },
  "finance": {
    "capex_total_idr": 72200000,
    "capex_breakdown": {
      "modules_idr": 37000000,
      "inverter_idr": 13200000,
      "racking_idr": 7000000,
      "installation_idr": 15000000
    },
    "monthly_saving_idr": 1959223,
    "annual_saving_idr": 23510676,
    "payback_years": 3.07,
    "tariff_key": "R2",
    "tariff_label": "R-2 / 3.500-5.500 VA",
    "tariff_idr_per_kwh": 1700,
    "monthly_bill_idr": 2800000,
    "co2_reduction_kg_per_year": 11063.85,
    "trees_equivalent": 503
  }
}
```

Angka di atas dapat diverifikasi ulang dari responsnya sendiri:

```
annual_production_kwh = capacity_kwp x daily_irradiance x incidence_factor x 365 x performance_ratio
                      = 11 x 4,8324 x 0,891 x 365 x 0,8 = 13.829,8
monthly_saving_idr   = (annual_production_kwh / 12) x tariff_idr_per_kwh, dibatasi monthly_bill_idr
                      = (13.829,81 / 12) x 1700 = 1.959.223
payback_years        = capex_total_idr / annual_saving_idr = 72.200.000 / 23.510.676 = 3,07
```

Aturan yang mengikat:

- `effective_area_sqm` tidak pernah negatif dan tidak pernah melebihi `total_area_sqm`.
- `installed` tidak pernah melebihi `max_slots`.
- `panel_count: null` mengisi seluruh slot yang muat, dan pada riwayat tersimpan `input.panel_count` tetap `null` sehingga maksud pengguna terbaca kembali.
- `monthly_saving_idr` **tidak pernah melebihi** `monthly_bill_idr`.
- `payback_years` bernilai `null` bila penghematan tahunan nol.
- `capacity_kwp = installed × power_w / 1000`.
- Seluruh nilai di atas dihitung server. Kunci hasil pada payload kiriman diabaikan.

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

## 6. Riwayat Simulasi

### `POST /analyses`

Payload **identik dengan** `POST /simulate`. Perhatikan: **tidak ada kunci hasil** pada payload ini.
Server menghitung ulang, lalu menyimpan hasil hitungannya sendiri.

```json
// 201 Created
{ "message": "Simulation saved", "id": 12, "capacity_kwp": 11, "payback_years": 3.07 }
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

Objek datar (tidak dibungkus `data`). Memuat seluruh masukan, hasil, dan asumsi yang dipakai.

```json
// 200 OK — objek datar, tidak dibungkus `data`
{
  "id": 12,
  "center_point": { "lat": -6.59, "lng": 106.8 },
  "roof_polygon": { "type": "Polygon", "coordinates": [[[106.7995, -6.5901], [106.8004, -6.5904], [106.8001, -6.5928], [106.7992, -6.5925], [106.7995, -6.5901]]] },
  "input": {
    "roof_width_m": 7.42, "roof_length_m": 12.46, "rotation_deg": -4.0,
    "setback_m": 0.5, "gutter_m": 0.6, "tilt_deg": 22.0, "azimuth_deg": 188.0,
    "module_key": "mono_perc_550", "orientation": "portrait", "clearance_m": 0.03,
    "panel_count": 24, "inverter_type": "string",
    "monthly_bill_idr": 2800000, "tariff_key": "R2"
  },
  "result": {
    "total_area_sqm": 92.37, "effective_area_sqm": 66.62,
    "max_slots": 20, "installed": 20, "rows": 5, "columns": 4,
    "module_area_sqm": 51.67, "density_ratio": 0.7755,
    "capacity_kwp": 11, "annual_production_kwh": 13829.81,
    "capex_total_idr": 72200000, "monthly_saving_idr": 1959223,
    "annual_saving_idr": 23510676, "payback_years": 3.07,
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

`id` yang bukan milik pemanggil menghasilkan `404` yang identik dengan `id` yang tidak ada.

### `DELETE /analyses/{id}`

```json
// 200 OK
{ "message": "Simulation deleted successfully" }
```

## 7. Ringkasan Endpoint

| Endpoint | Method | Auth | Sukses |
| :---- | :---- | :---- | :---- |
| `/register` | POST | — | `201` |
| `/login` | POST | — | `200` |
| `/logout` | POST | Bearer | `200` |
| `/user` | GET | Bearer | `200` |
| `/location` | POST | Bearer | `200` |
| `/options` | GET | Bearer | `200` |
| `/simulate` | POST | Bearer | `200` |
| `/analyses` | GET | Bearer | `200` |
| `/analyses` | POST | Bearer | `201` |
| `/analyses/{id}` | GET | Bearer | `200` |
| `/analyses/{id}` | DELETE | Bearer | `200` |

Endpoint produk lama (`/cv/fetch-osm`, `/cv/refine-polygon`, `/cv/detect-shadow`, `/solar/calculate`)
**sudah tidak ada** dan tidak boleh dipakai lagi.
