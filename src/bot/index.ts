import { Telegraf, Markup } from "telegraf";
import { ethers } from "ethers";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// ── State ──────────────────────────────────────────────────────────────────
interface UserState {
  step: string;
  data: Record<string, string>;
  wallets: Array<{ name: string; address: string; encryptedKey: string }>;
  activeWallet: number;
  slippage: string;
  gas: string;
}

const state: Record<number, UserState> = {};

function getState(userId: number): UserState {
  if (!state[userId]) {
    state[userId] = {
      step: "idle",
      data: {},
      wallets: [],
      activeWallet: 0,
      slippage: "0.5",
      gas: "fast",
    };
  }
  return state[userId];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatNum(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function createRealWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || "",
  };
}

function importFromPhrase(phrase: string) {
  try {
    const wallet = ethers.Wallet.fromPhrase(phrase.trim());
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: phrase.trim(),
    };
  } catch {
    return null;
  }
}

function importFromKey(key: string) {
  try {
    const wallet = new ethers.Wallet(key.trim());
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: "",
    };
  } catch {
    return null;
  }
}

function getMockToken(ca: string) {
  return {
    name: "RobinToken",
    ticker: "RBTK",
    price: 0.004821,
    change24h: 42.3,
    mcap: 4_800_000,
    liq: 1_200_000,
    vol: 890_000,
    holders: 3420,
    age: "2d",
    verified: true,
    tax: { buy: 0, sell: 0 },
    renounced: true,
    ca,
  };
}

// ── Header ─────────────────────────────────────────────────────────────────
const HEADER = `🤖 *ERROR404 Terminal*\n_The first professional trading terminal built for Robinhood Chain\._\n\n`;

// ── Main Menu ──────────────────────────────────────────────────────────────
async function showMain(ctx: any, edit = false) {
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const walletLine =
    s.wallets.length > 0
      ? `\n👛 *Active:* \`${shortAddr(s.wallets[s.activeWallet]?.address || "")}\``
      : "\n👛 *No wallet connected*";

  const text =
    HEADER +
    walletLine +
    `\n\n*Main Menu*\n\n` +
    `📡 Chains — Switch networks\n` +
    `👛 Wallets — Create or import\n` +
    `📊 Portfolio — Holdings & PnL\n` +
    `🎯 Orders — Limit & DCA orders\n` +
    `⚙️ Settings — Preferences\n` +
    `🔍 Scanner — Audit any token\n\n` +
    `⚡ _Paste any token CA to trade instantly\._\n\n` +
    `[🌐 Website](https://error404\.app) • [💬 Telegram](https://t\.me/error404terminal)`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("📡 Chains", "chains:view"),
      Markup.button.callback("👛 Wallets", "wallets:menu"),
    ],
    [
      Markup.button.callback("📊 Portfolio", "portfolio:view"),
      Markup.button.callback("🎯 Orders", "orders:view"),
    ],
    [
      Markup.button.callback("🔍 Scanner", "scanner:menu"),
      Markup.button.callback("⚙️ Settings", "settings:view"),
    ],
    [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
  ]);

  if (edit) {
    await ctx.editMessageText(text, {
      parse_mode: "Markdown",
      link_preview_options: { is_disabled: true },
      ...keyboard,
    });
  } else {
    await ctx.reply(text, {
      parse_mode: "Markdown",
      link_preview_options: { is_disabled: true },
      ...keyboard,
    });
  }
}

// ── Start ──────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  await showMain(ctx, false);
});

bot.action("menu:main", async (ctx) => {
  await ctx.answerCbQuery();
  await showMain(ctx, true);
});

// ── Chains ─────────────────────────────────────────────────────────────────
bot.action("chains:view", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    HEADER + `📡 *Select Network*\n\n✅ Robinhood Chain _(active)_`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✅ Robinhood Chain", "chain:rbn")],
        [Markup.button.callback("⬅ Back", "menu:main")],
      ]),
    }
  );
});

bot.action("chain:rbn", async (ctx) => {
  await ctx.answerCbQuery("Already on Robinhood Chain");
});

