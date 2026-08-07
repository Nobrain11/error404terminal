import { Context } from "telegraf";

export const handleScanner = {
  async scan(ctx: Context) {
    await ctx.editMessageText(
      "🔍 Scanner\n\nPaste a contract address to analyze:",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅ Back", callback_data: "menu:main" }],
          ],
        },
      }
    );
  },
};
