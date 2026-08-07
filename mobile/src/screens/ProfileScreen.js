import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors, radius } from "../theme";

const ROLE_LABEL = { admin: "ADMIN", hr: "HR", project_manager: "PROJECT MANAGER", employee: "EMPLOYEE" };

const monthYear = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—";

const initials = (name = "") =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const confirmLogout = () =>
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);

  const soon = (label) => Alert.alert(label, "Managed by HR / Admin.");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.gray50 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {user?.photo ? (
          <Image source={{ uri: user.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials(user?.name)}</Text>
          </View>
        )}
        <View style={styles.onlineDot} />
      </View>

      <Text style={styles.name}>{user?.name}</Text>
      <View style={styles.rolePill}>
        <Text style={styles.roleText}>
          {user?.designation ? `${user.designation}  •  ` : ""}{ROLE_LABEL[user?.role] || (user?.role || "").toUpperCase()}
        </Text>
      </View>

      {/* Info cards */}
      <View style={styles.row}>
        <View style={[styles.infoCard, { marginRight: 6 }]}>
          <Text style={styles.infoIcon}>🏢</Text>
          <Text style={styles.infoLabel}>Department</Text>
          <Text style={styles.infoValue}>{user?.department || "—"}</Text>
        </View>
        <View style={[styles.infoCard, { marginLeft: 6 }]}>
          <Text style={styles.infoIcon}>📅</Text>
          <Text style={styles.infoLabel}>Member Since</Text>
          <Text style={styles.infoValue}>{monthYear(user?.joinDate || user?.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.emailCard}>
        <Text style={styles.infoIcon}>✉️</Text>
        <View style={{ marginLeft: 4 }}>
          <Text style={styles.infoLabel}>Work Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
      </View>

      {/* Preferences */}
      <Text style={styles.sectionTitle}>APP PREFERENCES</Text>
      <View style={styles.prefCard}>
        <PrefRow icon="🔔" label="Notifications" value="On" onPress={() => soon("Notifications")} />
        <Divider />
        <PrefRow icon="🛡" label="Security & Privacy" onPress={() => soon("Security & Privacy")} />
        <Divider />
        <PrefRow icon="🌐" label="Language" value="English" onPress={() => soon("Language")} />
      </View>

      {/* Log out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>⎋  Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>App Version 1.0.0 (PPP Creative Network)</Text>
    </ScrollView>
  );
}

function PrefRow({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity style={styles.prefRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.prefIcon}>{icon}</Text>
      <Text style={styles.prefLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {value ? <Text style={styles.prefValue}>{value}</Text> : null}
        <Text style={styles.prefCaret}> ›</Text>
      </View>
    </TouchableOpacity>
  );
}

const Divider = () => <View style={styles.prefDivider} />;

const styles = StyleSheet.create({
  avatarWrap: { alignSelf: "center", marginTop: 8, marginBottom: 14 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.white },
  avatarFallback: { backgroundColor: colors.red, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: colors.white, fontSize: 32, fontWeight: "800" },
  onlineDot: {
    position: "absolute", right: 4, bottom: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.green, borderWidth: 3, borderColor: colors.gray50,
  },

  name: { fontSize: 26, fontWeight: "800", color: colors.black, textAlign: "center" },
  rolePill: { alignSelf: "center", backgroundColor: "#fdeaea", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8, marginBottom: 20 },
  roleText: { color: colors.red, fontWeight: "700", fontSize: 12, letterSpacing: 0.3 },

  row: { flexDirection: "row" },
  infoCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.gray200 },
  infoIcon: { fontSize: 16, marginBottom: 6 },
  infoLabel: { fontSize: 11, color: colors.gray400, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  infoValue: { fontSize: 15, fontWeight: "700", color: colors.black, marginTop: 3 },

  emailCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.gray200 },

  sectionTitle: { fontSize: 12, fontWeight: "800", color: colors.gray400, letterSpacing: 0.5, marginTop: 24, marginBottom: 10 },
  prefCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200, overflow: "hidden" },
  prefRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 15 },
  prefIcon: { fontSize: 16, marginRight: 12 },
  prefLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.black },
  prefValue: { color: colors.gray400, fontSize: 14 },
  prefCaret: { color: colors.gray400, fontSize: 18 },
  prefDivider: { height: 1, backgroundColor: colors.gray200, marginLeft: 42 },

  logoutBtn: { borderWidth: 1.5, borderColor: colors.red, borderRadius: radius.pill, paddingVertical: 15, alignItems: "center", marginTop: 26 },
  logoutText: { color: colors.red, fontWeight: "700", fontSize: 16 },

  version: { textAlign: "center", color: colors.gray400, fontSize: 12, marginTop: 18 },
});
