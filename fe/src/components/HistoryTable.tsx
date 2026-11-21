"use client";

import Link from "next/link";
import { useState } from "react";

import type { SimulationSummary } from "@/lib/api";
import { decimal, idr, integer, paybackYearsText } from "@/lib/format";

type Props = {
  items: SimulationSummary[];
  activeId: number | null;
  busy: boolean;
  onOpen: (id: number) => void;
  onRename: (id: number, address: string) => Promise<void>;
  onDelete: (id: number) => void;
};

function formatIsoTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const datePart = d.toISOString().slice(0, 10);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${datePart} ${hh}:${mm}`;
}

export function HistoryTable({ items, activeId, busy, onOpen, onRename, onDelete }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");

  const startEdit = (item: SimulationSummary) => {
    setEditingId(item.id);
    setDraftName(item.address ?? `Simulasi #${item.id}`);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName("");
  };

  const commitEdit = async (id: number) => {
    const trimmed = draftName.trim();
    setEditingId(null);
    await onRename(id, trimmed);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-[28px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 p-6 sm:p-12 text-center shadow-[0_12px_32px_rgba(15,23,42,0.04)] flex flex-col items-center justify-center max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 border border-amber-200/70 text-amber-800 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[30px]">history</span>
        </div>
        <h3 className="text-base font-semibold text-slate-900 tracking-tight">Belum ada simulasi tersimpan</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
          Simpan hasil rancangan dari Studio CAD untuk meninjau parameter teknis, kalkulasi biaya, dan proposal PDF di sini.
        </p>
        <Link
          href="/studio"
          className="mt-6 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 font-semibold text-xs flex items-center gap-2 transition shadow-[0_6px_18px_rgba(245,158,11,0.22),inset_0_1px_1px_rgba(255,255,255,0.85)] border border-amber-300/80 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">polyline</span>
          <span>Buka Studio CAD</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] bg-white/78 backdrop-blur-2xl saturate-150 border border-white/85 shadow-[0_12px_32px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-900/[0.03] border-b border-slate-900/[0.06] text-[11px] font-medium text-slate-500">
            <tr>
              <th className="py-3.5 px-4 font-medium whitespace-nowrap">ID</th>
              <th className="py-3.5 px-4 font-medium whitespace-nowrap">Proyek &amp; Koordinat</th>
              <th className="py-3.5 px-4 text-right font-medium whitespace-nowrap">Kapasitas</th>
              <th className="py-3.5 px-4 text-right font-medium whitespace-nowrap">Produksi/Thn</th>
              <th className="py-3.5 px-4 text-right font-medium whitespace-nowrap">Hemat/Bln</th>
              <th className="py-3.5 px-4 text-right font-medium whitespace-nowrap">Balik Modal</th>
              <th className="py-3.5 px-4 font-medium whitespace-nowrap">Tanggal (ISO)</th>
              <th className="py-3.5 px-4 text-right font-medium whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/[0.05]">
            {items.map((item) => {
              const isSelected = item.id === activeId;
              const isEditing = editingId === item.id;
              const displayName = item.address?.trim() || `Simulasi #${item.id}`;
              return (
                <tr
                  key={item.id}
                  className={`group transition-colors ${
                    isSelected ? "bg-amber-50/55" : "hover:bg-slate-900/[0.025]"
                  }`}
                >
                  <td className="py-3.5 px-4 font-medium text-slate-400 font-code-metric tabular-nums whitespace-nowrap">
                    #{item.id}
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 min-w-[180px] max-w-[260px]">
                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void commitEdit(item.id);
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          autoFocus
                          type="text"
                          value={draftName}
                          maxLength={160}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEdit();
                            }
                          }}
                          placeholder="Nama proyek..."
                          className="w-full min-w-[140px] px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 flex items-center justify-center transition cursor-pointer shrink-0"
                          title="Simpan nama"
                          aria-label="Simpan nama"
                        >
                          <span className="material-symbols-outlined text-[15px]">check</span>
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
                          title="Batal"
                          aria-label="Batal"
                        >
                          <span className="material-symbols-outlined text-[15px]">close</span>
                        </button>
                      </form>
                    ) : (
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-slate-900 text-xs truncate" title={displayName}>
                            {displayName}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => startEdit(item)}
                            className="opacity-100 sm:opacity-65 sm:group-hover:opacity-100 w-8 h-8 sm:w-6 sm:h-6 rounded-md hover:bg-amber-50 text-slate-400 hover:text-amber-700 flex items-center justify-center transition cursor-pointer shrink-0"
                            title="Ubah nama proyek"
                            aria-label={`Ubah nama proyek ${displayName}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 font-code-metric tabular-nums mt-0.5">
                          <span className="material-symbols-outlined text-[12px] text-sky-600/80">location_on</span>
                          {item.center_point.lat.toFixed(4)}, {item.center_point.lng.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900 font-code-metric tabular-nums whitespace-nowrap">
                    {decimal.format(item.capacity_kwp)} kWp
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-700 font-code-metric tabular-nums whitespace-nowrap">
                    {integer.format(item.annual_production_kwh)} kWh
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-emerald-700 font-code-metric tabular-nums whitespace-nowrap">
                    {idr.format(item.monthly_saving_idr)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-700 font-code-metric tabular-nums whitespace-nowrap">
                    {paybackYearsText(item.payback_years)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px] font-code-metric tabular-nums whitespace-nowrap">
                    {formatIsoTimestamp(item.created_at)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpen(item.id)}
                        disabled={busy}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-200/80 text-amber-950"
                            : "bg-slate-900/[0.05] hover:bg-slate-900/[0.09] text-slate-700"
                        }`}
                      >
                        Rincian
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        disabled={busy}
                        className="w-8 h-8 sm:w-7 sm:h-7 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                        title="Hapus simulasi ini"
                        aria-label={`Hapus simulasi #${item.id}`}
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
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
