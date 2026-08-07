import { Context } from "telegraf";

export async function handleStart(ctx: Context) {
  await ctx.reply(
    `👋 Welcome to ERROR404 Terminal\n\nThe best trading terminal on Robinhood Chain.\n\nGet started:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "💼 Create Wallet", callback_data: "wallet:create" },
            { text: "📥 Import Wallet", callback_data: "wallet:import" },
          ],
          [{ text: "🖥 Open Terminal", web_app: { url: `${process.env.NEXT_PUBLIC_APP_URL}/terminal` } }],
        ],
      },
    }
  );
}
