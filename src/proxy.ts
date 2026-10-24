import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static files, icons, the manifest and the service worker,
  // which the installed app and the login screen need before logging in.
  matcher: ["/((?!_next/static|_next/image|icon|apple-icon|manifest.webmanifest|sw.js|favicon.ico).*)"],
};
