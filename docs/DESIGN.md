# Sistem Desain Sunsight

Sistem desain ini dipindahkan dari proyek **Transense**
(`https://github.com/izerhaf7/transense`, berkas `frontend/src/styles/tokens.css` dan
`frontend/src/styles/app.css`), lalu diterapkan ke seluruh antarmuka Sunsight.

Tujuannya bukan menyalin tampilan ponsel transitnya, melainkan memakai **kosakata yang sama**: nama
token `--brand-*` dan nama kelas komponennya dipertahankan apa adanya, sehingga satu penyimpangan di
sini selalu dapat dibandingkan langsung dengan berkas asalnya, dan perbaikan yang dibuat di salah
satu proyek mudah dipindahkan ke proyek lain.

Contoh hidup sistem ini ada di halaman **`/design`** — halaman itu bukan mockup terpisah, melainkan
dirender dengan kelas dan token yang sama seperti halaman produk.

---

## 1. Berkas dan lapisannya

| Berkas | Isi | Aturan |
| :--- | :--- | :--- |
| `fe/src/styles/tokens.css` | Seluruh nilai mentah (`--brand-*`): warna, huruf, jarak, radius, bayangan, gerak | **Satu-satunya tempat nilai mentah boleh ditulis.** |
| `fe/src/app/globals.css` | `@import`, blok `@theme inline` (peta token ke Tailwind), dan `@layer base` | Tidak memuat satu pun nilai mentah |
| `fe/src/styles/components.css` | Komponen bernama (`.card`, `.input`, `.primary-button`, …) di dalam `@layer components` | Hanya boleh memakai `var(--brand-*)` |
| `fe/src/components/icons.tsx` | Ikon 24 px bergaris 1,6 px yang mewarisi warna teks | — |
| `fe/src/app/design/page.tsx` | Contoh hidup seluruh token dan komponen | Ikut berubah bila sistem berubah |

Urutan lapisan yang dihasilkan Tailwind: `theme → base → components → utilities`. Artinya **utilitas
selalu menang atas kelas komponen**, sehingga tidak pernah ada `!important` di repositori ini.

## 2. Aturan yang mengikat

1. **Nilai mentah hanya di `tokens.css`.** Tidak ada `#1677ff`, `rgba(...)`, atau `16px` di dalam
   komponen maupun halaman. Warna yang harus berubah antar keadaan pun diambil dari token.
2. **Tata letak di halaman, permukaan di sistem.** Grid, lebar kolom, dan urutan ditulis dengan
   utilitas Tailwind langsung di halaman (`lg:grid-cols-[minmax(0,1fr)_20rem]`, `gap-3`, `w-32`).
   Permukaan, tipografi, dan kontrol memakai kelas komponen.
3. **Jangan memakai palet bawaan Tailwind.** `bg-zinc-900`, `text-sky-600`, dan sejenisnya dilarang;
   gunakan `bg-accent`, `text-ink-secondary`, `border-line`, dan seterusnya. Nilai itu berasal dari
   token, bukan dari palet Tailwind.
4. **Satu tema, terang.** Transense juga tidak punya tema gelap, jadi tidak ada varian `dark:`.
5. **Angka memakai huruf berspasi tetap.** Nilai ukur, koordinat, dan hasil hitung memakai
   `--brand-font-mono` beserta `font-variant-numeric: tabular-nums` supaya digitnya sejajar.

## 3. Token

### 3.1 Warna

