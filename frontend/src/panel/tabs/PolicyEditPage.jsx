import { useEffect, useState } from "react";
import { fetchPolicy, savePolicy } from "../../api/panel";

export default function PolicyEditPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchPolicy().then((p) => setContent(p.content || "")).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await savePolicy(content);
      setMsg("Saved — employees can see it now.");
    } catch (e) {
      setMsg(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Company Policy</h2>
          <p>Write or paste the policy — it shows to every employee</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {msg && <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>{msg}</span>}
          <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <textarea
          className="policy-editor"
          rows={20}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste or write the company policy here…"
        />
      )}
    </div>
  );
}
