import "server-only";
import type { Catalog } from "@/lib/bot/store";

// Turns a typed message ("pagi tadi sembur Movento 20ml satu tong, 4 tong, sebab
// thrips") into the answers the guided flows would have collected. The AI only
// suggests: every value is re-checked by the flow's own validation, and
// nothing is saved until the farmer taps ✅ (PROJECT.md §8).

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

export type NewProduct = { name: string; category: "pesticide" | "fertilizer"; unit: string; quantity?: number; quantityUnit?: string };

export type AiEntry =
  | { type: "spray" | "tank_mix" | "fertilizer"; fields: Record<string, unknown> }
  | { type: "products"; products: NewProduct[]; daysAgo: number };

const nullable = (type: string, extra: object = {}) => ({ type: [type, "null"], ...extra });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["type", "products", "daysAgo", "productName", "unit", "dosePerTank", "tankSizeL", "tanks", "target", "weather", "abUnit", "aAmount", "bAmount", "waterL", "ec", "ph", "quantity", "method"],
  properties: {
    type: { type: "string", enum: ["spray", "tank_mix", "fertilizer", "products", "unknown"] },
    products: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "category", "unit", "quantity", "quantityUnit"],
        properties: {
          name: { type: "string" },
          category: { type: "string", enum: ["pesticide", "fertilizer"] },
          unit: { type: "string", enum: ["ml", "g", "L", "kg"] },
          quantity: { type: ["number", "null"] },
          quantityUnit: { type: ["string", "null"], enum: ["ml", "g", "L", "kg", null] },
        },
      },
    },
    daysAgo: nullable("integer"),
    productName: nullable("string"),
    unit: nullable("string", { enum: ["ml", "g", "L", "kg", null] }),
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
- "products": the farmer lists products he bought, received or wants added to his product list (beli, stock, tambah produk, "have/ada 25 set" of a product with a pack size), without spraying or mixing anything. A message that only says what he has in stock (e.g. "Baja AB have 25 set each 14kg") is "products", not tank_mix. Fill "products" with one item per product. Leave it an empty list for every other type.
- "unknown": anything else, or you cannot tell.

For "products": quantity is the TOTAL amount bought of that product, and quantityUnit its unit. When the farmer gives a pack size AND how many packs (set, beg, karung, botol, tin, bungkus, pek, x, unit, pcs), multiply them: total = number of packs x pack size. Examples: "BAYER INFINITO 1L" -> 1 L. "2 botol Score 500ml" -> 1000 ml. "BAJA AB 14KG SET 25SET" -> 14 kg x 25 sets = 350 kg. "Urea 25kg 10 beg" -> 250 kg. "Antracol 1KG x3" -> 3 kg. quantity is null only if no amount is written at all. daysAgo (top level) is when it was bought: "semalam" = 1, today or not stated = 0. If a product is the same as one in the known list, use the list name exactly. name is the brand and product name tidied into normal capitalisation (e.g. "Bayer Antracol 70WP"), without the pack size. category is pesticide (insecticide, fungicide, miticide, herbicide) or fertilizer. unit is the unit doses are measured in: g for powders and granules (WP, WG, SP, WDG, kg packs), ml for liquids (SC, EC, SL, litre packs), kg for fertilizers.

Rules:
- Only fill what the message actually says. Use null for anything not stated. Never guess numbers.
- "tong" means one sprayer tank. dosePerTank is the amount for ONE tank, in the product's own unit. "20ml satu tong, 4 tong" = dosePerTank 20, tanks 4. If only a total is given, leave dosePerTank null.
- tankSizeL is the tank volume in litres, only if stated.
- daysAgo: 0 for today / pagi tadi / tadi / petang tadi, 1 for semalam, 2 for kelmarin or "2 hari lepas", and so on. null if no day is mentioned.
- productName: the product the farmer names. If it is the same product as one in this list (allowing for typos and different spelling), use the list name exactly. Otherwise write the name as the farmer wrote it, tidied up (no quantity or unit in it). null if no product is named. Known products: ${products.length ? products.join(", ") : "(none yet)"}.
- unit: the unit written next to the dose or quantity (ml, g, L or kg), null if not stated.
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
    if (parsed.type === "products") {
      const products = (parsed.products as (Omit<NewProduct, "quantity" | "quantityUnit"> & { quantity: number | null; quantityUnit: string | null })[])
        .filter((p) => p.name.trim())
        .slice(0, 20)
        .map(({ quantity, quantityUnit, ...p }) => ({ ...p, ...(quantity && quantityUnit ? { quantity, quantityUnit } : {}) }));
      return products.length ? { type: "products", products, daysAgo: typeof parsed.daysAgo === "number" ? parsed.daysAgo : 0 } : null;
    }
    if (parsed.type !== "spray" && parsed.type !== "tank_mix" && parsed.type !== "fertilizer") return null;
    const { type, productName, unit, ...rest } = parsed;
    delete rest.products;
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== null) fields[k] = v;
    if (typeof productName === "string") fields.productName = productName;
    if (typeof unit === "string") fields.unit = unit;
    return { type, fields };
  } catch (error) {
    console.error("AI parse failed:", error);
    return null;
  }
}
