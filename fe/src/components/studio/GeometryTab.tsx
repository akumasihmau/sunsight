"use client";

import type { DetectedRoof } from "@/lib/api";
import type { RoofFacet, RoofShape, SlotState } from "@/lib/studioPhysics";

export interface GeometryTabProps {
  facets: RoofFacet[];
  selectedFacetIds: string[];
  activeFacetId: string;
  activeFacet: RoofFacet;
  bindFacetStripScroll: (el: HTMLDivElement | null) => void;
  onSelectAllFacets: () => void;
  onUnselectAllFacets: () => void;
  onAddNewFacet: () => void;
  onToggleFacetSelection: (id: string) => void;
  onFocusFacet: (id: string) => void;
  onDeleteFacet: (id: string) => void;
  isAiScanning: boolean;
  onRunAiDetection: () => void;
  showDetectedRoofs: boolean;
  remainingDetectedRoofs: DetectedRoof[];
  selectedDetectedIds: string[];
  onSelectDetectedRoof: (id: string) => void;
  onCommitDetectedSelection: () => void;
  roofShape: RoofShape;
  setRoofShape: (shape: RoofShape) => void;
  polygonRotation: number;
  setPolygonRotation: (deg: number) => void;
  onNudgeFacet: (dx: number, dy: number) => void;
  onCenterFacetOnRoof: () => void;
  obstacleBrush: SlotState | null;
  setObstacleBrush: (brush: SlotState | null) => void;
  onResetManualObstacles: () => void;
  onSelectBrushToast: (label: string) => void;
  netArea: number;
  onUpdateFacetName: (name: string) => void;
  ridge: number;
  setRidge: (v: number) => void;
  slope: number;
  setSlope: (v: number) => void;
  setback: number;
  setSetback: (v: number) => void;
  gutter: number;
  setGutter: (v: number) => void;
  pitch: number;
  setPitch: (v: number) => void;
  wedgePathD: string;
  arcPathD: string;
  pitchCosine: string;
  pitchEffPct: number;
  azimuth: number;
  setAzimuth: (v: number) => void;
  onNudgeAzimuth: (delta: number) => void;
  azInfo: { name: string; desc: string; isOptimal: boolean };
  azimuthEffPct: string;
  alignToAzimuth: boolean;
  setAlignToAzimuth: (val: boolean) => void;
  onNextTab: () => void;
}

