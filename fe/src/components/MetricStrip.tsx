"use client";

import type { SimulationResult } from "@/lib/api";
import { decimal, idr, integer, paybackYearsText } from "@/lib/format";

type Props = {
  result: SimulationResult;
};

/** Empat metrik utama hasil simulasi. */
export function MetricStrip({ result }: Props) {
  const { energy, finance, layout } = result;

  const metrics = [
    {
      label: "Kapasitas terpasang",
      value: `${decimal.format(energy.capacity_kwp)} kWp`,
      hint: `${integer.format(layout.installed)} modul terpasang dari ${integer.format(layout.max_slots)} slot`,
      empty: false,
    },
    {
      label: "Produksi tahunan",
      value: `${integer.format(energy.annual_production_kwh)} kWh`,
      hint: `${decimal.format(energy.daily_irradiance_kwh_per_sqm)} kWh/m²/hari dari ${energy.irradiance_source}`,
      empty: false,
    },
    {
      label: "Penghematan bulanan",
      value: idr.format(finance.monthly_saving_idr),
      hint: `${idr.format(finance.annual_saving_idr)} per tahun, dibatasi tagihan bulanan`,
      empty: false,
    },
    {
      label: "Payback",
      value: paybackYearsText(finance.payback_years),
      hint:
        finance.payback_years === null
          ? "Penghematan tahunan nol sehingga payback tidak dapat dihitung."
          : "CAPEX total dibagi penghematan tahunan.",
      // Tanpa modul terpasang tidak ada yang bisa dibayar kembali; nilainya
      // ditampilkan sebagai tanda pisah, bukan sebagai angka.
      empty: finance.payback_years === null,
    },
  ];

  return (
    <div className="stat-grid">
      {metrics.map((metric) => (
        <article key={metric.label} className="stat">
          <p className="stat__label">{metric.label}</p>
          <p className={metric.empty ? "stat__value stat__value--empty" : "stat__value"}>
            {metric.value}
          </p>
          <p className="stat__hint">{metric.hint}</p>
        </article>
      ))}
    </div>
  );
}
