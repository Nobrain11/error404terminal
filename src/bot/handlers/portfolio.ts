import { Context } from "telegraf";

export const handlePortfolio = {
  async view(ctx: Context) {
    await ctx.editMessageText(
      "💼 Portfolio\n\nTotal Value: $1,820.20\n24H Change: +$148.40\n\nOpen the terminal for full details.",
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
