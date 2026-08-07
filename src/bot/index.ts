import { bot } from "@/lib/telegram";
import { handleStart } from "./handlers/start";
import { handleWallet } from "./handlers/wallet";
import { handleTrade } from "./handlers/trade";
import { handlePortfolio } from "./handlers/portfolio";
import { handleAlerts } from "./handlers/alerts";
import { handleScanner } from "./handlers/scanner";
import { handleSettings } from "./handlers/settings";

bot.start(handleStart);
bot.action("wallet:create", handleWallet.create);
bot.action("wallet:import", handleWallet.import);
bot.action("trade:buy", handleTrade.buy);
bot.action("trade:sell", handleTrade.sell);
bot.action("portfolio:view", handlePortfolio.view);
bot.action("alerts:list", handleAlerts.list);
bot.action("scanner:scan", handleScanner.scan);
bot.action("settings:view", handleSettings.view);

export { bot };
