import { Context } from "telegraf";

export const handleSettings = {
  async view(ctx: Context) {
    await ctx.editMessageText(
      "⚙️ Settings\n\nManage slippage, gas, notifications and more.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Slippage", callback_data: "settings:slippage" }],
            [{ text: "⛽ Gas Priority", callback_data: "settings:gas" }],
            [{ text: "🔔 Notifications", callback_data: "settings:notifs" }],
            [{ text: "⬅ Back", callback_data: "menu:main" }],
          ],
        },
      }
    );
  },
};
