"use client";

import type { AnalysisSummary } from "@/lib/api";

type Props = {
  items: AnalysisSummary[];
  activeId: number | null;
  busy: boolean;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
};

export function HistoryTable({ items, activeId, busy, onOpen, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Belum ada analisis tersimpan.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Lokasi</th>
            <th className="px-3 py-2 font-medium">Terpakai</th>
            <th className="px-3 py-2 font-medium">Energi harian</th>
            <th className="px-3 py-2 font-medium">Dibuat</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((item) => (
            <tr
              key={item.id}
              className={item.id === activeId ? "bg-sky-50 dark:bg-sky-950" : undefined}
            >
              <td className="px-3 py-2 font-mono">{item.id}</td>
              <td className="px-3 py-2 font-mono text-xs">
                {item.center_point.lat.toFixed(5)}, {item.center_point.lng.toFixed(5)}
              </td>
              <td className="px-3 py-2">{item.usable_area_sqm.toFixed(2)} m²</td>
              <td className="px-3 py-2">{item.estimated_energy_kwh_per_day.toFixed(2)} kWh</td>
              <td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(item.created_at).toLocaleString("id-ID")}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  disabled={busy}
                  className="text-sky-600 underline disabled:opacity-50 dark:text-sky-400"
                >
                  Detail
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  disabled={busy}
                  className="ml-3 text-red-600 underline disabled:opacity-50 dark:text-red-400"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
