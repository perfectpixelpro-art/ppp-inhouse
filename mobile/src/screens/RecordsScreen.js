import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, Pressable } from "react-native";
import { myAttendance, fetchHolidays } from "../api/employee";
import { colors, radius } from "../theme";
import { fmtHm, fmtTime } from "../utils/format";

const HOUR = 3600000;

// Working days in a month: exclude Sundays, even (2nd/4th) Saturdays, national holidays.
const workingDaysInMonth = (y, m, holidaySet) => {
  const days = new Date(y, m + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const day = new Date(y, m, d);
    const dow = day.getDay();
    if (dow === 0) continue;
    if (dow === 6 && Math.ceil(d / 7) % 2 === 0) continue;
    const ymd = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (holidaySet.has(ymd)) continue;
    count++;
  }
  return count;
};

const monthLabel = (m) => new Date(m + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" });
const dMon = (d) => new Date(d).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
const dNum = (d) => new Date(d).getDate();
const dayName = (d) => new Date(d).toLocaleDateString("en-US", { weekday: "long" });
const ymdOf = (d) => { const t = new Date(d).getTime(); return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10); };

export default function RecordsScreen() {
  const [records, setRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    myAttendance().then((r) => setRecords(r || [])).catch(() => {});
    fetchHolidays().then((h) => setHolidays(h || [])).catch(() => {});
  }, []);

  const months = useMemo(() => {
    const set = new Set(records.map((r) => String(r.date).slice(0, 7)));
    set.add(new Date().toISOString().slice(0, 7));
    return [...set].sort().reverse();
  }, [records]);

  const rows = records.filter((r) => String(r.date).slice(0, 7) === month);
  const [yy, mm] = month.split("-").map(Number);

  const holidaySet = new Set(
    holidays.filter((h) => h.type === "national" && ymdOf(h.date).slice(0, 7) === month).map((h) => ymdOf(h.date)).filter(Boolean)
  );

  const workingDays = workingDaysInMonth(yy, mm - 1, holidaySet);
  const done = rows.filter((r) => r.state === "ended");
  const workedMs = done.reduce((s, r) => s + (r.workedMs || 0), 0);
  const expectedMs = done.reduce((s, r) => s + (r.dayType === "half" ? 4.25 : 8) * HOUR, 0);
  const netMs = workedMs - expectedMs;
  const otDays = done.filter((r) => (r.workedMs || 0) - (r.dayType === "half" ? 4.25 : 8) * HOUR >= 60000).length;

  const tagFor = (r) => {
    if (r.state !== "ended") {
      if (!r.checkIn) return { text: "NO CHECK-IN", color: colors.gray400 };
      return { text: (r.state || "").replace("_", " ").toUpperCase(), color: colors.amber };
    }
    if (r.rain) return { text: "RAIN DAY", color: "#2563eb" };
    if (r.dayType === "half") return { text: "HALF DAY", color: colors.amber };
    const diff = (r.workedMs || 0) - 8 * HOUR;
    if (diff >= 60000) return { text: "OVERTIME", color: colors.green };
    if (diff <= -60000) return { text: "PARTIAL", color: colors.amber };
    return { text: "PRESENT", color: colors.green };
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.gray50 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Month dropdown */}
      <TouchableOpacity style={styles.dropdown} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
        <Text style={styles.dropdownText}>{monthLabel(month)}</Text>
        <Text style={styles.dropdownCaret}>▾</Text>
      </TouchableOpacity>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select month</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {months.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modalItem, month === m && styles.modalItemOn]}
                  onPress={() => { setMonth(m); setPickerOpen(false); }}
                >
                  <Text style={[styles.modalItemText, month === m && styles.modalItemTextOn]}>{monthLabel(m)}</Text>
                  {month === m && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Stat cards */}
      <View style={styles.grid}>
        <StatCard icon="📅" label="WORKING" big={String(workingDays)} sub="Total Days" />
        <StatCard icon="✅" label="WORKED" big={String(done.length)} sub={otDays ? `+${otDays} OT day${otDays > 1 ? "s" : ""}` : "days"} subColor={colors.green} />
        <StatCard icon="⏱" label="EXPECTED" big={fmtHm(expectedMs)} sub="8h/day avg" />
        <StatCard icon="⚡" label="WORKED" big={fmtHm(workedMs)} sub={netMs >= 0 ? `+${fmtHm(netMs)} OT` : `−${fmtHm(-netMs)}`} subColor={netMs >= 0 ? colors.green : colors.red} />
        <StatCard dark label="NET" big={`${netMs >= 0 ? "+" : "−"}${fmtHm(Math.abs(netMs))}`} sub="Credit Hours" />
        <StatCard icon="🎉" label="HOLIDAYS" big={String(holidaySet.size).padStart(2, "0")} sub="Public Holidays" />
      </View>

      {/* Activity log */}
      <View style={styles.logHead}>
        <Text style={styles.sectionTitle}>Activity Log</Text>
        <Text style={styles.monthMuted}>{monthLabel(month)}</Text>
      </View>

      {rows.length === 0 && <Text style={styles.empty}>No records for this month.</Text>}
      {rows.map((r) => {
        const tag = tagFor(r);
        return (
          <View key={r._id} style={[styles.logRow, { borderLeftColor: tag.color }]}>
            <View style={styles.logDate}>
              <Text style={styles.logMon}>{dMon(r.date)}</Text>
              <Text style={styles.logDay}>{dNum(r.date)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.logName}>{dayName(r.date)}</Text>
              <Text style={styles.logTimes}>
                {r.checkIn ? `${fmtTime(r.checkIn)} — ${fmtTime(r.checkOut)}` : "No check-in recorded"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {r.state === "ended" && <Text style={styles.logHours}>{fmtHm(r.workedMs || 0)}</Text>}
              <Text style={[styles.logTag, { color: tag.color }]}>{tag.text}</Text>
            </View>
          </View>
        );
      })}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>End of Month Records</Text>
        <Text style={styles.footerNote}>
          Attendance logs are audited every week. Ensure all disputes are raised before the following Monday.
        </Text>
        <TouchableOpacity onPress={() => Alert.alert("Full report", "Ask HR to email your full monthly report as a PDF.")}>
          <Text style={styles.footerLink}>Request Full Report (PDF) ↧</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, label, big, sub, subColor, dark }) {
  return (
    <View style={[styles.statCard, dark && { backgroundColor: colors.red, borderColor: colors.red }]}>
      <View style={styles.statTop}>
        <Text style={[styles.statLabel, dark && { color: "rgba(255,255,255,0.8)" }]}>{label}</Text>
        {icon ? <Text>{icon}</Text> : null}
      </View>
      <Text style={[styles.statBig, dark && { color: colors.white }]}>{big}</Text>
      <Text style={[styles.statSub, dark ? { color: "rgba(255,255,255,0.9)" } : subColor ? { color: subColor } : null]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 16,
  },
  dropdownText: { fontSize: 16, fontWeight: "800", color: colors.black },
  dropdownCaret: { fontSize: 16, color: colors.gray600 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 30 },
  modalSheet: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16 },
  modalTitle: { fontSize: 13, fontWeight: "700", color: colors.gray400, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  modalItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 12, borderRadius: radius.md },
  modalItemOn: { backgroundColor: colors.gray50 },
  modalItemText: { fontSize: 16, fontWeight: "600", color: colors.black },
  modalItemTextOn: { color: colors.red, fontWeight: "800" },
  modalCheck: { color: colors.red, fontWeight: "800", fontSize: 16 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statCard: {
    width: "48.5%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  statTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statLabel: { fontSize: 11, fontWeight: "700", color: colors.gray400, letterSpacing: 0.5 },
  statBig: { fontSize: 26, fontWeight: "800", color: colors.black },
  statSub: { fontSize: 12, color: colors.gray600, marginTop: 2, fontWeight: "600" },

  logHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.black, marginBottom: 12 },
  monthMuted: { color: colors.gray400, fontSize: 12, fontWeight: "600", marginBottom: 12 },

  logRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderLeftWidth: 4,
  },
  logDate: { alignItems: "center", width: 42, marginRight: 10 },
  logMon: { color: colors.gray400, fontSize: 10, fontWeight: "700" },
  logDay: { color: colors.black, fontSize: 18, fontWeight: "800" },
  logName: { fontWeight: "700", color: colors.black },
  logTimes: { color: colors.gray600, fontSize: 12, marginTop: 2 },
  logHours: { fontWeight: "800", color: colors.black },
  logTag: { fontSize: 10, fontWeight: "800", marginTop: 2, letterSpacing: 0.3 },
  empty: { color: colors.gray400, textAlign: "center", padding: 20 },

  footer: { alignItems: "center", marginTop: 20, paddingHorizontal: 10 },
  footerTitle: { fontWeight: "800", color: colors.black, marginBottom: 6 },
  footerNote: { color: colors.gray600, fontSize: 12, textAlign: "center", lineHeight: 18 },
  footerLink: { color: colors.red, fontWeight: "700", marginTop: 12 },
});
