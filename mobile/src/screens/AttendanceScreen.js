import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { myToday, myAttendance, checkIn, checkOut, markRain } from "../api/employee";
import { colors, radius } from "../theme";
import { targetMs, workedNow, fmtClock, fmtHm, fmtTime } from "../utils/format";

const HOUR = 3600000;

// Working days so far this month (excludes Sundays + even Saturdays). National
// holidays aren't subtracted client-side; the web Records page has the exact figure.
const workingDaysThisMonth = () => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  let count = 0;
  for (let d = 1; d <= now.getDate(); d++) {
    const day = new Date(y, m, d);
    const dow = day.getDay();
    if (dow === 0) continue; // Sunday
    if (dow === 6 && Math.ceil(d / 7) % 2 === 0) continue; // even Saturday
    count++;
  }
  return count;
};

const dayName = (d) => new Date(d).toLocaleDateString("en-US", { weekday: "long" });
const dMon = (d) => new Date(d).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
const dNum = (d) => new Date(d).getDate();

export default function AttendanceScreen({ navigation }) {
  const goRecords = () => navigation?.navigate("Records");
  const [today, setToday] = useState(null);
  const [records, setRecords] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const tick = useRef(null);

  const load = async () => {
    try {
      const [t, recs] = await Promise.all([myToday(), myAttendance()]);
      setToday(t);
      setRecords(recs || []);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    clearInterval(tick.current);
    if (today?.state === "working") tick.current = setInterval(() => setNow(Date.now()), 1000);
    else if (today?.state === "on_break" || today?.state === "on_lunch")
      tick.current = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(tick.current);
  }, [today?.state]);

  const act = async (fn) => {
    setBusy(true);
    try {
      const updated = await fn();
      if (updated) setToday(updated);
      setNow(Date.now());
      await load();
    } catch (e) {
      Alert.alert("Couldn't do that", e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const state = today?.state || "not_started";
  const isHalf = today?.dayType === "half";
  const target = targetMs(today);
  const worked = workedNow(today, now);

  // Lunch is locked until 3 PM IST.
  const istHour = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }));
  const lunchLocked = state === "on_lunch" && istHour < 15;

  // "Forgot to resume" banner
  const openBreak = today?.breaks?.length ? today.breaks[today.breaks.length - 1] : null;
  const breakMins = openBreak && !openBreak.end ? Math.floor((now - new Date(openBreak.start).getTime()) / 60000) : 0;
  const showResumeHint = (state === "on_break" && breakMins >= 10) || (state === "on_lunch" && !lunchLocked);

  // This-month balance
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRecords = records.filter((r) => String(r.date).slice(0, 7) === thisMonth);
  const done = monthRecords.filter((r) => r.state === "ended");
  let over = 0, short = 0;
  for (const r of done) {
    const d = (r.workedMs || 0) - (r.dayType === "half" ? 4.25 : 8) * HOUR;
    if (d > 0) over += d; else short += -d;
  }
  const net = over - short;
  const workDays = workingDaysThisMonth();

  const STATUS_TEXT = {
    not_started: "Not started",
    working: "Currently Working",
    on_lunch: "On Lunch",
    on_break: "On Short Break",
    ended: "Day Complete",
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.gray50 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Date header */}
      <Text style={styles.dayLabel}>{new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}</Text>
      <Text style={styles.dateBig}>
        {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </Text>

      {/* Timer card */}
      <View style={styles.timerCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusDotWrap}>
            <View style={[styles.dot, { backgroundColor: state === "working" ? colors.green : colors.gray400 }]} />
            <Text style={[styles.statusText, { color: state === "working" ? colors.green : colors.gray600 }]}>
              {STATUS_TEXT[state]}
            </Text>
          </View>
        </View>
        {today && state !== "not_started" && (
          <Text style={styles.targetText}>{isHalf ? "Half Day · 4h Target" : "Full Day · 8h Target"}</Text>
        )}

        {/* Circular timer */}
        <View style={styles.ringOuter}>
          <View style={styles.ringInner}>
            <Text style={styles.clock}>{fmtClock(worked)}</Text>
            <Text style={styles.clockLabel}>TIME ELAPSED</Text>
          </View>
        </View>

        {/* Actions */}
        {state === "not_started" && (
          <View style={{ gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => act(() => checkIn("full"))} disabled={busy}>
              <Text style={styles.primaryBtnText}>☀️  Start Full Day (8h)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => act(() => checkIn("half"))} disabled={busy}>
              <Text style={styles.ghostBtnText}>🌤  Start Half Day (4h · no lunch)</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === "working" && (
          <>
            <View style={styles.pauseRow}>
              <TouchableOpacity style={styles.pauseBtn} onPress={() => act(() => checkOut("break"))} disabled={busy}>
                <Text style={styles.pauseText}>☕  Break</Text>
              </TouchableOpacity>
              {!isHalf && (
                <TouchableOpacity style={styles.pauseBtn} onPress={() => act(() => checkOut("lunch"))} disabled={busy}>
                  <Text style={styles.pauseText}>🍴  Lunch</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => act(() => checkOut("end"))} disabled={busy}>
              <Text style={styles.primaryBtnText}>⎋  Check Out</Text>
            </TouchableOpacity>
          </>
        )}

        {(state === "on_break" || state === "on_lunch") && (
          <TouchableOpacity
            style={[styles.primaryBtn, lunchLocked && { opacity: 0.5 }]}
            onPress={() => act(() => checkIn())}
            disabled={busy || lunchLocked}
          >
            <Text style={styles.primaryBtnText}>{lunchLocked ? "Resume at 3:00 PM" : "▶  Resume (Check In)"}</Text>
          </TouchableOpacity>
        )}

        {state === "ended" && <Text style={styles.doneText}>✅ Day complete</Text>}
      </View>

      {/* Resume hint */}
      {showResumeHint && (
        <View style={styles.hint}>
          <Text style={styles.hintTitle}>⚠️ Forgot to resume after break?</Text>
          <Text style={styles.hintLink}>Resume your timer above to keep the clock running.</Text>
        </View>
      )}

      {/* Rain day */}
      {state === "not_started" && (
        <View style={styles.rainCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rainTitle}>🌧  Rain Day Mode</Text>
            <Text style={styles.rainSub}>Mark today as a rain day</Text>
          </View>
          <Switch
            value={!!today?.rain}
            onValueChange={(v) => act(() => markRain(v))}
            trackColor={{ true: colors.red }}
            thumbColor={colors.white}
          />
        </View>
      )}

      {/* Monthly balance */}
      <Text style={styles.sectionTitle}>Monthly Balance</Text>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>NET BALANCE</Text>
        <Text style={[styles.balanceValue, { color: net >= 0 ? "#4ade80" : "#f87171" }]}>
          {net === 0 ? "0m" : `${net >= 0 ? "+" : "−"}${fmtHm(net)}`}
        </Text>
        <View style={styles.perfPill}>
          <Text style={styles.perfText}>{net >= 0 ? "Performing Well" : "Below Target"}</Text>
        </View>
        <View style={styles.balanceSplit}>
          <BalStat label="Overtime" value={`+${fmtHm(over)}`} />
          <BalStat label="Short" value={`−${fmtHm(short)}`} />
          <BalStat label="Days" value={`${done.length}/${workDays}`} />
        </View>
      </View>

      {/* History */}
      <View style={styles.histHead}>
        <Text style={styles.sectionTitle}>My History</Text>
        <TouchableOpacity onPress={goRecords}><Text style={styles.viewAll}>View All ›</Text></TouchableOpacity>
      </View>
      {monthRecords.length === 0 && <Text style={styles.empty}>No attendance this month yet.</Text>}
      {monthRecords.slice(0, 6).map((r) => {
        const ended = r.state === "ended";
        const diff = (r.workedMs || 0) - (r.dayType === "half" ? 4.25 : 8) * HOUR;
        const tag = r.dayType === "half" ? "Half Day" : diff >= 60000 ? "Overtime" : diff <= -60000 ? "Short" : "Normal";
        const tagColor = tag === "Overtime" ? colors.red : tag === "Short" ? colors.red : colors.gray600;
        return (
          <View key={r._id} style={styles.histRow}>
            <View style={styles.histDate}>
              <Text style={styles.histMon}>{dMon(r.date)}</Text>
              <Text style={styles.histDay}>{dNum(r.date)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.histName}>{dayName(r.date)}</Text>
              <Text style={styles.histTimes}>
                {fmtTime(r.checkIn)} — {fmtTime(r.checkOut)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.histWorked, { color: tag === "Overtime" ? colors.red : colors.black }]}>
                {ended ? fmtHm(r.workedMs || 0) : "—"}
              </Text>
              <Text style={[styles.histTag, { color: tagColor }]}>{ended ? tag : STATUS_TEXT[r.state]}</Text>
            </View>
          </View>
        );
      })}

      <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.8} onPress={goRecords}>
        <Text style={styles.downloadText}>🗂  View Attendance Records</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function BalStat({ label, value }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={styles.balStatValue}>{value}</Text>
      <Text style={styles.balStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dayLabel: { color: colors.gray600, fontWeight: "700", fontSize: 12, letterSpacing: 0.5 },
  dateBig: { color: colors.black, fontWeight: "800", fontSize: 20, marginBottom: 14 },

  timerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statusRow: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", justifyContent: "center" },
  statusDotWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontWeight: "700", fontSize: 13 },
  targetText: { color: colors.gray600, fontSize: 13, marginTop: 4 },

  ringOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 5,
    borderColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 22,
  },
  ringInner: { alignItems: "center" },
  clock: { fontSize: 34, fontWeight: "800", color: colors.black, letterSpacing: 1 },
  clockLabel: { fontSize: 10, color: colors.gray400, fontWeight: "700", letterSpacing: 1, marginTop: 4 },

  pauseRow: { flexDirection: "row", gap: 10, alignSelf: "stretch", marginBottom: 10 },
  pauseBtn: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  pauseText: { fontWeight: "700", color: colors.black },
  primaryBtn: {
    backgroundColor: colors.red,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
    alignSelf: "stretch",
  },
  primaryBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  ghostBtn: {
    backgroundColor: colors.gray50,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  ghostBtnText: { color: colors.black, fontWeight: "700", fontSize: 15 },
  doneText: { color: colors.green, fontWeight: "700", fontSize: 16, marginTop: 4 },

  hint: { backgroundColor: colors.amberBg, borderRadius: radius.md, padding: 14, marginTop: 14 },
  hintTitle: { color: "#92400e", fontWeight: "700", marginBottom: 2 },
  hintLink: { color: "#b45309", fontSize: 13 },

  rainCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  rainTitle: { fontWeight: "700", color: colors.black },
  rainSub: { color: colors.gray600, fontSize: 13, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.black, marginTop: 22, marginBottom: 12 },

  balanceCard: { backgroundColor: colors.black, borderRadius: radius.lg, padding: 20, alignItems: "center" },
  balanceLabel: { color: colors.gray400, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  balanceValue: { fontSize: 40, fontWeight: "800", marginTop: 4 },
  perfPill: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  perfText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  balanceSplit: { flexDirection: "row", alignSelf: "stretch", marginTop: 20 },
  balStatValue: { color: colors.white, fontWeight: "800", fontSize: 16 },
  balStatLabel: { color: colors.gray400, fontSize: 12, marginTop: 3 },

  histHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  viewAll: { color: colors.red, fontWeight: "700", fontSize: 13 },
  histRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  histDate: { alignItems: "center", width: 42, marginRight: 10 },
  histMon: { color: colors.gray400, fontSize: 10, fontWeight: "700" },
  histDay: { color: colors.black, fontSize: 18, fontWeight: "800" },
  histName: { fontWeight: "700", color: colors.black },
  histTimes: { color: colors.gray600, fontSize: 12, marginTop: 2 },
  histWorked: { fontWeight: "800" },
  histTag: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  empty: { color: colors.gray400, textAlign: "center", padding: 16 },

  downloadBtn: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  downloadText: { color: colors.black, fontWeight: "700" },
});
