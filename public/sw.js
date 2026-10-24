// Minimal service worker: caches static assets so the installed app opens
// fast, and shows a friendly page when there is no signal at the farm.
const CACHE = "kebun-cili-v1";

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline — Kebun Cili</title>
<style>body{font-family:system-ui,sans-serif;background:#f6f5f1;color:#0b0b0b;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center}
@media (prefers-color-scheme:dark){body{background:#0d0d0d;color:#f0efec}}
button{margin-top:16px;padding:10px 18px;border-radius:10px;border:0;background:#1f6b3a;color:#fff;font-size:16px}</style></head>
<body><div><h1 style="font-size:22px">Tiada internet (no internet)</h1>
<p>Connect to the internet to see the latest farm logs.</p>
<button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(
        () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
      ),
    );
  }
});
