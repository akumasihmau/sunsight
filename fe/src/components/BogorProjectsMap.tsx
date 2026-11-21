"use client";

import { useEffect, useRef, useState } from "react";

export interface MapProjectItem {
  id: string;
  name: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  capacityKwp: number;
  annualProdMwh: number;
}

interface BogorProjectsMapProps {
  projects: MapProjectItem[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onOpenStudio?: (id: string) => void;
  roofScore?: number;
  irradiance?: number;
}

export function BogorProjectsMap({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenStudio,
  roofScore = 94,
  irradiance = 4.85,
}: BogorProjectsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({});
  const markerStateRef = useRef<Record<string, string>>({});

  const [mapReady, setMapReady] = useState(false);
  const [isPotentialOpen, setIsPotentialOpen] = useState(false);
  const onSelectProjectRef = useRef(onSelectProject);
  const lastCenteredProjectKeyRef = useRef<string>("");
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onSelectProjectRef.current = onSelectProject;
  }, [onSelectProject]);

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);

  function openPotentialOnHover() {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    setIsPotentialOpen(true);
  }

  function closePotentialOnLeave() {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = setTimeout(() => {
      setIsPotentialOpen(false);
    }, 180);
  }

  // Helper to construct clean dot markers with distinct styling for selected vs unselected projects
  function createMarkerHtml(proj: MapProjectItem, active: boolean): string {
    if (active) {
      // Selected project: radiant glowing amber beacon dot (never obscures roof silhouette)
      return `
        <div class="sunsight-map-dot-wrapper" title="${proj.name}" style="
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transform: translate(-50%, -50%);
          user-select: none;
        ">
          <div class="map-glowing-dot" style="
            width: 15px;
            height: 15px;
            border-radius: 9999px;
            background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 65%, #d97706 100%);
            border: 2.5px solid #ffffff;
            box-shadow: 0 0 0 5px rgba(251, 191, 36, 0.28), 0 4px 12px rgba(217, 119, 6, 0.45);
          "></div>
        </div>
      `;
    }

    // Unselected project: quiet, subtle sky-slate dot clearly distinct from the selected beacon
    return `
      <div class="sunsight-map-dot-wrapper" title="${proj.name}" style="
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transform: translate(-50%, -50%);
        user-select: none;
      ">
        <div style="
          width: 9px;
          height: 9px;
          border-radius: 9999px;
          background: rgba(56, 189, 248, 0.88);
          border: 1.5px solid rgba(255, 255, 255, 0.92);
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
          transition: transform 0.18s ease;
        "></div>
      </div>
    `;
  }

  // Initialize Leaflet map from local bundled package (zero external CDN wait)
  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const L = ((window as any).L ?? (await import("leaflet")).default) as any;
        if (!L || !mapContainerRef.current || mapInstanceRef.current || isCancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).L = L;
        leafletRef.current = L;

        const initialProject =
          projects.find((p) => p.id === selectedProjectId) || projects[0];
        const initialCenter: [number, number] = initialProject
          ? [initialProject.lat, initialProject.lng]
          : [-6.611, 106.815];

        // Center directly on active project at roof-level zoom 18 (appropriate context without being too far)
        const map = L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 18,
          minZoom: 11,
          maxZoom: 19,
          preferCanvas: true,
          zoomControl: false,
          attributionControl: false,
        });

        // Restrict to Kota Bogor & surrounds
        const bogorBounds = L.latLngBounds(
          L.latLng(-6.67, 106.72),
          L.latLng(-6.52, 106.87)
        );
        map.setMaxBounds(bogorBounds);

        // Single fast Esri Satellite Layer (skip slow duplicate label overlay on mini-map)
        const satellite = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            maxNativeZoom: 19,
            maxZoom: 19,
            updateWhenIdle: true,
            updateWhenZooming: false,
            keepBuffer: 2,
          }
        );

        satellite.addTo(map);

        mapInstanceRef.current = map;
        markersRef.current = {};
        markerStateRef.current = {};
        setMapReady(true);

        // Invalidate size once DOM stabilizes
        requestAnimationFrame(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
      } catch (err) {
        console.warn("Leaflet init error:", err);
      }
    }

    void initMap();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize({ animate: false });
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      isCancelled = true;
      resizeObserver?.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers dynamically whenever project list or selection changes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = leafletRef.current ?? (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map || !mapReady) return;

    const nextIds = new Set(projects.map((p) => p.id));

    // Remove markers for deleted or unloaded projects
    Object.keys(markersRef.current).forEach((id) => {
      if (!nextIds.has(id)) {
        markersRef.current[id]?.remove();
        delete markersRef.current[id];
        delete markerStateRef.current[id];
      }
    });

    // Add missing markers or update only when marker visuals actually change
    projects.forEach((proj) => {
      const isSelected = proj.id === selectedProjectId;
      const stateKey = `${proj.lat.toFixed(6)}|${proj.lng.toFixed(6)}|${proj.name}|${isSelected}`;
      const existing = markersRef.current[proj.id];

      if (!existing) {
        const icon = L.divIcon({
          html: createMarkerHtml(proj, isSelected),
          className: "sunsight-leaflet-marker",
          iconSize: [0, 0],
        });
        const marker = L.marker([proj.lat, proj.lng], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        });
        marker.on("click", () => {
          onSelectProjectRef.current(proj.id);
        });
        marker.addTo(map);
        markersRef.current[proj.id] = marker;
        markerStateRef.current[proj.id] = stateKey;
      } else if (markerStateRef.current[proj.id] !== stateKey) {
        const icon = L.divIcon({
          html: createMarkerHtml(proj, isSelected),
          className: "sunsight-leaflet-marker",
          iconSize: [0, 0],
        });
        existing.setLatLng([proj.lat, proj.lng]);
        existing.setIcon(icon);
        existing.setZIndexOffset(isSelected ? 1000 : 0);
        markerStateRef.current[proj.id] = stateKey;
      }
    });

    const activeProject = projects.find((p) => p.id === selectedProjectId);
    if (activeProject) {
      const targetKey = `${activeProject.id}|${activeProject.lat.toFixed(6)}|${activeProject.lng.toFixed(6)}`;
      if (lastCenteredProjectKeyRef.current !== targetKey) {
        const isFirstFocus = lastCenteredProjectKeyRef.current === "";
        lastCenteredProjectKeyRef.current = targetKey;
        const targetZoom = 18;
        if (isFirstFocus) {
          map.setView([activeProject.lat, activeProject.lng], targetZoom, { animate: false });
        } else {
          map.flyTo([activeProject.lat, activeProject.lng], targetZoom, {
            animate: true,
            duration: 0.55,
          });
        }
      }
    }
  }, [selectedProjectId, projects, mapReady]);

  function handleZoomIn() {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  }

  function handleZoomOut() {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  }

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  function handleExpandToStudio() {
    if (onOpenStudio) {
      onOpenStudio(activeProject?.id ?? "");
    }
  }

  return (
    <div className="relative w-full h-full min-h-[260px] sm:min-h-[320px] rounded-[18px] bg-slate-900 overflow-hidden shadow-2xs select-none">
      {/* Real Leaflet Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Loading state before Leaflet initializes */}
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xs text-slate-300 gap-2">
          <span className="material-symbols-outlined text-[28px] animate-spin text-amber-400">
            sync
          </span>
          <span className="text-xs font-medium">Memuat citra satelit Kota Bogor...</span>
        </div>
      )}

      {/* Top Right Map Controls: Zoom & Buka Proyek di Studio */}
      <div className="absolute top-3 right-3 z-20 flex items-center justify-end pointer-events-none">
        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-xl border border-white/90 rounded-full p-0.5 shadow-[0_8px_24px_rgba(15,23,42,0.16)] pointer-events-auto">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Perbesar"
            className="w-7 h-7 rounded-full hover:bg-amber-50/90 text-slate-700 hover:text-amber-950 flex items-center justify-center transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Perkecil"
            className="w-7 h-7 rounded-full hover:bg-amber-50/90 text-slate-700 hover:text-amber-950 flex items-center justify-center transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            type="button"
            onClick={handleExpandToStudio}
            title={`Buka ${activeProject?.name || "Proyek"} di Studio CAD`}
            aria-label={`Buka ${activeProject?.name || "Proyek"} di Studio CAD`}
            className="w-7 h-7 rounded-full hover:bg-gradient-to-r hover:from-amber-200 hover:via-amber-300 hover:to-amber-200 text-slate-700 hover:text-amber-950 flex items-center justify-center transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">crop_free</span>
          </button>
        </div>
      </div>

      {/* Bottom Right Floating Solar Potential Component (Hover or Click to Expand) */}
      {activeProject && (
        <div
          className="absolute right-3 bottom-3 z-20 pointer-events-auto flex flex-col items-end"
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") openPotentialOnHover();
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") closePotentialOnLeave();
          }}
        >
          {/* Expanded State Card (Apple Frosted Glass + Soft Radiant Glow) */}
          <div
            className={`transition-all duration-300 ease-out origin-bottom-right ${
              isPotentialOpen
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                : "opacity-0 scale-90 translate-y-3 pointer-events-none absolute bottom-0 right-0"
            }`}
          >
            <div className="w-[min(260px,calc(100vw-4.5rem))] sm:w-[290px] bg-white/84 bg-gradient-to-br from-white/94 via-amber-50/35 to-sky-50/30 backdrop-blur-2xl saturate-150 rounded-2xl p-3.5 sm:p-4 shadow-[0_14px_36px_rgba(15,23,42,0.16),0_4px_14px_rgba(251,191,36,0.16),inset_0_1px_1px_rgba(255,255,255,0.92)] border border-white/85 flex flex-col gap-2 relative">
              {/* Header with Title and Close Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-amber-500">wb_sunny</span>
                  <h4 className="text-[13px] sm:text-[14px] font-semibold text-slate-900 tracking-tight">Potensi surya</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPotentialOpen(false)}
                  className="w-6 h-6 rounded-full hover:bg-slate-900/[0.06] text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                  title="Tutup ringkasan potensi"
                  aria-label="Tutup ringkasan potensi"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* Body stats & gauge */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="min-w-0">
                  <p className="text-[12px] sm:text-[13px] font-semibold text-slate-800 truncate">
                    {activeProject.district !== "-" ? activeProject.district : "Kota Bogor"}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug font-code-metric">
                    {irradiance} kWh/m² per hari
                  </p>
                </div>
                <div className="relative w-12 h-12 sm:w-13 sm:h-13 shrink-0">
                  <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                    <circle cx={28} cy={28} r={22} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth={5} />
                    <circle
                      cx={28}
                      cy={28}
                      r={22}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 22}
                      strokeDashoffset={2 * Math.PI * 22 * (1 - Math.min(100, Math.max(0, roofScore)) / 100)}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] sm:text-[12px] font-semibold text-slate-900 font-code-metric tabular-nums">
                    {roofScore}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsed State Mini Sun Button */}
          <button
            type="button"
            onClick={() => setIsPotentialOpen((v) => !v)}
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/85 backdrop-blur-xl saturate-150 text-amber-500 flex items-center justify-center shadow-[0_6px_18px_rgba(15,23,42,0.16)] border border-white/90 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300 ease-out cursor-pointer group ${
              isPotentialOpen ? "opacity-0 scale-75 pointer-events-none absolute" : "opacity-100 scale-100"
            }`}
            title="Arahkan kursor atau klik untuk melihat Potensi Surya"
            aria-label="Potensi Surya"
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[22px] group-hover:rotate-45 group-hover:scale-110 transition-transform duration-300">
              wb_sunny
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
