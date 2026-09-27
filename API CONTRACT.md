# API Contract — Sunsight

Kontrak ini adalah sumber kebenaran untuk bentuk *wire format* antara Frontend dan Backend.
Setiap perubahan bentuk payload, satuan, atau kode status harus mengubah berkas ini pada commit yang sama.

- **Base URL (development):** `http://localhost:8000/api`
- **Autentikasi:** Bearer token Sanctum pada header `Authorization: Bearer <token>`
- **Format:** JSON, `Content-Type: application/json` dan `Accept: application/json`
- **Timestamp:** string ISO 8601 UTC, contoh `2026-09-27T10:15:30.000000Z`

Endpoint di luar daftar ini tidak termasuk lingkup pengerjaan. Lupa sandi, reset sandi, dan ekspor PDF
sengaja belum ada dan tidak boleh diperkirakan oleh Frontend.

## 1. Amplop Kesalahan

Backend selalu mengembalikan JSON untuk permintaan di bawah `/api/*`. Frontend hanya perlu menangani dua bentuk berikut.

| Status | Kapan | Bentuk body |
| :---- | :---- | :---- |
| `401` | Token tidak ada, kedaluwarsa, sudah dicabut, atau kredensial login salah | `{"message": "..."}` |
| `422` | Validasi masukan gagal | `{"message": "...", "errors": {"<field>": ["...", "..."]}}` |
| `429` | Terlalu banyak percobaan login atau pendaftaran | `{"message": "..."}` |
| `404` | Sumber daya tidak ditemukan atau bukan milik pemanggil | `{"message": "..."}` |
| `500` | Kesalahan tak terduga | `{"message": "..."}` |

Aturan yang mengikat:

- Login gagal **selalu** `401`, baik ketika email tidak terdaftar maupun ketika password salah, dengan
  pesan yang identik. Frontend tidak boleh membedakan kedua kasus itu.
- Permintaan terproteksi tanpa token yang sah **selalu** `401`.
- Sumber daya milik user lain **selalu** `404`, bukan `403`, agar keberadaannya tidak terbocorkan.
- Masukan yang tidak valid **tidak pernah** menghasilkan `500`.

## 2. Ruang Koordinat dan Satuan

Ada dua ruang koordinat dan batasnya dipatok tegas. Tertukar di antara keduanya tidak memunculkan error,
hanya hasil yang salah.

| Dipakai pada | Ruang | Format | Keterangan |
| :---- | :---- | :---- | :---- |
| `rough_polygon`, `refined_polygon` | Piksel citra | `[[x, y], ...]` | Relatif terhadap citra, origin kiri-atas, `x` ke kanan, `y` ke bawah, satuan piksel, boleh pecahan |
| `polygon`, `roof_polygon` | Geografis | `[[lng, lat], ...]` | GeoJSON, WGS84 (EPSG:4326) |

Aturan poligon:

- Minimal 3 titik unik. Kurang dari itu `422`.
- Poligon geografis memakai ring tertutup: titik pertama sama dengan titik terakhir.
- `refined_polygon` selalu berada di dalam batas citra `[0, width] x [0, height]`.

Konversi piksel ke geografis memakai `bbox` dari `/cv/fetch-osm` dan proyeksi Web Mercator:

```
lng = bbox[0] + (x / width)  * (bbox[2] - bbox[0])
lat = bbox[3] - (y / height) * (bbox[3] - bbox[1])   // perhatikan: y tumbuh ke bawah, lat mengecil
```

Citra memakai proyeksi Web Mercator, sehingga `lat` yang dihasilkan linier hanya pada rentang bbox satu citra.
Itu cukup untuk ukuran satu bidikan dan tidak boleh dipakai untuk rentang lintang yang lebar.

Satuan yang dipakai, tanpa pengecualian:

| Field | Satuan | Catatan |
| :---- | :---- | :---- |
| `*_area_sqm` | meter persegi | |
| `estimated_energy_kwh_per_day` | kWh per hari | Energi, bukan daya. Nama lama `estimated_power_kwh` tidak dipakai |
| `daily_ghi_kwh_per_sqm` | kWh/m²/hari | Iradiasi harian rata-rata di bidang horizontal |
| `roof_orientation_deg` | derajat, 0–180 | Orientasi **sumbu** atap, bukan arah kemiringan |
| `recommended_azimuth_deg` | derajat, 0–360 | Azimut panel terbaik untuk lokasi, dari utara searah jarum jam |
| `meters_per_pixel` | meter per piksel | |

Semantik orientasi atap: dari citra nadir, arah kemiringan atap **tidak dapat** ditentukan. Karena itu
`roof_orientation_deg` adalah orientasi sumbu utama poligon hasil analisis komponen utama (PCA), dilaporkan
sebagai nilai 0–180 derajat dari utara searah jarum jam tanpa arah hadap. Untuk lintang selatan,
`recommended_azimuth_deg` bernilai `0` (utara); untuk lintang utara, `180` (selatan).

## 3. Autentikasi dan Pengguna

Endpoint publik: `/register`, `/login`. Sisanya butuh header `Authorization`.

