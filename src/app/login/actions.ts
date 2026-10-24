"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Fields, type FormState } from "@/lib/form-fields";
import { createClient } from "@/lib/supabase/server";

const safeNext = (path: string | undefined) =>
  path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/login") ? path : "/";

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const f = new Fields(fd);
  const email = f.str("email", "Email", { required: true, max: 200 });
  const password = f.str("password", "Password", { required: true, max: 200 });
  const next = f.str("next", "Next", { max: 500 });
  if (!f.ok) return f.state();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email!, password: password! });
  if (error || !data.user) return { error: "Wrong email or password." };

  // A valid account is not enough; it must be on the farm's member list.
  const { data: member } = await supabase.from("farm_members").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!member) {
    await supabase.auth.signOut();
    return { error: "This account isn't on the farm's member list yet." };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
