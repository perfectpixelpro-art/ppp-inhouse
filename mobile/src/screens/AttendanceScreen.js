import { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { myToday, myAttendance, checkIn, checkOut } from "../api/employee";
import { Card, Button, Badge } from "../components/ui";
import { colors, radius } from "../theme";
import { targetMs, workedNow, fmtClock, fmtHm, fmtTime, fmtDate } from "../utils/format";

const STATE_LABEL = {
  not_started: "Not started",
  working: "Working",
  on_lunch: "On lunch",
  on_break: "On short break",
  ended: "Day ended",
};

export default function AttendanceScreen() {
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
    } catch (e) {
      // keep last state on error
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Live ticking while working.
  useEffect(() => {
    clearInterval(tick.current);
    if (today?.state === "working") tick.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick.current);
  }, [today?.state]);

  const act = async (fn) => {
    setBusy(true);
    try {
      const updated = await fn();
      setToday(updated);
      setNow(Date.now());
      await load();
    } catch (e) {
      // surface later via a toast component
    } finally {
      setBusy(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const state = today?.state || "not_started";
  const target = targetMs(today);
  const worked = workedNow(today, now);
  const pct = Math.min(100, Math.round((worked / target) * 100));
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRecords = records.filter((r) => String(r.date).slice(0, 7) === thisMonth);

  // Month balance
  const done = monthRecords.filter((r) => r.state === "ended");
  let over = 0, short = 0;
  for (const r of done) {
    const d = (r.workedMs || 0) - (r.dayType === "half" ? 4 : 8) * 3600000;
    if (d > 0) over += d; else short += -d;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.gray50 }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Timer card */}
      <Card>
        <View style={styles.pillRow}>
          <Badge label={STATE_LABEL[state]} color={state === "working" ? colors.green : colors.gray400} />
          {today && state !== "not_started" && (
            <Badge label={today.dayType === "half" ? "Half · 4h" : "Full · 8h"} color={colors.black} />
          )}
        </View>
        <Text style={styles.clock}>{fmtClock(worked)}</Text>
        <Text style={styles.sub}>
          {(worked / 3600000).toFixed(1)} h of {target / 3600000} h
        </Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.meta}>In: {fmtTime(today?.checkIn)}</Text>

        <View style={{ marginTop: 14 }}>
          {state === "not_started" && (
            <View style={{ gap: 10 }}>
              <Button title="☀️ Full Day (8h)" variant="dark" onPress={() => act(() => checkIn("full"))} disabled={busy} />
              <Button title="🌤 Half Day (4h · no lunch)" variant="ghost" onPress={() => act(() => checkIn("half"))} disabled={busy} />
            </View>
          )}
          {state === "working" && (
            <Button title="Check Out" onPress={() => act(() => checkOut("end"))} disabled={busy} />
          )}
          {(state === "on_break" || state === "on_lunch") && (
            <Button title="Resume (Check In)" variant="dark" onPress={() => act(() => checkIn())} disabled={busy} />
          )}
        </View>
      </Card>

      {/* Month balance */}
      <Card>
        <Text style={styles.cardLabel}>This month balance</Text>
        <View style={styles.balanceRow}>
          <Stat label="Overtime" value={`+${fmtHm(over)}`} color={colors.green} />
          <Stat label="Short" value={`−${fmtHm(short)}`} color={colors.red} />
          <Stat label="Days" value={String(done.length)} color={colors.black} />
        </View>
      </Card>

      {/* History */}
      <Text style={styles.histTitle}>My history · this month</Text>
      {monthRecords.length === 0 && <Text style={styles.empty}>No attendance this month yet.</Text>}
      {monthRecords.map((r) => (
        <Card key={r._id} style={styles.histRow}>
          <View>
            <Text style={styles.histDate}>{fmtDate(r.date)}</Text>
            <Text style={styles.histTimes}>
              {fmtTime(r.checkIn)} → {fmtTime(r.checkOut)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.histWorked}>{r.state === "ended" ? fmtHm(r.workedMs || 0) : "—"}</Text>
            <Badge
              label={STATE_LABEL[r.state] || r.status}
              color={r.state === "ended" ? colors.green : colors.gray400}
            />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  clock: { fontSize: 46, fontWeight: "800", color: colors.black, letterSpacing: -1 },
  sub: { color: colors.gray600, marginTop: 2 },
  bar: { height: 8, backgroundColor: colors.gray200, borderRadius: radius.pill, marginTop: 12, overflow: "hidden" },
  barFill: { height: 8, backgroundColor: colors.red },
  meta: { color: colors.gray600, marginTop: 8, fontSize: 13 },
  cardLabel: { color: colors.gray400, fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 10 },
  balanceRow: { flexDirection: "row" },
  statLabel: { color: colors.gray400, fontSize: 11, fontWeight: "600" },
  statValue: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  histTitle: { fontSize: 16, fontWeight: "700", color: colors.black, marginBottom: 10, marginTop: 6 },
  histRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  histDate: { fontWeight: "700", color: colors.black },
  histTimes: { color: colors.gray600, fontSize: 13, marginTop: 2 },
  histWorked: { fontWeight: "700", color: colors.black, marginBottom: 4 },
  empty: { color: colors.gray400, textAlign: "center", padding: 20 },
});
