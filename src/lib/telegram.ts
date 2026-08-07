import { Telegraf } from "telegraf";

const globalForBot = globalThis as unknown as { bot: Telegraf | undefined };

export const bot =
  globalForBot.bot ?? new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

if (process.env.NODE_ENV !== "production") globalForBot.bot = bot;