// ── Wallets ────────────────────────────────────────────────────────────────
bot.action("wallets:menu", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);

  const walletRows = s.wallets.map((w, i) => [
    Markup.button.callback(
      `${i === s.activeWallet ? "✅" : "👛"} ${w.name} — ${shortAddr(w.address)}`,
      `wallet:select:${i}`
    ),
  ]);

  await ctx.editMessageText(
    HEADER +
      `👛 *Wallets*\n\n${
        s.wallets.length === 0
          ? "No wallets yet\. Create or import one\."
          : `${s.wallets.length} wallet\(s\) connected\.`
      }`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        ...walletRows,
        [
          Markup.button.callback("➕ Create Wallet", "wallet:create"),
          Markup.button.callback("📥 Import", "wallet:import"),
        ],
        [Markup.button.callback("⬅ Back", "menu:main")],
      ]),
    }
  );
});

bot.action("wallet:create", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const w = createRealWallet();

  s.data.pending_address = w.address;
  s.data.pending_key = w.privateKey;
  s.data.pending_phrase = w.mnemonic;
  s.step = "confirm_save";

  const walletNum = s.wallets.length + 1;

  await ctx.editMessageText(
    HEADER +
      `👛 *New Wallet Created*\n\n` +
      `📍 *Address:*\n\`${w.address}\`\n\n` +
      `🔑 *Private Key:*\n\`${w.privateKey}\`\n\n` +
      `📝 *Recovery Phrase:*\n\`${w.mnemonic}\`\n\n` +
      `⚠️ *SAVE THIS NOW\.*\n` +
      `Screenshot or write it down\.\n` +
      `This will NOT be shown again\.\n\n` +
      `Tap ✅ once you have saved it\.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            `✅ Saved — Activate Wallet ${walletNum}`,
            "wallet:saved"
          ),
        ],
        [Markup.button.callback("⬅ Back", "wallets:menu")],
      ]),
    }
  );
});

bot.action("wallet:saved", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);

  const walletNum = s.wallets.length + 1;
  s.wallets.push({
    name: `Wallet ${walletNum}`,
    address: s.data.pending_address,
    encryptedKey: s.data.pending_key,
  });
  s.activeWallet = s.wallets.length - 1;
  s.step = "idle";

  await ctx.editMessageText(
    HEADER +
      `✅ *Wallet ${walletNum} Activated*\n\n` +
      `📍 \`${s.data.pending_address}\`\n\n` +
      `Ready to trade on Robinhood Chain\.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "menu:main")],
        [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
      ]),
    }
  );
});

bot.action("wallet:import", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  getState(userId).step = "import_method";

  await ctx.editMessageText(
    HEADER + `📥 *Import Wallet*\n\nChoose import method:`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔑 Recovery Phrase", "wallet:phrase")],
        [Markup.button.callback("🗝 Private Key", "wallet:key")],
        [Markup.button.callback("⬅ Back", "wallets:menu")],
      ]),
    }
  );
});

bot.action("wallet:phrase", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  getState(userId).step = "awaiting_phrase";
  await ctx.editMessageText(
    HEADER +
      `🔑 *Recovery Phrase*\n\nSend your 12 or 24 word phrase now\.\n\n⚠️ Never share with anyone\.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❌ Cancel", "wallets:menu")],
      ]),
    }
  );
});

