import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { Plus, PackageSearch, AlertTriangle } from "lucide-react-native";
import api from "../../lib/api";

type WholesaleItem = {
  id: number;
  name: string;
  category: string;
  stockQuantity: number;
  unitPrice: number;
  minStockLevel: number;
};

type LowStockItem = WholesaleItem & { suggestedReorderQty: number };

const LOW_STOCK_THRESHOLD = 5;

export default function StockScreen() {
  const [items, setItems] = useState<WholesaleItem[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [itemsRes, lowRes] = await Promise.all([
        api.get<WholesaleItem[]>("/admin/wholesale/items"),
        api.get<LowStockItem[]>("/admin/stock/low"),
      ]);
      setItems(itemsRes.data);
      setLowStockCount(lowRes.data.length);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setError("Your account doesn't have access to inventory data.");
      } else if (e?.response?.status === 401) {
        setError("Please log in again.");
      } else {
        setError("Couldn't load inventory. Pull down to retry.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch every time the tab regains focus, so a restock/distribution
  // done elsewhere in the app (or on the web dashboard) shows up here
  // without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalUnits = items.reduce((sum, item) => sum + item.stockQuantity, 0);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
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
        {/* Header */}
        <View className="px-5 pt-16 pb-4">
          <Text className="text-slate-900 font-bold text-2xl">Inventory &amp; Wholesale</Text>
          <Text className="text-slate-500 font-medium text-sm mt-1">Live stock levels across your catalog</Text>
        </View>

        {error && (
          <View className="mx-5 mb-4 bg-rose-100 rounded-3xl p-4">
            <Text className="text-rose-700 font-medium text-sm">{error}</Text>
          </View>
        )}

        {/* Summary cards */}
        <View className="flex-row px-5 gap-3 mb-6">
          <View className="flex-1 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center mb-3">
              <PackageSearch color="#2563EB" size={18} />
            </View>
            <Text className="text-slate-500 font-medium text-xs">Total Items in Stock</Text>
            <Text className="text-slate-900 font-bold text-3xl mt-1">{totalUnits}</Text>
            <Text className="text-slate-400 font-medium text-xs mt-0.5">{items.length} SKUs</Text>
          </View>

          <View className="flex-1 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <View className="w-10 h-10 rounded-2xl bg-rose-50 items-center justify-center mb-3">
              <AlertTriangle color="#E11D48" size={18} />
            </View>
            <Text className="text-slate-500 font-medium text-xs">Low Stock Alerts</Text>
            <Text className="text-slate-900 font-bold text-3xl mt-1">{lowStockCount}</Text>
            <Text className="text-slate-400 font-medium text-xs mt-0.5">need reordering</Text>
          </View>
        </View>

        {/* Inventory list */}
        <View className="px-5">
          <Text className="text-slate-900 font-bold text-base mb-3">All Items</Text>
          <View className="gap-2.5">
            {items.map((item) => {
              const isLow = item.stockQuantity < LOW_STOCK_THRESHOLD;
              return (
                <View
                  key={item.id}
                  className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex-row items-center justify-between"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-slate-900 font-bold text-base" numberOfLines={1}>
                      {item.name}
                    </Text>
                    {/* WholesaleItem has no per-item "supplier" field — supplier
                        is only recorded per restock event (RestockLog), so an
                        item can legitimately have been restocked from more than
                        one. Category is the closest stable, always-present
                        attribute, shown here in its place. */}
                    <Text className="text-slate-500 font-medium text-xs mt-0.5">{item.category}</Text>
                  </View>
                  {isLow ? (
                    <View className="px-2.5 py-1 rounded-full bg-rose-100">
                      <Text className="text-rose-700 font-bold text-sm">{item.stockQuantity}</Text>
                    </View>
                  ) : (
                    <Text className="text-slate-900 font-bold text-lg">{item.stockQuantity}</Text>
                  )}
                </View>
              );
            })}

            {items.length === 0 && !error && (
              <View className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 items-center">
                <Text className="text-slate-400 font-medium text-sm">No items in the catalog yet.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => Alert.alert("Coming soon", "Distribute Part / Restock modal goes here.")}
        className="absolute bottom-8 right-6 w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg"
        style={{
          shadowColor: "#2563EB",
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <Plus color="white" size={26} />
      </TouchableOpacity>
    </View>
  );
}
