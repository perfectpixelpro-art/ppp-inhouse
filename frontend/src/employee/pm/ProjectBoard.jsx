import { useEffect, useState } from "react";
import { fetchProjectResources, addProjectResource, removeProjectResource, uploadAttachment } from "../../api/pm";
import { useAuth } from "../../context/AuthContext";
import { canSeeAllPM } from "../../roles";
import Avatar from "../../panel/Avatar";
import { fmtDateTime, downloadUrl } from "./pmUtils";

// A shared board for a project — any member posts text, links or files
// (images/videos/docs). Visible to every member + HR/Admin.
export default function ProjectBoard({ projectId }) {
  const { user } = useAuth();
  const staff = canSeeAllPM(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("text"); // text | link | file
  const [text, setText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => { setLoading(true); fetchProjectResources(projectId).then(setItems).finally(() => setLoading(false)); };
  useEffect(load, [projectId]);

  const canRemove = (r) => staff || r.addedBy?._id === user?._id;

  const postText = async () => {
    if (!text.trim()) return;
    setBusy(true); setError("");
    try { const list = await addProjectResource(projectId, { kind: "text", text }); setItems(list); setText(""); }
    catch (e) { setError(e.response?.data?.message || e.message); } finally { setBusy(false); }
  };
  const postLink = async () => {
    if (!linkUrl.trim()) return;
    setBusy(true); setError("");
    try { const list = await addProjectResource(projectId, { kind: "link", url: linkUrl, name: linkName }); setItems(list); setLinkUrl(""); setLinkName(""); }
    catch (e) { setError(e.response?.data?.message || e.message); } finally { setBusy(false); }
  };
  const postFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true); setError("");
    try {
      let list = items;
      for (const f of files) {
        const up = await uploadAttachment(f);
        list = await addProjectResource(projectId, { kind: "file", url: up.url, name: up.name, fileKind: up.kind });
      }
      setItems(list);
    } catch (er) { setError(er.response?.data?.message || er.message); }
    finally { setBusy(false); e.target.value = ""; }
  };
  const remove = async (r) => {
    if (!window.confirm("Remove this?")) return;
    await removeProjectResource(projectId, r._id);
    setItems((xs) => xs.filter((x) => x._id !== r._id));
  };

  return (
    <div className="board">
      {error && <div className="error-banner">{error}</div>}

      <div className="board-composer">
        <div className="mode-toggle">
          <button className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>Text</button>
          <button className={mode === "link" ? "active" : ""} onClick={() => setMode("link")}>Link</button>
          <button className={mode === "file" ? "active" : ""} onClick={() => setMode("file")}>File</button>
        </div>
        {mode === "text" && (
          <div className="board-row">
            <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Share a note with the team…" />
            <button className="btn btn-primary btn-sm" onClick={postText} disabled={busy || !text.trim()}>Post</button>
          </div>
        )}
        {mode === "link" && (
          <div className="board-row">
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
            <input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Label (optional)" />
            <button className="btn btn-primary btn-sm" onClick={postLink} disabled={busy || !linkUrl.trim()}>Add link</button>
          </div>
        )}
        {mode === "file" && (
          <div className="board-row">
            <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" onChange={postFiles} />
            {busy && <span className="sr-hint">Uploading…</span>}
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : items.length === 0 ? (
        <div className="pm-empty">Nothing shared yet — post the first thing.</div>
      ) : (
        <ul className="board-feed">
          {items.map((r) => (
            <li key={r._id} className="board-item">
              <Avatar user={r.addedBy} size={30} />
              <div className="board-body">
                <div className="board-head">
                  <strong>{r.addedBy?.name || "—"}</strong>
                  <span className="td-hint">{fmtDateTime(r.createdAt)}</span>
                  {canRemove(r) && <button className="td-x" onClick={() => remove(r)}>✕</button>}
                </div>
                {r.kind === "text" && <div className="board-text">{r.text}</div>}
                {r.kind === "link" && <a className="board-link" href={r.url} target="_blank" rel="noreferrer">🔗 {r.name || r.url}</a>}
                {r.kind === "file" && (
                  <div className="board-file">
                    {r.fileKind === "image" ? (
                      <a href={r.url} target="_blank" rel="noreferrer"><img src={r.url} alt={r.name || "file"} /></a>
                    ) : (
                      <a className="sr-fchip" href={r.url} target="_blank" rel="noreferrer">{r.fileKind === "video" ? "🎬" : "📄"} {r.name || "file"}</a>
                    )}
                    <a className="sr-dl" href={downloadUrl(r.url)} download={r.name || ""} target="_blank" rel="noreferrer" title="Download">⬇</a>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
