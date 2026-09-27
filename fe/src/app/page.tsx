import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Simulasi kelayakan PLTS atap dari citra satelit
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          Masukkan koordinat, tandai bidang atap pada citra nadir yang muncul, lalu atur parameter
          teknisnya. Sunsight menata modul di dalam bidang itu dan menghitung kapasitas terpasang,
          produksi tahunan, penghematan listrik bulanan, serta payback — seluruh angka dihitung
          server, lengkap dengan asumsi dan rincian biayanya.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/studio"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Buka studio
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Buat akun
        </Link>
      </div>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            tahap: "1",
            judul: "Tentukan lokasi",
            isi: "Koordinat dan zoom dipakai untuk mengunduh citra satelit nadir lokasi itu.",
          },
          {
            tahap: "2",
            judul: "Tandai bidang atap",
            isi: "Persegi bidang atap digeser, diubah ukurannya, dan diputar langsung di atas citra; dimensinya tampil dalam meter.",
          },
          {
            tahap: "3",
            judul: "Atur parameter",
            isi: "Kemiringan, azimuth, setback, talang, preset modul, jumlah panel, tagihan listrik, dan golongan tarif.",
          },
          {
            tahap: "4",
            judul: "Baca hasilnya",
            isi: "Kapasitas, produksi tahunan, penghematan bulanan, dan payback beserta asumsi yang dipakai; simpan ke riwayat bila perlu.",
          },
        ].map((langkah) => (
          <li
            key={langkah.tahap}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
              Tahap {langkah.tahap}
            </span>
            <h2 className="mt-1 font-medium">{langkah.judul}</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{langkah.isi}</p>
          </li>
        ))}
      </ol>

      <p className="max-w-2xl text-xs text-zinc-500 dark:text-zinc-400">
        Kemiringan dan azimuth adalah masukan pengguna, bukan hasil deteksi citra: dari satu citra
        nadir arah kemiringan tidak dapat ditentukan. Citra satelit dipakai untuk pengembangan dan
        demonstrasi, dan atribusinya selalu ditampilkan di studio.
      </p>
    </div>
  );
}
