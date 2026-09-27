"use client";

import Link from "next/link";

import { HistoryIcon } from "@/components/icons";
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
      <div className="empty-state">
        <span className="empty-state__mark">
          <HistoryIcon className="icon" />
        </span>
        <p className="empty-state__title">Belum ada simulasi tersimpan</p>
        <p className="empty-state__body">
          Simpan hasil dari studio, lalu simulasi itu muncul di sini beserta masukan, asumsi, dan
          rincian biaya yang dipakai saat perhitungannya.
        </p>
        <Link href="/studio" className="primary-button">
          Buka studio
        </Link>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Lokasi</th>
            <th className="data-table__num">Kapasitas</th>
            <th className="data-table__num">Produksi tahunan</th>
            <th className="data-table__num">Hemat bulanan</th>
            <th className="data-table__num">Payback</th>
            <th>Dibuat</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className={item.id === activeId ? "is-selected" : undefined}>
              <td className="data-table__id">{item.id}</td>
              <td className="data-table__coord">
                {item.center_point.lat.toFixed(5)}, {item.center_point.lng.toFixed(5)}
              </td>
              <td className="data-table__num">{decimal.format(item.capacity_kwp)} kWp</td>
              <td className="data-table__num">{integer.format(item.annual_production_kwh)} kWh</td>
              <td className="data-table__num">{idr.format(item.monthly_saving_idr)}</td>
              <td className="data-table__num">{paybackYearsText(item.payback_years)}</td>
              <td className="data-table__time">
                {new Date(item.created_at).toLocaleString("id-ID")}
              </td>
              <td className="data-table__actions">
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  disabled={busy}
                  className="ghost-button button--sm"
                >
                  Detail
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  disabled={busy}
                  className="ghost-button ghost-button--danger button--sm"
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
