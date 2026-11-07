import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Config: shop info, working hours, lunch break (FR-6.1) ---
  // NOTE: the shared admin_password_hash Config key is gone — staff auth is
  // now real per-user accounts in the User table (seeded below).
  const defaultConfig: Record<string, string> = {
    shop_name: "QuickFix Phone Repair",
    shop_address: "123 Main Street",
    shop_contact: "+1-555-0100",
    working_hours_start: "09:00",
    working_hours_end: "18:00",
    lunch_break_start: "13:00",
    lunch_break_end: "14:00",
    days_off: JSON.stringify(["Sunday"]),
  };

  for (const [key, value] of Object.entries(defaultConfig)) {
    await prisma.config.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  // --- Staff accounts (auth/RBAC) ---
  // One ADMIN (owner) and one TECHNICIAN (worker) so both roles can be
  // logged into and tested immediately after a fresh seed. Change both
  // passwords after first login — these are dev-only defaults.
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? "admin1234";
  const defaultTechPassword = process.env.DEFAULT_TECHNICIAN_PASSWORD ?? "tech1234";

  await prisma.user.upsert({
    where: { email: "admin@prqms.local" },
    create: {
      name: "Shop Owner",
      email: "admin@prqms.local",
      passwordHash: await bcrypt.hash(defaultAdminPassword, 10),
      role: "ADMIN",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "tech@prqms.local" },
    create: {
      name: "Technician",
      email: "tech@prqms.local",
      passwordHash: await bcrypt.hash(defaultTechPassword, 10),
      role: "TECHNICIAN",
    },
    update: {},
  });

  // --- Repair types (FR-3.1.1 dropdown values + estimated durations) ---
  const repairTypes: { name: string; estimatedDurationMinutes: number }[] = [
    { name: "Screen Replacement", estimatedDurationMinutes: 45 },
    { name: "Battery Replacement", estimatedDurationMinutes: 30 },
    { name: "Water Damage", estimatedDurationMinutes: 90 },
    { name: "Charging Port", estimatedDurationMinutes: 40 },
    { name: "Speaker Repair", estimatedDurationMinutes: 25 },
    { name: "Other", estimatedDurationMinutes: 60 },
  ];

  const createdTypes: Record<string, number> = {};
  for (const rt of repairTypes) {
    const row = await prisma.repairType.upsert({
      where: { name: rt.name },
      create: rt,
      update: { estimatedDurationMinutes: rt.estimatedDurationMinutes },
    });
    createdTypes[rt.name] = row.id;
  }

  // --- Price list (FR-3.1 / FR-3.2): a few brand-specific prices plus a
  // default fallback (deviceBrand = null) for every repair type ---
  const brandPrices: { repairType: string; deviceBrand: string; basePrice: number }[] = [
    { repairType: "Screen Replacement", deviceBrand: "iPhone", basePrice: 120 },
    { repairType: "Screen Replacement", deviceBrand: "Samsung", basePrice: 100 },
    { repairType: "Battery Replacement", deviceBrand: "iPhone", basePrice: 60 },
    { repairType: "Battery Replacement", deviceBrand: "Samsung", basePrice: 50 },
  ];

  for (const p of brandPrices) {
    const repairTypeId = createdTypes[p.repairType];
    await prisma.priceList.upsert({
      where: { repairTypeId_deviceBrand: { repairTypeId, deviceBrand: p.deviceBrand } },
      create: { repairTypeId, deviceBrand: p.deviceBrand, basePrice: p.basePrice },
      update: { basePrice: p.basePrice },
    });
  }

  const defaultFallbackPrices: Record<string, number> = {
    "Screen Replacement": 90,
    "Battery Replacement": 45,
    "Water Damage": 80,
    "Charging Port": 55,
    "Speaker Repair": 40,
    Other: 50,
  };

  // Prisma's compound-unique `where` input rejects `null` (SQL NULL is never
  // "equal" to NULL, so upsert-by-compound-unique can't target it). Do a
  // manual findFirst + create/update instead for the deviceBrand = null
  // (default fallback) rows.
  for (const [name, basePrice] of Object.entries(defaultFallbackPrices)) {
    const repairTypeId = createdTypes[name];
    const existing = await prisma.priceList.findFirst({
      where: { repairTypeId, deviceBrand: null },
    });
    if (existing) {
      await prisma.priceList.update({ where: { id: existing.id }, data: { basePrice } });
    } else {
      await prisma.priceList.create({ data: { repairTypeId, deviceBrand: null, basePrice } });
    }
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log(`Admin login:      admin@prqms.local / ${defaultAdminPassword}`);
  // eslint-disable-next-line no-console
  console.log(`Technician login: tech@prqms.local / ${defaultTechPassword}`);
  // eslint-disable-next-line no-console
  console.log("Change both passwords after first login.");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
