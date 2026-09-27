# Sunsight — Antarmuka

Next.js 16 (App Router), TypeScript, dan Tailwind CSS 4 dengan sistem desain bertoken.

## Menjalankan

```bash
nvm use
npm install
npm run dev
```

Halaman tersedia di http://localhost:3000. Antarmuka memanggil API di `http://localhost:8000/api`
secara bawaan; untuk mengubahnya, salin `.env.example` menjadi `.env.local` dan isi
`NEXT_PUBLIC_API_URL`. **Backend harus berjalan bersamaan.**

## Susunan

| Bagian | Isi |
| :--- | :--- |
| `src/app/` | Rute: `/` halaman depan, `/studio` simulasi, `/history` riwayat, `/login` dan `/register` akun, `/design` contoh sistem desain |
| `src/components/` | Komponen produk: editor bidang atap, panel parameter, metrik, rincian hasil, tabel riwayat, kepala halaman, ikon |
| `src/lib/api.ts` | Klien API beserta tipe payload dan penyimpanan token di `localStorage` |
| `src/lib/format.ts` | Pemformatan angka, rupiah, dan satuan |
| `src/styles/tokens.css` | Seluruh nilai mentah sistem desain (`--brand-*`) |
| `src/styles/components.css` | Komponen sistem desain di dalam `@layer components` |

## Aturan gaya

Sistem desain di `src/styles/` dipindahkan dari proyek Transense; aturan pakainya ada di
[`../docs/DESIGN.md`](../docs/DESIGN.md). Ringkasnya:

1. Nilai mentah (warna, ukuran huruf, jarak, radius, bayangan) hanya boleh ditulis di
   `src/styles/tokens.css`.
2. Permukaan, tipografi, dan kontrol memakai kelas komponen (`.card`, `.input`, `.primary-button`, …).
   Tata letak memakai utilitas Tailwind langsung di halaman.
3. Palet bawaan Tailwind (`bg-zinc-900`, `text-sky-600`) tidak dipakai; pakai `bg-accent`,
   `text-ink-secondary`, `border-line`, dan seterusnya.
4. Hanya ada satu tema, terang.

Halaman `/design` merender seluruh token dan komponen dengan kelas yang sama seperti halaman produk,
jadi ia sekaligus menjadi tempat memeriksa komponen baru.

## Verifikasi

```bash
npm run build
npx tsc --noEmit   # jalankan setelah build, karena tipe global Next baru dihasilkan build
npm run lint
```

Belum ada runner test di frontend; pembuktiannya lewat build, pemeriksaan tipe, lint, dan penelusuran
di peramban sungguhan.
