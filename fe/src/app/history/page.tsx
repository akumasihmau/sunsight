"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { HistoryTable } from "@/components/HistoryTable";
import {
  ApiRequestError,
  api,
  getToken,
  setToken,
  type AnalysisDetail,
  type AnalysisSummary,
} from "@/lib/api";

type PageMeta = { current_page: number; per_page: number; total: number; last_page: number };

/** Pesan yang ditampilkan untuk sebuah kegagalan permintaan. */
function messageFor(caught: unknown): string {
  return caught instanceof ApiRequestError
    ? caught.message
    : "Terjadi kesalahan yang tidak terduga.";
}

export default function HistoryPage() {
  const router = useRouter();

  const [items, setItems] = useState<AnalysisSummary[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Memuat satu halaman daftar riwayat.
   *
   * Sengaja tidak menyetel status apa pun sebelum permintaan dikirim, supaya
   * pemanggilan dari dalam effect tidak memicu render berantai.
   */
  const load = useCallback(
    async (page: number) => {
      try {
        const result = await api.listAnalyses(page);
        setItems(result.data);
        setMeta(result.meta);
        setError(null);
      } catch (caught) {
        if (caught instanceof ApiRequestError && caught.status === 401) {
          setToken(null);
          router.replace("/login");
          return;
        }

        setError(messageFor(caught));
      }
    },
    [router],
  );

  useEffect(() => {
    if (getToken() === null) {
      router.replace("/login");
      return;
    }

    // Pemuatan awal memakai rantai promise, bukan pemanggilan fungsi yang menyetel
    // status, supaya tidak ada render berantai saat mount. Penanda `cancelled`
    // mencegah hasil yang datang terlambat menimpa keadaan setelah unmount.
    let cancelled = false;

    api
      .listAnalyses(1)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setItems(result.data);
        setMeta(result.meta);
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }

        if (caught instanceof ApiRequestError && caught.status === 401) {
          setToken(null);
          router.replace("/login");
          return;
        }

        setError(messageFor(caught));
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  /** Membungkus aksi yang dipicu pengguna dengan indikator sibuk. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);

    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(id: number) {
    await run(async () => {
      try {
        setDetail(await api.getAnalysis(id));
      } catch (caught) {
        setError(messageFor(caught));
      }
    });
  }

  async function remove(id: number) {
    if (!window.confirm(`Hapus analisis #${id}?`)) {
      return;
    }

    await run(async () => {
      try {
        await api.deleteAnalysis(id);

        if (detail?.id === id) {
          setDetail(null);
        }

        // Dimuat ulang dari server supaya tampilan tidak menyimpang dari data.
        await load(meta?.current_page ?? 1);
      } catch (caught) {
        setError(messageFor(caught));
      }
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Riwayat analisis</h1>

      {error !== null && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <HistoryTable
        items={items}
        activeId={detail?.id ?? null}
        busy={busy}
        onOpen={(id) => void openDetail(id)}
        onDelete={(id) => void remove(id)}
      />

      {meta !== null && meta.last_page > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => void run(() => load(Math.max(1, meta.current_page - 1)))}
            disabled={busy || meta.current_page <= 1}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-50 dark:border-zinc-700"
          >
            Sebelumnya
          </button>
          <span className="text-zinc-500 dark:text-zinc-400">
            Halaman {meta.current_page} dari {meta.last_page} · {meta.total} analisis
          </span>
          <button
            type="button"
            onClick={() => void run(() => load(Math.min(meta.last_page, meta.current_page + 1)))}
            disabled={busy || meta.current_page >= meta.last_page}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 disabled:opacity-50 dark:border-zinc-700"
          >
            Berikutnya
          </button>
        </div>
      )}

      {detail !== null && (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-semibold">Detail analisis #{detail.id}</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Terpakai</dt>
              <dd className="font-semibold">{detail.usable_area_sqm.toFixed(2)} m²</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Berbayang</dt>
              <dd className="font-semibold">{detail.shadow_area_sqm.toFixed(2)} m²</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Energi harian</dt>
              <dd className="font-semibold">{detail.estimated_energy_kwh_per_day.toFixed(2)} kWh</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Orientasi atap</dt>
              <dd className="font-semibold">{detail.roof_orientation_deg.toFixed(2)}°</dd>
            </div>
          </dl>

          <h3 className="mt-4 mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Asumsi yang tersimpan
          </h3>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {Object.entries(detail.assumptions).map(([key, value]) => (
                <tr key={key}>
                  <td className="py-1 pr-4 font-mono text-zinc-500 dark:text-zinc-400">{key}</td>
                  <td className="py-1">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Poligon tersimpan memuat {detail.roof_polygon.coordinates[0]?.length ?? 0} titik.
          </p>
        </section>
      )}
    </div>
  );
}
