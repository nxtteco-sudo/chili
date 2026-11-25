// Runs the bot on your laptop by asking Telegram for new messages (polling),
// so you can test it before the dashboard is deployed.
//   pnpm bot:dev
// Stop it with Ctrl+C. It removes the webhook first, so don't run it while
// the deployed bot is live.
import { createBot } from "../src/lib/bot/bot";

process.loadEnvFile(".env.local");
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN in .env.local first (from @BotFather).");
  process.exit(1);
}

const bot = createBot(token);
await bot.api.deleteWebhook();
await bot.start({ onStart: (me) => console.log(`Bot @${me.username} is running. Send it /start on Telegram.`) });
