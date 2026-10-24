import fs from "node:fs/promises";
import { connection } from "next/server";
import { photoPath } from "@/lib/store";

export async function GET(_request: Request, ctx: RouteContext<"/photos/[id]">) {
  await connection();
  const { id } = await ctx.params;
  const file = photoPath(id);
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const bytes = await fs.readFile(file);
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        // Photo ids are never reused, so the file can be cached forever.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
