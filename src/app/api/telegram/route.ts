import { webhookCallback } from "grammy";
import { createBot } from "@/lib/bot/bot";

// Telegram calls this URL for every message. The secret token header proves
// the request really comes from Telegram (set with the same value in setWebhook).
export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return new Response("Bot is not configured", { status: 503 });
  return webhookCallback(createBot(token), "std/http", { secretToken: secret })(request);
}