### `POST /register`

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `name` | string | wajib, maksimal 255 |
| `email` | string | wajib, format email, unik, maksimal 255 |
| `password` | string | wajib, minimal 8, harus sama dengan `password_confirmation` |
| `password_confirmation` | string | wajib |

```json
// 201 Created
{
  "token": "1|R4nd0mPl41nT3xtT0k3n...",
  "user": { "id": 1, "name": "Rafid", "email": "rafid@example.com" }
}
```

### `POST /login`

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `email` | string | wajib, format email |
| `password` | string | wajib |

```json
// 200 OK
{
  "token": "2|An0th3rPl41nT3xtT0k3n...",
  "user": { "id": 1, "name": "Rafid", "email": "rafid@example.com" }
}
```

```json
// 401 Unauthorized — sama untuk email tidak terdaftar maupun password salah
{ "message": "Email atau password salah." }
```

### `POST /logout`

Tidak berpayload. Mencabut token yang sedang dipakai.

```json
// 200 OK
{ "message": "Logged out" }
```

### `GET /user`

```json
// 200 OK
{ "id": 1, "name": "Rafid", "email": "rafid@example.com" }
```

Respons tidak pernah memuat `password`, `remember_token`, maupun token lain.

## 4. Pipeline Citra

### `POST /cv/fetch-osm`

Mengunduh citra nadir untuk satu titik. Mengembalikan identitas aset yang dipakai oleh dua endpoint berikutnya.

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `lat` | number | wajib, −90 s.d. 90 |
| `lng` | number | wajib, −180 s.d. 180 |
| `zoom` | integer | opsional, bawaan `19`, rentang 15 s.d. 20 |

```json
// 200 OK
{
  "image_id": "9f1c2d34-5e6a-4b7c-8d9e-0a1b2c3d4e5f",
  "image_url": "http://localhost:8000/storage/imagery/1/9f1c2d34-5e6a-4b7c-8d9e-0a1b2c3d4e5f.jpg",
  "bbox": [-6.598000, 106.797000, -6.593000, 106.802000],
  "width": 512,
  "height": 512,
  "meters_per_pixel": 0.2966
}
```

Aturan yang mengikat:

- `bbox` selalu berurutan `[minLng, minLat, maxLng, maxLat]`.
- `image_id` adalah UUID dan merupakan satu-satunya cara merujuk aset pada endpoint berikutnya.
  Tidak ada field `image_path` — nama berkas internal tidak pernah dikirim ke klien.
- Ukuran citra selalu `512 x 512` piksel.
- `meters_per_pixel = 156543.03392 * cos(lat * pi / 180) / 2^zoom`. Nilai ini yang dipakai untuk
  mengubah luas piksel menjadi meter persegi, sehingga tidak boleh dihitung ulang oleh Frontend.
- `image_url` dapat dimuat tanpa header tambahan.

### `POST /cv/refine-polygon`

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `image_id` | string | wajib, UUID milik pemanggil |
| `rough_polygon` | array | wajib, koordinat **piksel**, minimal 3 titik unik |

```json
// 200 OK
{
  "refined_polygon": [[128.5, 96.0], [402.0, 101.5], [398.5, 344.0], [131.0, 339.5]],
  "mask_image_url": "http://localhost:8000/storage/imagery/1/9f1c2d34-....mask.png"
}
```

`refined_polygon` memakai ruang piksel yang sama dengan `rough_polygon` dan selalu berada di dalam citra.

### `POST /cv/detect-shadow`

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `image_id` | string | wajib, UUID milik pemanggil |
| `refined_polygon` | array | wajib, koordinat **piksel**, minimal 3 titik unik |

```json
// 200 OK
{
  "usable_area_sqm": 45.5,
  "shadow_area_sqm": 5.0,
  "total_area_sqm": 50.5,
  "shadow_mask_url": "http://localhost:8000/storage/imagery/1/9f1c2d34-....shadow.png"
}
```

Selalu berlaku `usable_area_sqm + shadow_area_sqm = total_area_sqm`, dan tidak ada nilai yang negatif.
Deteksi bayangan saat ini memakai ambang kecerahan sehingga dapat keliru menganggap atap gelap, kolam,
atau vegetasi sebagai bayangan. Keterbatasan ini disadari dan dicatat.

### Kepemilikan aset

`image_id` di atas selalu divalidasi terhadap user pemanggil. Mengirim `image_id` milik user lain
menghasilkan `404` yang sama dengan UUID yang tidak pernah ada, sehingga keberadaan aset tidak terbocorkan.

## 5. Kalkulasi Energi

### `POST /solar/calculate`

Tidak menyimpan apa pun. Penyimpanan hanya terjadi lewat `POST /analyses`.

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `usable_area_sqm` | number | wajib, > 0 |
| `center_point` | object | wajib, `{"lat": ..., "lng": ...}` |
| `polygon` | array | wajib, koordinat **geografis** `[[lng, lat], ...]`, ring tertutup, minimal 3 titik unik |

