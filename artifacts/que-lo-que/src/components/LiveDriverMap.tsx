import { useEffect, useRef, useState } from "react";
import type { Map, Marker } from "leaflet";

interface Props {
  orderId: number;
  deliveryAddress: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // ── Mapbox (preferred — better DR coverage) ────────────────────────────────
  if (MAPBOX_TOKEN) {
    try {
      const query = encodeURIComponent(`${address}, República Dominicana`);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&country=DO&language=es&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      const [lng, lat] = data?.features?.[0]?.center ?? [];
      if (lat != null && lng != null) return { lat, lng };
    } catch { /* fall through */ }
  }
  // ── Nominatim fallback ────────────────────────────────────────────────────
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ", República Dominicana")}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "es" } });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* fallback to SD center */ }
  return null;
}

export default function LiveDriverMap({ orderId, deliveryAddress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const driverMarkerRef = useRef<Marker | null>(null);
  const destMarkerRef = useRef<Marker | null>(null);
  const [hasDriverLoc, setHasDriverLoc] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let L: typeof import("leaflet") | null = null;
    let active = true;

    const init = async () => {
      if (!containerRef.current) return;
      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!active || !containerRef.current) return;

      // Default center: Santo Domingo
      const map = L.map(containerRef.current, {
        zoom: 14,
        center: [18.4861, -69.9312],
        zoomControl: false,
        attributionControl: false,
      });
      mapRef.current = map;

      // Use Mapbox Streets tiles when token is available, otherwise OSM fallback
      const tileUrl = MAPBOX_TOKEN
        ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      const tileOptions = MAPBOX_TOKEN
        ? { maxZoom: 22, tileSize: 512, zoomOffset: -1, attribution: "© Mapbox © OpenStreetMap" }
        : { maxZoom: 19 };
      L.tileLayer(tileUrl, tileOptions).addTo(map);

      const driverIcon = L.divIcon({
        className: "",
        html: `<div style="width:38px;height:38px;background:#FFD700;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 0 6px rgba(255,215,0,0.25),0 0 0 14px rgba(255,215,0,0.1);animation:driverPulse 1.8s infinite">🛵</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:40px;display:flex;flex-direction:column;align-items:center"><div style="width:32px;height:32px;background:#22c55e;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:16px">📦</span></div><div style="width:2px;height:8px;background:#22c55e;margin-top:-1px"></div></div>`,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      driverMarkerRef.current = L.marker([18.4861, -69.9312], { icon: driverIcon }).addTo(map);

      // Geocode delivery address and place destination pin
      const destCoords = await geocodeAddress(deliveryAddress);
      if (destCoords && active && mapRef.current) {
        destMarkerRef.current = L.marker([destCoords.lat, destCoords.lng], { icon: destIcon })
          .bindTooltip("Tu dirección", { permanent: false, className: "text-xs font-bold" })
          .addTo(map);
        map.fitBounds([
          [18.4861, -69.9312],
          [destCoords.lat, destCoords.lng],
        ], { padding: [40, 40] });
      }
    };

    init();

    const fetchLocation = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/driver-location`, { credentials: "include" });
        if (!res.ok) return;
        const { lat, lng } = await res.json();
        if (!active || !mapRef.current || !driverMarkerRef.current) return;
        const { default: L2 } = await import("leaflet");
        const latLng = L2.latLng(lat, lng);
        driverMarkerRef.current.setLatLng(latLng);
        if (!hasDriverLoc) {
          // Fit bounds to show driver + destination
          if (destMarkerRef.current) {
            const dLoc = driverMarkerRef.current.getLatLng();
            const rLoc = destMarkerRef.current.getLatLng();
            mapRef.current.fitBounds([
              [dLoc.lat, dLoc.lng],
              [rLoc.lat, rLoc.lng],
            ], { padding: [40, 40] });
          } else {
            mapRef.current.setView(latLng, 15);
          }
          setHasDriverLoc(true);
        }
      } catch {
        setError(true);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 8000);

    return () => {
      active = false;
      clearInterval(interval);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [orderId, deliveryAddress]);

  if (error) return null;

  return (
    <div className="bg-white/8 border border-yellow-400/30 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <span className="text-base">🛵</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Ubicación en vivo</p>
          <p className="text-xs text-white/70 truncate">{deliveryAddress}</p>
        </div>
        <span className="flex items-center gap-1 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-bold">En vivo</span>
        </span>
      </div>
      <div ref={containerRef} className="w-full h-56" />
      <div className="px-4 py-2.5 border-t border-white/10 flex items-center gap-4 text-xs text-white/70">
        <span className="flex items-center gap-1.5"><span>🛵</span> Tu driver</span>
        <span className="flex items-center gap-1.5"><span>📦</span> Tu dirección</span>
      </div>
      <style>{`
        @keyframes driverPulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(255,215,0,0.25), 0 0 0 14px rgba(255,215,0,0.1); }
          50% { box-shadow: 0 0 0 10px rgba(255,215,0,0.15), 0 0 0 22px rgba(255,215,0,0.05); }
        }
      `}</style>
    </div>
  );
}
