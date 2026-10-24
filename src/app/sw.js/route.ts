import { CLEANUP_SW, PRODUCTION_SW } from "@/lib/service-worker";

export function GET() {
  const body = process.env.NODE_ENV === "production" ? PRODUCTION_SW : CLEANUP_SW;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Always revalidate so an updated worker is picked up straight away.
      "Cache-Control": "no-cache",
    },
  });
}