| Kelompok | Token | Nilai | Dipakai untuk |
| :--- | :--- | :--- | :--- |
| Dasar | `--brand-color-background` | `#ffffff` | Latar kanvas dan kartu |
| | `--brand-color-foreground` | `#111111` | Teks utama |
| | `--brand-color-accent` | `#1677ff` | Warna merek dan aksi utama |
| | `--brand-color-surface` | `#f7f8fa` | Permukaan lembut |
| | `--brand-color-muted` | `#6b7280` | Abu netral untuk grafik |
| | `--brand-color-border` | `#d9dee7` | Garis pemisah dan tepi kontrol |
| Aksen | `--brand-color-accent-hover` | `#4096ff` | Keadaan ditunjuk |
| | `--brand-color-accent-active` | `#0958d9` | Keadaan ditekan |
| | `--brand-color-accent-bg` | `#e6f4ff` | Latar pucat (lencana, keadaan terpilih) |
| | `--brand-color-accent-bg-hover` | `#bae0ff` | Latar pucat saat ditekan |
| | `--brand-color-accent-border` | `#91caff` | Tepi bernada aksen |
| | `--brand-color-accent-text` | `#002c8c` | Teks di atas latar aksen pucat |
| Sukses | `--brand-color-success` | `#00b055` | — |
| | `--brand-color-success-bg` | `#e6f9f0` | Latar pesan berhasil |
| | `--brand-color-success-border` | `#80d4a8` | Tepi pesan berhasil |
| | `--brand-color-success-foreground` | `#006a33` | Teks pesan berhasil |
| Peringatan | `--brand-color-warning` | `#ff7a1a` | — |
| | `--brand-color-warning-bg` | `#fff0e6` | Latar peringatan |
| | `--brand-color-warning-border` | `#ffb380` | Tepi peringatan |
| | `--brand-color-warning-foreground` | `#994910` | Teks peringatan |
| Galat | `--brand-color-error` | `#b83630` | Teks dan tombol merusak |
| | `--brand-color-error-bg` | `#fce8e8` | Latar galat |
| | `--brand-color-error-border` | `#e89c9a` | Tepi galat |
| Teks | `--brand-color-text` | `#111111` | Teks utama |
| | `--brand-color-text-secondary` | `#646464` | Penjelasan, keterangan tabel |
| | `--brand-color-text-tertiary` | `#949494` | Catatan kaki, satuan |
| | `--brand-color-text-on-accent` | `#ffffff` | Teks di atas bidang aksen |
| | `--brand-color-scrim` | `rgba(17,17,17,0.72)` | Lencana di atas citra satelit |
| Isian | `--brand-color-fill`, `-secondary`, `-tertiary` | `#dbdbdb`, `#f1f1f1`, `#f5f5f5` | Kontrol nonaktif, garis tabel |
| Latar | `--brand-color-bg-layout` | `#f5f5f5` | Latar halaman |
| | `--brand-color-bg-container` | `#ffffff` | Kartu dan kepala halaman |
| | `--brand-color-bg-subtle` | `#f5f7fa` | Kepala tabel |
| | `--brand-color-white-soft` | `rgba(255,255,255,0.16)` | Isian ikon saat tile tersorot |

### 3.2 Tipografi

| Token | Nilai | Catatan |
| :--- | :--- | :--- |
| `--brand-font-family` | Plus Jakarta Sans → system-ui | Dimuat `next/font/google` di `fe/src/app/layout.tsx` |
| `--brand-font-mono` | Geist Mono → ui-monospace | Koordinat, ukuran, hasil hitung |
| `--brand-font-size-2xs` | 11 px | Catatan kaki (tambahan Sunsight) |
| `--brand-font-size-xs` | 12 px | Label kontrol, kepala tabel (tambahan Sunsight) |
| `--brand-font-size-sm` | 13 px | Teks pendamping, tombol |
| `--brand-font-size-base` | 16 px | Teks isi |
| `--brand-font-size-lg` | 19 px | Judul kartu (h3) |
| `--brand-font-size-xl` | 22 px | Judul bagian (h2) |
| `--brand-font-size-2xl` | 28 px | Judul halaman (h1); Transense berhenti di 22 px |
| `--brand-font-weight-normal` / `-strong` | 400 / 600 | Tidak ada 500 atau 700 |
| `--brand-line-height` / `-heading` | 1,5 / 1,2 | — |

Huruf Plus Jakarta Sans berlisensi SIL Open Font License 1.1; dimuat lewat `next/font` sehingga
berkasnya disajikan dari domain sendiri tanpa menyimpan berkas huruf di repositori.

### 3.3 Jarak, radius, dan tinggi kontrol