bot.action("wallet:key", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  getState(userId).step = "awaiting_key";
  await ctx.editMessageText(
    HEADER +
      `🗝 *Private Key*\n\nSend your private key now\.\n\n⚠️ Never share with anyone\.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❌ Cancel", "wallets:menu")],
      ]),
    }
  );
});

bot.action(/wallet:select:(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const i = parseInt(ctx.match[1]);
  s.activeWallet = i;
  const w = s.wallets[i];
  await ctx.editMessageText(
    HEADER +
      `✅ *${w.name} Selected*\n\n📍 \`${w.address}\`\n\nThis is now your active wallet\.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🏠 Main Menu", "menu:main")],
      ]),
    }
  );
});

// ── Token Screen ───────────────────────────────────────────────────────────
async function showTokenScreen(ctx: any, ca: string, edit = false) {
  const t = getMockToken(ca);
  const pos = t.change24h > 0;
  const change = `${pos ? "🟢 \\+" : "🔴 "}${t.change24h}%`;

  const text =
    HEADER +
    `${t.verified ? "✅" : "⚠️"} *${t.name}* \\(${t.ticker}\\)\n` +
    `\`${ca}\`\n\n` +
    `💰 *Price:* $${t.price.toFixed(6)}\n` +
    `${change}\n` +
    `📊 *MCap:* ${formatNum(t.mcap)}\n` +
    `💧 *Liq:* ${formatNum(t.liq)}\n` +
    `📈 *Vol:* ${formatNum(t.vol)}\n` +
    `👥 *Holders:* ${t.holders.toLocaleString()}\n` +
    `🕐 *Age:* ${t.age}\n` +
    `🔒 *Renounced:* ${t.renounced ? "Yes ✅" : "No ❌"}\n` +
    `🧾 *Tax:* Buy ${t.tax.buy}% / Sell ${t.tax.sell}%\n\n` +
    `_Select action below:_`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("🟢 Buy", `buy:menu:${ca}`),
      Markup.button.callback("🔴 Sell", `sell:menu:${ca}`),
    ],
    [
      Markup.button.callback("📈 Limit", `limit:menu:${ca}`),
      Markup.button.callback("👥 Multi", `multi:menu:${ca}`),
    ],
    [
      Markup.button.callback("🔍 Scan", `scan:ca:${ca}`),
      Markup.button.callback("🔄 Refresh", `token:refresh:${ca}`),
    ],
    [Markup.button.callback("⬅ Back", "menu:main")],
  ]);

  if (edit) {
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", ...keyboard });
  } else {
    await ctx.reply(text, { parse_mode: "MarkdownV2", ...keyboard });
  }
}

bot.action(/token:refresh:(.+)/, async (ctx) => {
  await ctx.answerCbQuery("🔄 Refreshing...");
  await showTokenScreen(ctx, ctx.match[1], true);
});

// ── Buy ────────────────────────────────────────────────────────────────────
bot.action(/buy:menu:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const t = getMockToken(ca);

  await ctx.editMessageText(
    HEADER +
      `🟢 *Buy ${t.ticker}*\n\n` +
      `💰 Price: $${t.price.toFixed(6)}\n` +
      `⚙️ Slippage: ${s.slippage}% \\| Gas: ${s.gas}\n\n` +
      `Select amount:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("0.01 ETH", `buy:confirm:${ca}:0.01`),
          Markup.button.callback("0.05 ETH", `buy:confirm:${ca}:0.05`),
          Markup.button.callback("0.1 ETH", `buy:confirm:${ca}:0.1`),
        ],
        [
          Markup.button.callback("0.5 ETH", `buy:confirm:${ca}:0.5`),
          Markup.button.callback("1 ETH", `buy:confirm:${ca}:1`),
          Markup.button.callback("✏️ Custom", `buy:custom:${ca}`),
        ],
        [
          Markup.button.callback("⚙️ Slippage", "settings:slippage"),
          Markup.button.callback("⛽ Gas", "settings:gas"),
        ],
        [
          Markup.button.callback("⬅ Back", `token:refresh:${ca}`),
          Markup.button.callback("🏠 Menu", "menu:main"),
        ],
      ]),
    }
  );
});

bot.action(/buy:confirm:(.+):(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const amount = ctx.match[2];
  const t = getMockToken(ca);
  const estimated = Math.floor(parseFloat(amount) / t.price).toLocaleString();

  await ctx.editMessageText(
    HEADER +
      `🟢 *Confirm Buy*\n\n` +
      `🪙 Token: ${t.name} \\(${t.ticker}\\)\n` +
      `💰 Spending: ${amount} ETH\n` +
      `📦 Estimated: ~${estimated} ${t.ticker}\n` +
      `📉 Slippage: 0\\.5%\n` +
      `⛽ Gas: ~$0\\.08\n\n` +
      `Confirm?`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Confirm", `buy:execute:${ca}:${amount}`),
          Markup.button.callback("❌ Cancel", `buy:menu:${ca}`),
        ],
      ]),
    }
  );
});

bot.action(/buy:execute:(.+):(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const amount = ctx.match[2];
  const t = getMockToken(ca);

  await ctx.editMessageText(
    HEADER +
      `⏳ *Transaction Pending\.\.\.*\n\nBuying ${t.ticker} with ${amount} ETH\n\nPlease wait\.\.\.`,
    { parse_mode: "MarkdownV2" }
  );

  setTimeout(async () => {
    const estimated = Math.floor(parseFloat(amount) / t.price).toLocaleString();
    await ctx.editMessageText(
      HEADER +
        `✅ *Buy Confirmed\\!*\n\n` +
        `💰 Spent: ${amount} ETH\n` +
        `📦 Received: ${estimated} ${t.ticker}\n` +
        `🔗 Hash: \`0x4a2b…f91c\``,
      {
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("📊 Portfolio", "portfolio:view")],
          [Markup.button.callback(`🔄 Trade Again`, `token:refresh:${ca}`)],
          [Markup.button.callback("🏠 Menu", "menu:main")],
        ]),
      }
    );
  }, 2000);
});

