"use client";

import type { SimulationOptions, SimulationParameters } from "@/lib/api";
import { decimal, idr, integer } from "@/lib/format";

type SliderFieldProps = {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled: boolean;
  onChange: (value: number) => void;
};

/** Satu parameter berupa penggeser dengan nilai terkininya terlihat. */
function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  disabled,
  onChange,
}: SliderFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between gap-2 text-xs font-medium">
        {label}
        <span className="font-mono text-zinc-500 dark:text-zinc-400">
          {decimal.format(value)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-sky-600"
      />
      <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">{hint}</span>
    </label>
  );
}

type Props = {
  options: SimulationOptions | null;
  value: SimulationParameters;
  maxSlots: number | null;
  disabled: boolean;
  onChange: (patch: Partial<SimulationParameters>) => void;
};

export function ParameterPanel({ options, value, maxSlots, disabled, onChange }: Props) {
  const catalogMissing = options === null;

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">Parameter simulasi</h2>

      {catalogMissing && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Katalog modul dan tarif belum termuat, jadi pilihan di bawah masih kosong.
        </p>
      )}

      <SliderField
        label="Kemiringan bidang"
        hint="Masukan pengguna; arah kemiringan tidak dapat dibaca dari citra nadir."
        value={value.tilt_deg}
        min={0}
        max={60}
        step={1}
        unit="°"
        disabled={disabled}
        onChange={(tilt_deg) => onChange({ tilt_deg })}
      />

      <SliderField
        label="Azimuth"
        hint="0° = utara, bertambah searah jarum jam. Juga masukan pengguna, bukan hasil deteksi."
        value={value.azimuth_deg}
        min={0}
        max={360}
        step={1}
        unit="°"
        disabled={disabled}
        onChange={(azimuth_deg) => onChange({ azimuth_deg })}
      />

      <SliderField
        label="Setback tepi"
        hint="Jarak aman dari tepi bidang yang tidak boleh ditempati modul."
        value={value.setback_m}
        min={0}
        max={5}
        step={0.05}
        unit=" m"
        disabled={disabled}
        onChange={(setback_m) => onChange({ setback_m })}
      />

      <SliderField
        label="Jalur talang"
        hint="Lebar jalur pada sisi bawah bidang yang disisakan untuk talang."
        value={value.gutter_m}
        min={0}
        max={5}
        step={0.05}
        unit=" m"
        disabled={disabled}
        onChange={(gutter_m) => onChange({ gutter_m })}
      />

      <SliderField
        label="Jarak antar panel"
        hint="Rongga pemasangan antar modul pada kisi."
        value={value.clearance_m}
        min={0}
        max={1}
        step={0.01}
        unit=" m"
        disabled={disabled}
        onChange={(clearance_m) => onChange({ clearance_m })}
      />

      <label className="block space-y-1">
        <span className="text-xs font-medium">Preset modul</span>
        <select
          value={value.module_key}
          disabled={disabled || catalogMissing}
          onChange={(event) => onChange({ module_key: event.target.value })}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Pilih modul…</option>
          {options?.modules.map((module) => (
            <option key={module.key} value={module.key}>
              {module.label} · {integer.format(module.power_w)} W
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium">Orientasi</span>
          <select
            value={value.orientation}
            disabled={disabled}
            onChange={(event) =>
              onChange({ orientation: event.target.value === "landscape" ? "landscape" : "portrait" })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="portrait">Potret</option>
            <option value="landscape">Lanskap</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium">Inverter</span>
          <select
            value={value.inverter_type}
            disabled={disabled}
            onChange={(event) =>
              onChange({ inverter_type: event.target.value === "micro" ? "micro" : "string" })
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="string">String</option>
            <option value="micro">Micro</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium">Golongan tarif PLN</span>
        <select
          value={value.tariff_key}
          disabled={disabled || catalogMissing}
          onChange={(event) => onChange({ tariff_key: event.target.value })}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Pilih golongan…</option>
          {options?.tariffs.map((tariff) => (
            <option key={tariff.key} value={tariff.key}>
              {tariff.label} · {idr.format(tariff.idr_per_kwh)}/kWh ({tariff.year})
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-1">
        <label htmlFor="panel-count" className="block text-xs font-medium">
          Jumlah panel terpasang
        </label>
        <div className="flex gap-2">
          <input
            id="panel-count"
            type="number"
            min={0}
            max={maxSlots ?? undefined}
            step={1}
            // Kosong berarti pengguna belum menentukan sendiri: server mengisi sampai slot maksimum.
            value={value.panel_count ?? maxSlots ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange({ panel_count: Math.max(0, Math.round(Number(event.target.value) || 0)) })
            }
            className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ panel_count: null })}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium disabled:opacity-50 dark:border-zinc-700"
          >
            Isi maksimum
          </button>
        </div>
        <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
          {maxSlots === null
            ? "Slot maksimum belum diketahui sampai simulasi pertama selesai."
            : `Slot maksimum untuk bidang ini: ${integer.format(maxSlots)}.`}
        </span>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium">Tagihan listrik bulanan (Rp)</span>
        <input
          type="number"
          min={0}
          step={50000}
          value={value.monthly_bill_idr}
          disabled={disabled}
          onChange={(event) =>
            onChange({ monthly_bill_idr: Math.max(0, Math.round(Number(event.target.value) || 0)) })
          }
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
          Penghematan yang dilaporkan tidak pernah melebihi tagihan ini.
        </span>
      </label>
    </section>
  );
}