| Kelompok | Skala |
| :--- | :--- |
| Jarak | `xxs` 4 · `xs` 8 · `sm` 12 · `base` 16 · `md` 20 · `lg` 22 · `xl` 32 · `xxl` 40 px |
| Radius | `xs` 3 · `sm` 5 · `base` 8 · `lg` 10 · `xl` 16 · `2xl` 18 · `pill` 999 px |
| Tinggi kontrol | `sm` 30 · `base` 38 · `lg` 46 px |
| Bayangan | `--brand-shadow-card`, `-card-hover`, `-accent`, `-accent-strong`, `-accent-tile`, `-elevated` |
| Gerak | `fast` 0,1 s · `base` 0,2 s · `slow` 0,3 s · `ease-out` `cubic-bezier(.215,.61,.355,1)` |

Transense memakai tinggi 46 px untuk semua tombol karena sasarannya sentuh. Di sini 38 px adalah
bawaan, 46 px dipakai sadar untuk ajakan utama, dan 30 px untuk tindakan di dalam baris tabel.

### 3.4 Kerangka halaman

| Token | Nilai | Catatan |
| :--- | :--- | :--- |
| `--brand-screen-padding` | 20 px | Sisi kiri-kanan kerangka |
| `--brand-shell-width` | 1200 px | Transense 480 px karena sasarannya ponsel |
| `--brand-opacity-muted` | 0,72 | Keadaan nonaktif |

## 4. Peta ke utilitas Tailwind

`@theme inline` di `fe/src/app/globals.css` menerjemahkan token menjadi nama yang dimengerti
Tailwind, sehingga keduanya setara: `bg-accent` dan `var(--brand-color-accent)` menghasilkan warna
yang sama persis.

| Token | Utilitas yang tersedia |
| :--- | :--- |
| `--brand-color-accent` | `bg-accent`, `text-accent`, `border-accent` |
| `--brand-color-accent-bg` / `-bg-hover` / `-border` / `-text` | `bg-accent-soft`, `bg-accent-soft-hover`, `border-accent-line`, `text-accent-ink` |
| `--brand-color-success*` | `bg-success`, `bg-success-soft`, `border-success-line`, `text-success-ink`, `bg-success-hover`, `bg-success-active` |
| `--brand-color-warning*` | `bg-warning`, `bg-warning-soft`, `border-warning-line`, `text-warning-ink`, … |
| `--brand-color-error*` | `bg-error`, `bg-error-soft`, `border-error-line`, `bg-error-hover`, `bg-error-active` |
| `--brand-color-text*` | `text-ink`, `text-ink-secondary`, `text-ink-tertiary`, `text-on-accent` |
| `--brand-color-border` | `border-line` |
| `--brand-color-bg-layout` / `-container` / `-subtle` | `bg-layout`, `bg-container`, `bg-subtle` |
| `--brand-color-fill*` | `bg-fill`, `bg-fill-secondary`, `bg-fill-tertiary` |
| `--brand-color-scrim` | `bg-scrim` |
| `--brand-font-*` | `font-sans`, `font-mono` |
| `--brand-font-size-*` | `text-2xs`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl` |
| `--brand-radius-*` | `rounded-xs`, `-sm`, `-md` (8 px), `-lg`, `-xl`, `-2xl`, `-pill` |
| `--brand-shadow-*` | `shadow-card`, `shadow-card-hover`, `shadow-accent`, `shadow-accent-strong`, `shadow-accent-tile`, `shadow-elevated` |

## 5. Komponen

Nama kelas di bawah ini berasal dari Transense, kecuali yang ditandai **(tambahan Sunsight)**.

### Tipografi

| Kelas | Kegunaan |
| :--- | :--- |
| `.eyebrow` | Label kecil huruf besar berwarna aksen di atas judul |
| `.page-intro` | Blok pembuka halaman: eyebrow, judul, dan paragraf pengantar |
| `.section-heading` | Judul bagian dengan bar aksen di tepi kiri |
| `.link` **(tambahan)** | Tautan di tengah kalimat |
| `.icon` | Ukuran ikon 20 px |

### Kerangka

```tsx
<body className="app-shell">
  <header className="app-header">
    <div className="page-frame app-header__inner">
      <Link href="/" className="app-header__brand">
        <span className="app-header__mark"><SunIcon className="icon" /></span>
        Sunsight
      </Link>
      <nav className="app-nav" aria-label="Navigasi utama">
        <Link href="/studio" className="app-nav__link">Studio</Link>
        <Link href="/studio" className="app-nav__link is-active" aria-current="page">Studio</Link>
      </nav>
    </div>
  </header>
  <main className="page-frame page-content flex-1">{children}</main>
  <footer className="app-footer">
    <div className="page-frame app-footer__inner">…</div>
  </footer>