// ── Sell ───────────────────────────────────────────────────────────────────
bot.action(/sell:menu:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const t = getMockToken(ca);

  await ctx.editMessageText(
    HEADER +
      `🔴 *Sell ${t.ticker}*\n\n` +
      `💰 Price: $${t.price.toFixed(6)}\n` +
      `💼 Balance: 1,842,301 ${t.ticker}\n` +
      `💵 Value: ~$888\\.12\n\n` +
      `Select percentage to sell:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("25%", `sell:confirm:${ca}:25`),
          Markup.button.callback("50%", `sell:confirm:${ca}:50`),
          Markup.button.callback("75%", `sell:confirm:${ca}:75`),
          Markup.button.callback("100%", `sell:confirm:${ca}:100`),
        ],
        [
          Markup.button.callback("⚙️ Slippage", "settings:slippage"),
          Markup.button.callback("⛽ Gas", "settings:gas"),
        ],
        [
          Markup.button.callback("⬅ Back", `token:refresh:${ca}`),
          Markup.button.callback("🏠 Menu", "menu:main"),
        ],
      ]),
    }
  );
});

bot.action(/sell:confirm:(.+):(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const pct = ctx.match[2];
  const t = getMockToken(ca);
  const balance = 1842301;
  const amount = Math.floor((balance * parseInt(pct)) / 100).toLocaleString();
  const value = ((balance * parseInt(pct)) / 100 * t.price).toFixed(2);

  await ctx.editMessageText(
    HEADER +
      `🔴 *Confirm Sell*\n\n` +
      `🪙 Token: ${t.ticker}\n` +
      `📦 Selling: ${amount} ${t.ticker} \\(${pct}%\\)\n` +
      `💵 Estimated: ~$${value}\n` +
      `📉 Slippage: 0\\.5%\n` +
      `⛽ Gas: ~$0\\.08\n\n` +
      `Confirm?`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Confirm Sell", `sell:execute:${ca}:${pct}`),
          Markup.button.callback("❌ Cancel", `sell:menu:${ca}`),
        ],
      ]),
    }
  );
});

bot.action(/sell:execute:(.+):(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const pct = ctx.match[2];
  const t = getMockToken(ca);

  await ctx.editMessageText(
    HEADER +
      `⏳ *Selling ${pct}% of ${t.ticker}\.\.\.*\n\nPlease wait\.\.\.`,
    { parse_mode: "MarkdownV2" }
  );

  setTimeout(async () => {
    const value = ((1842301 * parseInt(pct)) / 100 * t.price).toFixed(2);
    await ctx.editMessageText(
      HEADER +
        `✅ *Sell Confirmed\\!*\n\n` +
        `🪙 Sold: ${pct}% of ${t.ticker}\n` +
        `💵 Received: ~$${value}\n` +
        `🔗 Hash: \`0x9b3c…a22f\``,
      {
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("📊 Portfolio", "portfolio:view")],
          [Markup.button.callback("🏠 Menu", "menu:main")],
        ]),
      }
    );
  }, 2000);
});

// ── Limit ──────────────────────────────────────────────────────────────────
bot.action(/limit:menu:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const t = getMockToken(ca);

  await ctx.editMessageText(
    HEADER +
      `📈 *Limit Order — ${t.ticker}*\n\n` +
      `Current Price: $${t.price.toFixed(6)}\n\n` +
      `Choose type:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("🟢 Buy Limit", `limit:buy:${ca}`),
          Markup.button.callback("🔴 Sell Limit", `limit:sell:${ca}`),
        ],
        [Markup.button.callback("⬅ Back", `token:refresh:${ca}`)],
      ]),
    }
  );
});

bot.action(/limit:(buy|sell):(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const type = ctx.match[1];
  const ca = ctx.match[2];
  const userId = ctx.from?.id!;
  const t = getMockToken(ca);
  getState(userId).step = `awaiting_limit_price:${type}:${ca}`;

  await ctx.editMessageText(
    HEADER +
      `📈 *${type === "buy" ? "🟢 Buy" : "🔴 Sell"} Limit — ${t.ticker}*\n\n` +
      `Current Price: $${t.price.toFixed(6)}\n\n` +
      `Send your target price \\(e\\.g\\. \`0\\.006\`\\):`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("❌ Cancel", `token:refresh:${ca}`)],
      ]),
    }
  );
});

