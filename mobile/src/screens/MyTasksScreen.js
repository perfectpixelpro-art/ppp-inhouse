import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from "react-native";
import { myTasks } from "../api/employee";
import { Card, Badge } from "../components/ui";
import { colors } from "../theme";
import { STATUS } from "../theme";
import { fmtDate } from "../utils/format";

const CLOSED = ["approved", "done"];
const isOverdue = (t) => t.dueDate && !CLOSED.includes(t.status) && new Date(t.dueDate) < new Date();

const TABS = ["Today", "Overdue", "Upcoming", "Completed"];

export default function MyTasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState("Today");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      setTasks(await myTasks());
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const today = new Date().toDateString();
  const bucket = (t) => {
    if (CLOSED.includes(t.status)) return "Completed";
    if (isOverdue(t)) return "Overdue";
    if (t.dueDate && new Date(t.dueDate).toDateString() === today) return "Today";
    return "Upcoming";
  };
  const shown = tasks.filter((t) => bucket(t) === tab);

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t} {tasks.filter((x) => bucket(x) === t).length}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {shown.length === 0 && <Text style={styles.empty}>Nothing here.</Text>}
        {shown.map((t) => {
          const s = STATUS[t.status] || STATUS.todo;
          return (
            <Card key={t._id} style={styles.taskCard}>
              <Text style={styles.title}>{t.title}</Text>
              <Text style={styles.project}>{t.projectId?.name || "No project"}</Text>
              <View style={styles.taskFoot}>
                <Badge label={s.label} color={s.color} />
                <Text style={styles.due}>Due {fmtDate(t.dueDate)}</Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.gray200 },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderColor: "transparent" },
  tabActive: { borderColor: colors.red },
  tabText: { color: colors.gray600, fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: colors.red },
  taskCard: { padding: 14 },
  title: { fontWeight: "700", fontSize: 15, color: colors.black },
  project: { color: colors.gray600, fontSize: 13, marginTop: 2 },
  taskFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  due: { color: colors.gray400, fontSize: 12 },
  empty: { color: colors.gray400, textAlign: "center", padding: 30 },
});