</body>
```

`.app-shell` kolom setinggi layar, `.page-frame` pembatas lebar 1200 px, `.page-content` grid jarak
22 px dengan padding vertikal, `.app-header` melekat di atas dengan latar separuh tembus pandang.

### Tombol

```tsx
<button className="primary-button">Ambil citra</button>
<Link href="/studio" className="primary-button button--lg">Buka studio</Link>
<button className="secondary-button button--sm">Sebelumnya</button>
<button className="ghost-button">Detail</button>
<button className="ghost-button ghost-button--danger button--sm">Hapus</button>
<button className="danger-button">Hapus permanen</button>
<button className="icon-button" aria-label="…"><SunIcon className="icon" /></button>
```

| Kelas | Arti |
| :--- | :--- |
| `.primary-button` | Aksi utama: isian aksen, teks putih, bayangan aksen |
| `.secondary-button` | Aksi kedua: putih, tepi abu; saat ditunjuk menjadi bernada aksen |
| `.ghost-button` | Aksi tenang tanpa tepi; `--danger` untuk tindakan merusak di dalam baris tabel |
| `.danger-button` | Tindakan merusak yang menonjol |
| `.icon-button` | Tombol berisi ikon saja, 38 × 38 px |
| `.button--sm` / `--lg` / `--block` | Tinggi 30 px / 46 px / selebar induk |

### Kontrol masukan

```tsx
<label className="field">
  <span className="field__label">
    Kemiringan bidang
    <span className="field__value">20°</span>
  </span>
  <input type="range" min={0} max={60} className="range-input" />
  <span className="field__hint">Masukan pengguna, bukan hasil deteksi citra.</span>
</label>

<label className="field">
  <span className="field__label">Lintang</span>
  <input className="input input--numeric" defaultValue="-6.59550" />
  {fieldErrors.latitude && <span className="field__error">{fieldErrors.latitude[0]}</span>}
</label>

