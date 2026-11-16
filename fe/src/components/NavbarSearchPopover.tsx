"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, getToken, type GeocodeResult } from "@/lib/api";
import { LOCATION_PRESETS, setPendingScanIntent } from "@/lib/profile";

export interface NavbarSearchProjectItem {
  id: string;
  name: string;
  address: string;
  district?: string;
  capacityKwp: number;
}

interface NavbarSearchPopoverProps {
  /** Saved projects list (when omitted, lazily fetched from /analyses when opened). */
  projects?: NavbarSearchProjectItem[];
  selectedProjectId?: string;
  activeLocationName?: string;
  onSelectProject?: (proj: NavbarSearchProjectItem) => void;
  onSelectLocation?: (label: string, lat: number, lng: number) => void;
  onUseGps?: () => void;
  isGpsLoading?: boolean;
  onNotify?: (message: string) => void;
}

export function NavbarSearchPopover({
  projects,
  selectedProjectId,
  activeLocationName = "Kota Bogor, Jawa Barat",
  onSelectProject,
  onSelectLocation,
  onUseGps,
  isGpsLoading: externalGpsLoading = false,
  onNotify,
}: NavbarSearchPopoverProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lazyProjects, setLazyProjects] = useState<NavbarSearchProjectItem[] | null>(null);
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [internalGpsLoading, setInternalGpsLoading] = useState(false);

  const isGpsLoading = externalGpsLoading || internalGpsLoading;
  const projectList = useMemo(
    () => projects ?? lazyProjects ?? [],
    [projects, lazyProjects]
  );

  // Close cleanly with Escape key
  useEffect(() => {
    if (!searchOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  // Lazily fetch saved projects when used outside Beranda (e.g. Profile page)
  useEffect(() => {
    if (!searchOpen || projects !== undefined || lazyProjects !== null || !getToken()) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await api.listSimulations(1, 50);
        if (cancelled) return;
        const mapped: NavbarSearchProjectItem[] = (res.data ?? []).map((item) => {
          const parts = (item.address ?? "")
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          return {
            id: String(item.id),
            name: item.address ?? `Simulasi #${item.id}`,
            address: item.address ?? "-",
            district: parts.find((p) => /bogor/i.test(p)) ?? parts[1] ?? `${item.roof_count} bidang atap`,
            capacityKwp: item.capacity_kwp,
          };
        });
        setLazyProjects(mapped);
      } catch {
        if (!cancelled) setLazyProjects([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchOpen, projects, lazyProjects]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projectList;
    return projectList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.district ?? "").toLowerCase().includes(q)
    );
  }, [projectList, searchQuery]);

  const matchingAddressPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      const bogorFirst = LOCATION_PRESETS.filter((p) =>
        p.address.toLowerCase().includes("bogor")
      );
      return bogorFirst.length > 0 ? bogorFirst : LOCATION_PRESETS.slice(0, 3);
    }
    return LOCATION_PRESETS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Live address/street geocoding while popover is open
  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    if (q.length < 3) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setGeocodeLoading(true);
      setGeocodeError(null);
      try {
        const res = await api.geocode(q);
        if (cancelled) return;
        setGeocodeResults(res.results.slice(0, 6));
      } catch {
        if (cancelled) return;
        setGeocodeResults([]);
        setGeocodeError("Gagal terhubung ke layanan pencarian alamat.");
      } finally {
        if (!cancelled) setGeocodeLoading(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchOpen, searchQuery]);

  const activeQueryTrimmed = searchQuery.trim();
  const visibleGeocodeResults = useMemo(
    () => (activeQueryTrimmed.length >= 3 ? geocodeResults : []),
    [activeQueryTrimmed.length, geocodeResults]
  );
  const visibleGeocodeError = activeQueryTrimmed.length >= 3 ? geocodeError : null;
  const visibleGeocodeLoading = activeQueryTrimmed.length >= 3 && geocodeLoading;

  const handleSelectAddressLocation = useCallback(
    (label: string, lat: number, lng: number) => {
      setSearchOpen(false);
      if (onSelectLocation) {
        onSelectLocation(label, lat, lng);
        return;
      }
      const shortName = label.split(",")[0]?.trim() || label;
      setPendingScanIntent({
        address: label,
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
      });
      onNotify?.(`Membuka peta Studio di ${shortName}...`);
      router.push(
        `/studio?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&name=${encodeURIComponent(label)}`
      );
    },
    [onNotify, onSelectLocation, router]
  );

  const handleSelectSavedProject = useCallback(
    (proj: NavbarSearchProjectItem) => {
      setSearchOpen(false);
      if (onSelectProject) {
        onSelectProject(proj);
        return;
      }
      router.push(`/?project=${encodeURIComponent(proj.id)}`);
    },
    [onSelectProject, router]
  );

  const handleGpsClick = useCallback(() => {
    if (onUseGps) {
      setSearchOpen(false);
      onUseGps();
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onNotify?.("Browser Anda tidak mendukung fitur GPS.");
      return;
    }
    setInternalGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setInternalGpsLoading(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSearchOpen(false);
        router.push(
          `/studio?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&name=${encodeURIComponent("Lokasi GPS Saat Ini")}`
        );
      },
      () => {
        setInternalGpsLoading(false);
        onNotify?.("Izin GPS ditolak atau gagal membaca posisi. Pastikan akses lokasi diizinkan.");
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }, [onNotify, onUseGps, router]);

  const handleSearchSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;

      if (visibleGeocodeResults.length > 0) {
        const top = visibleGeocodeResults[0];
        handleSelectAddressLocation(top.label, top.lat, top.lng);
        return;
      }

      if (matchingAddressPresets.length > 0 && filteredProjects.length === 0) {
        const p = matchingAddressPresets[0];
        handleSelectAddressLocation(p.address, Number(p.lat), Number(p.lng));
        return;
      }

      setGeocodeLoading(true);
      setGeocodeError(null);
      try {
        const res = await api.geocode(q);
        setGeocodeResults(res.results.slice(0, 6));
        if (res.results.length > 0) {
          const top = res.results[0];
          handleSelectAddressLocation(top.label, top.lat, top.lng);
          return;
        }
        if (filteredProjects.length > 0) {
          handleSelectSavedProject(filteredProjects[0]);
          return;
        }
        setGeocodeError("Alamat atau nama jalan tidak ditemukan. Sertakan nama jalan/kota.");
      } catch {
        if (filteredProjects.length > 0) {
          handleSelectSavedProject(filteredProjects[0]);
          return;
        }
        setGeocodeError("Layanan pencarian alamat sedang tidak tersedia.");
      } finally {
        setGeocodeLoading(false);
      }
    },
    [
      filteredProjects,
      visibleGeocodeResults,
      handleSelectAddressLocation,
      handleSelectSavedProject,
      matchingAddressPresets,
      searchQuery,
    ]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setSearchOpen((v) => !v)}
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border ${
          searchOpen
            ? "bg-gradient-to-br from-amber-100/95 via-amber-200/85 to-yellow-100/95 backdrop-blur-xl saturate-150 text-amber-950 border-amber-300/85 shadow-[0_4px_18px_rgba(245,158,11,0.24),0_0_22px_rgba(251,191,36,0.22),inset_0_1px_1px_rgba(255,255,255,0.9)]"
            : "bg-white/90 hover:bg-white backdrop-blur-xl saturate-150 text-slate-700 hover:text-amber-900 shadow-xs border-white/85 hover:border-amber-200/80"
        }`}
        title={searchOpen ? "Tutup Pencarian" : "Cari Proyek atau Alamat"}
        aria-label="Cari proyek, alamat, atau nama jalan"
        aria-expanded={searchOpen}
      >
        <span className="material-symbols-outlined text-[20px]">
          {searchOpen ? "close" : "search"}
        </span>
      </button>

      {searchOpen && (
        <>
          <button
            type="button"
            aria-label="Tutup pencarian"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setSearchOpen(false)}
          />
          <div className="absolute left-0 top-14 z-40 w-[min(430px,calc(100vw-1.5rem))] bg-white/92 backdrop-blur-2xl saturate-150 rounded-[28px] border border-white/90 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.24),0_0_28px_rgba(251,191,36,0.12),inset_0_1px_1px_rgba(255,255,255,0.95)] p-3 animate-fadeIn">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-1.5 h-11 pl-3.5 pr-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/70 focus-within:bg-white focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-200/40 transition"
            >
              <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">
                search
              </span>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari proyek, alamat, atau nama jalan..."
                className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none border-0 border-none focus:ring-0 p-0"
              />
              {searchQuery.trim().length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    title="Bersihkan kata kunci"
                    className="w-7 h-7 rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                  <button
                    type="submit"
                    disabled={visibleGeocodeLoading}
                    title="Cari alamat di Studio"
                    className="h-8 px-2.5 rounded-xl bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 hover:brightness-105 text-amber-950 text-[11px] font-semibold border border-amber-300/80 flex items-center justify-center transition cursor-pointer disabled:opacity-60 shrink-0"
                  >
                    {visibleGeocodeLoading ? "..." : "Cari"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleGpsClick}
                disabled={isGpsLoading}
                title="Gunakan lokasi GPS"
                className="w-8 h-8 rounded-xl hover:bg-white text-slate-600 hover:text-amber-600 flex items-center justify-center transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    isGpsLoading ? "animate-spin" : ""
                  }`}
                >
                  {isGpsLoading ? "sync" : "my_location"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  router.push("/studio");
                }}
                title="Buka & Pilih di Peta Studio CAD"
                className="w-8 h-8 rounded-xl hover:bg-white text-slate-600 hover:text-amber-600 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">map</span>
              </button>
            </form>

            <div className="flex items-center justify-between gap-2 px-2 pt-2.5 pb-1 text-[11px] text-slate-400">
              <p className="flex items-center gap-1 min-w-0 truncate">
                <span className="material-symbols-outlined text-[13px] text-amber-500 shrink-0">
                  location_on
                </span>
                <span className="truncate">{activeLocationName}</span>
              </p>
              <span className="shrink-0 text-[10px] font-medium text-slate-400">
                Enter untuk cari jalan
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pt-1 pr-0.5">
              {/* Saved Projects */}
              {filteredProjects.length > 0 && (
                <div>
                  <p className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                    Proyek Tersimpan ({filteredProjects.length})
                  </p>
                  <div className="space-y-1">
                    {filteredProjects.map((proj) => {
                      const isCurrent = proj.id === selectedProjectId;
                      return (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => handleSelectSavedProject(proj)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition cursor-pointer ${
                            isCurrent
                              ? "bg-gradient-to-r from-amber-100/90 via-amber-200/80 to-amber-100/90 text-amber-950 font-semibold border border-amber-300/80 shadow-2xs"
                              : "hover:bg-slate-100/70 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isCurrent
                                ? "bg-amber-300/80 text-amber-950"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">roofing</span>
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold truncate text-slate-900">
                              {proj.name}
                            </span>
                            <span className="block text-xs text-slate-400 truncate">
                              {proj.address}
                            </span>
                          </span>
                          <span className="text-xs font-semibold text-slate-700 shrink-0">
                            {proj.capacityKwp} kWp
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Addresses & Streets */}
              <div>
                <div className="flex items-center justify-between px-2 pb-1">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                    {searchQuery.trim().length > 0
                      ? "Alamat & Nama Jalan"
                      : "Lokasi Cepat ke Studio"}
                  </p>
                  {visibleGeocodeLoading && (
                    <span className="text-[10.5px] font-medium text-amber-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] animate-spin">
                        sync
                      </span>
                      Mencari...
                    </span>
                  )}
                </div>

                {visibleGeocodeResults.length > 0 && (
                  <div className="space-y-1">
                    {visibleGeocodeResults.map((res, idx) => {
                      const parts = res.label
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const title = parts[0] || res.label;
                      const subtitle =
                        parts.slice(1).join(", ") ||
                        `${res.lat.toFixed(5)}, ${res.lng.toFixed(5)}`;
                      return (
                        <button
                          key={`${res.lat}-${res.lng}-${idx}`}
                          type="button"
                          onClick={() => handleSelectAddressLocation(res.label, res.lat, res.lng)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-amber-50/80 border border-transparent hover:border-amber-200/70 transition cursor-pointer group"
                        >
                          <span className="w-9 h-9 rounded-full bg-amber-100/90 text-amber-700 group-hover:bg-amber-200/80 group-hover:text-amber-900 flex items-center justify-center shrink-0 transition">
                            <span className="material-symbols-outlined text-[18px]">
                              location_on
                            </span>
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold truncate text-slate-900">
                              {title}
                            </span>
                            <span className="block text-xs text-slate-400 truncate">
                              {subtitle}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-1 rounded-full shrink-0">
                            Studio
                            <span className="material-symbols-outlined text-[13px]">
                              arrow_forward
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {matchingAddressPresets.length > 0 && (
                  <div className={visibleGeocodeResults.length > 0 ? "mt-1 space-y-1" : "space-y-1"}>
                    {matchingAddressPresets
                      .filter(
                        (preset) =>
                          !visibleGeocodeResults.some(
                            (r) => r.label.toLowerCase() === preset.address.toLowerCase()
                          )
                      )
                      .map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            handleSelectAddressLocation(
                              preset.address,
                              Number(preset.lat),
                              Number(preset.lng)
                            )
                          }
                          className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-slate-100/80 transition cursor-pointer group"
                        >
                          <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 group-hover:bg-amber-100 group-hover:text-amber-800 flex items-center justify-center shrink-0 transition">
                            <span className="material-symbols-outlined text-[18px]">
                              signpost
                            </span>
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold truncate text-slate-900">
                              {preset.label}
                            </span>
                            <span className="block text-xs text-slate-400 truncate">
                              {preset.address}
                            </span>
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 group-hover:text-amber-800 shrink-0">
                            Buka →
                          </span>
                        </button>
                      ))}
                  </div>
                )}

                {activeQueryTrimmed.length > 0 &&
                  activeQueryTrimmed.length < 3 &&
                  visibleGeocodeResults.length === 0 && (
                    <p className="px-2.5 py-2 text-xs text-slate-400">
                      Ketik minimal 3 huruf (mis.{" "}
                      <span className="text-slate-600 font-medium">Jl. Pajajaran, Bogor</span>)
                      untuk mencari alamat otomatis.
                    </p>
                  )}

                {visibleGeocodeError && (
                  <p className="px-2.5 py-2 text-xs text-amber-800 bg-amber-50/90 border border-amber-200/80 rounded-xl mt-1">
                    {visibleGeocodeError}
                  </p>
                )}

                {filteredProjects.length === 0 &&
                  visibleGeocodeResults.length === 0 &&
                  matchingAddressPresets.length === 0 &&
                  activeQueryTrimmed.length >= 3 &&
                  !visibleGeocodeLoading &&
                  !visibleGeocodeError && (
                    <div className="px-3 py-4 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        Alamat{" "}
                        <span className="font-semibold text-slate-700">
                          &ldquo;{searchQuery.trim()}&rdquo;
                        </span>{" "}
                        belum ditemukan.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          router.push("/studio");
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 hover:bg-amber-200/80 text-amber-950 text-xs font-semibold transition cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">map</span>
                        <span>Pilih Titik di Peta Studio</span>
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
