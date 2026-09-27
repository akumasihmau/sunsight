import type { Metadata } from "next";

import { ChartIcon, MapPinIcon, RoofFrameIcon, SlidersIcon, SunIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Sistem desain — Sunsight",
  description: "Token, komponen, dan aturan pemakaian sistem desain Sunsight",
};

/** Kelompok token warna beserta namanya, ditampilkan sebagai contoh hidup. */
const COLOR_GROUPS: Record<string, string[]> = {
  "Palet dasar": [
    "--brand-color-background",
    "--brand-color-foreground",
    "--brand-color-accent",
    "--brand-color-surface",
    "--brand-color-muted",
    "--brand-color-border",
  ],
  Aksen: [
    "--brand-color-accent-hover",
    "--brand-color-accent-active",
    "--brand-color-accent-bg",
    "--brand-color-accent-bg-hover",
    "--brand-color-accent-border",
    "--brand-color-accent-text",
  ],
  Sukses: [
    "--brand-color-success",
    "--brand-color-success-hover",
    "--brand-color-success-active",
    "--brand-color-success-bg",
    "--brand-color-success-border",
    "--brand-color-success-foreground",
  ],
  Peringatan: [
    "--brand-color-warning",
    "--brand-color-warning-hover",
    "--brand-color-warning-active",
    "--brand-color-warning-bg",
    "--brand-color-warning-border",
    "--brand-color-warning-foreground",
  ],
  Galat: [
    "--brand-color-error",
    "--brand-color-error-hover",
    "--brand-color-error-active",
    "--brand-color-error-bg",
    "--brand-color-error-border",
  ],
  Teks: [
    "--brand-color-text",
    "--brand-color-text-secondary",
    "--brand-color-text-tertiary",
    "--brand-color-text-on-accent",
    "--brand-color-scrim",
  ],
  Isian: [
    "--brand-color-fill",
    "--brand-color-fill-secondary",
    "--brand-color-fill-tertiary",
    "--brand-color-bg-layout",
    "--brand-color-bg-container",
    "--brand-color-bg-subtle",
  ],
};

/** Skala jarak, dalam piksel, sesuai kelipatan 4 px pada token. */
const SPACING_SCALE = [
  { token: "--brand-space-xxs", px: 4 },
  { token: "--brand-space-xs", px: 8 },
  { token: "--brand-space-sm", px: 12 },
  { token: "--brand-space-base", px: 16 },
  { token: "--brand-space-md", px: 20 },
  { token: "--brand-space-lg", px: 22 },
  { token: "--brand-space-xl", px: 32 },
  { token: "--brand-space-xxl", px: 40 },
];

const RADIUS_SCALE = [
  { token: "--brand-radius-xs", px: 3 },
  { token: "--brand-radius-sm", px: 5 },
  { token: "--brand-radius-base", px: 8 },
  { token: "--brand-radius-lg", px: 10 },
  { token: "--brand-radius-xl", px: 16 },
  { token: "--brand-radius-2xl", px: 18 },
  { token: "--brand-radius-pill", px: 999 },
];

const FEATURE_TILES = [
  { Icon: MapPinIcon, label: "Tile tindakan", body: "Sorotannya membalik warna aksen." },
  { Icon: RoofFrameIcon, label: "Ikon 48 px", body: "Lingkaran aksen memakai token yang sama." },
  { Icon: SlidersIcon, label: "Judul dan badan", body: "Judul 16 px tebal, badan 13 px sekunder." },
  { Icon: ChartIcon, label: "Kisi otomatis", body: "Kolom menyesuaikan lebar, minimum 15 rem." },
];

/** Satu contoh token warna: kotaknya, namanya, dan nama tokennya. */
function Swatch({ token }: { token: string }) {
  return (
    <div className="grid gap-1">
      <span
        className="h-12 rounded-md border border-line"
        style={{ background: `var(${token})` }}
      />
      <code className="text-2xs break-all text-ink-tertiary">{token}</code>
    </div>
  );
}

