import { useEffect, useRef, useState } from "react";
import type { Map, Marker, TileLayer } from "leaflet";

interface Props {
  orderId: number;
  deliveryAddress: string;
}

export default function LiveDriverMap({ orderId, deliveryAddress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const [error, setError] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    let L: typeof import("leaflet") | null = null;
    let active = true;

    const init = async () => {
      if (!containerRef.current) return;
      L = (await import("leaflet")).default;

      await import("leaflet/dist/leaflet.css");

      if (!active || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoom: 15,
        center: [18.4861, -69.9312],
        zoomControl: false,
        attributionControl: false,
      });
      mapRef.current = map;

      tileRef.current = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19 }
      ).addTo(map);

      const driverIcon = L.divIcon({
        className: "",
        html: `<div style="width:36px;height:36px;background:#FFD700;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 0 6px rgba(255,215,0,0.25),0 0 0 12px rgba(255,215,0,0.1);animation:pulse 1.8s infinite">🛵</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      markerRef.current = L.marker([18.4861, -69.9312], { icon: driverIcon }).addTo(map);
    };

    init();

    const fetchLocation = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/driver-location`, { credentials: "include" });
        if (!res.ok) return;
        const { lat, lng } = await res.json();
        if (!active || !mapRef.current || !markerRef.current || !L) return;
        const latLng = L.latLng(lat, lng);
        markerRef.current.setLatLng(latLng);
        if (!hasLocation) {
          mapRef.current.setView(latLng, 15);
          setHasLocation(true);
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
  }, [orderId]);

  if (error) return null;

  return (
    <div className="bg-white/8 border border-yellow-400/30 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <span className="text-base">🛵</span>
        <div>
          <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Ubicación en vivo</p>
          <p className="text-xs text-gray-400 truncate">{deliveryAddress}</p>
        </div>
        <span className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-bold">En vivo</span>
        </span>
      </div>
      <div ref={containerRef} className="w-full h-52" />
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(255,215,0,0.25), 0 0 0 12px rgba(255,215,0,0.1); }
          50% { box-shadow: 0 0 0 10px rgba(255,215,0,0.15), 0 0 0 20px rgba(255,215,0,0.05); }
        }
      `}</style>
    </div>
  );
}
