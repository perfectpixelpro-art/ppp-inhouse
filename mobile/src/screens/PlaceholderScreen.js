import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

// Simple stub used for screens not built yet (Leave, Projects, Portfolio).
// Replace each with a real screen following the AttendanceScreen / MyTasksScreen pattern.
export default function PlaceholderScreen({ title = "Coming soon", note }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note || "This screen is scaffolded and ready to build."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, backgroundColor: colors.gray50 },
  title: { fontSize: 20, fontWeight: "800", color: colors.black, marginBottom: 8 },
  note: { color: colors.gray600, textAlign: "center" },
});
