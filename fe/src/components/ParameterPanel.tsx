"use client";

import { AzimuthCompass } from "@/components/studio/AzimuthCompass";
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
    <label className="field">
      <span className="field__label">
        {label}
        <span className="field__value">
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
        className="range-input"
      />
      <span className="field__hint">{hint}</span>
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
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Parameter simulasi</h2>
        <p className="card__hint">
          Setiap perubahan dihitung ulang server setelah jeda singkat.
        </p>
      </div>

      {catalogMissing && (
        <p className="notice-box notice-box--warning">
          Katalog modul dan tarif belum termuat, jadi pilihan di bawah masih kosong.
        </p>
      )}

      {/* Kompas Navigasi Azimuth Interaktif */}
      <AzimuthCompass
        azimuthDeg={value.azimuth_deg}
        tiltDeg={value.tilt_deg}
        disabled={disabled}
        onChangeAzimuth={(azimuth_deg) => onChange({ azimuth_deg })}
      />

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

      <label className="field">
        <span className="field__label">Preset modul</span>
        <select
          value={value.module_key}
          disabled={disabled || catalogMissing}
          onChange={(event) => onChange({ module_key: event.target.value })}
          className="select"
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
        <label className="field">
          <span className="field__label">Orientasi</span>
          <select
            value={value.orientation}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                orientation: event.target.value === "landscape" ? "landscape" : "portrait",
              })
            }
            className="select"
          >
            <option value="portrait">Potret</option>
            <option value="landscape">Lanskap</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Inverter</span>
          <select
            value={value.inverter_type}
            disabled={disabled}
            onChange={(event) =>
              onChange({ inverter_type: event.target.value === "micro" ? "micro" : "string" })
            }
            className="select"
          >
            <option value="string">String</option>
            <option value="micro">Micro</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field__label">Golongan tarif PLN</span>
        <select
          value={value.tariff_key}
          disabled={disabled || catalogMissing}
          onChange={(event) => onChange({ tariff_key: event.target.value })}
          className="select"
        >
          <option value="">Pilih golongan…</option>
          {options?.tariffs.map((tariff) => (
            <option key={tariff.key} value={tariff.key}>
              {tariff.label} · {idr.format(tariff.idr_per_kwh)}/kWh ({tariff.year})
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        <label htmlFor="panel-count" className="field__label">
          Jumlah panel terpasang
        </label>
        <div className="flex items-center gap-2">
          <input
            id="panel-count"
            type="number"
            min={0}
            max={maxSlots ?? undefined}
            step={1}
            value={value.panel_count ?? maxSlots ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange({ panel_count: Math.max(0, Math.round(Number(event.target.value) || 0)) })
            }
            className="input input--numeric w-24"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ panel_count: null })}
            className="secondary-button button--sm"
          >
            Isi maksimum
          </button>
        </div>
        <span className="field__hint">
          {maxSlots === null
            ? "Slot maksimum belum diketahui sampai simulasi pertama selesai."
            : `Slot maksimum untuk bidang ini: ${integer.format(maxSlots)}.`}
        </span>
      </div>

      <div className="field">
        <label htmlFor="monthly-bill-input" className="field__label">
          Tagihan listrik bulanan (Rp)
        </label>
        <input
          id="monthly-bill-input"
          type="number"
          min={0}
          step={50000}
          value={value.monthly_bill_idr}
          disabled={disabled}
          onChange={(event) =>
            onChange({ monthly_bill_idr: Math.max(0, Math.round(Number(event.target.value) || 0)) })
          }
          className="input input--numeric"
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[1_500_000, 2_800_000, 5_000_000].map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ monthly_bill_idr: preset })}
              className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold border transition cursor-pointer ${
                value.monthly_bill_idr === preset
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Rp {(preset / 1_000_000).toLocaleString("id-ID")} Jt
            </button>
          ))}
        </div>
        <span className="field__hint">
          Penghematan yang dilaporkan tidak pernah melebihi tagihan ini.
        </span>
      </div>
    </section>
  );
}
