#!/usr/bin/env node
/* =====================================================================
   سيرفر محلي لموقع إفرست – بيشغّل الموقع على الكمبيوتر وبيعمل نفس شغل api.php
   (كلمة السر، الحفظ، الطلبات، رفع الفيديوهات) عشان تقدر تستخدم لوحة التحكم
   كاملة من جهازك قبل ما ترفع الموقع على الاستضافة.
   التشغيل (من داخل مجلد everest-store):  node tools/dev-server.js   ثم افتح http://localhost:5180
   ===================================================================== */
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const PORT = +process.env.PORT || +process.argv[2] || 5180;
const PRIV = path.join(ROOT, "private"), STORE = path.join(ROOT, "data/store.json"), VIDEO_DIR = path.join(ROOT, "assets/videos");
const AUTH = path.join(PRIV, "auth.json"), EVENTS = path.join(PRIV, "events.jsonl");
const MAX_VIDEO_MB = 300, CHUNK_MB = 4, MAX_FAILS = 8, LOCK_MIN = 15;
for (const d of [PRIV, path.join(PRIV, "backups"), path.join(PRIV, "tmp"), VIDEO_DIR]) fs.mkdirSync(d, {recursive: true});

const MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".woff2": "font/woff2"};

/* ---------- أدوات ---------- */
const rjson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")) } catch (e) { return d } };
const wjson = (f, d, pretty) => { const t = f + ".tmp" + crypto.randomBytes(4).toString("hex"); fs.writeFileSync(t, JSON.stringify(d, null, pretty ? 2 : 0)); fs.renameSync(t, f) };
const send = (res, o, code = 200) => { res.writeHead(code, {"Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store"}); res.end(JSON.stringify(o)) };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strong = p => typeof p === "string" && [...p].length >= 8 && /\d/.test(p) && /\D/.test(p);
const hashPw = (p, salt = crypto.randomBytes(16).toString("hex")) => "scrypt$" + salt + "$" + crypto.scryptSync(p, salt, 64).toString("hex");
const checkPw = (p, h) => { if (!h || typeof p !== "string") return false; const [, salt, hex] = h.split("$"); const a = crypto.scryptSync(p, salt, 64), b = Buffer.from(hex, "hex"); return a.length === b.length && crypto.timingSafeEqual(a, b) };
const auth = () => rjson(AUTH, {hash: "", tokens: {}, fails: 0, lockUntil: 0});
const sha = t => crypto.createHash("sha256").update(String(t)).digest("hex");
function newToken(a, remember) {
  const t = crypto.randomBytes(32).toString("hex"), now = Date.now() / 1000;
  for (const k of Object.keys(a.tokens || {})) if (a.tokens[k] < now) delete a.tokens[k];
  (a.tokens = a.tokens || {})[sha(t)] = now + (remember ? 30 * 86400 : 12 * 3600);
  return t;
}
function readBody(req, limit) {
  return new Promise((res, rej) => { const c = []; let n = 0; req.on("data", d => { n += d.length; if (n > limit) { rej(new Error("too big")); req.destroy() } else c.push(d) }); req.on("end", () => res(Buffer.concat(c))); req.on("error", rej) });
}
function parseMultipart(buf, boundary) {
  const out = {}, sep = Buffer.from("--" + boundary); let pos = buf.indexOf(sep);
  while (pos !== -1) {
    const next = buf.indexOf(sep, pos + sep.length); if (next === -1) break;
    const part = buf.slice(pos + sep.length + 2, next - 2), he = part.indexOf("\r\n\r\n");
    if (he > 0) { const head = part.slice(0, he).toString(), m = /name="([^"]+)"/.exec(head); if (m) out[m[1]] = /filename="/.test(head) ? part.slice(he + 4) : part.slice(he + 4).toString() }
    pos = next;
  }
  return out;
}

