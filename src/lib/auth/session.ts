// src/lib/auth/session.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Resolves a userId from the "Authorization: Bearer <token>" header,
 * matching against the Session model your Telegram login already creates.
 * Returns null if missing, invalid, or expired.
 */
export async function getUserFromBearerToken(
  authHeader: string | null
): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;
  if (session.expiresAt < new Date()) return null; // expired

  return { userId: session.userId };
}
