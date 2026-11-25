import "server-only";
import { Bot, InlineKeyboard, Keyboard, session, type Context, type SessionFlavor } from "grammy";
import { dayKey, formatShort } from "@/lib/dates";
import { describeActivity } from "@/lib/describe";
import { parseLogMessage } from "@/lib/ai/parse";
import { FLOWS, makeCtx, prefill, rows, type Draft, type Flow, type Option } from "./flows";
import { deleteActivity, getTelegramUser, lastSavedActivity, loadCatalog, saveActivity, sessionStorage } from "./store";

// The Telegram bot (Phase 4, button logging). Wording: Malay first, English in brackets.

type Session = { flow?: Flow["id"]; step: number; draft: Draft; values: string[]; raw?: string };
type BotContext = Context & SessionFlavor<Session>;

const MENU = {
  spray: "🧪 Spray",
  tank_mix: "🪣 Tank mix (AB)",
  fertilizer: "🌱 Other baja",
  problem: "⚠️ Problem",
  batch: "🌶️ Batch",
  search: "🔍 Cari",
  recent: "📋 Recent",
} as const;

const menu = new Keyboard()
  .text(MENU.spray).text(MENU.tank_mix).row()
  .text(MENU.fertilizer).text(MENU.problem).row()
  .text(MENU.batch).text(MENU.search).text(MENU.recent)
  .persistent()
  .resized();

const confirmKeyboard = new InlineKeyboard()
  .text("✅ Betul, simpan", "c:ok").row()
  .text("🔁 Ulang", "c:redo").text("❌ Batal", "c:no");

const ICON = { spray: "🧪", tank_mix: "🪣", fertilizer: "🌱" } as const;

function keyboardFor(options: Option[] = []) {
  const kb = new InlineKeyboard();
  rows(options).forEach((row) => {
    row.forEach((o) => kb.text(o.label, `w:${options.indexOf(o)}`));
    kb.row();
  });
  return kb;
}

const reset = (ctx: BotContext) => {
  ctx.session = { step: 0, draft: {}, values: [] };
};

// Shows the next unanswered question, or the summary once everything is filled in.
async function ask(ctx: BotContext) {
  const s = ctx.session;
  const flow = FLOWS[s.flow!];
  const fc = makeCtx(s.draft, await loadCatalog());
  while (s.step < flow.steps.length) {
    const step = flow.steps[s.step];
    const auto = step.auto?.(fc);
    if (!auto && step.key in s.draft) {
      s.step++; // already answered (read from the farmer's typed message)
      continue;
    }
    if (!auto) {
      const q = step.ask(fc);
      const options = q.options ?? [];
      s.values = options.map((o) => o.value);
      await ctx.reply(q.text, { reply_markup: options.length ? keyboardFor(options) : undefined });
      return;
    }
    s.draft[step.key] = auto.value;
    s.step++;
  }
  s.values = [];
  if (s.raw) {
    // A typed sentence is saved straight away; the Padam button is the safety net.
    const activity = { ...flow.build(fc), rawMessage: s.raw };
    const summary = flow.summary(fc).split("\n").slice(1).join("\n");
    await saveActivity(activity);
    reset(ctx);
    await ctx.reply(`✅ Disimpan! (Saved.)\n\n${summary}`, {
      reply_markup: new InlineKeyboard().text("↩️ Salah? Padam", `u:${activity.id}`),
    });
    return;
  }
  await ctx.reply(flow.summary(fc), { reply_markup: confirmKeyboard });
}

async function start(ctx: BotContext, id: Flow["id"]) {
  reset(ctx);
  ctx.session.flow = id;
  await ctx.reply(`${FLOWS[id].title}\n(Taip /batal untuk berhenti. Type /batal to stop.)`);
  await ask(ctx);
}

async function answer(ctx: BotContext, raw: string) {
  const s = ctx.session;
  const flow = FLOWS[s.flow!];
  const step = flow.steps[s.step];
  if (!step) return; // waiting on the confirm buttons
  const result = step.parse ? step.parse(raw, makeCtx(s.draft, await loadCatalog())) : { value: raw };
  if ("error" in result) {
    await ctx.reply(result.error);
    return;
  }
  s.draft[step.key] = result.value;
  s.step++;
  await ask(ctx);
}

