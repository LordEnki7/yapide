const GPS_KEY = "qlq_gps";

export interface GPSLocation {
  lat: number;
  lng: number;
  address?: string;
  savedAt: number;
}

export function getStoredGPS(): GPSLocation | null {
  try {
    const raw = localStorage.getItem(GPS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GPSLocation;
  } catch {
    return null;
  }
}

export function saveGPS(loc: GPSLocation) {
  localStorage.setItem(GPS_KEY, JSON.stringify(loc));
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // ── Mapbox (preferred — better DR street coverage) ──────────────────────────
  if (MAPBOX_TOKEN) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=1&types=address,place`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const place = data?.features?.[0];
        if (place?.place_name) {
          // Strip the country suffix (", República Dominicana") for brevity
          return place.place_name.replace(/,\s*República Dominicana$/i, "").trim();
        }
      }
    } catch { /* fall through */ }
  }
  // ── Nominatim fallback ──────────────────────────────────────────────────────
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "es" } }
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    const addr = data.address ?? {};
    const parts = [
      addr.road ?? addr.pedestrian ?? addr.suburb,
      addr.house_number,
      addr.city ?? addr.town ?? addr.village ?? addr.municipality,
    ].filter(Boolean);
    return parts.join(", ") || data.display_name?.split(",").slice(0, 3).join(",") || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export async function requestGPS(): Promise<GPSLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS no disponible en este dispositivo"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const address = await reverseGeocode(lat, lng);
        const loc: GPSLocation = { lat, lng, address, savedAt: Date.now() };
        saveGPS(loc);
        resolve(loc);
      },
      (err) => {
        reject(new Error(
          err.code === 1
            ? "Permiso de ubicación denegado. Actívalo en la configuración."
            : "No se pudo obtener tu ubicación. Intenta de nuevo."
        ));
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}