export default function DesignPage() {
  return (
    <>
      <header className="page-intro">
        <p className="eyebrow">Sistem desain</p>
        <h1>Token dan komponen Sunsight</h1>
        <p>
          Halaman ini adalah contoh hidup dari sistem desain yang dipakai aplikasi, bukan mockup
          terpisah: setiap contoh di bawah dirender dengan kelas dan token yang sama seperti halaman
          produk. Nilainya berasal dari `fe/src/styles/tokens.css`, dan aturan pakainya ada di
          `docs/DESIGN.md`.
        </p>
      </header>

      <section className="grid gap-4">
        <div className="section-heading">
          <h2>Warna</h2>
          <p>Tujuh kelompok token; setiap warna turunan selalu punya latar, garis, dan teksnya.</p>
        </div>

        {Object.entries(COLOR_GROUPS).map(([group, tokens]) => (
          <div key={group} className="card">
            <h3 className="card__title">{group}</h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
              {tokens.map((token) => (
                <Swatch key={token} token={token} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4">
        <div className="section-heading">
          <h2>Tipografi</h2>
          <p>
            Huruf Plus Jakarta Sans, dimuat lewat pengoptimal huruf Next. Skalanya berasal dari
            Transense (13/16/19/22 px) ditambah 11 dan 12 px untuk catatan, serta 28 px untuk judul
            halaman di layar lebar.
          </p>
        </div>

        <div className="card">
          <p className="eyebrow">Eyebrow · 13 px, huruf besar, aksen</p>
          <h1>Judul halaman · 28 px</h1>
          <h2>Judul bagian · 22 px</h2>
          <h3>Judul kartu · 19 px</h3>
          <p className="text-base">
            Teks isi 16 px, tinggi baris 1,5. Angka hasil selalu memakai huruf berspasi tetap:{" "}
            <span className="font-mono">13,20 kWp</span>, <span className="font-mono">16.596 kWh</span>
            , <span className="font-mono">-6,59550</span>.
          </p>
          <p className="text-sm text-ink-secondary">
            Teks pendamping 13 px dengan warna sekunder, dipakai untuk penjelasan dan keterangan
            tabel.
          </p>
          <p className="text-2xs text-ink-tertiary">
            Catatan kaki 11 px dengan warna tersier, dipakai untuk asumsi dan syarat.
          </p>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="section-heading">
          <h2>Jarak dan radius</h2>
          <p>Skala jarak kelipatan 4 px, dan radius yang menaik secara monoton.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h3 className="card__title">Jarak</h3>
            <ul className="grid gap-2">
              {SPACING_SCALE.map((step) => (
                <li key={step.token} className="flex items-center gap-3">
                  <span
                    className="h-3 shrink-0 rounded-xs bg-accent"
                    style={{ width: `var(${step.token})` }}
                  />
                  <code className="text-2xs text-ink-tertiary">
                    {step.token} · {step.px} px
                  </code>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3 className="card__title">Radius</h3>
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-3">
              {RADIUS_SCALE.map((step) => (
                <li key={step.token} className="grid gap-1">
                  <span
                    className="h-12 border border-line bg-accent-soft"
                    style={{ borderRadius: `var(${step.token})` }}
                  />
                  <code className="text-2xs text-ink-tertiary">
                    {step.token} · {step.px === 999 ? "penuh" : `${step.px} px`}
                  </code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="section-heading">
          <h2>Tombol</h2>
          <p>
            Empat tingkat kepentingan. Tinggi bawaan 38 px, `.button--lg` 46 px untuk ajakan utama,
            `.button--sm` 30 px untuk tindakan di dalam baris tabel.
          </p>
        </div>

        <div className="card">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="primary-button">
              Tombol utama
            </button>
            <button type="button" className="secondary-button">
              Tombol kedua
            </button>
            <button type="button" className="ghost-button">
              Tombol hantu
            </button>
            <button type="button" className="danger-button">
              Hapus
            </button>
            <button type="button" className="icon-button" aria-label="Contoh tombol ikon">
              <SunIcon className="icon" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="primary-button button--lg">
              Ukuran besar
            </button>
            <button type="button" className="primary-button">
              Ukuran bawaan
            </button>
            <button type="button" className="primary-button button--sm">
              Ukuran kecil
            </button>
            <button type="button" className="primary-button" disabled>
              Nonaktif
            </button>
            <button type="button" className="ghost-button ghost-button--danger button--sm">
              Hapus baris
            </button>
          </div>

          <button type="button" className="primary-button button--lg button--block">
            Tombol selebar kartu
          </button>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="section-heading">
          <h2>Kontrol masukan</h2>
          <p>
            Label, petunjuk, dan galat adalah satu kesatuan `.field`. Kontrol angka memakai
            `.input--numeric` supaya digitnya sejajar.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <label className="field">
              <span className="field__label">Email</span>
              <input className="input" defaultValue="rafid@example.com" />
              <span className="field__hint">Petunjuk berukuran 11 px di bawah kontrol.</span>
            </label>

            <label className="field">
              <span className="field__label">Golongan tarif PLN</span>
              <select className="select" defaultValue="R1">
                <option value="R1">R-1/TR 2200 VA · Rp1.444/kWh (2024)</option>
                <option value="B1">B-1/TR 6600 VA · Rp1.699/kWh (2024)</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">
                Kemiringan bidang
                <span className="field__value">20°</span>
              </span>
              <input
                type="range"
                className="range-input"
                min={0}
                max={60}
                step={1}
                defaultValue={20}
              />
              <span className="field__hint">
                Penggeser yang nilai terkininya ditampilkan di sisi label.
              </span>
            </label>

            <label className="field">
              <span className="field__label">Password</span>
              <input className="input" defaultValue="terlalupendek" />
              <span className="field__error">Password minimal 8 karakter.</span>
            </label>

            <label className="field">
              <span className="field__label">Lintang</span>
              <input className="input input--numeric" defaultValue="-6.59550" disabled />
              <span className="field__hint">Kontrol yang dinonaktifkan saat permintaan berjalan.</span>
            </label>
          </div>

          <div className="card">
            <h3 className="card__title">Aturan warna kontrol</h3>
            <table className="data-table data-table--compact">
              <tbody>
                <tr>
                  <td>Garis diam</td>
                  <td>--brand-color-border</td>
                </tr>
                <tr>
                  <td>Garis saat ditunjuk</td>
                  <td>--brand-color-accent-border</td>
                </tr>
                <tr>
                  <td>Garis saat fokus</td>
                  <td>--brand-color-accent</td>
                </tr>
                <tr>
                  <td>Cincin fokus</td>
                  <td>--brand-color-accent-bg</td>
                </tr>
                <tr>
                  <td>Nonaktif</td>
                  <td>--brand-color-fill-tertiary</td>
                </tr>
              </tbody>
            </table>
            <p className="card__hint">
              Cincin fokus tidak dihapus di mana pun: elemen yang dapat difokus hanya mengubah
              bentuknya, bukan menghilangkannya.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="section-heading">
          <h2>Lencana dan pesan</h2>
          <p>
            Lencana untuk keadaan pendek, kotak pesan untuk kalimat. Varian `--info` adalah tambahan
            Sunsight; Transense baru memakai sukses dan bahaya.
          </p>
        </div>

        <div className="card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="state-badge state-badge--accent">Aksen</span>
            <span className="state-badge state-badge--success">Sukses</span>
            <span className="state-badge state-badge--warning">Peringatan</span>
            <span className="state-badge state-badge--danger">Galat</span>
            <span className="state-badge state-badge--neutral">Netral</span>
          </div>

          <p className="notice-box notice-box--info">
            Simulasi dihitung ulang setiap parameter berubah, dengan jeda singkat supaya seretan
            tidak membanjiri server.
          </p>
          <p className="notice-box">
            Simulasi tersimpan dan dapat dibuka lagi dari riwayat.
          </p>
          <p className="notice-box notice-box--warning">
            Katalog modul belum termuat, sehingga pilihan di bawah masih kosong.
          </p>
          <p role="alert" className="notice-box notice-box--danger">
            Penyedia citra menolak permintaan: token Mapbox belum diatur pada konfigurasi server.
          </p>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="section-heading">
          <h2>Metrik</h2>
          <p>
            Angka hasil ditampilkan besar dan beraksen karena itulah keluaran produk. Payback yang
            tidak dapat dihitung ditampilkan sebagai tanda pisah, bukan angka.
          </p>
        </div>

        <div className="stat-grid">
          <article className="stat">
            <p className="stat__label">Kapasitas terpasang</p>
            <p className="stat__value">11,00 kWp</p>
            <p className="stat__hint">20 modul terpasang dari 24 slot</p>
          </article>
          <article className="stat">
            <p className="stat__label">Produksi tahunan</p>
            <p className="stat__value">14.092 kWh</p>
            <p className="stat__hint">4,8324 kWh/m²/hari dari NASA POWER</p>
          </article>
          <article className="stat">
            <p className="stat__label">Penghematan bulanan</p>
            <p className="stat__value">Rp1.500.000</p>
            <p className="stat__hint">Rp18.000.000 per tahun, dibatasi tagihan bulanan</p>
          </article>
          <article className="stat">
            <p className="stat__label">Payback</p>
            <p className="stat__value stat__value--empty">—</p>
            <p className="stat__hint">Penghematan tahunan nol sehingga payback tidak dapat dihitung.</p>
          </article>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="section-heading">
          <h2>Tabel</h2>
          <p>
            `.data-table` untuk daftar berkepala, `.data-table--compact` untuk pasangan label dan
            nilai di dalam kartu. Kolom angka rata kanan dan memakai angka tabular.
          </p>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Lokasi</th>
                <th className="data-table__num">Kapasitas</th>
                <th className="data-table__num">Payback</th>
                <th>Dibuat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr className="is-selected">
                <td className="data-table__id">1</td>
                <td className="data-table__coord">-6.59550, 106.79950</td>
                <td className="data-table__num">11,00 kWp</td>
                <td className="data-table__num">4,01 tahun</td>
                <td className="data-table__time">27/09/2026 00.31</td>
                <td className="data-table__actions">
                  <button type="button" className="ghost-button button--sm">
                    Detail
                  </button>
                  <button type="button" className="ghost-button ghost-button--danger button--sm">
                    Hapus
                  </button>
                </td>
              </tr>
              <tr>
                <td className="data-table__id">2</td>
                <td className="data-table__coord">-7.25750, 112.75210</td>
                <td className="data-table__num">13,20 kWp</td>
                <td className="data-table__num">—</td>
                <td className="data-table__time">27/09/2026 00.44</td>
                <td className="data-table__actions">
                  <button type="button" className="ghost-button button--sm">
                    Detail
                  </button>
                  <button type="button" className="ghost-button ghost-button--danger button--sm">
                    Hapus
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card">
            <h3 className="card__title">Rincian CAPEX</h3>
            <table className="data-table data-table--compact">
              <tbody>
                <tr>
                  <td>Modul surya</td>
                  <td>Rp28.600.000</td>
                </tr>
                <tr>
                  <td>Inverter</td>
                  <td>Rp7.150.000</td>
                </tr>
                <tr className="is-total">
                  <td>Total CAPEX</td>
                  <td>Rp45.000.000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="section-heading">
          <h2>Kartu, tile, dan keadaan kosong</h2>
          <p>
            Tile hanya mendapat sorotan bila benar-benar menuju sesuatu; tile yang sekadar
            menjelaskan tidak berpura-pura dapat diklik.
          </p>
        </div>

        <ol className="feature-list">
          {FEATURE_TILES.map((tile) => (
            <li key={tile.label}>
              <article className="feature-tile">
                <span className="feature-tile__icon">
                  <tile.Icon />
                </span>
                <p className="feature-tile__step">Contoh</p>
                <h3 className="feature-tile__label">{tile.label}</h3>
                <p className="feature-tile__body">{tile.body}</p>
              </article>
            </li>
          ))}
        </ol>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card card--interactive">
            <div className="card__header">
              <h3 className="card__title">Kartu yang dapat ditunjuk</h3>
              <p className="card__hint">`.card--interactive` mengangkat kartu 2 px saat ditunjuk.</p>
            </div>
            <p className="m-0 text-sm text-ink-secondary">
              Kartu diam memakai bayangan `--brand-shadow-card`; saat ditunjuk bayangan naik ke
              `--brand-shadow-card-hover`.
            </p>
          </div>

          <div className="empty-state">
            <span className="empty-state__mark">
              <ChartIcon className="icon" />
            </span>
            <p className="empty-state__title">Belum ada simulasi tersimpan</p>
            <p className="empty-state__body">
              Keadaan kosong selalu menjelaskan langkah berikutnya, bukan hanya menyatakan bahwa
              datanya tidak ada.
            </p>
            <button type="button" className="primary-button">
              Buka studio
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="card__title">Kanvas peta dan persegi bidang atap</h3>
          <p className="card__hint">
            `.map-canvas` adalah bingkai citra; `.roof-selection` dan `.roof-handle` adalah persegi
            bidang atap beserta titik sudutnya.
          </p>
          <div className="map-canvas h-40">
            <svg viewBox="0 0 200 100" className="h-full w-full">
              <rect x="0" y="0" width="200" height="100" className="fill-fill-tertiary" />
              <rect x="60" y="25" width="80" height="50" strokeWidth={2} className="roof-selection" />
              <circle cx="60" cy="25" r="5" strokeWidth={2} className="roof-handle" />
              <circle cx="140" cy="25" r="5" strokeWidth={2} className="roof-handle" />
              <circle cx="60" cy="75" r="5" strokeWidth={2} className="roof-handle" />
              <circle cx="140" cy="75" r="5" strokeWidth={2} className="roof-handle" />
            </svg>
            <p className="map-canvas__attribution">© Mapbox © Maxar</p>
          </div>
        </div>
      </section>

      <div className="notice-box notice-box--info">
        <p>
          <strong>Aturan yang mengikat.</strong> Nilai mentah hanya boleh ditulis di
          `fe/src/styles/tokens.css`. Halaman memakai kelas komponen untuk permukaan, tipografi, dan
          kontrol, serta utilitas Tailwind hanya untuk tata letak.
        </p>
      </div>
    </>
  );
}
