import "server-only";
import type { Catalog } from "@/lib/bot/store";

// Turns a typed message ("pagi tadi sembur Movento 20ml satu tong, 4 tong, sebab
// thrips") into the answers the guided flows would have collected. The AI only
// suggests: every value is re-checked by the flow's own validation, and
// nothing is saved until the farmer taps ✅ (PROJECT.md §8).

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

export type AiEntry = { type: "spray" | "tank_mix" | "fertilizer"; fields: Record<string, unknown> };

const nullable = (type: string, extra: object = {}) => ({ type: [type, "null"], ...extra });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["type", "daysAgo", "productName", "dosePerTank", "tankSizeL", "tanks", "target", "weather", "abUnit", "aAmount", "bAmount", "waterL", "ec", "ph", "quantity", "method"],
  properties: {
    type: { type: "string", enum: ["spray", "tank_mix", "fertilizer", "unknown"] },
    daysAgo: nullable("integer"),
    productName: nullable("string"),
    dosePerTank: nullable("number"),
    tankSizeL: nullable("number"),
    tanks: nullable("number"),
    target: nullable("string"),
    weather: nullable("string"),
    abUnit: nullable("string", { enum: ["L", "ml", "kg", "g", null] }),
    aAmount: nullable("number"),
    bAmount: nullable("number"),
    waterL: nullable("number"),
    ec: nullable("number"),
    ph: nullable("number"),
    quantity: nullable("number"),
    method: nullable("string", { enum: ["foliar", "tabur", "siram", "other", null] }),
  },
} as const;

const instructions = (products: string[], today: string) => `You read short farm-log messages from a chili farmer in Malaysia, written in Malay, English or a mix (with typos and short forms), and fill in a form.

The farm: chili in polybags on drip. Only pesticides are sprayed. "AB" fertilizer is mixed in a big tank. Today is ${today}.

Decide the entry type:
- "spray": spraying pesticide (sembur, racun, spray, drench a product).
- "tank_mix": mixing a new AB fertilizer tank (baja A dan B, tangki, EC/pH readings).
- "fertilizer": other fertilizer applied by hand or foliar, not through the drip tank (tabur, siram, baja daun).
- "unknown": anything else, or you cannot tell.

Rules:
- Only fill what the message actually says. Use null for anything not stated. Never guess numbers.
- "tong" means one sprayer tank. dosePerTank is the amount for ONE tank, in the product's own unit. "20ml satu tong, 4 tong" = dosePerTank 20, tanks 4. If only a total is given, leave dosePerTank null.
- tankSizeL is the tank volume in litres, only if stated.
- daysAgo: 0 for today / pagi tadi / tadi / petang tadi, 1 for semalam, 2 for kelmarin or "2 hari lepas", and so on. null if no day is mentioned.
- productName must be copied exactly from this list, or null if nothing matches: ${products.length ? products.join(", ") : "(no products yet)"}.
- target is the pest, disease or reason (thrips, kulat, tungau...), short, as the farmer said it.
- method (fertilizer only): foliar = sprayed on leaves, tabur = spread on soil, siram = poured.`;

export async function parseLogMessage(text: string, catalog: Catalog, today: string): Promise<AiEntry | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      // Telegram gives a webhook about 10 seconds, so give up well before that.
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        model: MODEL,
        reasoning_effort: "none",
        max_completion_tokens: 400,
        response_format: { type: "json_schema", json_schema: { name: "farm_entry", strict: true, schema: SCHEMA } },
        messages: [
          { role: "system", content: instructions(catalog.products.map((p) => p.name), today) },
          { role: "user", content: text.slice(0, 1000) },
        ],
      }),
    });
    if (!res.ok) {
      console.error("AI request failed:", res.status, await res.text());
      return null;
    }
    const parsed = JSON.parse((await res.json()).choices[0].message.content) as Record<string, unknown>;
    if (parsed.type !== "spray" && parsed.type !== "tank_mix" && parsed.type !== "fertilizer") return null;
    const { type, productName, ...rest } = parsed;
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== null) fields[k] = v;
    if (typeof productName === "string") fields.productName = productName;
    return { type, fields };
  } catch (error) {
    console.error("AI parse failed:", error);
    return null;
  }
}
