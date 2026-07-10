import Notice from "../models/Notice.js";

// POST /api/notices  (admin/hr) — publish text and/or image to all or one employee
export const createNotice = async (req, res) => {
  const { message, image, audience, employee } = req.body;
  if (!message && !image) return res.status(400).json({ message: "Add a message or an image" });
  const notice = await Notice.create({
    message: message || "",
    image: image || "",
    audience: audience === "user" ? "user" : "all",
    employee: audience === "user" ? employee : undefined,
    createdBy: req.user._id,
  });
  res.status(201).json(await notice.populate("employee", "name email"));
};

// GET /api/notices  (admin/hr) — every notice with who acknowledged + their notes
export const listNotices = async (req, res) => {
  const notices = await Notice.find()
    .populate("employee", "name email")
    .populate("acks.employee", "name email photo")
    .sort({ createdAt: -1 });
  res.json(notices);
};

// DELETE /api/notices/:id  (admin/hr)
export const deleteNotice = async (req, res) => {
  const n = await Notice.findByIdAndDelete(req.params.id);
  if (!n) return res.status(404).json({ message: "Notice not found" });
  res.json({ message: "Removed", id: req.params.id });
};

// GET /api/notices/mine  — notices targeted to me, with my ack (if any)
export const myNotices = async (req, res) => {
  const notices = await Notice.find({
    $or: [{ audience: "all" }, { employee: req.user._id }],
  }).sort({ createdAt: -1 });
  const mine = notices.map((n) => {
    const myAck = n.acks.find((a) => String(a.employee) === String(req.user._id));
    return { _id: n._id, message: n.message, image: n.image, createdAt: n.createdAt, ack: myAck || null };
  });
  res.json(mine);
};

// POST /api/notices/:id/ack  { note }  — acknowledge (upsert my ack)
export const ackNotice = async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) return res.status(404).json({ message: "Notice not found" });
  const targeted = notice.audience === "all" || String(notice.employee) === String(req.user._id);
  if (!targeted) return res.status(403).json({ message: "Not your notice" });

  const note = req.body.note || "";
  const existing = notice.acks.find((a) => String(a.employee) === String(req.user._id));
  if (existing) { existing.note = note; existing.at = new Date(); }
  else notice.acks.push({ employee: req.user._id, note, at: new Date() });
  await notice.save();
  res.json({ ok: true });
};