```json
// 200 OK
{
  "usable_area_sqm": 45.5,
  "daily_ghi_kwh_per_sqm": 5.2,
  "estimated_energy_kwh_per_day": 36.9,
  "roof_orientation_deg": 15.5,
  "recommended_azimuth_deg": 0.0,
  "assumptions": {
    "module_efficiency": 0.2,
    "performance_ratio": 0.78,
    "tilt_deg": 10.0,
    "tilt_factor": 1.05,
    "irradiance_source": "NASA POWER",
    "irradiance_period": "climatology",
    "irradiance_kwh_per_sqm_day": 5.2
  }
}
```

Aturan yang mengikat:

- Kemiringan panel **tidak** dikirim oleh klien. Nilainya berasal dari konfigurasi backend dan
  dilaporkan kembali di blok `assumptions`.
- `assumptions` selalu ada pada respons ini. Nilainya yang menjelaskan angka energi, sehingga Frontend
  wajib menyimpannya saat menyimpan analisis, dan Backend wajib menuliskannya ke basis data.
- `estimated_energy_kwh_per_day = usable_area_sqm * module_efficiency * irradiance_kwh_per_sqm_day * performance_ratio * tilt_factor`.

## 6. Riwayat Analisis

Semua endpoint di sini hanya menyentuh data milik user pemanggil.

### `GET /analyses`

| Query | Tipe | Aturan |
| :---- | :---- | :---- |
| `page` | integer | opsional, bawaan `1` |
| `per_page` | integer | opsional, bawaan `10`, maksimal `100` |
| `limit` | integer | opsional, alias dari `per_page`; `per_page` menang bila keduanya dikirim |

```json
// 200 OK
{
  "data": [
    {
      "id": 12,
      "center_point": { "lat": -6.5955, "lng": 106.7995 },
      "usable_area_sqm": 45.5,
      "shadow_area_sqm": 5.0,
      "estimated_energy_kwh_per_day": 36.9,
      "roof_orientation_deg": 15.5,
      "created_at": "2026-09-27T10:15:30.000000Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 10, "total": 1, "last_page": 1 },
  "links": { "first": "...", "last": "...", "prev": null, "next": null }
}
```

### `POST /analyses`

Menyimpan satu hasil kalkulasi lengkap beserta poligon dan asumsinya.

| Field | Tipe | Aturan |
| :---- | :---- | :---- |
| `usable_area_sqm` | number | wajib, > 0 |
| `shadow_area_sqm` | number | wajib, >= 0 |
| `center_point` | object | wajib, `{"lat": ..., "lng": ...}` |
| `polygon` | array | wajib, koordinat **geografis**, ring tertutup |
| `estimated_energy_kwh_per_day` | number | wajib, >= 0 |
| `roof_orientation_deg` | number | wajib, 0–180 |
| `recommended_azimuth_deg` | number | wajib, 0–360 |
| `assumptions` | object | wajib, dikirim kembali apa adanya dari `/solar/calculate` |

```json
// 201 Created
{ "message": "Analysis saved", "id": 12 }
```

### `GET /analyses/{id}`

```json
// 200 OK
{
  "id": 12,
  "center_point": { "lat": -6.5955, "lng": 106.7995 },
  "roof_polygon": {
    "type": "Polygon",
    "coordinates": [[[106.7978, -6.5941], [106.8010, -6.5940], [106.8009, -6.5968], [106.7978, -6.5969], [106.7978, -6.5941]]]
  },
  "usable_area_sqm": 45.5,
  "shadow_area_sqm": 5.0,
  "estimated_energy_kwh_per_day": 36.9,
  "roof_orientation_deg": 15.5,
  "recommended_azimuth_deg": 0.0,
  "assumptions": { "module_efficiency": 0.2, "performance_ratio": 0.78, "tilt_deg": 10.0, "tilt_factor": 1.05, "irradiance_source": "NASA POWER", "irradiance_period": "climatology", "irradiance_kwh_per_sqm_day": 5.2 },
  "created_at": "2026-09-27T10:15:30.000000Z"
}
```

`roof_polygon` dikembalikan sebagai objek GeoJSON, bukan array. `id` yang bukan milik pemanggil
menghasilkan `404`.

### `DELETE /analyses/{id}`

```json
// 200 OK
{ "message": "Analysis deleted successfully" }
```

## 7. Ringkasan Endpoint

| Endpoint | Method | Auth | Sukses |
| :---- | :---- | :---- | :---- |
| `/register` | POST | — | `201` |
| `/login` | POST | — | `200` |
| `/logout` | POST | Bearer | `200` |
| `/user` | GET | Bearer | `200` |
| `/cv/fetch-osm` | POST | Bearer | `200` |
| `/cv/refine-polygon` | POST | Bearer | `200` |
| `/cv/detect-shadow` | POST | Bearer | `200` |
| `/solar/calculate` | POST | Bearer | `200` |
| `/analyses` | GET | Bearer | `200` |
| `/analyses` | POST | Bearer | `201` |
| `/analyses/{id}` | GET | Bearer | `200` |
| `/analyses/{id}` | DELETE | Bearer | `200` |