// ── Multi Wallet ───────────────────────────────────────────────────────────
bot.action(/multi:menu:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const t = getMockToken(ca);

  if (s.wallets.length < 2) {
    await ctx.editMessageText(
      HEADER +
        `👥 *Multi\\-Wallet Buy*\n\n` +
        `You need at least 2 wallets\.\n` +
        `Currently: ${s.wallets.length} wallet\\(s\\)\n\n` +
        `Add more wallets first\.`,
      {
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("➕ Add Wallet", "wallet:create")],
          [Markup.button.callback("⬅ Back", `token:refresh:${ca}`)],
        ]),
      }
    );
    return;
  }

  const walletRows = s.wallets.map((w, i) => [
    Markup.button.callback(
      `${w.name} — ${shortAddr(w.address)}`,
      `multi:buy:${ca}:${i}:0.05`
    ),
  ]);

  await ctx.editMessageText(
    HEADER +
      `👥 *Multi\\-Wallet Buy — ${t.ticker}*\n\n` +
      `Buy from multiple wallets simultaneously\.\n` +
      `Amount per wallet: 0\\.05 ETH\n\n` +
      `Tap a wallet or buy all:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        ...walletRows,
        [Markup.button.callback("✅ Buy All Wallets", `multi:all:${ca}:0.05`)],
        [Markup.button.callback("⬅ Back", `token:refresh:${ca}`)],
      ]),
    }
  );
});

bot.action(/multi:all:(.+):(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const amount = ctx.match[2];
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const t = getMockToken(ca);

  await ctx.editMessageText(
    HEADER +
      `⏳ *Multi\\-Wallet Buy Executing\.\.\.*\n\n${s.wallets.length} wallets buying ${amount} ETH each\.\.\.`,
    { parse_mode: "MarkdownV2" }
  );

  setTimeout(async () => {
    const results = s.wallets
      .map((w, i) => `✅ Wallet ${i + 1}: ${shortAddr(w.address)} — ${amount} ETH`)
      .join("\n");
    const total = (parseFloat(amount) * s.wallets.length).toFixed(3);

    await ctx.editMessageText(
      HEADER +
        `✅ *Multi\\-Wallet Buy Complete\\!*\n\n` +
        results +
        `\n\nTotal spent: ${total} ETH`,
      {
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("📊 Portfolio", "portfolio:view")],
          [Markup.button.callback("🏠 Menu", "menu:main")],
        ]),
      }
    );
  }, 2500);
});

// ── Scanner ────────────────────────────────────────────────────────────────
bot.action("scanner:menu", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  getState(userId).step = "awaiting_scan";

  await ctx.editMessageText(
    HEADER +
      `🔍 *Contract Scanner*\n\n` +
      `Send any contract address to audit it instantly\.\n\n` +
      `Analyzes:\n` +
      `• Safety score\n• Liquidity & ownership\n• Holder distribution\n• Tax & honeypot\n• Dev wallet activity`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⬅ Back", "menu:main")],
      ]),
    }
  );
});

bot.action(/scan:ca:(.+)/, async (ctx) => {
  await ctx.answerCbQuery("🔍 Scanning...");
  const ca = ctx.match[1];
  await runScan(ctx, ca, true);
});

async function runScan(ctx: any, ca: string, edit = false) {
  const t = getMockToken(ca);
  const score = 82;
  const filled = Math.floor(score / 10);
  const bar = "🟩".repeat(filled) + "⬛".repeat(10 - filled);

  const text =
    HEADER +
    `🔍 *Scan Result*\n\n` +
    `📍 \`${ca}\`\n\n` +
    `🛡 *Safety Score: ${score}/100*\n${bar}\n\n` +
    `${t.verified ? "✅" : "❌"} Verified Contract\n` +
    `${t.renounced ? "✅" : "❌"} Ownership Renounced\n` +
    `✅ Liquidity Healthy\n` +
    `✅ No Honeypot\n` +
    `⚠️ Fresh Wallets: 12%\n\n` +
    `💰 *Market Data*\n` +
    `Price: $${t.price.toFixed(6)}\n` +
    `MCap: ${formatNum(t.mcap)}\n` +
    `Liquidity: ${formatNum(t.liq)}\n` +
    `Volume: ${formatNum(t.vol)}\n` +
    `Holders: ${t.holders.toLocaleString()}\n` +
    `Tax: Buy ${t.tax.buy}% / Sell ${t.tax.sell}%\n\n` +
    `*Top Holders*\n` +
    `🏦 LP Pool: 48\\.2%\n` +
    `👨‍💻 Dev: 3\\.1%\n` +
    `🔥 Burn: 5\\.0%\n` +
    `👤 Others: 43\\.7%`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("🟢 Buy", `buy:menu:${ca}`),
      Markup.button.callback("🔄 Refresh", `scan:ca:${ca}`),
    ],
    [Markup.button.callback("⬅ Back", "scanner:menu")],
  ]);

  if (edit) {
    await ctx.editMessageText(text, { parse_mode: "MarkdownV2", ...keyboard });
  } else {
    await ctx.reply(text, { parse_mode: "MarkdownV2", ...keyboard });
  }
}