<select className="select">…</select>
```

`.field` wajib membungkus label, kontrol, dan pesannya agar jaraknya konsisten. `.field--inline`
untuk label dan kontrol yang berjajar satu baris. `.input--numeric` menyalakan huruf berspasi tetap.

### Permukaan, lencana, dan pesan

| Kelas | Kegunaan |
| :--- | :--- |
| `.card` | Permukaan putih radius 16 px dengan bayangan kartu |
| `.card__header`, `.card__title`, `.card__hint` | Kepala kartu: judul dan keterangan |
| `.card--flush` | Tanpa padding, untuk isi berupa tabel atau kanvas |
| `.card--interactive` | Memberi sorotan angkat 2 px; hanya untuk kartu yang benar-benar dapat ditekan |
| `.state-badge` + `--accent` / `--success` / `--warning` / `--danger` / `--neutral` | Keadaan pendek berbentuk pil |
| `.notice-box` + `--info` **(tambahan)** / `--warning` / `--danger` | Kalimat pemberitahuan; bawaan berarti berhasil |
| `.empty-state` + `__mark`, `__title`, `__body` | Keadaan kosong yang menjelaskan langkah berikutnya |

### Data

| Kelas | Kegunaan |
| :--- | :--- |
| `.stat-grid` + `.stat`, `.stat__label`, `.stat__value`, `.stat__hint` | Empat angka utama hasil simulasi; `.stat__value--empty` untuk nilai yang tidak dapat dihitung |
| `.table-wrap` | Pembungkus tabel: tepi, radius, dan gulir mendatar |
| `.data-table` | Tabel berkepala; `__num` (rata kanan), `__id`, `__coord`, `__time`, `__actions`, `tr.is-selected` |
| `.data-table--compact` | Pasangan label–nilai di dalam kartu; `tr.is-total` untuk baris penjumlah |
| `.feature-list` + `.feature-tile`, `__icon`, `__step`, `__label`, `__body` | Tile ikon; `.feature-tile--action` menambahkan sorotan pembalik warna |

### Kanvas peta

| Kelas | Kegunaan |
| :--- | :--- |
| `.map-canvas` | Bingkai citra satelit |
| `.map-canvas__attribution` | Lencana atribusi penyedia di sudut kanan bawah |
| `.map-canvas__failure` | Penutup saat citra gagal dimuat |
| `.map-toolbar` + `.map-toolbar__value` | Baris ukuran bidang di bawah kanvas |
| `.roof-selection`, `.roof-handle` **(tambahan)** | Persegi bidang atap dan titik sudutnya; warnanya dari token aksen |

## 6. Penyimpangan dari Transense

Semua disengaja, dan alasannya dicatat di sini supaya tidak "diperbaiki" tanpa berpikir.

| Penyimpangan | Alasan |
| :--- | :--- |
| Tidak ada tema gelap | Transense juga tidak punya; mengarang palet gelap hanya menambah satu set warna yang tidak berasal dari sistem mana pun |
| Lebar kerangka 1200 px, bukan 480 px | Sunsight WebGIS untuk layar lebar; yang diambil adalah kosakatanya, bukan tata letak ponselnya |
| Navigasi di kepala halaman, bukan bilah bawah | Padanan bilah bawah ponsel; penanda halaman aktif (`.is-active`) tetap sama |
| Judul halaman 28 px | Transense berhenti di 22 px karena tinggi layar ponsel terbatas |
| `.feature-tile` tidak selalu menyala | Di Transense setiap tile dapat ditekan; di sini hanya `.feature-tile--action` yang bersorot, supaya tile penjelas tidak berpura-pura dapat diklik |
| `.notice-box--info` | Transense baru perlu menampilkan berhasil dan bahaya, sedangkan Sunsight perlu catatan netral |
| `.link` | Belum ada di Transense karena seluruh arahannya berupa tombol |
| `.card`, `.stat*`, `.data-table*`, `.map-canvas*`, `.roof-*` | Belum ada padanannya di Transense; semuanya memakai token yang sama |
| Nama berkas dipecah tiga | Transense menaruh token dan komponen di dua berkas `tokens.css` + `app.css` berisi 5.000 baris; di sini token, komponen, dan peta Tailwind dipisah agar aturan lapisannya terlihat |
| `color-mix()` untuk sorotan tile dan penutup galat | Transense memakai nilai alfa tetap; di sini campurannya diturunkan dari token supaya tidak ada warna mentah di komponen |

## 7. Menambah komponen baru

1. Cari dulu di `/design`: mungkin komponennya sudah ada.
2. Bila perlu komponen baru, tulis di `fe/src/styles/components.css` **di dalam `@layer components`**
   dan hanya dengan `var(--brand-*)`.
3. Bila butuh nilai yang belum ada, tambahkan tokennya di `tokens.css` beserta komentarnya — jangan
   menulis nilai mentah di komponen.
4. Tambahkan contohnya ke `/design` supaya komponen itu ikut terverifikasi dan terlihat orang lain.
5. Jalankan gerbang mutu:

```bash
cd fe && npm run build
cd fe && npx tsc --noEmit     # setelah build, karena tipe global Next baru dihasilkan build
cd fe && npm run lint
```

Lalu buka `/design` dan halaman yang memakai komponen itu, dan periksa warnanya lewat
`getComputedStyle` — bukan hanya dengan melihat gambar.
