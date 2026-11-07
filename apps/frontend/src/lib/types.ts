export type TicketStatus = "WAITING" | "IN_PROGRESS" | "DONE" | "COLLECTED" | "CANCELLED";

export type RepairStage = "DROPPED_OFF" | "DIAGNOSING" | "WAITING_ON_PARTS" | "REPAIRING" | "READY_FOR_PICKUP";

export type Customer = {
  id: number;
  name: string;
  phoneNumber: string;
  email: string | null;
  telegramChatId: string | null;
  createdAt: string;
};

export type CustomerSearchResult = Customer & {
  lastDeviceBrand: string | null;
};

export type RepairType = {
  id: number;
  name: string;
  estimatedDurationMinutes: number;
};

export type PriceListEntry = {
  id: number;
  repairTypeId: number;
  deviceBrand: string | null;
  basePrice: number;
  repairType?: RepairType;
  createdAt: string;
  updatedAt: string;
};

// Liability-protection checklist: device condition on arrival, recorded by
// the technician. Required (server-enforced, see PATCH /tickets/:id/status)
// before a ticket can move WAITING -> IN_PROGRESS.
export type ScreenCondition = "SCRATCHED" | "CRACKED" | "PERFECT";

export type PreRepairChecklist = {
  id: number;
  ticketId: number;
  screenCondition: ScreenCondition;
  touchFaceIdWorking: boolean;
  camerasWorking: boolean;
  chargingPortWorking: boolean;
  technicianNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Ticket = {
  id: number;
  customerId: number;
  deviceBrand: string;
  deviceModel: string;
  repairTypeId: number;
  problemDescription: string;
  status: TicketStatus;
  repairStage: RepairStage;
  trackingCode: string;
  registeredAt: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedStartTime: string | null;
  estimatedCost: number;
  actualCost: number | null;
  queuePosition: number | null;
  notes: string | null;
  cancellationReason: string | null;
  hasPin: boolean;
  customer: Customer;
  repairType: RepairType;
  preRepairChecklist: PreRepairChecklist | null;
};

export type ShopConfig = Record<string, string>;

// Shape of GET /api/track/:trackingCode — deliberately minimal (no
// customer name/phone/PIN), matching what that public endpoint returns.
export type TrackedTicket = {
  deviceBrand: string;
  deviceModel: string;
  repairType: string;
  status: TicketStatus;
  repairStage: RepairStage;
  estimatedStartTime: string | null;
  registeredAt: string;
};

// "Get in Touch" form submissions — a general inquiry, not a repair ticket.
export type ContactMessageStatus = "UNREAD" | "READ" | "REPLIED";

export type ContactMessage = {
  id: number;
  reference: string; // e.g. "C-1042"
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactMessageStatus;
  replyText: string | null;
  repliedAt: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// B2B Wholesale Parts Distribution
// ---------------------------------------------------------------------------

export type WholesaleItem = {
  id: number;
  name: string;
  category: string;
  stockQuantity: number;
  unitPrice: number;
  minStockLevel: number;
  createdAt: string;
  updatedAt: string;
};

export type ExternalTechnician = {
  id: number;
  name: string;
  phone: string;
  shopLocation: string;
  totalDebt: number;
  createdAt: string;
  updatedAt: string;
};

export type PaymentStatus = "PAID" | "PARTIAL" | "LOAN";

export type DistributionLedgerEntry = {
  id: number;
  wholesaleItemId: number;
  externalTechnicianId: number;
  quantityTaken: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  wholesaleItem: WholesaleItem;
  externalTechnician: ExternalTechnician;
};

// ---------------------------------------------------------------------------
// Advanced Stock Management — inbound restocking, defective/waste tracking,
// and the low-stock shopping list (GET /api/admin/stock/*).
// ---------------------------------------------------------------------------

export type Supplier = {
  id: number;
  name: string;
  phone: string;
  location: string;
};

export type RestockLogEntry = {
  id: number;
  wholesaleItemId: number;
  supplierId: number;
  quantityAdded: number;
  unitCostPrice: number;
  totalCost: number;
  createdAt: string;
  wholesaleItem: WholesaleItem;
  supplier: Supplier;
};

export type DefectiveStatus = "WAITING_FOR_REFUND" | "REFUNDED";

export type DefectiveLogEntry = {
  id: number;
  wholesaleItemId: number;
  quantity: number;
  reason: string;
  reportedBy: string;
  status: DefectiveStatus;
  createdAt: string;
  wholesaleItem: WholesaleItem;
};

export type LowStockItem = WholesaleItem & {
  suggestedReorderQty: number;
};

// ---------------------------------------------------------------------------
// CEO Analytics Dashboard — GET /api/admin/analytics
// ---------------------------------------------------------------------------

export type AnalyticsStats = {
  totalRevenue: number;
  outstandingDebt: number;
  activeRepairs: number;
};

export type RevenuePoint = {
  date: string;
  revenue: number;
};

export type StatusDistributionSlice = {
  name: string;
  value: number;
};

export type AnalyticsData = {
  stats: AnalyticsStats;
  revenueOverTime: RevenuePoint[];
  statusDistribution: StatusDistributionSlice[];
};
