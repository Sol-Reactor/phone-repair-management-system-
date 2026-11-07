import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { LogOut, ShieldCheck } from "lucide-react-native";
import { useAuth } from "../../lib/auth";

export default function SettingsScreen() {
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View className="flex-1 bg-slate-50 px-5 pt-16">
      <Text className="text-slate-900 font-bold text-2xl">Settings</Text>
      <Text className="text-slate-500 font-medium text-sm mt-1">Account &amp; app</Text>

      <View className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mt-6 flex-row items-center">
        <View className="w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center mr-3">
          <ShieldCheck color="#2563EB" size={18} />
        </View>
        {user ? (
          <View className="flex-1">
            <Text className="text-slate-900 font-bold text-sm">{user.name}</Text>
            <Text className="text-slate-500 font-medium text-xs mt-0.5">{user.email}</Text>
          </View>
        ) : (
          <Text className="text-slate-400 font-medium text-sm flex-1">Not logged in</Text>
        )}
        {user && (
          <View className={`px-2.5 py-1 rounded-full ${isAdmin ? "bg-blue-100" : "bg-slate-100"}`}>
            <Text className={`text-xs font-bold ${isAdmin ? "text-blue-700" : "text-slate-600"}`}>
              {user.role}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.85}
        className="bg-rose-100 rounded-3xl p-5 mt-4 flex-row items-center justify-center gap-2"
      >
        <LogOut color="#E11D48" size={18} />
        <Text className="text-rose-700 font-bold">Log out</Text>
      </TouchableOpacity>
    </View>
  );
}
