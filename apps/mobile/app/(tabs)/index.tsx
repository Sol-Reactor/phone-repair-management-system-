import { useCallback, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { Wrench, AlertTriangle, DollarSign, Mail, Lock } from "lucide-react-native";
import api from "../../lib/api";
import { useAuth } from "../../lib/auth";

type Ticket = {
  id: number;
  customer: { name: string };
  deviceBrand: string;
  deviceModel: string;
  repairType: { name: string };
  status: "WAITING" | "IN_PROGRESS" | "DONE" | "COLLECTED" | "CANCELLED";
  registeredAt: string;
};

type LowStockItem = { id: number };
type ContactMessage = { id: number; status: "UNREAD" | "READ" | "REPLIED" };
type Analytics = { revenueOverTime: { revenue: number }[] };

// Soft-badge palette (bg-*-100 + text-*-700) per the design system, reused
// for the status pill on each Recent Activity row.
const STATUS_BADGE: Record<Ticket["status"], string> = {
  WAITING: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  COLLECTED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-rose-100 text-rose-700",
};
const STATUS_LABEL: Record<Ticket["status"], string> = {
  WAITING: "Waiting",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  COLLECTED: "Collected",
  CANCELLED: "Cancelled",
};

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// "Admin only" badge shown on a stat card the current user's role can't
// read (analytics/stock/messages are all requireAdmin on the backend — a
// TECHNICIAN gets a 403 for those three, but still sees Active Repairs,
// which comes from GET /tickets and is open to both roles).
function StatCard({
  icon,
  iconBg,
  label,
  value,
  locked,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  locked?: boolean;
}) {
  return (
    <View className="w-[47%] bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
      <View className={`w-10 h-10 rounded-2xl items-center justify-center mb-3 ${iconBg}`}>{icon}</View>
      <Text className="text-slate-500 font-medium text-xs">{label}</Text>
      {locked ? (
        <View className="flex-row items-center mt-1.5">
          <Lock color="#94A3B8" size={12} />
          <Text className="text-slate-400 font-bold text-sm ml-1">Admin only</Text>
        </View>
      ) : (
        <Text className="text-slate-900 font-bold text-3xl mt-1">{value}</Text>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const { user, isAdmin } = useAuth();

  const [activeRepairs, setActiveRepairs] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState<number | null>(null);
  const [todayRevenue, setTodayRevenue] = useState<number | null>(null);
  const [pendingMessages, setPendingMessages] = useState<number | null>(null);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Independent requests, not Promise.all: a TECHNICIAN legitimately gets
    // a 403 on three of these (they're requireAdmin on the backend), and
    // that shouldn't blank out the one stat + the ticket list they DO have
    // access to. Each card just falls back to its own "Admin only" state.
    const [ticketsRes, lowStockRes, analyticsRes, messagesRes] = await Promise.allSettled([
      api.get<Ticket[]>("/tickets"),
      api.get<LowStockItem[]>("/admin/stock/low"),
      api.get<Analytics>("/admin/analytics"),
      api.get<ContactMessage[]>("/contact"),
    ]);

    if (ticketsRes.status === "fulfilled") {
      setActiveRepairs(ticketsRes.value.data.length);
      setRecentTickets(ticketsRes.value.data.slice(0, 5));
    }
    if (lowStockRes.status === "fulfilled") setLowStock(lowStockRes.value.data.length);
    if (analyticsRes.status === "fulfilled") {
      const buckets = analyticsRes.value.data.revenueOverTime;
      setTodayRevenue(buckets[buckets.length - 1]?.revenue ?? 0);
    }
    if (messagesRes.status === "fulfilled") {
      setPendingMessages(messagesRes.value.data.filter((m) => m.status === "UNREAD").length);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const initials = (user?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#2563EB"
          />
        }
      >
        {/* Greeting header */}
        <View className="flex-row items-center justify-between px-5 pt-16 pb-6">
          <View>
            <Text className="text-slate-500 font-medium text-sm">Welcome back</Text>
            <Text className="text-slate-900 font-bold text-2xl mt-0.5">{firstName}</Text>
          </View>
          <View className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center">
            <Text className="text-blue-700 font-bold text-base">{initials}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="px-5 flex-row flex-wrap justify-between gap-y-3">
          <StatCard
            icon={<Wrench color="#2563EB" size={18} />}
            iconBg="bg-blue-50"
            label="Active Repairs"
            value={activeRepairs === null ? (loading ? "…" : "—") : String(activeRepairs)}
          />
          <StatCard
            icon={<AlertTriangle color="#E11D48" size={18} />}
            iconBg="bg-rose-50"
            label="Low Stock"
            value={lowStock === null ? (loading ? "…" : "0") : String(lowStock)}
            locked={!isAdmin && lowStock === null}
          />
          <StatCard
            icon={<DollarSign color="#059669" size={18} />}
            iconBg="bg-emerald-50"
            label="Today's Revenue"
            value={todayRevenue === null ? "…" : `$${todayRevenue.toFixed(2)}`}
            locked={!isAdmin && todayRevenue === null}
          />
          <StatCard
            icon={<Mail color="#7C3AED" size={18} />}
            iconBg="bg-violet-50"
            label="Pending Messages"
            value={pendingMessages === null ? (loading ? "…" : "0") : String(pendingMessages)}
            locked={!isAdmin && pendingMessages === null}
          />
        </View>

        {/* Recent Activity */}
        <View className="px-5 mt-8">
          <Text className="text-slate-900 font-bold text-base mb-3">Recent Activity</Text>
          <View className="gap-2.5">
            {recentTickets.map((t) => (
              <View
                key={t.id}
                className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex-row items-center"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>
                    {t.customer.name} · {t.deviceBrand} {t.deviceModel}
                  </Text>
                  <Text className="text-slate-500 font-medium text-xs mt-0.5" numberOfLines={1}>
                    {t.repairType.name} · {timeAgo(t.registeredAt)}
                  </Text>
                </View>
                <View className={`px-2.5 py-1 rounded-full ${STATUS_BADGE[t.status]}`}>
                  <Text className={`text-xs font-bold ${STATUS_BADGE[t.status].split(" ")[1]}`}>
                    {STATUS_LABEL[t.status]}
                  </Text>
                </View>
              </View>
            ))}

            {!loading && recentTickets.length === 0 && (
              <View className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 items-center">
                <Text className="text-slate-400 font-medium text-sm">No active tickets right now.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
