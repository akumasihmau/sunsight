"use client";

import type { CapexBreakdown, SimulationResult } from "@/lib/api";
import { decimal, idr, integer } from "@/lib/format";

type CapexTableProps = {
  breakdown: CapexBreakdown;
  total: number;
};

/** Rincian CAPEX beserta totalnya; dipakai panel hasil studio dan detail riwayat. */
export function CapexTable({ breakdown, total }: CapexTableProps) {
  const rows = [
    { label: "Modul surya", value: breakdown.modules_idr },
    { label: "Inverter", value: breakdown.inverter_idr },
    { label: "Racking", value: breakdown.racking_idr },
    { label: "Instalasi", value: breakdown.installation_idr },
  ];

  return (
    <table className="data-table data-table--compact">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            <td>{idr.format(row.value)}</td>
          </tr>
        ))}
        <tr className="is-total">
          <td>Total CAPEX</td>
          <td>{idr.format(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

type Props = {
  result: SimulationResult;
};

/** Rincian bidang, tata letak, anggaran, dan asumsi dari satu hasil simulasi. */
export function ResultDetails({ result }: Props) {
  const { geometry, layout, energy, finance } = result;

  const geometryRows = [
    { label: "Luas bidang", value: `${decimal.format(geometry.total_area_sqm)} m²` },
    { label: "Luas efektif", value: `${decimal.format(geometry.effective_area_sqm)} m²` },
    { label: "Lebar atap", value: `${decimal.format(geometry.roof_width_m)} m` },
    { label: "Panjang atap", value: `${decimal.format(geometry.roof_length_m)} m` },
    { label: "Slot maksimum", value: integer.format(layout.max_slots) },
    { label: "Modul terpasang", value: integer.format(layout.installed) },
    {
      label: "Kisi",
      value: `${integer.format(layout.rows)} baris × ${integer.format(layout.columns)} kolom`,
    },
    { label: "Luas modul", value: `${decimal.format(layout.module_area_sqm)} m²` },
    { label: "Rasio kerapatan", value: decimal.format(layout.density_ratio) },
  ];

  const assumptionRows = [
    {
      label: "Iradiasi harian rata-rata",
      value: `${decimal.format(energy.daily_irradiance_kwh_per_sqm)} kWh/m²/hari`,
    },
    {
      label: "Sumber iradiasi",
      value: `${energy.irradiance_source} · ${energy.irradiance_period}`,
    },
    { label: "Faktor sudut datang", value: decimal.format(energy.incidence_factor) },
    { label: "Performance ratio", value: decimal.format(energy.performance_ratio) },
    {
      label: "Golongan tarif",
      value: `${finance.tariff_label} · ${idr.format(finance.tariff_idr_per_kwh)}/kWh`,
    },
    { label: "Tagihan listrik bulanan", value: idr.format(finance.monthly_bill_idr) },
    {
      label: "Reduksi CO₂",
      value: `${decimal.format(finance.co2_reduction_kg_per_year)} kg/tahun · setara ${integer.format(finance.trees_equivalent)} pohon`,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Bidang dan tata letak</h2>
          <p className="card__hint">Ukuran bidang yang ditandai, setelah setback, talang, dan kisi modul.</p>
        </div>
        <table className="data-table data-table--compact">
          <tbody>
            {geometryRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Rincian CAPEX</h2>
          <p className="card__hint">Biaya modal awal sebagai dasar perhitungan payback.</p>
        </div>
        <CapexTable breakdown={finance.capex_breakdown} total={finance.capex_total_idr} />
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Asumsi perhitungan</h2>
          <p className="card__hint">Nilai yang dipakai server pada perhitungan terakhir.</p>
        </div>
        <table className="data-table data-table--compact">
          <tbody>
            {assumptionRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
