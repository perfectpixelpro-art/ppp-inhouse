import { useEffect, useState } from "react";
import { fetchGallery } from "../../api/employee";
import "./gallery.css";

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    fetchGallery().then(setItems).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Gallery</h2>
          <p>Moments from life at PPP</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty">No photos yet.</div>
      ) : (
        <div className="gallery-grid">
          {items.map((it) => (
            <figure key={it._id} className="gallery-card" onClick={() => setActive(it)}>
              <img src={it.imageUrl} alt={it.title} loading="lazy" />
              <figcaption>
                <strong>{it.title}</strong>
                {it.caption && <span>{it.caption}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {active && (
        <div className="lightbox" onClick={() => setActive(null)}>
          <img src={active.imageUrl} alt={active.title} />
          <div className="lightbox-cap">{active.title} — {active.caption}</div>
        </div>
      )}
    </div>
  );
}
