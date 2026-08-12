import crypto from "crypto";

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface VerifiedInitData {
  user: TelegramUser;
  authDate: number;
}

const MAX_AUTH_AGE_SECONDS = 86400; // 24h

export function verifyTelegramInitData(initData: string): VerifiedInitData | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");

    const dataCheckArr: string[] = [];
    params.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (computedHash !== hash) return null;

    const authDate = parseInt(params.get("auth_date") || "0", 10);
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || now - authDate > MAX_AUTH_AGE_SECONDS) return null;

    const userRaw = params.get("user");
    if (!userRaw) return null;
    const user: TelegramUser = JSON.parse(userRaw);

    return { user, authDate };
  } catch (e) {
    console.error("Telegram initData verification failed:", e);
    return null;
  }
}
