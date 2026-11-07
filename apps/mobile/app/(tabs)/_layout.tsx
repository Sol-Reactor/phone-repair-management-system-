import { Tabs, Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { LayoutDashboard, Ticket, Package, Settings } from "lucide-react-native";
import { useAuth } from "../../lib/auth";

type IconComponent = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

// Small "pill" behind the active tab's icon — the one bit of default
// react-navigation tab bar chrome (a flat colored icon with no depth) that
// reads as cheap/basic rather than premium. A soft rounded highlight behind
// the focused icon is the fastest way to fix that.
function TabIcon({ Icon, focused, color }: { Icon: IconComponent; focused: boolean; color: string }) {
  return (
    <View
      className={`w-11 h-9 rounded-2xl items-center justify-center ${focused ? "bg-blue-50" : ""}`}
    >
      <Icon color={color} size={20} strokeWidth={focused ? 2.4 : 2} />
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, loading } = useAuth();

  // Wait for the initial "is there already a token?" check (lib/auth.tsx)
  // before deciding — otherwise a logged-in user flashes the login screen
  // on every cold start while GET /admin/me is still in flight.
  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB", // blue-600
        tabBarInactiveTintColor: "#94A3B8", // slate-400
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F1F5F9", // slate-100 hairline — subtle, not the "ugly default" harsh border
          elevation: 8, // Android: soft shadow so the bar still separates from light content
          shadowColor: "#0F172A",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          height: 88,
          paddingTop: 10,
          paddingBottom: 26,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={LayoutDashboard} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Tickets",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Ticket} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Package} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Settings} focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
