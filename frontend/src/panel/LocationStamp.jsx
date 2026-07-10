// Where a check-in came from. Only set when the employee checked in from a
// touch device (phone/tablet in desktop mode) — office Macs show "—".
const AT_OFFICE_M = 200;

export const fmtDistance = (m) =>
  m == null ? "—" : m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;

export default function LocationStamp({ loc, showDevice = false }) {
  if (!loc || loc.lat == null) return <span style={{ color: "var(--gray-400)" }}>—</span>;

  const near = loc.distanceM != null && loc.distanceM <= AT_OFFICE_M;
  const maps = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <a
        href={maps}
        target="_blank"
        rel="noreferrer"
        className={`badge ${near ? "badge-approved" : "badge-red"}`}
        title={`Accuracy ±${loc.accuracy ?? "?"} m — open in Google Maps`}
      >
        📍 {near ? "At office" : `${fmtDistance(loc.distanceM)} away`}
      </a>
      {showDevice && loc.deviceKind && (
        <span style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>{loc.deviceKind}</span>
      )}
    </span>
  );
}
