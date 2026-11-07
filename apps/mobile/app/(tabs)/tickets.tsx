import { View, Text } from "react-native";
import { Ticket as TicketIcon } from "lucide-react-native";

// Ticket Queue — placeholder shell matching the design system.
// Next step: wire this up to GET /api/tickets (requireAuth — both ADMIN and
// TECHNICIAN can see this data, see backend ticketRoutes.ts).
export default function TicketsScreen() {
  return (
    <View className="flex-1 bg-slate-50 px-5 pt-16">
      <Text className="text-slate-900 font-bold text-2xl">Tickets</Text>
      <Text className="text-slate-500 font-medium text-sm mt-1">Live repair queue</Text>

      <View className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mt-6 items-center py-10">
        <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mb-3">
          <TicketIcon color="#2563EB" size={20} />
        </View>
        <Text className="text-slate-900 font-bold text-sm text-center">Ticket list lands here next</Text>
        <Text className="text-slate-500 font-medium text-sm text-center mt-1">
          This screen is wired into navigation and ready for GET /tickets.
        </Text>
      </View>
    </View>
  );
}
