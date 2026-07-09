import Gallery from "../models/Gallery.js";

// GET /api/gallery  — any authenticated user
export const getGallery = async (req, res) => {
  const items = await Gallery.find().sort({ createdAt: -1 });
  res.json(items);
};

// POST /api/gallery  — admin/hr
export const createGalleryItem = async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ message: "imageUrl is required" });
  const item = await Gallery.create({
    imageUrl,
    title: req.body.title,
    caption: req.body.caption,
  });
  res.status(201).json(item);
};

// DELETE /api/gallery/:id  — admin/hr
export const deleteGalleryItem = async (req, res) => {
  const item = await Gallery.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Item not found" });
  res.json({ message: "Removed", id: req.params.id });
};
