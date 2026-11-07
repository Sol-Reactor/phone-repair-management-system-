import { prisma } from "./prisma";

export type ResolvedPrice = {
  source: "exact" | "default";
  basePrice: number;
} | null;

// FR-3.2 / FR-3.4: look up the price for a repair type + device brand,
// falling back to the brand-agnostic default (deviceBrand = null) row for
// that repair type. Shared by the price-list lookup endpoint and ticket
// registration (estimated cost at intake).
export async function resolvePrice(repairTypeId: number, deviceBrand?: string): Promise<ResolvedPrice> {
  if (deviceBrand) {
    const exact = await prisma.priceList.findUnique({
      where: { repairTypeId_deviceBrand: { repairTypeId, deviceBrand } },
    });
    if (exact) {
      return { source: "exact", basePrice: Number(exact.basePrice) };
    }
  }

  // Prisma's compound-unique `where` input rejects `null`, so the default
  // row is looked up with a plain filter instead of findUnique-by-key.
  const fallback = await prisma.priceList.findFirst({
    where: { repairTypeId, deviceBrand: null },
  });

  if (fallback) {
    return { source: "default", basePrice: Number(fallback.basePrice) };
  }

  return null;
}
