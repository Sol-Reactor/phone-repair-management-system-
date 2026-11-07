import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ShieldCheck, ArrowRight } from "lucide-react-native";
import { useAuth } from "../lib/auth";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      // Backend returns the same generic message for a bad email or a bad
      // password (see authController.login) — don't invent a more specific
      // one here, that would leak which emails have accounts.
      setError(e?.response?.data?.error ?? "Couldn't reach the server. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900">
      {/* Root layout defaults the status bar to dark content for the (now
          light) main app screens — override back to light content here
          since this specific screen is dark. */}
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 items-center justify-center px-6">
            {/* Logo */}
            <View className="w-16 h-16 rounded-3xl bg-blue-600 items-center justify-center mb-3 shadow-lg">
              <Text className="text-white font-extrabold text-2xl">Q</Text>
            </View>
            <Text className="text-white font-bold text-xl tracking-tight mb-8">PRQMS</Text>

            {/* Card */}
            <View className="bg-slate-800 rounded-3xl p-8 w-11/12 max-w-sm">
              <Text className="text-white text-xl font-bold text-center mb-1">Welcome back</Text>
              <Text className="text-slate-400 font-medium text-center mb-6">Sign in to manage the shop</Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                className="bg-slate-700 text-white rounded-2xl p-4 mb-4 text-lg"
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                onSubmitEditing={handleSubmit}
                className="bg-slate-700 text-white rounded-2xl p-4 text-lg"
              />

              {error && <Text className="text-rose-400 font-medium text-sm mt-4">{error}</Text>}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
                className={`rounded-2xl p-4 flex-row justify-center items-center mt-6 ${
                  submitting ? "bg-blue-600/50" : "bg-blue-600"
                }`}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className="text-white font-bold text-base mr-1.5">Sign in</Text>
                    <ArrowRight color="white" size={18} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center mt-6 opacity-60">
              <ShieldCheck color="#64748B" size={14} />
              <Text className="text-slate-500 text-xs font-medium ml-1.5">Owner &amp; staff access only</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
