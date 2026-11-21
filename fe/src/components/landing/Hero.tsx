"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SolarMeadowScene } from "@/components/landing/SolarMeadowScene";
import { api, getToken, type GeocodeResult } from "@/lib/api";
import {
  LOCATION_PRESETS,
  resolveCoordinatesFromAddress,
  setPendingScanIntent,
} from "@/lib/profile";

type PreviewTab = "geometry" | "pvarray" | "financials";

export default function Hero() {
  const router = useRouter();
  const [address, setAddress] = useState("Jl. Pajajaran No. 42, Bogor Tengah, Kota Bogor");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("geometry");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const q = address.trim();
    if (!suggestionsOpen || q.length < 3) {
      const frame = window.requestAnimationFrame(() => {
        if (q.length < 3) setSuggestions([]);
        setSuggestionsLoading(false);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    let cancelled = false;
    const loadingFrame = window.requestAnimationFrame(() => {
      if (!cancelled) setSuggestionsLoading(true);
    });
    const timer = window.setTimeout(async () => {
      try {
        const res = await api.geocode(q);
        if (!cancelled) {
          setSuggestions(res.results.slice(0, 5));
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(loadingFrame);
      window.clearTimeout(timer);
    };
  }, [address, suggestionsOpen]);

  const navigateWithLocation = (label: string, lat: string, lng: string) => {
    setPendingScanIntent({ address: label, lat, lng });
    const target = `/studio?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&name=${encodeURIComponent(label)}`;
    if (getToken()) {
      router.push(target);
      return;
    }
    router.push("/register?redirect=/studio");
  };

  const handleStartSimulation = async (e?: FormEvent) => {
    e?.preventDefault();
    if (isResolving) return;

    const cleanAddress = address.trim() || LOCATION_PRESETS[0]?.address || "Kota Bogor";
    if (selectedCoords) {
      navigateWithLocation(
        cleanAddress,
        selectedCoords.lat.toFixed(6),
        selectedCoords.lng.toFixed(6)
      );
      return;
    }

    let coords = resolveCoordinatesFromAddress(cleanAddress);
    setIsResolving(true);
    try {
      const res = await Promise.race([
        api.geocode(cleanAddress),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);
      const best = res?.results?.[0];
      if (best && Number.isFinite(best.lat) && Number.isFinite(best.lng)) {
        coords = {
          lat: best.lat.toFixed(6),
          lng: best.lng.toFixed(6),
          zoom: "19",
        };
      }
    } catch {
      // Fallback safely to regional preset coordinates
    } finally {
      setIsResolving(false);
    }

    navigateWithLocation(cleanAddress, coords.lat, coords.lng);
  };

  return (
    <section className="relative overflow-hidden pt-26 pb-16 sm:pt-32 sm:pb-24">
      {/* Lush Sunlit Meadow Horizon Positioned Seamlessly Under Navbar & Behind Studio Frame */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[690px] sm:h-[820px] overflow-hidden">
        <SolarMeadowScene variant="hero" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-5 sm:space-y-6">
        {/* Subtle Apple Context Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/88 backdrop-blur-xl saturate-150 border border-white/95 shadow-[0_4px_16px_rgba(245,158,11,0.12)] text-xs font-medium text-slate-700">
          <span className="material-symbols-outlined text-[15px] text-amber-500">wb_sunny</span>
          <span>Simulasi PLTS Atap Berbasis Satelit</span>
        </div>

        {/* Primary Headline: Natural, Resonant Apple Typography */}
        <h1 className="text-4xl sm:text-6xl font-semibold text-slate-900 tracking-tight leading-[1.09] max-w-3xl mx-auto font-title">
          Hitung energi surya <br />
          <span className="bg-gradient-to-r from-amber-700 via-amber-500 to-orange-500 bg-clip-text text-transparent">
            dari atap Anda.
          </span>
        </h1>

        {/* Concise Subheadline */}
        <p className="text-sm sm:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
          Ketahui jumlah panel, biaya instalasi, dan perkiraan hemat listrik rumah Anda dalam hitungan detik.
        </p>

        {/* Frosted Glass Search & Action Bar with Dynamic Live Autocomplete */}
        <div className="max-w-xl mx-auto pt-2">
          <div ref={searchContainerRef} className="relative">
            <form
              onSubmit={handleStartSimulation}
              className="p-2 rounded-[26px] sm:rounded-full bg-white/88 backdrop-blur-2xl saturate-150 border border-white/95 shadow-[0_14px_38px_rgba(245,158,11,0.14),0_4px_12px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.92)] flex flex-col sm:flex-row sm:items-center gap-2 transition-all focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-200/40"
            >
              <div className="w-full sm:flex-1 flex items-center pl-2.5 pr-1 sm:pl-4 sm:pr-0 py-1.5 sm:py-0 gap-2 sm:gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0">
                  location_on
                </span>
                <input
                  type="text"
                  value={address}
                  onFocus={() => setSuggestionsOpen(true)}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setSelectedCoords(null);
                    setSuggestionsOpen(true);
                  }}
                  placeholder="Cari alamat bangunan atau nama jalan..."
                  className="w-full text-sm text-slate-900 placeholder-slate-400 bg-transparent border-none outline-none font-medium truncate"
                />
                {address.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddress("");
                      setSelectedCoords(null);
                      setSuggestions([]);
                      setSuggestionsOpen(true);
                    }}
                    aria-label="Hapus alamat"
                    className="w-6 h-6 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isResolving}
                className="w-full sm:w-auto h-10 sm:h-11 px-5 sm:px-6 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 font-title text-xs sm:text-sm font-semibold border border-amber-300/80 shadow-[0_4px_14px_rgba(245,158,11,0.24),inset_0_1px_1px_rgba(255,255,255,0.88)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-75"
              >
                <span>{isResolving ? "Mencari lokasi..." : "Mulai Simulasi"}</span>
                <span className={`material-symbols-outlined text-[16px] ${isResolving ? "animate-spin" : ""}`}>
                  {isResolving ? "sync" : "arrow_forward"}
                </span>
              </button>
            </form>

            {/* Dynamic Address Autocomplete Dropdown */}
            {suggestionsOpen && (suggestionsLoading || suggestions.length > 0) && (
              <div className="absolute left-0 right-0 top-full mt-2 z-30 max-h-72 overflow-y-auto rounded-[24px] bg-white/94 backdrop-blur-2xl saturate-150 border border-white/95 shadow-[0_22px_54px_rgba(15,23,42,0.14),0_0_24px_rgba(245,158,11,0.10)] p-2 text-left animate-fadeIn">
                {suggestionsLoading && suggestions.length === 0 ? (
                  <div className="px-3.5 py-2.5 text-xs text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-amber-600 animate-spin">sync</span>
                    <span>Mencari alamat &amp; nama jalan...</span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-900/[0.04]">
                    {suggestions.map((item, idx) => (
                      <button
                        key={`${item.lat}-${item.lng}-${idx}`}
                        type="button"
                        onClick={() => {
                          setAddress(item.label);
                          setSelectedCoords({ lat: item.lat, lng: item.lng });
                          setSuggestionsOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-amber-50/80 transition cursor-pointer group"
                      >
                        <span className="w-8 h-8 rounded-full bg-amber-100/90 text-amber-700 group-hover:bg-amber-200 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs sm:text-sm font-medium text-slate-900 truncate">
                            {item.label}
                          </span>
                          <span className="block text-[10.5px] text-slate-400 font-code-metric">
                            {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                          </span>
                        </span>
                        <span className="text-[11px] font-semibold text-amber-800 shrink-0">
                          Pilih
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Auth Hint */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
            <span>Gratis tanpa survei lapangan</span>
            <span className="text-slate-400">·</span>
            <Link href="/login?redirect=/studio" className="font-semibold text-amber-900 hover:underline">
              Sudah punya akun? Masuk
            </Link>
          </div>

          {/* Location Chips */}
          <div className="mt-3.5 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap text-xs">
            <span className="text-slate-500 text-[11px] font-medium mr-1">Contoh lokasi:</span>
            {[
              { label: "Bogor Tengah", addr: "Jl. Pajajaran No. 42, Bogor Tengah, Kota Bogor" },
              { label: "Bogor Selatan", addr: "Jl. Pahlawan, Bogor Selatan, Kota Bogor" },
              { label: "Bogor Timur", addr: "Jl. Pajajaran Indah, Bogor Timur, Kota Bogor" },
              { label: "Tanah Sareal", addr: "Jl. Sholeh Iskandar, Tanah Sareal, Kota Bogor" },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setAddress(chip.addr);
                  setSelectedCoords(null);
                  setSuggestionsOpen(false);
                }}
                className="px-3 py-1 rounded-full bg-white/86 hover:bg-white backdrop-blur-md border border-white/95 text-slate-700 hover:text-amber-950 text-[11px] sm:text-xs font-medium transition shadow-2xs cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* SHOWCASE PREVIEW: Authentic Miniature of SunSight Studio */}
        <div className="pt-8 sm:pt-12 max-w-5xl mx-auto">
          <div className="relative rounded-[28px] sm:rounded-[34px] bg-white/82 backdrop-blur-2xl saturate-150 border border-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.10),0_8px_32px_rgba(245,158,11,0.14),inset_0_1px_1px_rgba(255,255,255,0.95)] p-2 sm:p-3">
            {/* Authentic Studio Shell (Map Viewport Left + Frosted Inspector Panel Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 rounded-[22px] sm:rounded-[26px] overflow-hidden border border-slate-200/70 bg-slate-100 min-h-[380px] sm:min-h-[430px] text-left">
              {/* LEFT: Satellite Map + Floating Studio Top Bar + CAD Polygon + Dock */}
              <div className="lg:col-span-7 relative min-h-[300px] sm:min-h-[430px] overflow-hidden bg-slate-900">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-90"
                  style={{ backgroundImage: "url('/satellite_map.jpg')" }}
                />

                {/* Subtle CAD Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:24px_24px]" />

                {/* Floating Studio Top Bar Pills */}
                <div className="relative z-10 flex items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-8 w-8 rounded-full bg-white/88 backdrop-blur-xl border border-white/90 shadow-xs flex items-center justify-center text-slate-700 shrink-0">
                      <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                    </span>
                    <div className="h-8 px-3 rounded-full bg-white/88 backdrop-blur-xl border border-white/90 shadow-xs flex items-center gap-1.5 text-[11px] font-medium text-slate-700 truncate">
                      <span className="material-symbols-outlined text-[14px] text-amber-600 shrink-0">search</span>
                      <span className="truncate">Jl. Pajajaran, Bogor Tengah</span>
                    </div>
                  </div>

                  <span className="h-8 px-3 rounded-full bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 border border-amber-300/80 text-amber-950 text-[11px] font-semibold flex items-center gap-1 shadow-xs shrink-0">
                    <span className="material-symbols-outlined text-[14px]">save</span>
                    <span className="hidden sm:inline">Simpan Desain</span>
                  </span>
                </div>

                {/* CAD Roof Polygon with Corner Vertex Handles, Setback & Fitted 550W Modules */}
                <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                  <div className="relative">
                    {/* Vertex Label Pill */}
                    <div className="mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/25 text-white text-[10px] font-semibold font-code-metric shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>Poligon Manual #1 · 84 m²</span>
                    </div>

                    {/* Main CAD Polygon Frame */}
                    <div className="relative w-52 sm:w-72 h-32 sm:h-44 rounded-lg border-2 border-amber-400 bg-amber-400/12 p-2.5 shadow-[0_0_32px_rgba(251,191,36,0.3)]">
                      {/* 4 Corner CAD Vertex Dots (Matches Real Pen / Edit Mode) */}
                      <span className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border-2 border-amber-500 shadow-xs" />
                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border-2 border-amber-500 shadow-xs" />
                      <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border-2 border-amber-500 shadow-xs" />
                      <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border-2 border-amber-500 shadow-xs" />

                      {/* Inner Setback Perimeter + Fitted 550W PV Module Grid */}
                      <div className="w-full h-full rounded border border-dashed border-amber-300/80 p-1.5 grid grid-cols-6 gap-1">
                        {Array.from({ length: 18 }).map((_, i) => (
                          <div
                            key={i}
                            className="rounded-[2px] bg-gradient-to-br from-sky-900 via-slate-900 to-sky-950 border border-sky-300/70 shadow-2xs relative overflow-hidden"
                          >
                            <div className="absolute inset-x-0 top-1/2 h-[0.5px] bg-sky-200/25" />
                            <div className="absolute inset-y-0 left-1/2 w-[0.5px] bg-sky-200/25" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Studio Controls: Scale Pill (left) + Floating CAD Dock (center) */}
                <div className="absolute inset-x-2.5 sm:inset-x-3 bottom-2.5 sm:bottom-3 z-10 flex items-center justify-between gap-1.5 sm:gap-2">
                  {/* Scale Indicator Matching Real Studio */}
                  <div className="h-7 px-2 sm:px-2.5 rounded-full bg-white/88 backdrop-blur-xl border border-white/95 shadow-xs flex items-center gap-1.5 sm:gap-2 text-[10px] font-medium text-slate-700 font-code-metric shrink-0">
                    <span className="border-b-2 border-x-2 border-slate-600 px-1.5 leading-none pb-0.5 text-[9px]">
                      20 m
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="hidden sm:inline">Optimal</span>
                    </span>
                  </div>

                  {/* Floating CAD Toolbar Dock */}
                  <div className="h-8 sm:h-9 px-1.5 sm:px-2 rounded-full bg-white/90 backdrop-blur-2xl border border-white/95 shadow-md flex items-center gap-0.5 sm:gap-1">
                    {[
                      { icon: "near_me", active: false, label: "Pilih" },
                      { icon: "polyline", active: true, label: "Edit Atap" },
                      { icon: "draw", active: false, label: "Pen" },
                      { icon: "straighten", active: false, label: "Penggaris" },
                      { icon: "block", active: false, label: "Hambatan" },
                    ].map((tool) => (
                      <span
                        key={tool.label}
                        title={tool.label}
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${
                          tool.active
                            ? "bg-amber-200/90 text-amber-950 shadow-2xs"
                            : "text-slate-600"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px] sm:text-[15px]">{tool.icon}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT: Floating Apple Frosted Glass Studio Inspector Panel */}
              <div className="lg:col-span-5 bg-white/92 backdrop-blur-2xl border-t lg:border-t-0 lg:border-l border-slate-200/70 p-3.5 sm:p-4 flex flex-col justify-between gap-3">
                <div className="space-y-3">
                  {/* 4-Cell Minimal Metrics Ribbon (Exact Match to Studio Header) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(even)]:border-l sm:[&>*:nth-child(n+3)]:border-t-0 sm:[&>*:nth-child(even)]:border-l-0 sm:divide-x divide-slate-200/70 [&>*]:border-slate-200/70 bg-slate-50/90 rounded-2xl border border-slate-200/70 overflow-hidden py-1 sm:py-2 px-0.5">
                    <div className="text-center py-1.5 sm:py-0 px-1">
                      <span className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Kapasitas
                      </span>
                      <span className="text-xs sm:text-[13px] font-bold text-slate-900 font-code-metric">
                        9.9 <span className="text-[9px] text-amber-700 font-semibold">kWp</span>
                      </span>
                    </div>
                    <div className="text-center py-1.5 sm:py-0 px-1">
                      <span className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Produksi
                      </span>
                      <span className="text-xs sm:text-[13px] font-bold text-slate-900 font-code-metric">
                        14.2 <span className="text-[9px] text-slate-500 font-semibold">MWh</span>
                      </span>
                    </div>
                    <div className="text-center py-1.5 sm:py-0 px-1">
                      <span className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Hemat/Bln
                      </span>
                      <span className="text-xs sm:text-[13px] font-bold text-emerald-700 font-code-metric">
                        2.04M
                      </span>
                    </div>
                    <div className="text-center py-1.5 sm:py-0 px-1">
                      <span className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Payback
                      </span>
                      <span className="text-xs sm:text-[13px] font-bold text-amber-800 font-code-metric">
                        2.4 <span className="text-[9px] text-slate-500 font-semibold">Thn</span>
                      </span>
                    </div>
                  </div>

                  {/* Interactive Apple Segmented Control Tabs */}
                  <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-900/[0.045] gap-1">
                    {(
                      [
                        { id: "geometry", label: "Geometri" },
                        { id: "pvarray", label: "Modul" },
                        { id: "financials", label: "Finansial" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPreviewTab(tab.id)}
                        className={`py-1.5 px-2 rounded-xl text-center font-title text-[11px] transition-all cursor-pointer ${
                          previewTab === tab.id
                            ? "bg-gradient-to-r from-amber-100/95 via-yellow-200/95 to-amber-100/95 text-amber-950 font-semibold border border-amber-200/90 shadow-[0_2px_8px_rgba(251,191,36,0.20)]"
                            : "text-slate-600 hover:text-slate-900 font-medium"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content Matching Studio Panel Cards */}
                  {previewTab === "geometry" && (
                    <div className="rounded-2xl bg-slate-50/85 border border-slate-200/70 p-3 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-title text-xs font-semibold text-slate-900">
                          Bidang Atap <span className="font-code-metric text-slate-400">(1/1)</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[10px] font-semibold">
                          Optimal 188°
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block">Luas Efektif</span>
                          <span className="font-semibold text-slate-900 font-code-metric">74.2 m²</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block">Kemiringan</span>
                          <span className="font-semibold text-slate-900 font-code-metric">22° Pelana</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block">Bentang Atap</span>
                          <span className="font-semibold text-slate-900 font-code-metric">12.0 × 7.0 m</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block">Radiasi Lokal</span>
                          <span className="font-semibold text-amber-800 font-code-metric">4.83 kWh/m²</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {previewTab === "pvarray" && (
                    <div className="rounded-2xl bg-slate-50/85 border border-slate-200/70 p-3 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-title text-xs font-semibold text-slate-900">
                          Konfigurasi Modul
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100/90 text-amber-900 text-[10px] font-semibold font-code-metric">
                          18 Slot Terisi
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 space-y-1.5 text-[11px]">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Tipe Modul</span>
                          <span className="font-semibold text-slate-900 text-right">550 W Mono PERC</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Orientasi</span>
                          <span className="font-semibold text-slate-900 text-right">Potret · Setback 0,3 m</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Inverter</span>
                          <span className="font-semibold text-slate-900 text-right">On-Grid String (PR 80%)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {previewTab === "financials" && (
                    <div className="rounded-2xl bg-slate-50/85 border border-slate-200/70 p-3 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-title text-xs font-semibold text-slate-900">
                          Ringkasan Finansial
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[10px] font-semibold shrink-0">
                          BEP 2,4 Tahun
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 space-y-1.5 text-[11px]">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Estimasi Investasi</span>
                          <span className="font-semibold text-slate-900 font-code-metric text-right">Rp 58,9 jt</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Hemat per Tahun</span>
                          <span className="font-semibold text-emerald-700 font-code-metric text-right">Rp 24,5 jt</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Reduksi CO₂</span>
                          <span className="font-semibold text-slate-900 font-code-metric text-right">11,4 ton/thn</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Studio CTA Strip */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-500 truncate">
                    Klik tab di atas atau coba langsung di Studio
                  </span>
                  <Link
                    href="/register?redirect=/studio"
                    className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>Buka Studio</span>
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
