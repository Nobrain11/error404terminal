import { Context } from "telegraf";

export const handleTrade = {
  async buy(ctx: Context) {
    await ctx.editMessageText(
      "⚡ Quick Buy\n\nPaste a contract address to buy:",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "⬅ Back", callback_data: "menu:main" }],
          ],
        },
      }
    );
  },

  async sell(ctx: Context) {
    await ctx.editMessageText(
      "💸 Quick Sell\n\nSelect a token to sell:",
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
