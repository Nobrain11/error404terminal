// src/lib/wallet/custodial.ts
// ERROR404 Terminal — in-app custodial wallet creation
// Private keys are AES-256-GCM encrypted before storage. Never logged, never returned twice.

import { ethers } from "ethers";
import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.WALLET_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("WALLET_ENCRYPTION_KEY is not set in the environment.");
  }
  // Expect a 32-byte key. If your existing key isn't 32 bytes, hash it down to size
  // rather than storing keys of inconsistent length.
  return crypto.createHash("sha256").update(key).digest();
}

export function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptPrivateKey(payload: string): string {
  const key = getEncryptionKey();
  const [ivB64, authTagB64, dataB64] = payload.split(":");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Malformed encrypted wallet payload.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Generates a brand new wallet. Returns the plaintext private key ONCE —
 * caller is responsible for showing it to the user and then discarding it.
 * Only the encrypted form should ever reach the database.
 */
export function generateCustodialWallet(): {
  address: string;
  privateKey: string; // plaintext — show once, never persist as plaintext
  encryptedPrivateKey: string; // this is what goes in the DB
} {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    encryptedPrivateKey: encryptPrivateKey(wallet.privateKey),
  };
}

/**
 * Reconstructs a signer from an encrypted stored key, for server-side
 * trade execution on behalf of a custodial-wallet user.
 */
export function getCustodialSigner(
  encryptedPrivateKey: string,
  provider: ethers.Provider
): ethers.Wallet {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  return new ethers.Wallet(privateKey, provider);
}
