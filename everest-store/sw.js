/* أبلكيشن إفرست: مش بيخزّن أي حاجة (الموقع دايماً أحدث نسخة) – بس بيعرض رسالة لطيفة لو مفيش إنترنت */
const OFFLINE = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>إفرست للدهانات</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,"Segoe UI",Tahoma,sans-serif;background:#feb206;color:#003087;text-align:center;padding:24px}
.c{background:#fff;border-radius:18px;padding:32px 26px;max-width:340px;box-shadow:0 12px 30px rgba(0,0,0,.15)}h1{font-size:22px;margin:10px 0}p{color:#444;line-height:1.7}
button{margin-top:14px;background:#003087;color:#fff;border:0;border-radius:10px;padding:12px 26px;font:inherit;font-size:16px}</style></head>
<body><div class="c"><div style="font-size:46px">📡</div><h1>مفيش إنترنت دلوقتي</h1><p>اتأكد من الواي فاي أو الباقة وجرّب تاني.<br>ولو مستعجل كلّمنا: <b dir="ltr">0114 086 0075</b></p><button onclick="location.reload()">جرّب تاني</button></div></body></html>`;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, {headers: {"Content-Type": "text/html; charset=utf-8"}})));
});
