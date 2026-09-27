import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Estimasi panel surya dari citra atap
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          Sunsight mengambil citra nadir pada koordinat yang dipilih, merapikan batas atap,
          memperkirakan area yang tidak berbayang, lalu menghitung estimasi energi harian
          beserta seluruh asumsi yang dipakainya.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/analysis"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Mulai analisis
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
          { tahap: "1", judul: "Ambil citra", isi: "Citra nadir diunduh untuk koordinat dan zoom yang dipilih." },
          { tahap: "2", judul: "Tandai atap", isi: "Poligon kasar digambar, lalu dirapikan menjadi batas atap." },
          { tahap: "3", judul: "Buang bayangan", isi: "Area berbayang dihitung terpisah dari area yang terpakai." },
          { tahap: "4", judul: "Hitung energi", isi: "Energi harian dihitung dari luas terpakai dan iradiasi lokasi." },
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
    </div>
  );
}
