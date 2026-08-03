import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Badge } from "../components/ui";
import { colors } from "../theme";

const ROLE_LABEL = { admin: "Admin", hr: "HR", project_manager: "Project Manager", employee: "Employee" };

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  return (
    <View style={styles.wrap}>
      <Card>
        <Text style={styles.name}>{user?.name}</Text>
        <Badge label={ROLE_LABEL[user?.role] || user?.role} color={colors.red} />
        <Text style={styles.row}>Email: {user?.email}</Text>
        {user?.department ? <Text style={styles.row}>Department: {user.department}</Text> : null}
        {user?.designation ? <Text style={styles.row}>Designation: {user.designation}</Text> : null}
      </Card>
      <Button title="Log Out" variant="dark" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: colors.gray50 },
  name: { fontSize: 22, fontWeight: "800", color: colors.black, marginBottom: 8 },
  row: { color: colors.gray600, marginTop: 8 },
});
