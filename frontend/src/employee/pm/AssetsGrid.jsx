import { fmtDateTime, downloadUrl } from "./pmUtils";

// A gallery of submitted assets. props: assets [{url,name,kind,taskTitle,assignee,submittedAt}]
export default function AssetsGrid({ assets }) {
  if (!assets?.length) return <div className="pm-empty">No assets submitted yet.</div>;
  return (
    <div className="assets-grid">
      {assets.map((a, i) => (
        <div key={i} className="asset-card">
          <a href={a.url} target="_blank" rel="noreferrer" className="asset-media">
            {a.kind === "image" ? (
              <img src={a.url} alt={a.name || "asset"} />
            ) : (
              <div className="asset-icon">{a.kind === "video" ? "🎬" : "📄"}</div>
            )}
          </a>
          <div className="asset-meta">
            <a href={a.url} target="_blank" rel="noreferrer" className="asset-name">{a.name || a.url}</a>
            <div className="asset-sub">{a.taskTitle}</div>
            <div className="asset-sub">{a.assignee?.name || "—"} · {fmtDateTime(a.submittedAt)}</div>
            <a className="asset-dl" href={downloadUrl(a.url)} download={a.name || ""} target="_blank" rel="noreferrer">⬇ Download</a>
          </div>
        </div>
      ))}
    </div>
  );
}
