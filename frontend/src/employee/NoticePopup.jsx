import { useEffect, useState } from "react";
import { fetchMyNotices, ackNotice } from "../api/employee";
import Modal from "../panel/Modal";

// Shows unacknowledged notices one at a time, with Acknowledge + notes.
export default function NoticePopup() {
  const [queue, setQueue] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchMyNotices().then((ns) => setQueue(ns.filter((n) => !n.ack))).catch(() => {});
  }, []);

  const current = queue[0];
  if (!current) return null;

  const acknowledge = async () => {
    setBusy(true);
    try {
      await ackNotice(current._id, note);
      setNote("");
      setQueue((q) => q.slice(1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="📢 Notice"
      onClose={() => {}}
      footer={
        <button className="btn btn-primary" onClick={acknowledge} disabled={busy}>
          {busy ? "Saving…" : "Acknowledge"}
        </button>
      }
    >
      {current.image && (
        <img src={current.image} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: current.message ? 12 : 0 }} />
      )}
      {current.message && <p style={{ whiteSpace: "pre-wrap", margin: "0 0 1rem", lineHeight: 1.6 }}>{current.message}</p>}
      <div className="form-field full">
        <label>Add a note (optional) — visible to HR &amp; Admin</label>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Your response…" />
      </div>
      {queue.length > 1 && <p className="p-sub" style={{ marginTop: 8 }}>{queue.length - 1} more after this</p>}
    </Modal>
  );
}
