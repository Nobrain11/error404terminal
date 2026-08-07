import { Telegraf, Markup } from "telegraf";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// User state for multi-step flows
const userState: Record<number, { step: string; data: Record<string, string> }> = {};

// ── START ──────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const name = ctx.from?.first_name || "Trader";
  await ctx.reply(
    `👋 Welcome to ERROR404 Terminal, ${name}!\n\n🏆 The best trading terminal on Robinhood Chain.\n\nGet started by creating or importing a wallet.`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("💼 Create Wallet", "wallet:create"),
        Markup.button.callback("📥 Import Wallet", "wallet:import"),
      ],
      [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
    ])
  );
});

// ── MAIN MENU ──────────────────────────────────────────────────────────────
async function showMainMenu(ctx: any) {
  await ctx.editMessageText(
    "🏠 ERROR404 Terminal\n\nWhat would you like to do?",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("💼 Portfolio", "portfolio:view"),
        Markup.button.callback("⚡ Quick Trade", "trade:menu"),
      ],
      [
        Markup.button.callback("🔔 Alerts", "alerts:list"),
        Markup.button.callback("🔍 Scanner", "scanner:menu"),
      ],
      [
        Markup.button.callback("⚙️ Settings", "settings:view"),
      ],
      [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
    ])
  );
}

