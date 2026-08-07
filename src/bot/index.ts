import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.start(async (ctx) => {
  await ctx.reply(
    "👋 Welcome to ERROR404 Terminal\n\nThe best trading terminal on Robinhood Chain.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "💼 Create Wallet", callback_data: "wallet:create" },
            { text: "📥 Import Wallet", callback_data: "wallet:import" },
          ],
          [
            {
              text: "🖥 Open Terminal",
              web_app: {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/terminal`,
              },
            },
          ],
        ],
      },
    }
  );
});

bot.action("wallet:create", async (ctx) => {
  await ctx.editMessageText(
    "🔐 Creating your wallet...",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Continue", callback_data: "wallet:confirm" }],
          [{ text: "⬅ Back", callback_data: "menu:main" }],
        ],
      },
    }
  );
});

bot.action("menu:main", async (ctx) => {
  await ctx.editMessageText(
    "🏠 ERROR404 Terminal",
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "💼 Portfolio", callback_data: "portfolio:view" },
            { text: "⚡ Trade", callback_data: "trade:buy" },
          ],
          [
            { text: "🔔 Alerts", callback_data: "alerts:list" },
            { text: "🔍 Scanner", callback_data: "scanner:scan" },
          ],
          [{ text: "⚙️ Settings", callback_data: "settings:view" }],
          [
            {
              text: "🖥 Open Terminal",
              web_app: {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/terminal`,
              },
            },
          ],
        ],
      },
    }
  );
});

bot.action("portfolio:view", async (ctx) => {
  await ctx.editMessageText(
    "💼 Portfolio\n\nOpen the terminal for full details.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🖥 Open Terminal",
              web_app: {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/terminal`,
              },
            },
          ],
          [{ text: "⬅ Back", callback_data: "menu:main" }],
        ],
      },
    }
  );
});

bot.action("trade:buy", async (ctx) => {
  await ctx.editMessageText(
    "⚡ Quick Trade\n\nPaste a contract address to trade.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🖥 Open Terminal",
              web_app: {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/terminal`,
              },
            },
          ],
          [{ text: "⬅ Back", callback_data: "menu:main" }],
        ],
      },
    }
  );
});

bot.action("alerts:list", async (ctx) => {
  await ctx.editMessageText(
    "🔔 Alerts\n\nManage your alerts inside the terminal.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🖥 Open Terminal",
              web_app: {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/terminal`,
              },
            },
          ],
          [{ text: "⬅ Back", callback_data: "menu:main" }],
        ],
      },
    }
  );
});

bot.action("scanner:scan", async (ctx) => {
  await ctx.editMessageText(
    "🔍 Scanner\n\nPaste a contract address to analyze.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🖥 Open Terminal",
              web_app: {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/terminal`,
              },
            },
          ],
          [{ text: "⬅ Back", callback_data: "menu:main" }],
        ],
      },
    }
  );
});

bot.action("settings:view", async (ctx) => {
  await ctx.editMessageText(
    "⚙️ Settings\n\nManage your preferences.",
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
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

export { bot };
