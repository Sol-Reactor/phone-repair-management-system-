import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

// A physical device (Expo Go over the QR code) is a separate machine on the
// WiFi network — "localhost" and the Android-emulator-only "10.0.2.2" alias
// both refer to the *phone itself* in that case, not your dev machine, which
// is why requests were failing outright ("couldn't reach the server") rather
// than getting a 401/error response back from Express.
//
// Metro already knows your dev machine's real LAN IP — it's the address in
// "Metro waiting on exp://10.60.6.19:8081" in the terminal — and exposes it
// to the running app via expo-constants. Deriving BASE_URL from that instead
// of a hardcoded platform guess means this keeps working automatically
// whether you're on the emulator, a simulator, or a real phone, and however
// many times you switch WiFi networks.
function getDevServerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
  if (!hostUri) return null;
  return hostUri.split(":")[0];
}

const devHost = __DEV__ ? getDevServerHost() : null;

const BASE_URL = devHost
  ? `http://${devHost}:4000/api`
  : // Fallback for when hostUri isn't available (e.g. a production build,
    // which won't point at your dev machine anyway — set a real API URL
    // before ever shipping this build).
    Platform.select({
      android: "http://10.0.2.2:4000/api",
      ios: "http://localhost:4000/api",
      default: "http://localhost:4000/api",
    });

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log(`[api] using backend: ${BASE_URL}`);
}

export const TOKEN_KEY = "prqms_mobile_token";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  // X-Auth-Transport: the backend sets an httpOnly cookie for browsers and
  // only returns the raw JWT in the login body to clients that ask for it.
  headers: { "Content-Type": "application/json", "X-Auth-Transport": "bearer" },
});

// Attach the JWT (same Bearer-token scheme the web app uses) to every
// outgoing request, read fresh from AsyncStorage each time rather than
// cached in memory — simplest way to stay correct across app restarts.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Lets AuthProvider (lib/auth.tsx) react immediately when a request 401s
// mid-session (expired token) — otherwise the token gets cleared here but
// the app's in-memory `user` state doesn't know, so the UI stays on
// whatever screen it was on instead of bouncing back to /login.
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb;
}

// A 401 here means the token is missing/expired/invalid (see the backend's
// requireAuth/requireAdmin middleware) — clear it so the next screen render
// sees "logged out" instead of silently retrying with a dead token.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export type StaffUser = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "TECHNICIAN";
};

export async function login(email: string, password: string): Promise<StaffUser> {
  const { data } = await api.post<{ token: string; user: StaffUser }>("/admin/login", {
    email,
    password,
  });
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
  return data.user;
}

export async function fetchMe(): Promise<StaffUser> {
  const { data } = await api.get<StaffUser>("/admin/me");
  return data;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export default api;