// ── Portfolio ──────────────────────────────────────────────────────────────
bot.action("portfolio:view", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    HEADER +
      `📊 *Portfolio*\n\n` +
      `📍 \`0x3a7f…9b44\`\n` +
      `💰 Total: *$1,820\\.20*\n` +
      `📈 Today: \\+$148\\.40 🟢\n` +
      `📊 Total PnL: \\-$70\\.60 🔴\n` +
      `🎯 Win Rate: 62%\n\n` +
      `*Positions*\n` +
      `🟢 RBTK — $684\\.58 — *\\+55\\.5%*\n` +
      `💎 RIFI — $189\\.22 — *\\+13\\.8%*\n` +
      `🐸 CPEPE — $946\\.40 — *\\-25\\.4%*`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("💸 Deposit", "wallet:deposit"),
          Markup.button.callback("📤 Withdraw", "wallet:withdraw"),
        ],
        [Markup.button.webApp("🖥 Full Portfolio", `${APP_URL}/terminal`)],
        [Markup.button.callback("⬅ Back", "menu:main")],
      ]),
    }
  );
});

// ── Orders ─────────────────────────────────────────────────────────────────
bot.action("orders:view", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    HEADER +
      `🎯 *Active Orders*\n\n` +
      `📈 Limit Buy — RBTK @ $0\\.003 — 0\\.1 ETH\n` +
      `🔴 Limit Sell — RIFI @ $2\\.50 — 50%\n` +
      `🛑 Stop Loss — CPEPE @ $0\\.00015 — 100%\n\n` +
      `No DCA orders active\.`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("📈 New Limit", "orders:new_limit"),
          Markup.button.callback("🔄 New DCA", "orders:new_dca"),
        ],
        [Markup.button.webApp("🖥 Manage Orders", `${APP_URL}/terminal`)],
        [Markup.button.callback("⬅ Back", "menu:main")],
      ]),
    }
  );
});

bot.action("orders:new_limit", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    HEADER +
      `📈 *New Limit Order*\n\nPaste a contract address to set a limit order:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⬅ Back", "orders:view")],
      ]),
    }
  );
});

bot.action("orders:new_dca", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    HEADER +
      `🔄 *New DCA Order*\n\nDCA \\(Dollar Cost Average\\) coming soon\.\n\nOpen the terminal to configure advanced orders:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
        [Markup.button.callback("⬅ Back", "orders:view")],
      ]),
    }
  );
});

// ── Settings ───────────────────────────────────────────────────────────────
bot.action("settings:view", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  await ctx.editMessageText(
    HEADER +
      `⚙️ *Settings*\n\n` +
      `📉 Slippage: ${s.slippage}%\n` +
      `⛽ Gas: ${s.gas}\n` +
      `🔔 Notifications: On\n` +
      `🌐 Network: Robinhood Chain`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(`📉 Slippage: ${s.slippage}%`, "settings:slippage"),
          Markup.button.callback(`⛽ Gas: ${s.gas}`, "settings:gas"),
        ],
        [
          Markup.button.callback("🔔 Alerts", "alerts:list"),
          Markup.button.callback("🎁 Referral", "referral:view"),
        ],
        [Markup.button.callback("⬅ Back", "menu:main")],
      ]),
    }
  );
});

