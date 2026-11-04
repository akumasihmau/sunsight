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
  roofScore?: number;
  irradiance?: number;
}

type MapMode = "street" | "satellite";

export function BogorProjectsMap({
  projects,
  selectedProjectId,
  onSelectProject,
  roofScore = 94,
  irradiance = 4.85,
}: BogorProjectsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streetLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const satelliteLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labelsLayerRef = useRef<any>(null);

  const [mapMode, setMapMode] = useState<MapMode>("street");
  const [mapReady, setMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(13);

  // Helper to construct marker HTML
  function createMarkerHtml(proj: MapProjectItem, active: boolean, isZoomedOut: boolean): string {
    // When active and not zoomed out too far, show soft yellow/amber pill with project name
    if (active && !isZoomedOut) {
      return `
        <div class="sunsight-map-pin sunsight-map-pin--active" title="${proj.name}" style="
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
          color: #451a03;
          padding: 5px 12px 5px 8px;
          border-radius: 9999px;
          border: 1px solid rgba(245, 158, 11, 0.75);
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.32), inset 0 1px 1px rgba(255, 255, 255, 0.85);
          font-family: inherit;
          font-size: 11.5px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          transform: translate(-50%, -50%) scale(1.05);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
        ">
          <span style="
            width: 8px;
            height: 8px;
            border-radius: 9999px;
            background: #b45309;
            box-shadow: 0 0 6px rgba(180, 83, 9, 0.7);
            flex-shrink: 0;
          "></span>
          <span style="letter-spacing: -0.01em;">${proj.name}</span>
        </div>
      `;
    }

    // When unselected or zoomed out: just a glowing/pulsing dot without name or kwp
    return `
      <div class="sunsight-map-dot-wrapper" title="${proj.name}" style="
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transform: translate(-50%, -50%);
        user-select: none;
      ">
        <div class="map-glowing-dot" style="
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          background: #f59e0b;
          border: 2px solid #ffffff;
        "></div>
      </div>
    `;
  }

  // Initialize Leaflet map
  useEffect(() => {
    let isCancelled = false;

    function initMap() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !mapContainerRef.current || mapInstanceRef.current || isCancelled) return;

      try {
        // Center around Kota Bogor
        const map = L.map(mapContainerRef.current, {
          center: [-6.589, 106.797],
          zoom: 13,
          minZoom: 11,
          maxZoom: 18,
          zoomControl: false,
          attributionControl: false,
        });

        // Restrict to Kota Bogor & surrounds
        const bogorBounds = L.latLngBounds(
          L.latLng(-6.67, 106.72),
          L.latLng(-6.52, 106.87)
        );
        map.setMaxBounds(bogorBounds);

        // Track zoom level to collapse markers when zoomed out
        map.on("zoomend", () => {
          setZoomLevel(map.getZoom());
        });

        // CartoDB Positron / OSM Street Layer (clean, minimal, modern)
        const street = L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            subdomains: "abcd",
            maxZoom: 19,
          }
        );

        // Esri Satellite Layer
        const satellite = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { maxNativeZoom: 19, maxZoom: 19 }
        );

        // Reference labels layer for satellite
        const labels = L.tileLayer(
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          { maxNativeZoom: 19, maxZoom: 19 }
        );

        street.addTo(map);

        streetLayerRef.current = street;
        satelliteLayerRef.current = satellite;
        labelsLayerRef.current = labels;
        mapInstanceRef.current = map;

        // Render project markers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markerMap: Record<string, any> = {};

        projects.forEach((proj) => {
          const isSelected = proj.id === selectedProjectId;
          const icon = L.divIcon({
            html: createMarkerHtml(proj, isSelected, false),
            className: "sunsight-leaflet-marker",
            iconSize: [0, 0],
          });

          const marker = L.marker([proj.lat, proj.lng], { icon, zIndexOffset: isSelected ? 1000 : 0 });
          marker.on("click", () => {
            onSelectProject(proj.id);
          });
          marker.addTo(map);
          markerMap[proj.id] = marker;
        });

        markersRef.current = markerMap;
        setMapReady(true);

        // Invalidate size once DOM stabilizes
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 150);
      } catch (err) {
        console.warn("Leaflet init error:", err);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => initMap();
      document.body.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker icons and pan when selectedProjectId changes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current || !mapReady) return;

    projects.forEach((proj) => {
      const marker = markersRef.current[proj.id];
      if (!marker) return;

      const isSelected = proj.id === selectedProjectId;
      marker.setIcon(
        L.divIcon({
          html: createMarkerHtml(proj, isSelected, zoomLevel < 12),
          className: "sunsight-leaflet-marker",
          iconSize: [0, 0],
        })
      );
      marker.setZIndexOffset(isSelected ? 1000 : 0);
    });

    const activeProject = projects.find((p) => p.id === selectedProjectId);
    if (activeProject && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([activeProject.lat, activeProject.lng], {
        animate: true,
        duration: 0.6,
      });
    }
  }, [selectedProjectId, projects, mapReady, zoomLevel]);

  // Switch between street and satellite tiles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mapMode === "street") {
      if (satelliteLayerRef.current && map.hasLayer(satelliteLayerRef.current)) {
        map.removeLayer(satelliteLayerRef.current);
      }
      if (labelsLayerRef.current && map.hasLayer(labelsLayerRef.current)) {
        map.removeLayer(labelsLayerRef.current);
      }
      if (streetLayerRef.current && !map.hasLayer(streetLayerRef.current)) {
        streetLayerRef.current.addTo(map);
      }
    } else {
      if (streetLayerRef.current && map.hasLayer(streetLayerRef.current)) {
        map.removeLayer(streetLayerRef.current);
      }
      if (satelliteLayerRef.current && !map.hasLayer(satelliteLayerRef.current)) {
        satelliteLayerRef.current.addTo(map);
      }
      if (labelsLayerRef.current && !map.hasLayer(labelsLayerRef.current)) {
        labelsLayerRef.current.addTo(map);
      }
    }
  }, [mapMode]);

  function handleResetView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!mapInstanceRef.current || !L) return;

    const coords = projects.map((p) => [p.lat, p.lng]);
    const bounds = L.latLngBounds(coords);
    mapInstanceRef.current.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 14,
      animate: true,
    });
  }

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

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-[18px] bg-slate-100 overflow-hidden shadow-2xs select-none">
      {/* Real Leaflet Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Loading state before Leaflet initializes */}
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/90 backdrop-blur-xs text-slate-500 gap-2">
          <span className="material-symbols-outlined text-[28px] animate-spin text-amber-500">
            sync
          </span>
          <span className="text-xs font-medium">Memuat peta Kota Bogor...</span>
        </div>
      )}

      {/* Top Map Toolbar: Mode Toggle & Reset View */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Layer Switcher (Peta / Satelit) */}
        <div className="inline-flex p-0.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm pointer-events-auto">
          <button
            type="button"
            onClick={() => setMapMode("street")}
            className={`px-2.5 py-1 rounded-full text-[11px] transition cursor-pointer ${
              mapMode === "street"
                ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            Peta
          </button>
          <button
            type="button"
            onClick={() => setMapMode("satellite")}
            className={`px-2.5 py-1 rounded-full text-[11px] transition cursor-pointer ${
              mapMode === "satellite"
                ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 text-amber-950 font-bold border border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.18),inset_0_1px_1px_rgba(255,255,255,0.8)]"
                : "text-slate-600 hover:text-slate-900 font-medium"
            }`}
          >
            Satelit
          </button>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full p-0.5 shadow-sm pointer-events-auto">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Perbesar"
            className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Perkecil"
            className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Lihat Semua Proyek di Bogor"
            className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">crop_free</span>
          </button>
        </div>
      </div>

      {/* Bottom Information Card: Bar Penilaian Potensi Surya */}
      {activeProject && (
        <div className="absolute left-3 right-3 bottom-3 z-20 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-md border border-slate-200/80">
            <div className="min-w-0">
              <h4 className="text-[14px] sm:text-[15px] font-bold text-slate-900">Potensi surya</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug truncate">
                {activeProject.district} · {irradiance} kWh/m² per hari
              </p>
            </div>
            <div className="relative w-13 h-13 sm:w-14 sm:h-14 shrink-0">
              <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                <circle cx={28} cy={28} r={22} fill="none" stroke="#f1f5f9" strokeWidth={5} />
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
              <span className="absolute inset-0 flex items-center justify-center text-[12px] sm:text-[13px] font-bold text-slate-900">
                {roofScore}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
