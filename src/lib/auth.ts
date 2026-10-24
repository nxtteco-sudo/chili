import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";

export type Member = { userId: string; email?: string; name: string; role: "farmer" | "admin" };

// The logged-in user, if they are on the farm's member list. Cached per request.
export const getMember = cache(async (): Promise<Member | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: row } = await supabase.from("farm_members").select("name, role").eq("user_id", claims.sub).maybeSingle();
  if (!row) return null;
  return { userId: claims.sub, email: claims.email as string | undefined, name: row.name, role: row.role };
});

// Every server action and private route starts with this. The proxy already
// redirects logged-out visitors, but actions can be called directly with POST.
export async function requireMember(): Promise<Member> {
  const member = await getMember();
  if (!member) redirect("/login");
  return member;
}
