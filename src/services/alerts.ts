import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { bot } from "@/lib/telegram";

export async function checkPriceAlerts(tokenAddress: string, currentPrice: number) {
  const alerts = await prisma.alert.findMany({
    where: { token: tokenAddress, type: "price", active: true },
    include: { user: true },
  });

  for (const alert of alerts) {
    const target = parseFloat(alert.value);
    const triggered =
      alert.condition === "above" ? currentPrice >= target :
      alert.condition === "below" ? currentPrice <= target : false;

    if (triggered) {
      await bot.telegram.sendMessage(
        alert.user.telegramId,
        `🔔 Price Alert: Token hit $${currentPrice.toFixed(6)}\nTarget: ${alert.condition} $${target}`
      );
      await prisma.alert.update({ where: { id: alert.id }, data: { active: false } });
    }
  }
}

export async function sendWhaleAlert(userId: string, telegramId: string, token: string, amount: string) {
  await bot.telegram.sendMessage(
    telegramId,
    `🐋 Whale Alert on ${token}\nAmount: $${amount}`
  );
}
