import Link from "next/link";

import { ChartIcon, MapPinIcon, RoofFrameIcon, SlidersIcon } from "@/components/icons";

/** Empat tahap alur studio, masing-masing dengan ikonnya dari sistem desain. */
const STEPS = [
  {
    step: "1",
    Icon: MapPinIcon,
    title: "Tentukan lokasi",
    body: "Koordinat dan zoom dipakai untuk mengunduh citra satelit nadir lokasi itu.",
  },
  {
    step: "2",
    Icon: RoofFrameIcon,
    title: "Tandai bidang atap",
    body: "Persegi bidang atap digeser, diubah ukurannya, dan diputar langsung di atas citra; dimensinya tampil dalam meter.",
  },
  {
    step: "3",
    Icon: SlidersIcon,
    title: "Atur parameter",
    body: "Kemiringan, azimuth, setback, talang, preset modul, jumlah panel, tagihan listrik, dan golongan tarif.",
  },
  {
    step: "4",
    Icon: ChartIcon,
    title: "Baca hasilnya",
    body: "Kapasitas, produksi tahunan, penghematan bulanan, dan payback beserta asumsi yang dipakai; simpan ke riwayat bila perlu.",
  },
];

export default function Home() {
  return (
    <>
      <section className="page-intro">
        <p className="eyebrow">Simulasi PLTS atap</p>
        <h1>Perkirakan potensi panel surya di atap, dari citra satelit</h1>
        <p>
          Masukkan koordinat, tandai bidang atap pada citra nadir yang muncul, lalu atur parameter
          teknisnya. Sunsight menata modul di dalam bidang itu dan menghitung kapasitas terpasang,
          produksi tahunan, penghematan listrik bulanan, serta payback — seluruh angka dihitung
          server, lengkap dengan asumsi dan rincian biayanya.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/studio" className="primary-button button--lg">
            Buka studio
          </Link>
          <Link href="/register" className="secondary-button button--lg">
            Buat akun
          </Link>
        </div>
      </section>

      <section className="section-heading">
        <h2>Alur pemakaian</h2>
        <p>Empat tahap, seluruhnya di satu halaman studio.</p>
      </section>

      <ol className="feature-list">
        {STEPS.map((step) => (
          <li key={step.step}>
            <article className="feature-tile">
              <span className="feature-tile__icon">
                <step.Icon />
              </span>
              <p className="feature-tile__step">Tahap {step.step}</p>
              <h3 className="feature-tile__label">{step.title}</h3>
              <p className="feature-tile__body">{step.body}</p>
            </article>
          </li>
        ))}
      </ol>

      <div className="notice-box notice-box--info">
        <p>
          <strong>Kemiringan dan azimuth adalah masukan pengguna, bukan hasil deteksi.</strong> Dari
          satu citra nadir, arah kemiringan memang tidak dapat ditentukan, sehingga nilainya diisi
          manual di panel parameter.
        </p>
        <p>
          Citra satelit dipakai untuk pengembangan dan demonstrasi; atribusinya selalu ditampilkan
          di studio.
        </p>
      </div>
    </>
  );
}
