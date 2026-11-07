import "../global.css";
import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { verifyInstallation } from "nativewind";
import { AuthProvider } from "../lib/auth";

export default function RootLayout() {
  // TEMPORARY DIAGNOSTIC — NativeWind's own official troubleshooting helper.
  // Must run inside a component (not at module scope). It logs a detailed
  // report to the Metro terminal explaining exactly what's misconfigured,
  // if anything, rather than us guessing further.
  verifyInstallation();

  return (
    <AuthProvider>
      {/* TEMPORARY DIAGNOSTIC — delete this View once we confirm whether
          NativeWind's className transform is actually running. If this
          renders as a solid red bar with bold white "NATIVEWIND TEST" text,
          the pipeline works. If it renders as plain/invisible text with no
          red background, className is being silently ignored everywhere. */}
      <View className="bg-red-600 py-3 items-center justify-center" style={{ paddingTop: 44 }}>
        <Text className="text-white font-bold text-lg">NATIVEWIND TEST</Text>
      </View>

      {/* Default to dark status-bar content (dark icons/text) since the
          main app screens are now light (bg-slate-50) — login.tsx overrides
          this locally back to "light" content for its own dark background. */}
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ animation: "fade" }} />
      </Stack>
    </AuthProvider>
  );
}
