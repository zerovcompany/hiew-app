"use client";

import { useEffect, useRef, useState } from "react";

type Props = { lat: number | null; lng: number | null; onChange: (lat: number, lng: number) => void };
const DEFAULT: [number, number] = [15.8068, 102.0318];

declare global { interface Window { L?: any } }

export default function MapPicker({ lat, lng, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cssId = "leaflet-cdn-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link"); link.id = cssId; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(link);
    }
    if (window.L) { setReady(true); return; }
    const script = document.createElement("script"); script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.async = true;
    script.onload = () => setReady(true); document.body.appendChild(script);
    return () => { script.onload = null; };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.L || mapInstance.current) return;
    const initial: [number, number] = lat != null && lng != null ? [lat, lng] : DEFAULT;
    const map = window.L.map(mapRef.current).setView(initial, lat != null ? 16 : 13);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(map);
    map.on("click", (e: any) => onChange(e.latlng.lat, e.latlng.lng));
    mapInstance.current = map;
    if (lat != null && lng != null) markerRef.current = window.L.marker([lat, lng]).addTo(map);
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapInstance.current = null; markerRef.current = null; };
  }, [ready]); // initialize once

  useEffect(() => {
    if (!mapInstance.current || !window.L || lat == null || lng == null) return;
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    else markerRef.current = window.L.marker([lat, lng]).addTo(mapInstance.current);
    mapInstance.current.setView([lat, lng], Math.max(mapInstance.current.getZoom(), 16));
  }, [lat, lng]);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => onChange(p.coords.latitude, p.coords.longitude), () => undefined, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <div>
      <div ref={mapRef} className="h-64 w-full overflow-hidden rounded-2xl border border-ink/10 bg-ink/5" />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-ink/50">แตะบนแผนที่เพื่อปักหมุดตำแหน่งจัดส่ง</p>
        <button type="button" onClick={locate} className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink/5">📍 ใช้ตำแหน่งปัจจุบัน</button>
      </div>
      {lat != null && lng != null && <p className="mt-1 text-[11px] text-ink/40">พิกัด {lat.toFixed(6)}, {lng.toFixed(6)}</p>}
    </div>
  );
}
