import { Context } from "telegraf";

export const handleWallet = {
  async create(ctx: Context) {
    await ctx.editMessageText(
      "🔐 Creating your wallet...\n\nYour wallet will be encrypted and stored securely.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Continue", callback_data: "wallet:confirm" }],
            [{ text: "⬅ Back", callback_data: "start" }],
          ],
        },
      }
    );
  },

  async import(ctx: Context) {
    await ctx.editMessageText(
      "📥 Import Wallet\n\nSend your recovery phrase or private key.\n\n⚠️ Never share this with anyone.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔑 Recovery Phrase", callback_data: "wallet:phrase" }],
            [{ text: "🗝 Private Key", callback_data: "wallet:key" }],
            [{ text: "⬅ Back", callback_data: "start" }],
          ],
        },
      }
    );
  },
};