/* ---------- نفس منطق api.php ---------- */
async function api(req, res, url) {
  if (req.method === "GET" && url.searchParams.get("action") === "status") {
    const a = auth(); return send(res, {ok: true, server: "everest", setup: !!a.hash, maxVideoMB: MAX_VIDEO_MB, chunkMB: CHUNK_MB, local: true});
  }
  if (req.method !== "POST") return send(res, {ok: false, error: "method"}, 405);
  const ct = req.headers["content-type"] || "";
  let body;
  try {
    const raw = await readBody(req, (CHUNK_MB + 1) * 1048576 + 65536);
    body = /multipart\/form-data/i.test(ct) ? parseMultipart(raw, (/boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct) || [])[1] || (/boundary=([^;]+)/i.exec(ct) || [])[1]) : JSON.parse(raw.toString() || "{}");
  } catch (e) { return send(res, {ok: false, error: "bad request"}, 400) }
  const action = String(body.action || "");

  if (action === "event") {
    const types = ["order", "booking", "package", "wholesale", "colour_combo", "contact"];
    if (!types.includes(body.type)) return send(res, {ok: false});
    const clip = (v, n) => String(v ?? "").trim().slice(0, n);
    const row = {id: crypto.randomBytes(4).toString("hex"), date: new Date().toISOString(), type: body.type, status: "جديد", name: clip(body.name, 80), phone: clip(body.phone, 20), area: clip(body.area, 160), total: isFinite(+body.total) && body.total !== "" ? +body.total : "", details: clip(body.details, 3000), page: clip(body.page, 200)};
    fs.appendFileSync(EVENTS, JSON.stringify(row) + "\n"); return send(res, {ok: true});
  }
  if (action === "setup") {
    const a = auth(); if (a.hash) return send(res, {ok: false, error: "exists"});
    if (!strong(body.password)) return send(res, {ok: false, error: "weak"});
    a.hash = hashPw(body.password); a.fails = 0; a.lockUntil = 0; const t = newToken(a, body.remember); wjson(AUTH, a); return send(res, {ok: true, token: t});
  }
  if (action === "login") {
    const a = auth(); if (!a.hash) return send(res, {ok: false, error: "nosetup"});
    if ((a.lockUntil || 0) > Date.now() / 1000) return send(res, {ok: false, error: "locked"});
    if (!checkPw(body.password, a.hash)) {
      a.fails = (a.fails || 0) + 1; if (a.fails >= MAX_FAILS) { a.lockUntil = Date.now() / 1000 + LOCK_MIN * 60; a.fails = 0 }
      wjson(AUTH, a); await sleep(1200);
      return send(res, {ok: false, error: a.lockUntil > Date.now() / 1000 ? "locked" : "wrong key", left: Math.max(0, MAX_FAILS - a.fails)});
    }
    a.fails = 0; const t = newToken(a, body.remember); wjson(AUTH, a); return send(res, {ok: true, token: t});
  }
  const a = auth(), tok = String(body.token || "");
  if (!tok || !((a.tokens || {})[sha(tok)] > Date.now() / 1000)) { await sleep(400); return send(res, {ok: false, error: "wrong key"}) }

  switch (action) {
    case "ping": return send(res, {ok: true});
    case "logout": delete a.tokens[sha(tok)]; wjson(AUTH, a); return send(res, {ok: true});
    case "setKey": {
      if (!checkPw(body.currentKey, a.hash)) { await sleep(1200); return send(res, {ok: false, error: "current"}) }
      if (!strong(body.newKey)) return send(res, {ok: false, error: "weak"});
      a.hash = hashPw(body.newKey); a.tokens = {}; const t = newToken(a, body.remember); wjson(AUTH, a); return send(res, {ok: true, token: t});
    }
    case "save": {
      const d = body.data; if (!d || !d.products || !d.settings) return send(res, {ok: false, error: "invalid"});
      delete d.settings.adminHash;
      if (fs.existsSync(STORE)) {
        const bk = path.join(PRIV, "backups"); fs.copyFileSync(STORE, path.join(bk, "store-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json"));
        const old = fs.readdirSync(bk).filter(f => f.startsWith("store-")).sort(); old.slice(0, Math.max(0, old.length - 30)).forEach(f => fs.unlinkSync(path.join(bk, f)));
      }
      wjson(STORE, d, true); return send(res, {ok: true, savedAt: new Date().toISOString()});
    }
    case "events": {
      const rows = {}; if (fs.existsSync(EVENTS)) for (const l of fs.readFileSync(EVENTS, "utf8").split("\n")) { try { const r = JSON.parse(l); rows[r.id] = r } catch (e) {} }
      return send(res, {ok: true, events: Object.values(rows).reverse().slice(0, +body.limit || 500)});
    }
    case "status": {
      if (!fs.existsSync(EVENTS)) return send(res, {ok: false}); let found = false;
      const lines = fs.readFileSync(EVENTS, "utf8").split("\n").filter(Boolean).map(l => { const r = JSON.parse(l); if (r.id === body.id) { r.status = String(body.status).slice(0, 30); found = true } return JSON.stringify(r) });
      fs.writeFileSync(EVENTS, lines.join("\n") + "\n"); return send(res, {ok: found});
    }
    case "uploadChunk": {
      const uid = String(body.uploadId || "").replace(/[^a-z0-9]/g, ""), i = +body.index, n = +body.total;
      if (uid.length < 8 || !(i >= 0) || !(n >= 1) || i >= n || n > Math.ceil(MAX_VIDEO_MB / CHUNK_MB) + 1) return send(res, {ok: false, error: "bad"});
      if (!Buffer.isBuffer(body.chunk)) return send(res, {ok: false, error: "upload"});
      const part = path.join(PRIV, "tmp", uid + ".part");
      if (i === 0 && fs.existsSync(part)) fs.unlinkSync(part);
      if (i > 0 && !fs.existsSync(part)) return send(res, {ok: false, error: "order"});
      fs.appendFileSync(part, body.chunk);
      if (fs.statSync(part).size > MAX_VIDEO_MB * 1048576) { fs.unlinkSync(part); return send(res, {ok: false, error: "size"}) }
      if (i < n - 1) return send(res, {ok: true, next: i + 1});
      const fd = fs.openSync(part, "r"), h = Buffer.alloc(16); fs.readSync(fd, h, 0, 16, 0); fs.closeSync(fd);
      const ext = h.slice(4, 8).toString("latin1") === "ftyp" ? (h.slice(8, 10).toString("latin1") === "qt" ? "mov" : "mp4") : (h.slice(0, 4).equals(Buffer.from([0x1A, 0x45, 0xDF, 0xA3])) ? "webm" : "");
      if (!ext) { fs.unlinkSync(part); return send(res, {ok: false, error: "type"}) }
      const base = (String(body.name || "video").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "video").slice(0, 40);
      const name = `${base}-${Date.now().toString(36)}.${ext}`;
      fs.renameSync(part, path.join(VIDEO_DIR, name));
      return send(res, {ok: true, src: "assets/videos/" + name});
    }
    case "deleteVideo": {
      const m = /^assets\/videos\/([a-z0-9-]+\.(mp4|mov|webm))$/.exec(String(body.src || ""));
      if (m && fs.existsSync(path.join(VIDEO_DIR, m[1]))) fs.unlinkSync(path.join(VIDEO_DIR, m[1]));
      return send(res, {ok: true});
    }
    case "fetchJotun": return send(res, {ok: false, error: "الإضافة من رابط جوتن بتشتغل على الاستضافة – استخدم الإضافة السريعة على الكمبيوتر"});
  }
  return send(res, {ok: false, error: "unknown action"});
}

/* ---------- عرض ملفات الموقع (مع دعم تشغيل وتقديم الفيديو) ---------- */
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (/^\/(private|tools)(\/|$)/.test(p) || /\/\./.test(p)) { res.writeHead(403); return res.end("Forbidden") }
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end() }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) { res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"}); return res.end("Not found") }
  const st = fs.statSync(file), type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range) {
    const start = range[1] ? +range[1] : Math.max(0, st.size - +range[2]), end = range[1] && range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
    if (start >= st.size) { res.writeHead(416, {"Content-Range": `bytes */${st.size}`}); return res.end() }
    res.writeHead(206, {"Content-Type": type, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1, "Cache-Control": "no-cache"});
    return fs.createReadStream(file, {start, end}).pipe(res);
  }
  res.writeHead(200, {"Content-Type": type, "Content-Length": st.size, "Accept-Ranges": "bytes", "Cache-Control": "no-cache"});
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api.php") return api(req, res, url).catch(e => send(res, {ok: false, error: String(e.message || e)}, 500));
  serveStatic(req, res, url);
}).listen(PORT, () => console.log(`موقع إفرست شغال على http://localhost:${PORT}  –  لوحة التحكم: http://localhost:${PORT}/admin.html`));
