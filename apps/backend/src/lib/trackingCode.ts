import crypto from "crypto";
import { prisma } from "./prisma";

// Unambiguous uppercase alphanumeric alphabet — no 0/O or 1/I/L, so a
// customer reading it off a printed slip doesn't second-guess characters.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 6;

function randomCode(): string {
  const bytes = crypto.randomBytes(LENGTH);
  let code = "";
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

// 32^6 ≈ 1.07 billion combinations — collisions are practically impossible
// at this app's scale, but check-and-retry anyway rather than assume.
export async function generateUniqueTrackingCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const existing = await prisma.ticket.findUnique({ where: { trackingCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique tracking code after 5 attempts");
}