export function GeometryTab({
  facets,
  selectedFacetIds,
  activeFacetId,
  activeFacet,
  bindFacetStripScroll,
  onSelectAllFacets,
  onUnselectAllFacets,
  onAddNewFacet,
  onToggleFacetSelection,
  onFocusFacet,
  onDeleteFacet,
  isAiScanning,
  onRunAiDetection,
  showDetectedRoofs,
  remainingDetectedRoofs,
  selectedDetectedIds,
  onSelectDetectedRoof,
  onCommitDetectedSelection,
  roofShape,
  setRoofShape,
  polygonRotation,
  setPolygonRotation,
  onNudgeFacet,
  onCenterFacetOnRoof,
  obstacleBrush,
  setObstacleBrush,
  onResetManualObstacles,
  onSelectBrushToast,
  netArea,
  onUpdateFacetName,
  ridge,
  setRidge,
  slope,
  setSlope,
  setback,
  setSetback,
  gutter,
  setGutter,
  pitch,
  setPitch,
  wedgePathD,
  arcPathD,
  pitchCosine,
  pitchEffPct,
  azimuth,
  setAzimuth,
  onNudgeAzimuth,
  azInfo,
  azimuthEffPct,
  alignToAzimuth,
  setAlignToAzimuth,
  onNextTab,
}: GeometryTabProps) {
  return (
    <div id="studio-pane-geometry" className="p-3.5 space-y-3">
      {/* 1. Multi-Polygon Facet Switcher */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-title text-xs font-semibold text-slate-900">
            Bidang Atap{" "}
            <span className="font-code-metric text-slate-400 font-medium">
              ({selectedFacetIds.length}/{facets.length})
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={facets.length === 0}
              onClick={
                selectedFacetIds.length === facets.length ? onUnselectAllFacets : onSelectAllFacets
              }
              className="px-2.5 py-1 rounded-full bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-600 text-[10.5px] font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selectedFacetIds.length === facets.length && facets.length > 0
                ? "Batal Pilih"
                : "Pilih Semua"}
            </button>
            <button
              type="button"
              onClick={onAddNewFacet}
              className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 hover:from-amber-200 hover:to-amber-200 active:scale-95 text-amber-950 text-[10.5px] font-semibold flex items-center gap-1 transition border border-amber-200/90 shadow-[0_2px_8px_rgba(251,191,36,0.18),inset_0_1px_1px_rgba(255,255,255,0.9)] cursor-pointer"
              title="Tambah Bidang Atap Baru"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>Bidang</span>
            </button>
          </div>
        </div>

        {facets.length > 0 && (
          <div
            ref={bindFacetStripScroll}
            tabIndex={0}
            className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain py-0.5 focus:outline-none"
          >
            {facets.map((facet, idx) => {
              const isSelected = selectedFacetIds.includes(facet.id);
              const isActive = facet.id === activeFacetId;
              return (
                <div
                  key={facet.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] shrink-0 transition-all border ${
                    isSelected
                      ? isActive
                        ? "bg-gradient-to-r from-amber-100/95 via-yellow-100/95 to-amber-100/95 text-amber-950 border-amber-200/90 font-semibold shadow-2xs"
                        : "bg-amber-50/70 text-amber-900 border-amber-200/70 font-medium"
                      : "bg-slate-900/[0.03] hover:bg-slate-900/[0.06] text-slate-500 border-transparent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFacetSelection(facet.id);
                    }}
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isSelected ? "bg-amber-500 text-white" : "border border-slate-300 bg-white"
                    }`}
                    title={isSelected ? "Lepas pilihan" : "Pilih bidang"}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="flex items-center gap-1 cursor-pointer select-none"
                    onClick={() => onFocusFacet(facet.id)}
                  >
                    <span className="truncate max-w-[110px]">
                      {facet.name || `Bidang #${idx + 1}`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-code-metric">
                      {facet.ridge.toFixed(1)}×{facet.slope.toFixed(1)}m
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFacet(facet.id);
                    }}
                    className="w-4 h-4 rounded-full hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                    title="Hapus bidang"
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {facets.length === 0 ? (
          <div className="pt-1 space-y-2.5">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pindai citra satelit dengan AI atau gambar langsung menggunakan Pen Tool.
            </p>
            <button
              type="button"
              onClick={onRunAiDetection}
              disabled={isAiScanning}
              className="w-full py-2 px-3 rounded-full bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 hover:from-amber-200 hover:to-amber-200 active:scale-[0.98] text-amber-950 font-semibold text-xs flex items-center justify-center gap-1.5 border border-amber-200/90 shadow-[0_2px_10px_rgba(251,191,36,0.20),inset_0_1px_1px_rgba(255,255,255,0.9)] transition cursor-pointer disabled:opacity-60"
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  isAiScanning ? "animate-spin" : ""
                }`}
              >
                {isAiScanning ? "sync" : "radar"}
              </span>
              <span>{isAiScanning ? "Memindai Atap..." : "Pindai Atap AI"}</span>
            </button>
            {remainingDetectedRoofs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                {remainingDetectedRoofs.map((detected) => {
                  const isPicked = selectedDetectedIds.includes(detected.id);
                  return (
                    <button
                      key={detected.id}
                      type="button"
                      onClick={() => onSelectDetectedRoof(detected.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border ${
                        isPicked
                          ? "bg-amber-200/90 text-amber-950 border-amber-300 font-semibold"
                          : "bg-slate-900/[0.03] hover:bg-slate-900/[0.06] text-slate-700 border-transparent"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px] text-amber-700">
                        {isPicked ? "check_circle" : "roofing"}
                      </span>
                      <span>{detected.area_sqm.toFixed(1)} m²</span>
                      <span className="text-slate-400 font-code-metric text-[10px]">
                        {Math.round(detected.confidence * 100)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          selectedFacetIds.length === 0 && (
            <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
              <span>Pilih bidang untuk kalkulasi sistem.</span>
              <button
                type="button"
                onClick={onSelectAllFacets}
                className="text-amber-800 font-semibold hover:underline shrink-0 cursor-pointer"
              >
                Pilih Semua
              </button>
            </div>
          )
        )}

        {showDetectedRoofs && facets.length > 0 && remainingDetectedRoofs.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-medium text-slate-500">Kandidat terdeteksi</span>
              <button
                type="button"
                onClick={onCommitDetectedSelection}
                disabled={selectedDetectedIds.length === 0}
                className={`font-semibold ${
                  selectedDetectedIds.length > 0
                    ? "text-amber-800 hover:underline cursor-pointer"
                    : "text-slate-300 cursor-not-allowed"
                }`}
              >
                Terapkan
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {remainingDetectedRoofs.map((detected) => {
                const isPicked = selectedDetectedIds.includes(detected.id);
                return (
                  <button
                    key={detected.id}
                    type="button"
                    onClick={() => onSelectDetectedRoof(detected.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border ${
                      isPicked
                        ? "bg-amber-200/90 text-amber-950 border-amber-300 font-semibold"
                        : "bg-slate-900/[0.03] hover:bg-slate-900/[0.06] text-slate-700 border-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px] text-amber-700">
                      {isPicked ? "check_circle" : "roofing"}
                    </span>
                    <span>{detected.area_sqm.toFixed(1)} m²</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Bentuk, Posisi & Rintangan */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="font-title text-xs font-semibold text-slate-900">
            Bentuk &amp; Posisi
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {roofShape === "rectangle"
              ? "Persegi"
              : roofShape === "l-shape"
                ? "Bentuk L"
                : roofShape === "trapezoid"
                  ? "Limasan"
                  : "Bebas"}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-900/[0.04]">
          {[
            { id: "rectangle" as const, icon: "crop_landscape", label: "Persegi" },
            { id: "l-shape" as const, icon: "rounded_corner", label: "Bentuk L" },
            { id: "trapezoid" as const, icon: "change_history", label: "Limasan" },
            { id: "custom_polygon" as const, icon: "polyline", label: "Bebas" },
          ].map((shapeOpt) => (
            <button
              key={shapeOpt.id}
              type="button"
              onClick={() => setRoofShape(shapeOpt.id)}
              className={`py-1.5 px-1 rounded-xl text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                roofShape === shapeOpt.id
                  ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 font-semibold border border-amber-200/90 shadow-[0_2px_8px_rgba(251,191,36,0.18),inset_0_1px_1px_rgba(255,255,255,0.9)]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{shapeOpt.icon}</span>
              <span className="text-[10px]">{shapeOpt.label}</span>
            </button>
          ))}
        </div>

        {/* Rotation */}
        <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-600">Rotasi Poligon</span>
            <span className="font-code-metric font-semibold text-slate-900">
              {polygonRotation}°
            </span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={polygonRotation}
            onChange={(e) => setPolygonRotation(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="grid grid-cols-4 gap-1 font-code-metric text-[10px]">
            {[
              { label: "+8°", val: 8 },
              { label: "0°", val: 0 },
              { label: "45°", val: 45 },
              { label: "90°", val: 90 },
            ].map((rot) => (
              <button
                key={rot.val}
                type="button"
                onClick={() => setPolygonRotation(rot.val)}
                className={`py-1 rounded-full text-center transition cursor-pointer font-medium ${
                  polygonRotation === rot.val
                    ? "bg-amber-100 text-amber-950 font-semibold"
                    : "bg-slate-900/[0.03] hover:bg-slate-900/[0.06] text-slate-600"
                }`}
              >
                {rot.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nudge Position */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-0.5 bg-slate-900/[0.035] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onNudgeFacet(-10, 0)}
              className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:text-amber-800 transition cursor-pointer"
              title="Geser Kiri"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_left</span>
            </button>
            <div className="flex flex-col gap-0.5 sm:gap-0">
              <button
                type="button"
                onClick={() => onNudgeFacet(0, -10)}
                className="w-7 h-4 sm:w-6 sm:h-3 rounded flex items-center justify-center text-slate-600 hover:bg-white hover:text-amber-800 transition cursor-pointer"
                title="Geser Atas"
              >
                <span className="material-symbols-outlined text-[12px]">arrow_drop_up</span>
              </button>
              <button
                type="button"
                onClick={() => onNudgeFacet(0, 10)}
                className="w-7 h-4 sm:w-6 sm:h-3 rounded flex items-center justify-center text-slate-600 hover:bg-white hover:text-amber-800 transition cursor-pointer"
                title="Geser Bawah"
              >
                <span className="material-symbols-outlined text-[12px]">arrow_drop_down</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => onNudgeFacet(10, 0)}
              className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:text-amber-800 transition cursor-pointer"
              title="Geser Kanan"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_right</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onCenterFacetOnRoof}
            className="flex-1 h-8 px-3 rounded-xl bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">filter_center_focus</span>
            <span>Pusatkan</span>
          </button>
        </div>

        {/* Rintangan Atap */}
        <div className="space-y-2 pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-600">Rintangan Atap</span>
            {Object.keys(activeFacet.slotOverrides || {}).length > 0 && (
              <button
                type="button"
                onClick={onResetManualObstacles}
                className="text-[10.5px] text-rose-600 hover:underline font-medium cursor-pointer"
              >
                Reset manual
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "hvac" as const, icon: "ac_unit", label: "Kuas AC" },
              { id: "skylight" as const, icon: "grid_4x4", label: "Kuas Kaca" },
              { id: "empty" as const, icon: "block", label: "Kosongkan" },
            ].map((brush) => (
              <button
                key={brush.id}
                type="button"
                onClick={() => {
                  const next = obstacleBrush === brush.id ? null : brush.id;
                  setObstacleBrush(next);
                  if (next) onSelectBrushToast(brush.label);
                }}
                className={`py-2 px-1.5 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer border ${
                  obstacleBrush === brush.id
                    ? "bg-amber-100 text-amber-950 border-amber-200 font-semibold"
                    : "bg-slate-900/[0.03] text-slate-600 border-transparent hover:bg-slate-900/[0.06]"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{brush.icon}</span>
                <span>{brush.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Dimensi & Setback */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-title text-xs font-semibold text-slate-900">
            Dimensi &amp; Setback
          </span>
          <span className="font-code-metric text-[11px] font-semibold text-sky-700">
            {netArea.toFixed(1)} m² efektif
          </span>
        </div>

        <input
          type="text"
          value={activeFacet.name}
          onChange={(e) => onUpdateFacetName(e.target.value)}
          placeholder="Nama bidang atap"
          className="w-full rounded-xl bg-slate-900/[0.035] px-3 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300/60 transition"
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10.5px] font-medium text-slate-500">Panjang (m)</span>
            <input
              type="number"
              step="0.1"
              value={ridge}
              onChange={(e) => setRidge(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-900/[0.035] px-3 py-1.5 font-code-metric text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300/60"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[10.5px] font-medium text-slate-500">Lebar (m)</span>
            <input
              type="number"
              step="0.1"
              value={slope}
              onChange={(e) => setSlope(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-900/[0.035] px-3 py-1.5 font-code-metric text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300/60"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-600">Setback Keliling</span>
            <span className="font-code-metric font-semibold text-slate-900">
              {setback.toFixed(2)} m
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="0.8"
            step="0.05"
            value={setback}
            onChange={(e) => setSetback(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-600">Jalur Talang</span>
            <span className="font-code-metric font-semibold text-slate-900">
              {gutter.toFixed(2)} m
            </span>
          </div>
          <input
            type="range"
            min="0.3"
            max="0.9"
            step="0.05"
            value={gutter}
            onChange={(e) => setGutter(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* 4. Kemiringan Bidang Atap */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-title text-xs font-semibold text-slate-900">Kemiringan Atap</span>
          <span className="font-code-metric text-xs font-semibold text-amber-800">{pitch}°</span>
        </div>

        <div className="space-y-1.5">
          <input
            type="range"
            min="0"
            max="45"
            step="1"
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: "5°", val: 5 },
              { label: "10°", val: 10 },
              { label: "20°", val: 20 },
              { label: "35°", val: 35 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setPitch(p.val)}
                className={`py-1 rounded-full text-[10.5px] font-medium text-center transition cursor-pointer ${
                  pitch === p.val
                    ? "bg-amber-100 text-amber-950 font-semibold"
                    : "bg-slate-900/[0.03] hover:bg-slate-900/[0.06] text-slate-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
              <span>Sudut Datang Sinar Surya</span>
            </span>
            <span className="font-code-metric text-[10.5px] font-medium text-slate-400">
              Ideal 8°–15°
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl bg-slate-50/80 p-2.5">
            <div className="relative w-28 sm:w-36 h-[80px] sm:h-[84px] shrink-0 bg-white/95 rounded-lg p-1 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 145 85">
                <defs>
                  <pattern id="cad-grid-pitch" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="0.8" />
                  </pattern>
                  <linearGradient id="solarGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="50%" stopColor="#0369a1" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="amberWedgeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                <rect width="145" height="85" fill="url(#cad-grid-pitch)" />
                <polygon
                  points="12,70 24,70 24,82 12,82"
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <line
                  x1="8"
                  y1="70"
                  x2="138"
                  y2="70"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x="135"
                  y="73"
                  fontSize="7.5"
                  fill="#94a3b8"
                  fontFamily="Inter"
                  fontWeight="600"
                >
                  0°
                </text>
                <path d={wedgePathD} fill="url(#amberWedgeGrad)" />

                <g
                  transform={`rotate(-${pitch}, 20, 70)`}
                  style={{ transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                >
                  <line
                    x1="18"
                    y1="70"
                    x2="118"
                    y2="70"
                    stroke="#475569"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                  <line x1="36" y1="70" x2="36" y2="63" stroke="#64748b" strokeWidth="2" />
                  <line x1="74" y1="70" x2="74" y2="63" stroke="#64748b" strokeWidth="2" />
                  <line x1="106" y1="70" x2="106" y2="63" stroke="#64748b" strokeWidth="2" />
                  <rect
                    x="26"
                    y="58"
                    width="88"
                    height="5.5"
                    rx="1.5"
                    fill="url(#solarGlassGrad)"
                    stroke="#0284c7"
                    strokeWidth="1"
                  />
                  <line
                    x1="70"
                    y1="58"
                    x2="70"
                    y2="34"
                    stroke="#d97706"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <polygon points="70,30 67.5,35 72.5,35" fill="#d97706" />
                </g>

                <path d={arcPathD} fill="none" stroke="#d97706" strokeWidth="2" />
                <circle cx="20" cy="70" r="3.5" fill="#d97706" stroke="#ffffff" strokeWidth="1" />

                <g transform="translate(108, 16)">
                  <circle cx="0" cy="0" r="10" fill="#f59e0b" opacity="0.15" />
                  <circle cx="0" cy="0" r="7" fill="#f59e0b" opacity="0.3" />
                  <circle cx="0" cy="0" r="4.5" fill="#f59e0b" />
                  <line
                    x1="-7"
                    y1="7"
                    x2="-26"
                    y2="28"
                    stroke="#f59e0b"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <polygon points="-29,32 -22,27 -25,24" fill="#f59e0b" />
                </g>
              </svg>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Faktor Cosinus
              </span>
              <div className="font-title text-[15px] font-bold text-slate-900 leading-tight">
                Cos {pitch}° = {pitchCosine}
              </div>
              <div
                className={`inline-flex items-center gap-1 text-[11px] font-semibold sm:whitespace-nowrap ${
                  pitch >= 8 && pitch <= 18
                    ? "text-emerald-700"
                    : pitch < 8
                      ? "text-amber-700"
                      : "text-slate-600"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>
                  {pitch >= 8 && pitch <= 18
                    ? `Optimal · ${pitchEffPct}%`
                    : pitch < 8
                      ? `Landai · ${pitchEffPct}%`
                      : `Curam · ${pitchEffPct}%`}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[10.5px] text-slate-500 leading-relaxed">
            Kemiringan 8°–15° optimal di Kota Bogor (6,6° LS) sekaligus membantu aliran hujan.
          </p>
        </div>
      </div>

      {/* 5. Orientasi & Azimuth Kompas */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-3.5 border border-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.04),0_2px_10px_rgba(253,224,71,0.08),inset_0_1px_1px_rgba(255,255,255,0.92)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-title text-xs font-semibold text-slate-900">
            Orientasi &amp; Azimuth
          </span>
          <span className="font-code-metric text-xs font-semibold text-amber-800">
            {azimuth}° {azInfo.name}
          </span>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl bg-slate-50/80 p-2.5">
          <div className="relative w-20 h-20 shrink-0 rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-1 shadow-sm flex items-center justify-center select-none overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#334155" strokeWidth="1.5" />
              <text
                x="50"
                y="20"
                fill="#f43f5e"
                fontSize="9"
                fontWeight="900"
                fontFamily="monospace"
                textAnchor="middle"
                dominantBaseline="central"
              >
                N
              </text>
              <text
                x="50"
                y="80"
                fill="#f59e0b"
                fontSize="9"
                fontWeight="900"
                fontFamily="monospace"
                textAnchor="middle"
                dominantBaseline="central"
              >
                S
              </text>
              <text
                x="80"
                y="50"
                fill="#94a3b8"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
                dominantBaseline="central"
              >
                E
              </text>
              <text
                x="20"
                y="50"
                fill="#94a3b8"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
                dominantBaseline="central"
              >
                W
              </text>
            </svg>
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `rotate(${azimuth}deg)`,
                transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <svg className="w-16 h-16" viewBox="0 0 80 80">
                <polygon points="40,11 36.5,40 40,37" fill="#f43f5e" />
                <polygon points="40,11 43.5,40 40,37" fill="#be123c" />
                <polygon points="40,69 36.5,40 40,43" fill="#fbbf24" />
                <polygon points="40,69 43.5,40 40,43" fill="#d97706" />
                <circle cx="40" cy="40" r="4" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="font-title text-base font-bold text-slate-900 leading-none">
              {azimuth}° · {azInfo.name}
            </div>
            <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{azInfo.desc}</p>
            <div className="flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[13px]">check_circle</span>
              <span>Efisiensi {azimuthEffPct}%</span>
            </div>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={azimuth}
          onChange={(e) => setAzimuth(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200/80 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNudgeAzimuth(-10)}
            className="w-7 h-7 rounded-full bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
            title="Putar -10°"
          >
            <span className="material-symbols-outlined text-[14px]">rotate_left</span>
          </button>
          <div className="grid grid-cols-4 gap-1 flex-1 font-code-metric text-[10px]">
            {[
              { label: "0° U", val: 0 },
              { label: "90° T", val: 90 },
              { label: "180° S", val: 180 },
              { label: "270° B", val: 270 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setAzimuth(p.val)}
                className={`py-1 rounded-full text-center transition cursor-pointer font-medium ${
                  azimuth === p.val
                    ? "bg-amber-100 text-amber-950 font-semibold"
                    : "bg-slate-900/[0.03] hover:bg-slate-900/[0.06] text-slate-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onNudgeAzimuth(10)}
            className="w-7 h-7 rounded-full bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
            title="Putar +10°"
          >
            <span className="material-symbols-outlined text-[14px]">rotate_right</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-700">Selaraskan grid ke azimuth</span>
          <button
            type="button"
            onClick={() => setAlignToAzimuth(!alignToAzimuth)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
              alignToAzimuth
                ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 border border-amber-200/90"
                : "bg-slate-900/[0.05] text-slate-600 hover:bg-slate-900/[0.08]"
            }`}
          >
            {alignToAzimuth ? "Aktif" : "Mati"}
          </button>
        </div>
      </div>

      {/* Primary Action */}
      <button
        type="button"
        onClick={onNextTab}
        className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 hover:from-amber-200 hover:to-amber-200 active:scale-[0.98] text-amber-950 font-title text-xs font-semibold shadow-[0_4px_16px_rgba(251,191,36,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)] border border-amber-200/90 transition flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>Lanjut ke Modul</span>
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </button>
    </div>
  );
}
