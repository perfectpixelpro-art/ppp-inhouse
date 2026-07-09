import { useEffect, useState } from "react";
import { fetchPolicy } from "../../api/employee";
import "./policy.css";

export default function PolicyPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicy().then((p) => setContent(p.content || "")).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Company Policy</h2>
          <p>Please read and follow the guidelines below</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : content.trim() ? (
        <div className="card card-pad" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, maxWidth: 760 }}>
          {content}
        </div>
      ) : (
        <div className="empty">No policy published yet.</div>
      )}
    </div>
  );
}
