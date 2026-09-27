"use client";

import type { Calculation, ShadowAnalysis } from "@/lib/api";

type Props = {
  shadow: ShadowAnalysis | null;
  calculation: Calculation | null;
  savedId: number | null;
  busy: boolean;
  onSave: () => void;
};

/** Panel hasil: luas, energi, dan asumsi yang dipakai menghitungnya. */
export function ResultPanel({ shadow, calculation, savedId, busy, onSave }: Props) {
  if (shadow === null && calculation === null) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Hasil analisis akan muncul di sini setelah poligon atap diproses.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {shadow !== null && (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-semibold">Luas area</h2>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Terpakai</dt>
              <dd className="text-lg font-semibold">{shadow.usable_area_sqm.toFixed(2)} m²</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Berbayang</dt>
              <dd className="text-lg font-semibold">{shadow.shadow_area_sqm.toFixed(2)} m²</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Total</dt>
              <dd className="text-lg font-semibold">{shadow.total_area_sqm.toFixed(2)} m²</dd>
            </div>
          </dl>
          <a
            href={shadow.shadow_mask_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs text-sky-600 underline dark:text-sky-400"
          >
            Lihat mask bayangan
          </a>
        </section>
      )}

      {calculation !== null && (
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 text-sm font-semibold">Estimasi energi</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Energi harian</dt>
              <dd className="text-lg font-semibold">{calculation.estimated_energy_kwh_per_day.toFixed(2)} kWh</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Iradiasi</dt>
              <dd className="text-lg font-semibold">{calculation.daily_ghi_kwh_per_sqm.toFixed(3)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Orientasi atap</dt>
              <dd className="text-lg font-semibold">{calculation.roof_orientation_deg.toFixed(2)}°</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Azimut disarankan</dt>
              <dd className="text-lg font-semibold">{calculation.recommended_azimuth_deg.toFixed(0)}°</dd>
            </div>
          </dl>

          <h3 className="mt-4 mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Asumsi yang dipakai
          </h3>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {Object.entries(calculation.assumptions).map(([key, value]) => (
                <tr key={key}>
                  <td className="py-1 pr-4 font-mono text-zinc-500 dark:text-zinc-400">{key}</td>
                  <td className="py-1">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={busy || savedId !== null}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {savedId === null ? "Simpan analisis" : `Tersimpan sebagai #${savedId}`}
            </button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Orientasi atap dihitung dari sumbu poligon. Arah kemiringan tidak dapat ditentukan dari citra nadir.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
