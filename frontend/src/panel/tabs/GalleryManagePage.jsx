import { useEffect, useState } from "react";
import { fetchGallery, createGallery, deleteGallery, uploadFile } from "../../api/panel";
import "../../employee/tabs/gallery.css";

export default function GalleryManagePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => { fetchGallery().then(setItems).finally(() => setLoading(false)); };
  useEffect(load, []);

  // Upload each selected image and add it to the gallery
  const addImages = async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      for (const f of files) {
        const { url } = await uploadFile(f);
        await createGallery({ imageUrl: url, title: f.name.replace(/\.[^.]+$/, "") });
      }
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const remove = async (it) => {
    if (!window.confirm("Delete this photo?")) return;
    await deleteGallery(it._id);
    load();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Gallery</h2>
          <p>Add photos — all employees can see them</p>
        </div>
        <label className="btn btn-primary" style={{ cursor: "pointer" }}>
          {busy ? "Uploading…" : "+ Add Photos"}
          <input type="file" accept="image/*" multiple hidden onChange={addImages} disabled={busy} />
        </label>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty">No photos yet.</div>
      ) : (
        <div className="gallery-grid">
          {items.map((it) => (
            <figure key={it._id} className="gallery-card">
              <img src={it.imageUrl} alt={it.title} loading="lazy" />
              <figcaption>
                <strong>{it.title}</strong>
                <button className="btn btn-danger btn-sm" style={{ marginTop: 6 }} onClick={() => remove(it)}>Delete</button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
