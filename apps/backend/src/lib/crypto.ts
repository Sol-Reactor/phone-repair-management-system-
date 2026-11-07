import crypto from "crypto";

// NFR-4: device passwords/PINs shall be stored encrypted (AES-256).
// AES-256-GCM: authenticated encryption, random IV per value.
// Stored format: base64(iv) : base64(authTag) : base64(ciphertext)

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.PIN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "PIN_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" and add it to .env"
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("PIN_ENCRYPTION_KEY must be a 32-byte value hex-encoded (64 hex characters)");
  }
  return key;
}

export function encryptPin(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptPin(stored: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted PIN value");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return plain.toString("utf8");
}
