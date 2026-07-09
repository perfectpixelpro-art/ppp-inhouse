import Document from "../models/Document.js";

// GET /api/documents?employee=
export const getDocuments = async (req, res) => {
  const filter = {};
  if (req.query.employee) filter.employee = req.query.employee;
  const docs = await Document.find(filter)
    .populate("employee", "name email designation photo department")
    .sort({ createdAt: -1 });
  res.json(docs);
};

// POST /api/documents
export const createDocument = async (req, res) => {
  const { employee, docType } = req.body;
  if (!employee || !docType) {
    return res.status(400).json({ message: "employee and docType are required" });
  }
  const doc = await Document.create({
    employee,
    docType,
    number: req.body.number,
    fileUrl: req.body.fileUrl,
    images: Array.isArray(req.body.images) ? req.body.images : [],
    note: req.body.note,
  });
  res.status(201).json(await doc.populate("employee", "name email designation photo department"));
};

// DELETE /api/documents/:id
export const deleteDocument = async (req, res) => {
  const doc = await Document.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document not found" });
  res.json({ message: "Document removed", id: req.params.id });
};