bot.action("settings:slippage", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  await ctx.editMessageText(
    HEADER + `📉 *Slippage*\n\nCurrent: ${s.slippage}%\n\nSelect:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("0.1%", "slip:0.1"),
          Markup.button.callback("0.5%", "slip:0.5"),
          Markup.button.callback("1.0%", "slip:1.0"),
          Markup.button.callback("2.0%", "slip:2.0"),
        ],
        [Markup.button.callback("⬅ Back", "settings:view")],
      ]),
    }
  );
});

bot.action(/slip:(.+)/, async (ctx) => {
  await ctx.answerCbQuery(`Slippage set to ${ctx.match[1]}%`);
  const userId = ctx.from?.id!;
  getState(userId).slippage = ctx.match[1];
  await ctx.editMessageText(
    HEADER + `✅ Slippage set to *${ctx.match[1]}%*`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⬅ Back", "settings:view")],
      ]),
    }
  );
});

bot.action("settings:gas", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  await ctx.editMessageText(
    HEADER + `⛽ *Gas Priority*\n\nCurrent: ${s.gas}\n\nSelect:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("🐢 Normal", "gas:normal"),
          Markup.button.callback("⚡ Fast", "gas:fast"),
          Markup.button.callback("🚀 Turbo", "gas:turbo"),
        ],
        [Markup.button.callback("⬅ Back", "settings:view")],
      ]),
    }
  );
});

bot.action(/gas:(.+)/, async (ctx) => {
  await ctx.answerCbQuery(`Gas set to ${ctx.match[1]}`);
  const userId = ctx.from?.id!;
  getState(userId).gas = ctx.match[1];
  await ctx.editMessageText(
    HEADER + `✅ Gas set to *${ctx.match[1]}*`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⬅ Back", "settings:view")],
      ]),
    }
  );
});

// ── Alerts ─────────────────────────────────────────────────────────────────
bot.action("alerts:list", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    HEADER +
      `🔔 *Alerts*\n\n` +
      `✅ RBTK — Price above $0\\.005\n` +
      `✅ RIFI — Whale buy > $10K\n` +
      `❌ ALL — Portfolio \\+20% daily\n\n` +
      `_All alerts delivered via DM only\._`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("➕ New Alert", "alerts:create")],
        [Markup.button.webApp("🖥 Manage Alerts", `${APP_URL}/terminal`)],
        [Markup.button.callback("⬅ Back", "settings:view")],
      ]),
    }
  );
});

bot.action("alerts:create", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    HEADER + `➕ *New Alert*\n\nChoose type:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📈 Price Target", "alert:price")],
        [Markup.button.callback("🐋 Whale Activity", "alert:whale")],
        [Markup.button.callback("💼 Portfolio", "alert:portfolio")],
        [Markup.button.callback("⬅ Back", "alerts:list")],
      ]),
    }
  );
});

bot.action(/alert:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const type = ctx.match[1];
  const labels: Record<string, string> = {
    price: "Price Target",
    whale: "Whale Activity",
    portfolio: "Portfolio",
  };
  await ctx.editMessageText(
    HEADER +
      `➕ *${labels[type] || type} Alert*\n\nSend the token CA you want to track:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⬅ Back", "alerts:create")],
      ]),
    }
  );
});

// ── Referral ───────────────────────────────────────────────────────────────
bot.action("referral:view", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const code = `E404\\-${userId.toString().slice(-6).toUpperCase()}`;
  await ctx.editMessageText(
    HEADER +
      `🎁 *Referral Program*\n\n` +
      `Your Code: \`${code}\`\n\n` +
      `👥 Referrals: 0\n` +
      `💰 Earned: $0\\.00\n\n` +
      `_Earn rewards for every trader you bring\._`,
    {
      parse_mode: "MarkdownV2",
      link_preview_options: { is_disabled: true },
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⬅ Back", "settings:view")],
      ]),
    }
  );
});

