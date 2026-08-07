import { Context } from "telegraf";

export const handleAlerts = {
  async list(ctx: Context) {
    await ctx.editMessageText(
      "🔔 Alerts\n\nManage your price and whale alerts inside the terminal.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🖥 Open Terminal", web_app: { url: `${process.env.NEXT_PUBLIC_APP_URL}/terminal` } }],
            [{ text: "⬅ Back", callback_data: "menu:main" }],
          ],
        },
      }
    );
  },
};
