import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors, radius } from "../theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.gray50 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Brand */}
        <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brand}>PPP HR</Text>
        <Text style={styles.subtitle}>Employee Portal</Text>

        {/* Card */}
        <View style={styles.card}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputRow}>
            <Text style={styles.leadIcon}>✉︎</Text>
            <TextInput
              style={styles.input}
              placeholder="name@agency.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor={colors.gray400}
            />
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <View style={styles.inputRow}>
            <Text style={styles.leadIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={colors.gray400}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
            <TouchableOpacity onPress={() => setShowPass((s) => !s)} hitSlop={10}>
              <Text style={styles.eye}>{showPass ? "🙈" : "👁"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.button, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy} activeOpacity={0.85}>
            <Text style={styles.buttonText}>{busy ? "Logging in…" : "Log In  →"}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.forgot}>Forgot password? Contact HR / Admin</Text>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>PPP CREATIVE NETWORK</Text>
          <View style={styles.divider} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logo: { width: 84, height: 84, alignSelf: "center", marginBottom: 8 },
  brand: { fontSize: 30, fontWeight: "800", color: colors.black, textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.gray600, textAlign: "center", marginTop: 2, marginBottom: 24 },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  error: { color: colors.red, fontWeight: "600", marginBottom: 12, textAlign: "center" },

  label: { fontSize: 13, fontWeight: "700", color: colors.black, marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  leadIcon: { fontSize: 15, color: colors.gray400, marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.black },
  eye: { fontSize: 16, marginLeft: 8 },

  button: {
    backgroundColor: colors.red,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
    shadowColor: colors.red,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 16 },

  forgot: { textAlign: "center", color: colors.black, fontWeight: "600", fontSize: 13, marginTop: 24 },
  dividerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20, gap: 10 },
  divider: { height: 1, width: 30, backgroundColor: colors.gray200 },
  dividerText: { color: colors.gray400, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
});
