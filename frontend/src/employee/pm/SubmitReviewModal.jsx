import { useEffect, useState } from "react";
import Modal from "../../panel/Modal";
import { submitReview, uploadAttachment, fetchAssignableUsers } from "../../api/pm";

// Submit a task for review: attach notes, links and files (images/videos/docs),
// and optionally add extra reviewers (HR/Admin/PM can always review).
export default function SubmitReviewModal({ task, onClose, onSubmitted }) {
  const [note, setNote] = useState("");
  const [links, setLinks] = useState([]);
  const [linkInput, setLinkInput] = useState("");
  const [files, setFiles] = useState([]); // { url, name, kind }
  const [reviewers, setReviewers] = useState([]); // user ids
  const [people, setPeople] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchAssignableUsers().then(setPeople).catch(() => {}); }, []);

  const addLink = () => {
    const l = linkInput.trim();
    if (!l) return;
    setLinks((ls) => [...ls, l]);
    setLinkInput("");
  };

  const onFiles = async (e) => {
    const chosen = Array.from(e.target.files || []);
    if (!chosen.length) return;
    setUploading(true); setError("");
    try {
      for (const f of chosen) {
        const up = await uploadAttachment(f);
        setFiles((fs) => [...fs, up]);
      }
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const toggleReviewer = (id) =>
    setReviewers((rs) => (rs.includes(id) ? rs.filter((x) => x !== id) : [...rs, id]));

  const submit = async () => {
    setSaving(true); setError("");
    try {
      const updated = await submitReview(task._id, { note, links, files, reviewers });
      onSubmitted?.(updated);
      onClose();
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      title="Submit for review"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || uploading}>
            {saving ? "Submitting…" : "Submit for review"}
          </button>
        </>
      }
    >
      {error && <div className="error-banner">{error}</div>}

      <div className="sr">
        <label className="sr-field">
          <span>What did you work on?</span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes for the reviewer…" />
        </label>

        <div className="sr-field">
          <span>Links (Drive, Figma, etc.)</span>
          <div className="sr-linkadd">
            <input value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="https://…"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
            <button type="button" className="btn btn-sm" onClick={addLink} disabled={!linkInput.trim()}>Add</button>
          </div>
          {links.length > 0 && (
            <ul className="sr-list">
              {links.map((l, i) => (
                <li key={i}><a href={l} target="_blank" rel="noreferrer">{l}</a>
                  <button className="sr-x" type="button" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sr-field">
          <span>Files (images, video, PDF, docs)</span>
          <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" onChange={onFiles} />
          {uploading && <span className="sr-hint">Uploading…</span>}
          {files.length > 0 && (
            <ul className="sr-list">
              {files.map((f, i) => (
                <li key={i}>
                  <span className="sr-kind">{f.kind === "image" ? "🖼" : f.kind === "video" ? "🎬" : "📄"}</span>
                  <a href={f.url} target="_blank" rel="noreferrer">{f.name || f.url}</a>
                  <button className="sr-x" type="button" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sr-field">
          <span>Reviewers</span>
          <p className="sr-hint">HR, Admin &amp; Project Managers review automatically. Add anyone else:</p>
          <div className="member-picker">
            {people.map((p) => (
              <label key={p._id} className={`member-chip ${reviewers.includes(p._id) ? "on" : ""}`}>
                <input type="checkbox" checked={reviewers.includes(p._id)} onChange={() => toggleReviewer(p._id)} hidden />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
