import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, ReceiptText, Wrench } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { AnalyticsData } from "../../lib/types";
import { Card, ErrorText } from "../../components/ui";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Same three colors as the "Done"/"In Process"/"Dropped Off" buckets should
// read at a glance elsewhere in the app (StatusBadge's amber/blue/green).
const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981"]; // Dropped Off, In Process, Done

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  accent: "emerald" | "red" | "blue";
}) {
  const accentClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  }[accent];

  return (
    <Card className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accentClasses}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
      </div>
    </Card>
  );
}

// CEO Analytics Dashboard — a new page, deliberately not a replacement for
// the operational Live Queue at /app: that's what staff use to actually run
// repairs minute-to-minute, and nuking it for a charts page would break the
// shop. This lives alongside it at /admin/analytics.
export function AdminAnalyticsPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      api
        .get<AnalyticsData>("/admin/analytics")
        .then(setData)
        .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load analytics"));

    load();
    // Aggregation queries are heavier than the queue poll, so refresh less
    // often (30s, vs. the Live Queue's 8s) — this dashboard doesn't need
    // second-by-second freshness.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const tooltipStyle = {
    background: isDark ? "#1e293b" : "#ffffff",
    border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
    borderRadius: 8,
    fontSize: 13,
    color: isDark ? "#f1f5f9" : "#1e293b",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Analytics</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Revenue, debt, and repair throughput across both the repair shop and wholesale branch.
        </p>
      </div>

      <ErrorText>{error}</ErrorText>

      {!data ? (
        <p className="text-sm text-slate-500 dark:text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={DollarSign} label="Total Revenue" value={money(data.stats.totalRevenue)} accent="emerald" />
            <StatCard
              icon={ReceiptText}
              label="Total Outstanding Debt"
              value={money(data.stats.outstandingDebt)}
              accent="red"
            />
            <StatCard icon={Wrench} label="Active Repairs" value={String(data.stats.activeRepairs)} accent="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 dark:text-slate-400">
                Revenue — Last 7 Days
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.revenueOverTime} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="date" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke={axisColor}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [money(value), "Revenue"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#3b82f6" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 dark:text-slate-400">
                Repair Status Distribution
              </h2>
              <div className="h-72">
                {data.statusDistribution.every((s) => s.value === 0) ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-500">
                    No active repairs yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {data.statusDistribution.map((slice, i) => (
                          <Cell key={slice.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend
                        verticalAlign="bottom"
                        height={32}
                        formatter={(value) => <span style={{ color: axisColor, fontSize: 12 }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
