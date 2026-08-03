import { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";
import { colors, radius } from "../theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.logoDot}>
        <Text style={styles.logoText}>PPP</Text>
        <Text style={styles.logoAccent}>.</Text>
      </View>
      <Text style={styles.subtitle}>Employee Portal</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Work email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor={colors.gray400}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor={colors.gray400}
      />
      <Button title={busy ? "Logging in…" : "Log In"} onPress={submit} loading={busy} />
      <Text style={styles.note}>Forgot your password? Contact HR / Admin.</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: colors.white },
  logoDot: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end" },
  logoText: { fontSize: 44, fontWeight: "800", color: colors.black, letterSpacing: -1 },
  logoAccent: { fontSize: 44, fontWeight: "800", color: colors.accent },
  subtitle: { textAlign: "center", color: colors.gray600, fontSize: 15, marginBottom: 28 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
    color: colors.black,
    backgroundColor: colors.white,
  },
  error: { color: colors.red, textAlign: "center", marginBottom: 12, fontWeight: "600" },
  note: { textAlign: "center", color: colors.gray400, fontSize: 13, marginTop: 16 },
});
