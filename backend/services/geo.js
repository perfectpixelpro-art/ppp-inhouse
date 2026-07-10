// Distance from the office, for the check-in location stamp.
// Env is read lazily — server.js calls dotenv.config() after importing modules.
const R = 6371000; // earth radius, metres
const rad = (d) => (d * Math.PI) / 180;

export const officeCoords = () => {
  const lat = Number(process.env.OFFICE_LAT);
  const lng = Number(process.env.OFFICE_LNG);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

// Great-circle distance between two points, in metres.
export function haversineMeters(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(s))));
}

// Metres from the office, or null if coords aren't configured.
export const distanceFromOffice = (lat, lng) => {
  const office = officeCoords();
  return office ? haversineMeters(office, { lat, lng }) : null;
};

// Only touch devices (phone/tablet spoofing a desktop UA) must send a location.
// A real Mac reports maxTouchPoints === 0, so it checks in without a prompt.
export const isMacUserAgent = (ua = "") => /Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPod|Android/i.test(ua);

// self-check: node services/geo.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = (c, m) => console.assert(c, m);
  const office = { lat: 30.702, lng: 76.69 };
  ok(haversineMeters(office, office) === 0, "same point → 0 m");
  // ~1 km north: 0.009° latitude ≈ 1000 m
  const d = haversineMeters(office, { lat: 30.711, lng: 76.69 });
  ok(d > 950 && d < 1050, `~1km north, got ${d}`);
  // Mohali office → Gurugram (~250 km)
  const far = haversineMeters(office, { lat: 28.4601, lng: 77.0263 });
  ok(far > 240000 && far < 260000, `Mohali→Gurugram ~250km, got ${far}`);
  ok(isMacUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/141"), "mac chrome");
  ok(!isMacUserAgent("Mozilla/5.0 (Windows NT 10.0)"), "windows blocked");
  ok(!isMacUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)"), "iphone normal blocked");
  ok(isMacUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari"), "iphone desktop-mode passes UA (caught by touch)");
  console.log("geo self-check done");
}