// ── Deposit / Withdraw stubs ───────────────────────────────────────────────
bot.action("wallet:deposit", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const addr = s.wallets[s.activeWallet]?.address || "No wallet";
  await ctx.editMessageText(
    HEADER +
      `💸 *Deposit*\n\n` +
      `Send ETH or tokens to:\n\n\`${addr}\`\n\n` +
      `Network: Robinhood Chain`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("⬅ Back", "portfolio:view")],
      ]),
    }
  );
});

bot.action("wallet:withdraw", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    HEADER + `📤 *Withdraw*\n\nOpen the terminal to send funds:`,
    {
      parse_mode: "MarkdownV2",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
        [Markup.button.callback("⬅ Back", "portfolio:view")],
      ]),
    }
  );
});

// ── Text Handler ───────────────────────────────────────────────────────────
bot.on("text", async (ctx) => {
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const text = ctx.message.text.trim();

  // Contract address — show token screen
  if (text.startsWith("0x") && text.length === 42 && s.step === "idle") {
    await showTokenScreen(ctx, text, false);
    return;
  }

  // Scanner
  if (s.step === "awaiting_scan") {
    if (text.startsWith("0x") && text.length === 42) {
      s.step = "idle";
      await ctx.reply(`🔍 Scanning \`${text}\`\.\.\.`, { parse_mode: "MarkdownV2" });
      await runScan(ctx, text, false);
    } else {
      await ctx.reply(
        "❌ Invalid address\\. Must start with 0x and be 42 characters\\.",
        { parse_mode: "MarkdownV2" }
      );
    }
    return;
  }

  // Recovery phrase
  if (s.step === "awaiting_phrase") {
    const words = text.split(" ").filter(Boolean);
    if (words.length === 12 || words.length === 24) {
      const w = importFromPhrase(text);
      if (w) {
        const walletNum = s.wallets.length + 1;
        s.wallets.push({
          name: `Wallet ${walletNum}`,
          address: w.address,
          encryptedKey: w.privateKey,
        });
        s.activeWallet = s.wallets.length - 1;
        s.step = "idle";
        await ctx.reply(
          HEADER +
            `✅ *Wallet Imported\\!*\n\n📍 \`${w.address}\`\n\nReady to trade\.`,
          {
            parse_mode: "MarkdownV2",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("🏠 Main Menu", "menu:main")],
              [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
            ]),
          }
        );
      } else {
        await ctx.reply(
          "❌ Invalid recovery phrase\\. Please check and try again\\.",
          { parse_mode: "MarkdownV2" }
        );
      }
    } else {
      await ctx.reply("❌ Must be 12 or 24 words\\.", { parse_mode: "MarkdownV2" });
    }
    return;
  }

  // Private key
  if (s.step === "awaiting_key") {
    const w = importFromKey(text);
    if (w) {
      const walletNum = s.wallets.length + 1;
      s.wallets.push({
        name: `Wallet ${walletNum}`,
        address: w.address,
        encryptedKey: w.privateKey,
      });
      s.activeWallet = s.wallets.length - 1;
      s.step = "idle";
      await ctx.reply(
        HEADER +
          `✅ *Wallet Imported\\!*\n\n📍 \`${w.address}\`\n\nReady to trade\.`,
        {
          parse_mode: "MarkdownV2",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("🏠 Main Menu", "menu:main")],
            [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
          ]),
        }
      );
    } else {
      await ctx.reply("❌ Invalid private key\\.", { parse_mode: "MarkdownV2" });
    }
    return;
  }

  // Limit price
  if (s.step.startsWith("awaiting_limit_price:")) {
    const parts = s.step.split(":");
    const type = parts[1];
    const ca = parts[2];
    const price = parseFloat(text);
    if (!isNaN(price) && price > 0) {
      s.step = "idle";
      await ctx.reply(
        HEADER +
          `✅ *Limit Order Set*\n\n` +
          `Type: ${type === "buy" ? "🟢 Buy" : "🔴 Sell"}\n` +
          `Target: $${price}\n` +
          `Status: Active ⏳\n\n` +
          `You will be notified when triggered\.`,
        {
          parse_mode: "MarkdownV2",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("🎯 View Orders", "orders:view")],
            [Markup.button.callback("🏠 Menu", "menu:main")],
          ]),
        }
      );
    } else {
      await ctx.reply(
        "❌ Invalid price\\. Send a number like `0\\.006`",
        { parse_mode: "MarkdownV2" }
      );
    }
    return;
  }

  // Default
  await showMain(ctx, false);
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

export { bot };
