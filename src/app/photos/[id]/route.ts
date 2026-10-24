import { connection } from "next/server";
import { getMember } from "@/lib/auth";
import { readPhotoFile } from "@/lib/db";

// Photos sit in a private bucket; they are only served to logged-in members.
export async function GET(_request: Request, ctx: RouteContext<"/photos/[id]">) {
  await connection();
  if (!(await getMember())) return new Response("Please log in", { status: 401 });
  const { id } = await ctx.params;
  const blob = await readPhotoFile(id);
  if (!blob) return new Response("Not found", { status: 404 });
  return new Response(blob, {
    headers: {
      "Content-Type": "image/jpeg",
      // Photo ids are never reused, so the file can be cached forever (per user).
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
