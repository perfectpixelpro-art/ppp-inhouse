import { Text, TouchableOpacity, View, StyleSheet, ActivityIndicator } from "react-native";
import { colors, radius } from "../theme";

export function Button({ title, onPress, variant = "primary", disabled, loading }) {
  const bg = variant === "primary" ? colors.red : variant === "dark" ? colors.black : colors.gray50;
  const fg = variant === "ghost" ? colors.black : colors.white;
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, color = colors.gray400 }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: radius.pill, alignItems: "center" },
  btnText: { fontWeight: "700", fontSize: 15 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: 14,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
});
