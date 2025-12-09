import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { customType } from "drizzle-orm/pg-core";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = env.MCP_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("MCP_ENCRYPTION_KEY is not configured");
  }
  return Buffer.from(key, "base64");
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decrypt(encrypted: string): string {
  const key = getKey();
  const [ivB64, authTagB64, dataB64] = encrypted.split(":");
  if (!(ivB64 && authTagB64 && dataB64)) {
    throw new Error("Invalid encrypted text format");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return decipher.update(dataB64, "base64", "utf8") + decipher.final("utf8");
}

/**
 * Custom Drizzle type for encrypted text fields.
 * Automatically encrypts on write and decrypts on read using AES-256-GCM.
 */
export const encryptedText = customType<{ data: string; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => encrypt(value),
  fromDriver: (value) => decrypt(value),
});
