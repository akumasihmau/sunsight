"use client";

import Link from "next/link";

import type { SimulationSummary } from "@/lib/api";
import { decimal, idr, integer, paybackYearsText } from "@/lib/format";

type Props = {
  items: SimulationSummary[];
  activeId: number | null;
  busy: boolean;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
};

export function HistoryTable({ items, activeId, busy, onOpen, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px]">history</span>
        </div>
        <h3 className="text-base font-bold text-slate-900">Belum ada simulasi tersimpan</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
          Simpan hasil rancangan dari Studio CAD untuk melihat rincian perhitungan, masukan geometri, dan estimasi biaya di sini.
        </p>
        <Link
          href="/studio"
          className="mt-6 px-5 py-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-2 transition shadow-xs shadow-sky-600/25 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">polyline</span>
          <span>Buka Studio CAD</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">#</th>
              <th className="py-3.5 px-4">Koordinat Wilayah</th>
              <th className="py-3.5 px-4 text-right">Kapasitas</th>
              <th className="py-3.5 px-4 text-right">Produksi Tahunan</th>
              <th className="py-3.5 px-4 text-right">Hemat Bulanan</th>
              <th className="py-3.5 px-4 text-right">Payback</th>
              <th className="py-3.5 px-4">Waktu Dibuat</th>
              <th className="py-3.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const isSelected = item.id === activeId;
              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    isSelected ? "bg-sky-50/50" : "hover:bg-slate-50/70"
                  }`}
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-400">#{item.id}</td>
                  <td className="py-3.5 px-4 text-slate-700 text-[11px] font-medium">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-sky-600">location_on</span>
                      {item.center_point.lat.toFixed(5)}, {item.center_point.lng.toFixed(5)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-bold tracking-tight">
                      {decimal.format(item.capacity_kwp)} kWp
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-700 tracking-tight">
                    {integer.format(item.annual_production_kwh)} kWh
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold tracking-tight">
                      {idr.format(item.monthly_saving_idr)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-700 tracking-tight">
                    {paybackYearsText(item.payback_years)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    {new Date(item.created_at).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpen(item.id)}
                        disabled={busy}
                        className="px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
                      >
                        Detail
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        disabled={busy}
                        className="px-2.5 py-1 rounded-full border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600 transition cursor-pointer"
                        title="Hapus simulasi ini"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
