import Leave from "../models/Leave.js";
import User from "../models/User.js";
import { computeLeaveDeduction, accruedLeaveDays } from "../services/leaveDeduction.js";
import { sendMail, staffEmails } from "../services/mail.js";

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const dayDiff = (from, to) => {
  const ms = new Date(to).setHours(0, 0, 0, 0) - new Date(from).setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

// GET /api/leaves?status=&employee=
export const getLeaves = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.employee) filter.employee = req.query.employee;
  const leaves = await Leave.find(filter)
    .populate("employee", "name email designation photo department")
    .sort({ createdAt: -1 });
  res.json(leaves);
};

// GET /api/leaves/balance  -> per-employee accrued leave, used, remaining, salary cut
// Allowance is 1.5 days granted at probation exit plus 1.5 per month after. Approved-leave
// penalties draw from that balance; probation leaves and any penalty over the balance
// become salary cut. Admin/HR and deactivated accounts are not listed.
export const getLeaveBalance = async (req, res) => {
  const employees = await User.find({ role: "employee", active: true }).select(
    "name email designation photo department joinDate probationStart probationEnd"
  );
  const approved = await Leave.aggregate([
    { $match: { status: "approved", type: { $ne: "unpaid" } } },
    {
      $group: {
        _id: "$employee",
        leavePenalty: { $sum: { $cond: [{ $eq: ["$deductType", "salary"] }, 0, "$deductionDays"] } },
        salaryPenalty: { $sum: { $cond: [{ $eq: ["$deductType", "salary"] }, "$deductionDays", 0] } },
      },
    },
  ]);
  const map = Object.fromEntries(approved.map((a) => [String(a._id), a]));
  const balance = employees.map((e) => {
    const { leavePenalty = 0, salaryPenalty = 0 } = map[String(e._id)] || {};
    const allowance = accruedLeaveDays(e);
    const usedFromLeave = Math.min(leavePenalty, allowance);
    const spill = Math.max(0, leavePenalty - allowance); // penalty beyond balance → salary
    return {
      _id: e._id,
      name: e.name,
      email: e.email,
      designation: e.designation,
      photo: e.photo,
      department: e.department,
      allowance,
      used: usedFromLeave,
      remaining: Math.max(0, allowance - leavePenalty),
      salaryCut: salaryPenalty + spill,
    };
  });
  res.json(balance);
};

// POST /api/leaves
export const createLeave = async (req, res) => {
  const { employee, fromDate, toDate, type, reason } = req.body;
  if (!employee || !fromDate || !toDate) {
    return res.status(400).json({ message: "employee, fromDate and toDate are required" });
  }
  const emp = await User.findById(employee).select("probationStart probationEnd");
  const leave = new Leave({
    employee,
    type: type || "casual",
    fromDate,
    toDate,
    days: dayDiff(fromDate, toDate),
    reason,
    attachment: req.body.attachment || "",
  });
  const ded = computeLeaveDeduction(leave, emp);
  leave.deductionDays = ded.days;
  leave.deductType = ded.type;
  leave.deductReason = ded.reason;
  await leave.save();
  await leave.populate("employee", "name email designation photo");

  // Notify HR/admin that a new leave request came in
  staffEmails().then((to) =>
    sendMail({
      to,
      subject: `New leave request — ${leave.employee.name}`,
      html: `<p><strong>${leave.employee.name}</strong> applied for <strong>${leave.type}</strong> leave.</p>
             <p>${fmt(leave.fromDate)} → ${fmt(leave.toDate)} (${leave.days} day${leave.days === 1 ? "" : "s"})</p>
             ${leave.reason ? `<p>Reason: ${leave.reason}</p>` : ""}
             <p>Review it in the HR panel → Leave Applications.</p>`,
    })
  );

  res.status(201).json(leave);
};

// PATCH /api/leaves/:id/status  { status, note }
export const updateLeaveStatus = async (req, res) => {
  const { status, note } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const leave = await Leave.findByIdAndUpdate(
    req.params.id,
    { status, reviewNote: note || "", reviewedBy: req.user._id },
    { new: true }
  ).populate("employee", "name email designation photo");
  if (!leave) return res.status(404).json({ message: "Leave not found" });

  // Notify the employee of the decision / review
  if (leave.employee?.email) {
    const label = status === "approved" ? "approved ✅" : status === "rejected" ? "rejected ❌" : "updated";
    sendMail({
      to: leave.employee.email,
      subject: `Your leave request was ${label.replace(/ .$/, "")}`,
      html: `<p>Hi ${leave.employee.name},</p>
             <p>Your <strong>${leave.type}</strong> leave (${fmt(leave.fromDate)} → ${fmt(leave.toDate)}) was <strong>${label}</strong>.</p>
             ${leave.reviewNote ? `<p>Note from HR: ${leave.reviewNote}</p>` : ""}`,
    });
  }

  res.json(leave);
};
