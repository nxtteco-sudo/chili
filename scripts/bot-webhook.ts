// Points Telegram at the deployed app (run once after deploying, and again if the URL changes).
//   pnpm bot:webhook https://your-app.vercel.app
import { Bot } from "grammy";

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret } = process.env;
const base = process.argv[2];
if (!token || !secret || !base?.startsWith("https://")) {
  console.error("Usage: pnpm bot:webhook https://your-app.vercel.app\nNeeds TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in .env.local.");
  process.exit(1);
}

async function main() {
  const bot = new Bot(token!);
  await bot.api.setWebhook(`${base.replace(/\/$/, "")}/api/telegram`, {
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  console.log(await bot.api.getWebhookInfo());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