export function createBot(token: string) {
  const bot = new Bot<BotContext>(token);

  // Only people listed in telegram_users may use the bot. Everyone else gets
  // their own Telegram ID (so it can be added) and is otherwise ignored.
  bot.use(async (ctx, next) => {
    const id = ctx.from?.id;
    if (!id || ctx.chat?.type !== "private") return;
    if (await getTelegramUser(id)) return next();
    if (ctx.message?.text?.startsWith("/start") || ctx.message?.text?.startsWith("/id"))
      await ctx.reply(`Maaf, bot ni untuk keluarga ladang sahaja.\n(Sorry, this bot is private.)\n\nTelegram ID: ${id}`);
  });

  bot.use(session({ initial: (): Session => ({ step: 0, draft: {}, values: [] }), storage: sessionStorage as never, getSessionKey: (ctx) => ctx.from?.id.toString() }));

  bot.command("start", async (ctx) => {
    reset(ctx);
    await ctx.reply(
      "🌶️ Selamat datang ke Kebun Cili!\nTaip je apa yang dibuat, saya catatkan.\nContoh: sembur Movento 20ml satu tong, 4 tong, thrips\n\n(Just type what you did and it is logged. /menu shows buttons.)",
      { reply_markup: { remove_keyboard: true } },
    );
  });
  bot.command("menu", (ctx) => ctx.reply("Pilih: (Pick one)", { reply_markup: menu }));
  bot.command("id", (ctx) => ctx.reply(`Telegram ID: ${ctx.from?.id}`));
  bot.command(["batal", "cancel"], async (ctx) => {
    reset(ctx);
    await ctx.reply("Dibatalkan. (Cancelled.)");
  });

  for (const id of Object.keys(FLOWS) as Flow["id"][]) bot.hears(MENU[id], (ctx) => start(ctx, id));
  for (const key of ["problem", "batch", "search"] as const)
    bot.hears(MENU[key], (ctx) => ctx.reply("Belum siap lagi — akan datang. (Not ready yet — coming soon.)"));

  const recent = async (ctx: BotContext) => {
    const { activities, products } = await loadCatalog();
    if (activities.length === 0) return ctx.reply("Belum ada catatan. (Nothing logged yet.)");
    const list = activities.slice(0, 10).map((a) => {
      const d = describeActivity(a, products);
      return `${ICON[a.type]} ${formatShort(dayKey(a.occurredAt))} — ${d.title}\n     ${d.detail}`;
    });
    return ctx.reply(list.join("\n\n"));
  };
  bot.command("recent", recent);
  bot.hears(MENU.recent, recent);

  bot.command("dashboard", (ctx) =>
    ctx.reply(process.env.APP_URL ?? "Dashboard belum online lagi. (The dashboard isn't deployed yet.)"),
  );

  bot.command("undo", async (ctx) => {
    const last = await lastSavedActivity();
    if (!last) return ctx.reply("Tiada apa untuk dipadam. (Nothing to delete.)");
    const d = describeActivity(last, (await loadCatalog()).products);
    await ctx.reply(`Padam catatan terakhir? (Delete the last entry?)\n\n${ICON[last.type]} ${formatShort(dayKey(last.occurredAt))} — ${d.title}\n${d.detail}`, {
      reply_markup: new InlineKeyboard().text("🗑️ Ya, padam", `u:${last.id}`).text("Tak jadi", "u:no"),
    });
  });

  bot.callbackQuery(/^u:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = ctx.match[1];
    if (id === "no") return ctx.editMessageText("Tak jadi padam. (Not deleted.)");
    await deleteActivity(id);
    return ctx.editMessageText("🗑️ Dipadam. (Deleted.)");
  });

  bot.callbackQuery(/^w:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const value = ctx.session.values[Number(ctx.match[1])];
    if (!ctx.session.flow || value === undefined) return ctx.reply("Butang ni dah tamat. Mula semula dari menu. (That button has expired — start again from the menu.)");
    await ctx.editMessageReplyMarkup(); // lock in the answer by removing the buttons
    await answer(ctx, value);
  });

  bot.callbackQuery(/^c:(ok|redo|no)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const s = ctx.session;
    if (!s.flow) return ctx.reply("Sesi dah tamat. Mula semula dari menu. (Session ended — start again from the menu.)");
    const flow = FLOWS[s.flow];
    await ctx.editMessageReplyMarkup();
    if (ctx.match[1] === "no") {
      reset(ctx);
      return ctx.reply("Dibatalkan. (Cancelled.)");
    }
    if (ctx.match[1] === "redo") return start(ctx, flow.id);
    const activity = flow.build(makeCtx(s.draft, await loadCatalog()));
    await saveActivity({ ...activity, rawMessage: s.raw });
    reset(ctx);
    await ctx.reply("✅ Disimpan! (Saved.)");
  });

  bot.on("message:text", async (ctx) => {
    if (ctx.session.flow) return answer(ctx, ctx.message.text);
    // No flow running: try to read a typed sentence as a log entry.
    const catalog = await loadCatalog();
    const text = ctx.message.text;
    await ctx.replyWithChatAction("typing");
    const entry = await parseLogMessage(text, catalog, makeCtx({}, catalog).today);
    if (!entry) return ctx.reply("Tak faham lagi 😅 Cuba taip macam: sembur Movento 20ml satu tong, 4 tong, thrips\n(Couldn't read that. Or use /menu for buttons.)");
    const flow = FLOWS[entry.type];
    ctx.session = { flow: flow.id, step: 0, draft: prefill(flow, entry.fields, catalog), values: [], raw: text };
    await ctx.reply(`🤖 Saya faham ini ${flow.title}.`);
    await ask(ctx);
  });

  bot.on("message:photo", (ctx) => ctx.reply("Gambar belum disokong lagi — akan datang. (Photos aren't supported yet — coming soon.)"));

  bot.catch(async ({ error, ctx }) => {
    // Swallow errors: returning a 500 to Telegram would make it re-send the same message forever.
    console.error("Bot error:", error);
    await ctx.reply("Alamak, ada masalah. Cuba lagi sekejap. (Something went wrong, please try again.)").catch(() => {});
  });

  return bot;
}