// ── WALLET CREATE ──────────────────────────────────────────────────────────
bot.action("wallet:create", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  userState[userId] = { step: "creating", data: {} };

  // Generate mock wallet for now — replace with real ethers.js call
  const mockAddress = "0x" + Math.random().toString(16).slice(2, 42).padStart(40, "0");
  const mockPhrase = "witch collapse practice feed shame open despair creek road again ice least";

  userState[userId].data.address = mockAddress;
  userState[userId].data.phrase = mockPhrase;
  userState[userId].step = "backup_phrase";

  await ctx.editMessageText(
    `🔐 Wallet Created!\n\n📍 Address:\n\`${mockAddress}\`\n\n⚠️ BACKUP YOUR RECOVERY PHRASE\n\nWrite these 12 words down and store them safely. Never share them with anyone:\n\n\`${mockPhrase}\`\n\n✅ Tap confirm once you have saved your phrase.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✅ I saved my phrase", "wallet:confirm_phrase")],
        [Markup.button.callback("⬅ Back", "menu:main")],
      ]),
    }
  );
});

bot.action("wallet:confirm_phrase", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const address = userState[userId]?.data?.address || "0x...";

  await ctx.editMessageText(
    `✅ Wallet Ready!\n\n📍 Your Address:\n\`${address}\`\n\nYour wallet is encrypted and ready to use.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
        [Markup.button.callback("🏠 Main Menu", "menu:main")],
      ]),
    }
  );
});

// ── WALLET IMPORT ──────────────────────────────────────────────────────────
bot.action("wallet:import", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  userState[userId] = { step: "import_method", data: {} };

  await ctx.editMessageText(
    "📥 Import Wallet\n\nChoose your import method:",
    Markup.inlineKeyboard([
      [Markup.button.callback("🔑 Recovery Phrase", "wallet:phrase")],
      [Markup.button.callback("🗝 Private Key", "wallet:key")],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

bot.action("wallet:phrase", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  userState[userId] = { step: "awaiting_phrase", data: {} };

  await ctx.editMessageText(
    "🔑 Recovery Phrase Import\n\nSend your 12 or 24 word recovery phrase in the next message.\n\n⚠️ Never share your phrase with anyone else.",
    Markup.inlineKeyboard([
      [Markup.button.callback("❌ Cancel", "menu:main")],
    ])
  );
});

bot.action("wallet:key", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  userState[userId] = { step: "awaiting_key", data: {} };

  await ctx.editMessageText(
    "🗝 Private Key Import\n\nSend your private key in the next message.\n\n⚠️ Never share your private key with anyone else.",
    Markup.inlineKeyboard([
      [Markup.button.callback("❌ Cancel", "menu:main")],
    ])
  );
});

// ── SCANNER ────────────────────────────────────────────────────────────────
bot.action("scanner:menu", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  userState[userId] = { step: "awaiting_contract", data: {} };

  await ctx.editMessageText(
    "🔍 Contract Scanner\n\nPaste a contract address to analyze it.\n\nSend the contract address now:",
    Markup.inlineKeyboard([
      [Markup.button.webApp("🖥 Open Scanner", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

// ── TRADE ──────────────────────────────────────────────────────────────────
bot.action("trade:menu", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  userState[userId] = { step: "awaiting_trade_contract", data: {} };

  await ctx.editMessageText(
    "⚡ Quick Trade\n\nPaste a contract address to trade.\n\nSend the contract address now:",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("📈 Limit Order", "trade:limit"),
        Markup.button.callback("📊 Positions", "trade:positions"),
      ],
      [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

bot.action("trade:limit", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "📈 Limit Orders\n\nSet a limit order — buy or sell at your target price.\n\nOpen the terminal for full limit order management:",
    Markup.inlineKeyboard([
      [Markup.button.webApp("🖥 Set Limit Order", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "trade:menu")],
    ])
  );
});

bot.action("trade:positions", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "📊 Active Positions\n\nYour open positions:\n\n🟢 RBTK — $684.58 — +55.5%\n💎 RIFI — $189.22 — +13.8%\n🐸 CPEPE — $946.40 — -25.4%\n\nTotal Value: $1,820.20",
    Markup.inlineKeyboard([
      [Markup.button.webApp("🖥 Manage Positions", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "trade:menu")],
    ])
  );
});

// ── PORTFOLIO ──────────────────────────────────────────────────────────────
bot.action("portfolio:view", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "💼 Portfolio\n\n📍 0x3a7f…9b44\n💰 Total Value: $1,820.20\n📈 Today: +$148.40\n📊 Total PnL: -$70.60\n🎯 Win Rate: 62%\n\nAssets:\n🟢 RBTK — $684.58 — +55.5%\n💎 RIFI — $189.22 — +13.8%\n🐸 CPEPE — $946.40 — -25.4%",
    Markup.inlineKeyboard([
      [Markup.button.webApp("🖥 Full Portfolio", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

// ── ALERTS ─────────────────────────────────────────────────────────────────
bot.action("alerts:list", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "🔔 Alerts\n\nActive Alerts:\n✅ RBTK — Price above $0.005\n✅ RIFI — Whale buy > $10K\n❌ ALL — Portfolio +20% daily\n\nAll alerts delivered to DM only.",
    Markup.inlineKeyboard([
      [Markup.button.callback("➕ New Alert", "alerts:create")],
      [Markup.button.webApp("🖥 Manage Alerts", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

bot.action("alerts:create", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "➕ Create Alert\n\nChoose alert type:",
    Markup.inlineKeyboard([
      [Markup.button.callback("📈 Price Target", "alert:price")],
      [Markup.button.callback("🐋 Whale Activity", "alert:whale")],
      [Markup.button.callback("💼 Portfolio", "alert:portfolio")],
      [Markup.button.callback("⬅ Back", "alerts:list")],
    ])
  );
});

// ── REFERRAL ───────────────────────────────────────────────────────────────
bot.action("referral:view", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const refCode = `E404-${userId.toString().slice(-6)}`;

  await ctx.editMessageText(
    `🎁 Referral Program\n\n🔗 Your Code: \`${refCode}\`\n\nShare your link:\n${APP_URL}?ref=${refCode}\n\n👥 Referrals: 0\n💰 Earned: $0.00\n\nEarn rewards for every trader you bring to ERROR404.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⬅ Back", "settings:view")],
      ]),
    }
  );
});

// ── SETTINGS ───────────────────────────────────────────────────────────────
bot.action("settings:view", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "⚙️ Settings\n\nConfigure your trading preferences.",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("📊 Slippage: 0.5%", "settings:slippage"),
        Markup.button.callback("⛽ Gas: Fast", "settings:gas"),
      ],
      [
        Markup.button.callback("🔔 Notifications", "settings:notifs"),
        Markup.button.callback("🔐 Security", "settings:security"),
      ],
      [Markup.button.callback("🎁 Referral", "referral:view")],
      [Markup.button.webApp("🖥 Full Settings", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

bot.action("settings:slippage", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "📊 Slippage Settings\n\nChoose your default slippage:",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("0.1%", "slip:0.1"),
        Markup.button.callback("0.5% ✅", "slip:0.5"),
        Markup.button.callback("1.0%", "slip:1.0"),
        Markup.button.callback("2.0%", "slip:2.0"),
      ],
      [Markup.button.callback("⬅ Back", "settings:view")],
    ])
  );
});

bot.action("settings:gas", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "⛽ Gas Priority\n\nChoose your gas speed:",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🐢 Normal", "gas:normal"),
        Markup.button.callback("⚡ Fast ✅", "gas:fast"),
        Markup.button.callback("🚀 Turbo", "gas:turbo"),
      ],
      [Markup.button.callback("⬅ Back", "settings:view")],
    ])
  );
});

bot.action("settings:security", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "🔐 Security\n\nManage your wallet security.",
    Markup.inlineKeyboard([
      [Markup.button.callback("🔑 Export Private Key", "wallet:export")],
      [Markup.button.callback("📝 Recovery Phrase", "wallet:show_phrase")],
      [Markup.button.callback("⬅ Back", "settings:view")],
    ])
  );
});

// ── MENU MAIN ──────────────────────────────────────────────────────────────
bot.action("menu:main", async (ctx) => {
  await ctx.answerCbQuery();
  await showMainMenu(ctx);
});

// ── TEXT HANDLER ───────────────────────────────────────────────────────────
bot.on("text", async (ctx) => {
  const userId = ctx.from?.id!;
  const text = ctx.message.text;
  const state = userState[userId];

  // Scanner — contract address pasted
  if (state?.step === "awaiting_contract") {
    const address = text.trim();
    if (address.startsWith("0x") && address.length === 42) {
      userState[userId].step = "idle";
      await ctx.reply(
        `🔍 Scanning: \`${address}\`\n\n⏳ Analyzing contract...`,
        { parse_mode: "Markdown" }
      );
      // Simulate scan result
      setTimeout(async () => {
        await ctx.reply(
          `✅ Scan Complete\n\n📍 ${address}\n\n🛡 Safety Score: 82/100\n✅ Verified Contract\n✅ Liquidity Healthy\n✅ Ownership Renounced\n⚠️ Fresh Wallets: 12%\n\n💰 Liquidity: $1.2M\n📊 Market Cap: $4.8M\n👥 Holders: 3,420\n\n🔗 View full analysis in terminal:`,
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.webApp("🖥 Full Analysis", `${APP_URL}/terminal`)],
              [Markup.button.callback("🔍 Scan Another", "scanner:menu")],
              [Markup.button.callback("🏠 Main Menu", "menu:main")],
            ]),
          }
        );
      }, 1500);
    } else {
      await ctx.reply(
        "❌ Invalid contract address.\n\nMust start with 0x and be 42 characters.",
        Markup.inlineKeyboard([
          [Markup.button.callback("🔍 Try Again", "scanner:menu")],
        ])
      );
    }
    return;
  }

  // Trade — contract address pasted
  if (state?.step === "awaiting_trade_contract") {
    const address = text.trim();
    if (address.startsWith("0x") && address.length === 42) {
      userState[userId].step = "awaiting_trade_amount";
      userState[userId].data.contract = address;
      await ctx.reply(
        `⚡ Token Found!\n\n📍 \`${address}\`\n💰 Price: $0.004821\n📈 24H: +42.3%\n💧 Liquidity: $1.2M\n\nHow much ETH do you want to spend?`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("0.01 ETH", "buy:0.01"),
              Markup.button.callback("0.05 ETH", "buy:0.05"),
              Markup.button.callback("0.1 ETH", "buy:0.1"),
            ],
            [
              Markup.button.callback("0.5 ETH", "buy:0.5"),
              Markup.button.callback("1 ETH", "buy:1"),
            ],
            [Markup.button.callback("❌ Cancel", "menu:main")],
          ]),
        }
      );
    } else {
      await ctx.reply("❌ Invalid contract address. Must start with 0x.");
    }
    return;
  }

  // Phrase import
  if (state?.step === "awaiting_phrase") {
    const words = text.trim().split(" ");
    if (words.length === 12 || words.length === 24) {
      userState[userId].step = "idle";
      await ctx.reply(
        "✅ Wallet Imported!\n\n📍 Address: 0x3a7f…9b44\n\nYour wallet is ready to use.",
        Markup.inlineKeyboard([
          [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
          [Markup.button.callback("🏠 Main Menu", "menu:main")],
        ])
      );
    } else {
      await ctx.reply("❌ Invalid phrase. Must be 12 or 24 words.");
    }
    return;
  }

  // Private key import
  if (state?.step === "awaiting_key") {
    if (text.trim().startsWith("0x") && text.trim().length === 66) {
      userState[userId].step = "idle";
      await ctx.reply(
        "✅ Wallet Imported!\n\n📍 Address: 0x3a7f…9b44\n\nYour wallet is ready to use.",
        Markup.inlineKeyboard([
          [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
          [Markup.button.callback("🏠 Main Menu", "menu:main")],
        ])
      );
    } else {
      await ctx.reply("❌ Invalid private key. Must start with 0x and be 66 characters.");
    }
    return;
  }

  // Default
  await ctx.reply(
    "Use the menu to navigate ERROR404 Terminal.",
    Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Main Menu", "menu:main")],
      [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
    ])
  );
});

// ── BUY ACTIONS ────────────────────────────────────────────────────────────
["0.01", "0.05", "0.1", "0.5", "1"].forEach((amount) => {
  bot.action(`buy:${amount}`, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `⚡ Confirm Buy\n\n💰 Amount: ${amount} ETH\n📊 Estimated: ~1,842,301 RBTK\n⛽ Gas: ~$0.08\n📉 Slippage: 0.5%\n\nConfirm transaction?`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Confirm Buy", `confirm:buy:${amount}`),
          Markup.button.callback("❌ Cancel", "trade:menu"),
        ],
      ])
    );
  });

  bot.action(`confirm:buy:${amount}`, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `⏳ Transaction Pending...\n\n💰 Buying with ${amount} ETH\n\nPlease wait...`
    );
    setTimeout(async () => {
      await ctx.editMessageText(
        `✅ Transaction Confirmed!\n\n💰 Spent: ${amount} ETH\n📈 Received: ~1,842,301 RBTK\n🔗 Hash: 0x4a2b…f91c\n\nView in explorer or open terminal for details.`,
        Markup.inlineKeyboard([
          [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
          [Markup.button.callback("🏠 Main Menu", "menu:main")],
        ])
      );
    }, 2000);
  });
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

export { bot };
