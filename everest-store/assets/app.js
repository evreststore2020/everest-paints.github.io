/* =====================================================================
   إفرست للدهانات – منطق المتجر
   البيانات كلها في data/store.json (تُعدّل من admin.html) و data/colours.json
   ===================================================================== */
(async function () {
const BASE = new URL("..", document.currentScript ? document.currentScript.src : location.href).href;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const num = n => (+n).toLocaleString("ar-EG");
const fmt = n => Math.round(n).toLocaleString("ar-EG") + " ج.م";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch (e) { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} } };
/* لو الزائر لسه ما سجّلش: المتجر بيبان مقفول من أول لحظة لحد ما شاشة التسجيل تظهر */
{ const c = store.get("everest-customer", null); if (!(c && c.name && c.email && c.type) && !new URLSearchParams(location.search).has("preview")) document.documentElement.classList.add("cust-gate") }

/* ---------- تحميل البيانات ---------- */
let DATA;
const preview = new URLSearchParams(location.search).has("preview") && store.get("everest-admin-draft", null);
try { DATA = preview || await fetch(BASE + "data/store.json", {cache: "no-cache"}).then(r => r.json()); }
catch (e) { document.body.insertAdjacentHTML("afterbegin", '<p style="background:#c8102e;color:#fff;padding:12px;text-align:center">تعذّر تحميل بيانات المتجر. يجب تشغيل الموقع من خادم ويب (وليس بفتح الملف مباشرة).</p>'); return; }
/* لو Supabase متوصّل: المنتجات والإعدادات بتيجي منه، والطلبات بتتسجل فيه */
const SB = window.Supa && window.supaConfigured && window.supaConfigured() ? window.Supa(window.EVEREST_CONFIG) : null;
if (SB && !preview) {
  try { const live = await SB.loadAll(false); if (live.products.length) DATA = live } catch (e) { console.warn("Supabase:", e.message) }
}
if (DATA.settings) DATA.settings.apiUrl = "";
let PAGES = null; try { PAGES = new Set(await fetch(BASE + "data/pages.json").then(r => r.json())) } catch (e) {}
if (preview) document.body.insertAdjacentHTML("afterbegin", '<p style="background:#d9a441;color:#0b2a4a;padding:8px;text-align:center;font-weight:700">وضع المعاينة – هذه بيانات المسودة من لوحة التحكم وليست المنشورة</p>');

const S = DATA.settings;
const P = DATA.products.filter(p => p.active !== false);
const byId = id => DATA.products.find(p => p.id === id);
const J = "https://www.jotun.com/eg-ar/decorative/products/";
const IMG = id => `https://cdn-pim.jotun.com/images/ProductImages/${id}/1300x1334/${id}.png?format=webp&width=562&quality=70`;
const JOTUN_LOGO = "https://www.jotun.com/siteassetsjot03/jotun-logo-new.svg";
const wa = t => `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(t)}`;
const unitWord = p => p.u === "كجم" ? "كجم" : "لتر";
/* العبوات: كل عبوة {s: الحجم, u: الوحدة, p: سعر العبوة, v: النوع (أبيض/ألوان خاصة...)}
   المنتجات القديمة اللي ليها سعر للتر + أحجام بتتحول تلقائياً */
const PK = p => p.packs && p.packs.length ? p.packs : (p.sizes || []).map(s => ({s, u: p.u, p: p.price != null ? +(p.price * s).toFixed(2) : null}));
const pkKey = k => `${k.s}${k.u}${k.v ? "~" + k.v : ""}`;
const pkLabel = k => `${num(k.s)} ${k.u === "كجم" ? "كجم" : "لتر"}${k.v ? " – " + k.v : ""}`;
const isWhite = k => !k.v || k.v === "أبيض";
const unitPrice = p => { const L = PK(p).filter(k => k.p != null && isWhite(k)); return L.length ? Math.min(...L.map(k => k.p / k.s)) : (p.packs && p.packs.length ? null : p.price ?? null) };
const hasPrice = p => PK(p).some(k => k.p != null) || (!PK(p).length && p.price != null);
const findPk = (p, key) => PK(p).find(k => pkKey(k) === key);
const packPrice = (p, key) => { if (!key) return p.price ?? null; const k = findPk(p, key); return k ? k.p : null };
const unitLabel = (p, key) => { const k = key && findPk(p, key); return k ? pkLabel(k) : unitWord(p) };
const pageUrl = p => PAGES && !PAGES.has(p.id) ? `${BASE}product.html?id=${encodeURIComponent(p.id)}` : `${BASE}p/${p.id}.html`;
/* تسجيل الطلبات والحجوزات في جوجل شيت (لو مربوط) */
function logEvent(type, o = {}) {
  if (!SB) return;
  const clip = (v, n) => v == null || v === "" ? null : String(v).trim().slice(0, n);
  const cust = type === "signup" || type === "login", me = store.get("everest-customer", null);
  let det = o.details || "";
  if (!cust && me && me.email && !det.includes(me.email)) det += (det ? "\n" : "") + "إيميل العميل: " + me.email;
  const row = {type, page: clip(location.pathname, 200), name: clip(o.name || (me && me.name), 80), phone: clip(o.phone || (me && me.phone), 20), area: clip(o.area, 160), total: isFinite(+o.total) && o.total !== "" && o.total != null ? +o.total : null, details: clip(det, 3000)};
  /* لو قاعدة البيانات لسه ما اتحدثتش لنوع "تسجيل عميل"، بيتسجل كـ"تواصل" بعلامة واللوحة بتفهمها */
  SB.insert("orders", row).catch(e => {
    if (!cust || e.status !== 400) throw e;
    return SB.insert("orders", Object.assign({}, row, {type: "contact", details: clip((type === "signup" ? "👤 تسجيل عميل" : "🔑 دخول عميل") + "\n" + (row.details || ""), 3000)}));
  }).catch(e => console.warn("order log:", e.message));
}

/* ---------- التتبع: Google Analytics 4 و Facebook Pixel ---------- */
if (S.ga4Id) {
  const s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(S.ga4Id); document.head.appendChild(s);
  window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments) }; gtag("js", new Date()); gtag("config", S.ga4Id);
}
if (S.fbPixelId) {
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq("init", S.fbPixelId); fbq("track", "PageView");
}
const EV = {add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", generate_lead: "Lead", view_item: "ViewContent", search: "Search"};
function track(ev, params = {}) {
  try { if (window.gtag) gtag("event", ev, params); if (window.fbq) fbq("track", EV[ev] || ev, params); } catch (e) {}
}

/* ---------- عام ---------- */
let tt; function toast(t) { const el = $("#toast"); if (!el) return; el.textContent = t; el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 2200) }
const logo = $("#jotunLogo");
if (logo) { logo.onerror = function () { if (this.src !== JOTUN_LOGO) this.src = JOTUN_LOGO; else this.replaceWith(Object.assign(document.createElement("span"), {className: "jotun-word", textContent: "JOTUN"})) }; if (logo.complete && !logo.naturalWidth) logo.onerror(); }
if ($("#menuBtn")) { $("#menuBtn").onclick = () => $("#nav").classList.toggle("open"); $("#nav").addEventListener("click", e => { if (e.target.tagName === "A") $("#nav").classList.remove("open") }) }
if ($("#yr")) {
  $("#yr").textContent = new Date().getFullYear();
}
if ($("#fab")) $("#fab").href = wa("مرحباً، أرغب في الاستفسار عن دهانات جوتن.");

/* ---------- صفحات التواصل الاجتماعي في الشريط الأزرق ----------
   كل منصة مكانها ثابت؛ لو مفيش رابط في الإعدادات بتظهر باهتة ومش بتفتح */
const SOCIAL = [
  ["facebook", "فيسبوك", "M14 8h3V4h-3c-2.8 0-4 1.7-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.7-.6Z"],
  ["instagram", "إنستجرام", "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm5.3-4.1a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"],
  ["tiktok", "تيك توك", "M16.5 2h-3.3v13.2a2.9 2.9 0 1 1-2-2.8V9a6.2 6.2 0 1 0 5.3 6.2V8.8a7.6 7.6 0 0 0 4.5 1.4V6.9a4.5 4.5 0 0 1-4.5-4.9Z"],
  ["youtube", "يوتيوب", "M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15.1V8.9l5.4 3.1-5.4 3.1Z"],
  ["whatsapp", "واتساب", "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.1.1.6-.1 1.2Z"],
  ["x", "إكس (تويتر)", "M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.3l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"],
  ["snapchat", "سناب شات", "M12 2.5c3.1 0 5.3 2.4 5.3 5.4v2.2l1.6-.6c.6-.2 1.1.5.6.9-.8.6-1.9 1-2.4 1.2.6 1.9 2.1 3.6 4 4.2.4.1.4.7 0 .9-.9.4-2 .5-2.3.8-.2.3-.1 1-.4 1.2-.5.3-1.6-.2-2.8.1-1.1.3-1.8 1.7-3.6 1.7s-2.5-1.4-3.6-1.7c-1.2-.3-2.3.2-2.8-.1-.3-.2-.2-.9-.4-1.2-.3-.3-1.4-.4-2.3-.8-.4-.2-.4-.8 0-.9 1.9-.6 3.4-2.3 4-4.2-.5-.2-1.6-.6-2.4-1.2-.5-.4 0-1.1.6-.9l1.6.6V7.9c0-3 2.2-5.4 5.3-5.4Z"],
  ["threads", "ثريدز", "M12.2 22c-5.6 0-9.4-3.8-9.4-10S6.6 2 12.2 2c4.6 0 7.8 2.4 8.9 6.5l-2.3.6c-.8-3.1-3.1-4.8-6.6-4.8-4.2 0-6.9 2.9-6.9 7.7s2.7 7.7 6.9 7.7c3 0 5.1-1.4 5.1-3.6 0-1.2-.7-2.1-1.9-2.6-.3 2.6-1.9 4.1-4.3 4.1-2.1 0-3.6-1.3-3.6-3.1 0-2.2 2-3.4 5.5-3.3.1-1.4-.6-2.2-2-2.2-1 0-1.8.4-2.3 1.1l-1.8-1.3c.9-1.2 2.3-1.9 4.1-1.9 2.7 0 4.3 1.7 4.3 4.5v.3c2.3.8 3.9 2.6 3.9 4.9 0 3.6-3 5.8-7.4 5.8Zm-.6-8.4c-2 0-3.1.5-3.1 1.4 0 .7.7 1.2 1.6 1.2 1.3 0 2.3-.9 2.4-2.6h-.9Z"],
  ["telegram", "تيليجرام", "M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 13 1.5 11.5c-1-.3-1-1 .2-1.5L20.5 2.8c.9-.3 1.6.2 1.4 1.5Z"],
  ["linkedin", "لينكد إن", "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm6.5 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.5Z"],
  ["pinterest", "بنترست", "M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.7 2-2.7.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-.9 3.7-.3 1.1.6 2 1.7 2 2 0 3.5-2.1 3.5-5.2 0-2.7-2-4.6-4.8-4.6-3.3 0-5.2 2.5-5.2 5 0 1 .4 2.1.9 2.7.1.1.1.2.1.3l-.3 1.3c-.1.2-.2.3-.4.2-1.5-.7-2.4-2.8-2.4-4.6 0-3.7 2.7-7.2 7.9-7.2 4.1 0 7.3 2.9 7.3 6.9 0 4.1-2.6 7.4-6.2 7.4-1.2 0-2.3-.6-2.7-1.4l-.7 2.8c-.3 1-1 2.3-1.5 3.1A10 10 0 1 0 12 2Z"]
];
window.EVEREST_SOCIAL = SOCIAL;
function socialHTML() {
  const L = {}; for (const [k, v] of Object.entries(S.social || {})) L[k] = String(v || "").trim();
  return SOCIAL.map(([k, name, d]) => {
    const url = k === "whatsapp" ? (L.whatsapp && /^https:\/\//.test(L.whatsapp) ? L.whatsapp : (S.whatsapp ? `https://wa.me/${S.whatsapp}` : "")) : (/^https:\/\/[^\s"'<>]+$/.test(L[k] || "") ? L[k] : "");
    const svg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="${d}"/></svg>`;
    return url ? `<a href="${esc(url)}" target="_blank" rel="noopener" title="${name}" aria-label="${name}">${svg}</a>`
               : `<span title="${name} – قريباً" aria-label="${name} – قريباً">${svg}</span>`;
  }).join("");
}
if ($("#socials")) {
  $("#socials").innerHTML = socialHTML();
  if ($("#nav")) $("#nav").insertAdjacentHTML("beforeend", `<div class="socials m">${socialHTML()}</div>`);
}
window.canHTML = id => { const p = byId(id) || {}; const c = p.col || "#0b2a4a"; return `<div class="can"><div class="band" style="background:${c}">JOTUN</div><div class="nm">${esc(p.en)}</div></div>` };
const SRC = p => p.img ? IMG(p.img) : p.image ? (/^https?:/.test(p.image) ? p.image : BASE + p.image) : "";
const thumb = p => SRC(p) ? `<img loading="lazy" src="${esc(SRC(p))}" alt="${esc(p.en)} – ${esc(p.ar)}" onerror="this.onerror=null;this.outerHTML=canHTML('${p.id}')">` : canHTML(p.id);
function cairoNow() { return new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Cairo"})) }
if ($("#openNow")) { const d = cairoNow(), open = !S.closedDays.includes(d.getDay()) && d.getHours() >= S.openHour && d.getHours() < S.closeHour; $("#openNow").innerHTML = open ? '<b style="color:var(--ok)">● مفتوح الآن</b>' : '<b style="color:var(--accent)">● مغلق الآن</b>' }

/* ---------- الألوان ---------- */
const FAMS = [
  {id: "all", n: "الكل", c: "conic-gradient(#de7569,#f3bf53,#86a0b1,#717e79,#de7569)"},
  {id: "white", n: "أبيض", c: "#f3f4ee"}, {id: "grey", n: "رمادي وأسود", c: "#9e9f9d"},
  {id: "beige", n: "بيج", c: "#d9cfb9"}, {id: "brown", n: "بني", c: "#9f7d6b"},
  {id: "yellow", n: "أصفر", c: "#f3c080"}, {id: "orange", n: "برتقالي وخوخي", c: "#eb895c"},
  {id: "red", n: "أحمر", c: "#ac4546"}, {id: "pink", n: "وردي", c: "#e794a0"},
  {id: "purple", n: "بنفسجي", c: "#957aa1"}, {id: "blue", n: "أزرق", c: "#4486c4"}, {id: "green", n: "أخضر", c: "#6baa77"}
];
const famName = id => (FAMS.find(f => f.id === id) || {}).n || "";
let COLS = [];
if ($("#swatches") || $("#palette") || Object.keys(store.get("everest-cart-v2", {})).some(k => k.startsWith("sample|"))) { try { COLS = await fetch(BASE + "data/colours.json").then(r => r.json()) } catch (e) {} }
const colByCode = c => COLS.find(x => x.c === c);

/* ---------- السلة ---------- */
const CART_KEY = "everest-cart-v2";
let cart = store.get(CART_KEY, {});
let disc = store.get("everest-disc", null);
const save = () => { store.set(CART_KEY, cart); store.set("everest-disc", disc) };
function addToCart(key, n, silent) {
  cart[key] = (cart[key] || 0) + n; if (cart[key] <= 0) delete cart[key]; save(); renderCart();
  if (n > 0) { const [id, s] = key.split("|"); const p = byId(id); track("add_to_cart", {currency: "EGP", value: p ? (packPrice(p, s ? +s : null) || 0) * n : 0, items: [{item_id: id, item_name: p ? p.en : "colour sample " + s}]}); if (!silent) toast("تمت الإضافة للسلة ✓") }
}
window.everestAdd = addToCart;
function cartLines() {
  return Object.keys(cart).map(k => {
    const [id, s] = k.split("|");
    if (id === "sample") { const c = colByCode(s); return {k, sample: true, code: s, name: c ? c.n : "", hex: c ? c.h : "#ddd", n: cart[k], sum: S.samplePrice == null ? null : S.samplePrice * cart[k]} }
    const p = byId(id); if (!p) return null; const size = s && findPk(p, s) ? s : null; if (s && !size) return null; const unit = packPrice(p, size);
    return {k, p, size, n: cart[k], sum: unit == null ? null : unit * cart[k]};
  }).filter(Boolean);
}
function totals() {
  const L = cartLines(); let sub = 0, unknown = false, cnt = 0;
  L.forEach(l => { cnt += l.n; if (l.sum == null) unknown = true; else sub += l.sum });
  const d = disc ? Math.round(sub * disc.percent / 100) : 0;
  return {L, sub, d, tot: sub - d, unknown, cnt};
}
function renderCart() {
  if (!$("#items")) return;
  const T = totals();
  $("#items").innerHTML = T.L.length ? T.L.map(l => {
    const th = l.sample ? `<i class="th" style="background:${l.hex}"></i>` : SRC(l.p) ? `<img class="th" src="${esc(SRC(l.p))}" alt="">` : `<i class="th" style="background:${l.p.col}"></i>`;
    const title = l.sample ? `عيّنة لون ${esc(l.code)} ${esc(l.name)}` : esc(l.p.ar);
    const sub = l.sample ? "عيّنة لون" : l.size ? `عبوة ${unitLabel(l.p, l.size)}` : `بال${l.p.u === "كجم" ? "كيلو" : "لتر"}`;
    return `<div class="ci">${th}<div class="t"><b>${title}</b><small>${sub} · ${l.sum == null ? (l.sample ? "مجاناً / عند التأكيد" : "السعر عند التأكيد") : fmt(l.sum)}</small></div>
      <div class="qty"><button data-k="${esc(l.k)}" data-d="1" aria-label="زيادة">+</button><span>${num(l.n)}</span><button data-k="${esc(l.k)}" data-d="-1" aria-label="نقص">−</button></div></div>`;
  }).join("") : `<p style="color:var(--muted);text-align:center;padding:40px 0">السلة فارغة</p>`;
  $("#subtotal").textContent = fmt(T.sub);
  $("#discRow").hidden = !disc; if (disc) { $("#discLabel").textContent = `${disc.label} (${num(disc.percent)}٪)`; $("#discVal").textContent = "− " + fmt(T.d) }
  $("#total").textContent = fmt(T.tot); $("#cartCount").textContent = num(T.cnt); $("#totNote").style.display = T.unknown ? "block" : "none";
}
if ($("#items")) {
  $("#items").addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) addToCart(b.dataset.k, +b.dataset.d, true) });
  const openC = () => { $("#drawer").classList.add("on"); $("#overlay").classList.add("on") };
  const closeC = () => { $("#drawer").classList.remove("on"); $("#overlay").classList.remove("on") };
  window.everestOpenCart = openC;
  $("#openCart").onclick = openC; $("#closeCart").onclick = closeC; $("#overlay").onclick = closeC;
  if (location.hash === "#cart") openC();
  if (disc) $("#codeIn").value = disc.code;
  $("#codeBtn").onclick = () => {
    const v = $("#codeIn").value.trim().toUpperCase();
    if (!v) { disc = null; save(); renderCart(); return }
    const c = (DATA.discountCodes || []).find(x => x.active && x.code.toUpperCase() === v);
    if (!c) { disc = null; save(); renderCart(); return toast("الكود غير صحيح أو غير مفعّل") }
    disc = {code: c.code, percent: c.percent, label: c.label}; save(); renderCart(); toast("تم تطبيق الخصم ✓");
  };
  $("#checkout").onclick = () => {
    const T = totals(); if (!T.L.length) return toast("السلة فارغة");
    const name = $("#oName").value.trim(), phone = $("#oPhone").value.trim();
    if (!name || !phone) return toast("من فضلك اكتب الاسم ورقم الهاتف");
    const lines = T.L.map(l => l.sample ? `• عيّنة لون ${l.code} ${l.name} × ${l.n}` : `• ${l.p.ar} — ${l.size ? `عبوة ${unitLabel(l.p, l.size)} × ${l.n}` : `${l.n} ${l.p.u}`} = ${l.sum == null ? "السعر عند التأكيد" : fmt(l.sum)}`);
    const color = $("#oColor").value.trim();
    const msg = `طلب جديد من متجر إفرست 🛒\n\n${lines.join("\n")}\n\nالمجموع: ${fmt(T.sub)}${disc ? `\nخصم ${disc.label} (${disc.code}): − ${fmt(T.d)}` : ""}\nالإجمالي التقريبي: ${fmt(T.tot)}${T.unknown ? " + منتجات سعرها عند التأكيد" : ""}${color ? `\nكود اللون: ${color}` : ""}\n\nالاسم: ${name}\nالهاتف: ${phone}\nالعنوان: ${$("#oAddr").value.trim() || "-"}`;
    track("begin_checkout", {currency: "EGP", value: T.tot, coupon: disc ? disc.code : undefined});
    logEvent("order", {name, phone, area: $("#oAddr").value.trim(), total: T.tot, details: lines.join("\n") + (disc ? `\nكود خصم: ${disc.code} (${disc.percent}٪)` : "") + (color ? `\nكود اللون: ${color}` : "") + (T.unknown ? "\nبعض المنتجات سعرها عند التأكيد" : "")});
    window.open(wa(msg), "_blank");
  };
  renderCart();
}

/* ---------- المتجر ---------- */
const CATS = [
  {id: "all", name: "كل المنتجات", img: null},
  {id: "interior", name: "داخلية", img: 209770}, {id: "deco", name: "تأثيرات ديكورية", img: 202622},
  {id: "exterior", name: "خارجية", img: 220575}, {id: "prep", name: "تأسيس ومعاجين", img: 199487},
  {id: "wood", name: "دهانات أخشاب", img: null},
  {id: "industrial", name: "صناعية ومعادن", img: null}
];
const sel = {}; P.forEach(p => { const L = PK(p), W = L.filter(isWhite); const d = (W.length ? W : L).slice().sort((a, b) => b.s - a.s)[0]; sel[p.id] = d ? pkKey(d) : null });
function cardPrice(p) {
  const pr = packPrice(p, sel[p.id]);
  if (pr == null) return `<div class="price"><span class="ask">السعر عند الطلب</span></div>`;
  return `<div class="price"><b>${num(Math.round(pr))}</b> <small>ج.م / ${unitLabel(p, sel[p.id])}</small></div>`;
}
function sizesHTML(p) {
  const L = PK(p);
  return L.length ? `<small>العبوة:</small>` + L.map(k => `<button data-pack="${esc(pkKey(k))}" class="${sel[p.id] === pkKey(k) ? "on" : ""}">${pkLabel(k)}</button>`).join("")
    : `<small>يُباع بال${p.u === "كجم" ? "كيلو" : "لتر"} — اسأل عن العبوات المتاحة</small>`;
}
const cardHTML = p => `
      <article class="card" data-id="${p.id}">
        <a class="vis" href="${pageUrl(p)}">${p.best ? '<span class="tag">الأكثر طلباً</span>' : p.isNew ? '<span class="tag">جديد</span>' : ""}${thumb(p)}</a>
        <div class="body">
          <div class="line">${esc(p.line)}</div>
          <h3><a href="${pageUrl(p)}">${esc(p.ar)}</a></h3><div class="en">${esc(p.en)}</div>
          <div class="feats">${(p.f || []).map(x => `<span>${esc(x)}</span>`).join("")}</div>
          <div class="sizes">${sizesHTML(p)}</div>
          <div class="links"><a class="spec" href="${pageUrl(p)}">التفاصيل</a>${p.url ? `<a class="spec" href="${J + p.url}" target="_blank" rel="noopener">المواصفات على موقع جوتن ↗</a>` : ""}</div>
          <div class="foot">${cardPrice(p)}<button class="add" data-add>${!hasPrice(p) ? "أضف لطلب السعر" : "أضف للسلة"}</button></div>
        </div>
      </article>`;
/* نقرات بطاقات المنتجات في أي مكان (الشبكة أو السلايدر) */
document.addEventListener("click", e => {
  const card = e.target.closest(".card[data-id]"); if (!card) return; const p = byId(card.dataset.id); if (!p) return;
  const sb = e.target.closest("[data-pack]");
  if (sb) { sel[p.id] = sb.dataset.pack; $$(`.card[data-id="${p.id}"]`).forEach(c => { c.querySelectorAll("[data-pack]").forEach(x => x.classList.toggle("on", x.dataset.pack === sel[p.id])); c.querySelector(".foot .price").outerHTML = cardPrice(p) }); return }
  if (e.target.closest("[data-add]")) addToCart(p.id + "|" + (sel[p.id] ?? ""), 1);
});
if ($("#bestSlider")) {
  const best = [...P.filter(p => p.best), ...P.filter(p => !p.best && SRC(p))].slice(0, 8);
  const sl = $("#bestSlider"); sl.innerHTML = best.map(cardHTML).join("");
  const step = () => sl.firstElementChild.getBoundingClientRect().width + 24;
  const upd = () => { const max = sl.scrollWidth - sl.clientWidth - 2, x = Math.abs(sl.scrollLeft); $("#slPrev").disabled = x <= 2; $("#slNext").disabled = x >= max };
  $("#slNext").onclick = () => sl.scrollBy({left: -step()}); $("#slPrev").onclick = () => sl.scrollBy({left: step()});
  sl.addEventListener("scroll", upd, {passive: true}); upd();
}
if ($("#grid")) {
  let cat = "all", q = "", sort = "def";
  window.everestSetCat = c => { cat = c; renderCats(); renderGrid() };
  const renderCats = () => $("#cats").innerHTML = CATS.map(c => {
    const n = c.id === "all" ? P.length : P.filter(p => p.cat === c.id).length; if (!n) return "";
    const vis = c.img || c.image ? `<img src="${c.img ? IMG(c.img) : BASE + c.image}" alt="" loading="lazy">` : `<div class="sw" style="background:${c.id === "all" ? "conic-gradient(#c8102e,#d9a441,#717e79,#0b2a4a,#c8102e)" : "#56616d"}"></div>`;
    return `<button class="cat ${c.id === cat ? "active" : ""}" data-c="${c.id}">${vis}<b>${c.name}</b><small>${num(n)} منتج</small></button>`;
  }).join("");
  const renderGrid = () => {
    let list = P.filter(p => (cat === "all" || p.cat === cat) && (!q || (p.ar + p.en + p.line).toLowerCase().includes(q)));
    if (sort === "asc") list = [...list].sort((a, b) => (unitPrice(a) ?? Infinity) - (unitPrice(b) ?? Infinity));
    if (sort === "desc") list = [...list].sort((a, b) => (unitPrice(b) ?? -1) - (unitPrice(a) ?? -1));
    $("#grid").innerHTML = list.length ? list.map(cardHTML).join("") : `<div class="empty">لا توجد منتجات مطابقة. <a href="${wa("أبحث عن منتج: " + q)}" style="color:var(--accent)">اسألنا على واتساب</a></div>`;
  };
  $("#cats").addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (!b) return; cat = b.dataset.c; renderCats(); renderGrid() });
  let st; $("#q").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); renderGrid(); clearTimeout(st); st = setTimeout(() => q && track("search", {search_term: q}), 800) });
  $("#sort").addEventListener("change", e => { sort = e.target.value; renderGrid() });
  if (S.priceNote) $("#shop .toolbar").insertAdjacentHTML("afterend", `<p class="muted" style="font-size:13px;margin:-14px 0 20px">ℹ️ ${esc(S.priceNote)}</p>`);
  $$("[data-goto-cat]").forEach(a => a.addEventListener("click", () => everestSetCat(a.dataset.gotoCat)));
  if ($("#footProducts")) $("#footProducts").innerHTML = P.filter(p => p.best).map(p => `<li><a href="${pageUrl(p)}">${esc(p.ar)}</a></li>`).join("");
  renderCats(); renderGrid();
}

/* ---------- كتالوج الألوان ---------- */
let vizSet = null;
if ($("#swatches") && COLS.length) {
  let fam = "all", cq = "", limit = 60, current = COLS[0];
  $("#colCount").textContent = num(COLS.length);
  $("#fam").innerHTML = FAMS.map(f => `<button data-f="${f.id}" class="${f.id === fam ? "on" : ""}"><i style="background:${f.c}"></i>${f.n}</button>`).join("");
  const filtered = () => COLS.filter(c => (fam === "all" || c.f === fam) && (!cq || c.c.includes(cq) || c.n.toLowerCase().includes(cq)));
  const detail = c => { current = c; $("#cdBig").style.background = c.h; $("#cdName").textContent = c.n; $("#cdCode").textContent = "كود جوتن: " + c.c; $("#cdFam").textContent = famName(c.f); $$(".sw-card").forEach(x => x.classList.toggle("on", x.dataset.c === c.c)) };
  const render = () => {
    const list = filtered();
    $("#swatches").innerHTML = list.slice(0, limit).map(c => `<button class="sw-card ${current && current.c === c.c ? "on" : ""}" data-c="${c.c}"><i style="background:${c.h}"></i><span><b>${c.c}</b><small>${esc(c.n)}</small></span></button>`).join("") || `<div class="empty">لا توجد ألوان مطابقة</div>`;
    $("#colShown").textContent = `${num(Math.min(limit, list.length))} من ${num(list.length)} لون`;
    $("#colMore").hidden = list.length <= limit;
  };
  const setFam = f => { fam = f; limit = 60; $$("#fam button").forEach(x => x.classList.toggle("on", x.dataset.f === f)); render() };
  $("#fam").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) setFam(b.dataset.f) });
  if ($("#famCircles")) {
    $("#famCircles").innerHTML = FAMS.filter(f => f.id !== "all").map(f => `<a href="#colours" data-fam="${f.id}"><i style="background:${f.c}"></i>${f.n}</a>`).join("");
    $("#famCircles").addEventListener("click", e => { const a = e.target.closest("[data-fam]"); if (a) setFam(a.dataset.fam) });
  }
  $("#colQ").addEventListener("input", e => { cq = e.target.value.trim().toLowerCase(); limit = 60; render() });
  $("#colMore").onclick = () => { limit += 60; render() };
  $("#swatches").addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (b) detail(colByCode(b.dataset.c)) });
  $("#cdSample").onclick = () => { addToCart("sample|" + current.c, 1); track("generate_lead", {lead_type: "colour_sample", colour: current.c}) };
  $("#cdTry").onclick = () => { if (vizSet) vizSet(current); $("#viz").scrollIntoView({behavior: "smooth"}) };
  render(); detail(current);
}

/* ---------- تجربة الألوان ---------- */
if ($("#palette")) {
  const PAL = ["7236","1012","1275","8282","0568","1140","10182","9911","10342","0394","1623","1352","1877","8252","6325","4624","4618","0274","3021","2456"];
  let palette = PAL.map(colByCode).filter(Boolean);
  if (!palette.length) palette = [{c: "1140", n: "ساند", h: "#cfc5b4"}, {c: "6325", n: "بالنس", h: "#717e79"}];
  let target = "wall", picks = {wall: palette.find(c => c.c === "1140") || palette[0], accentWall: palette.find(c => c.c === "6325") || palette[1]};
  const renderViz = () => {
    $("#palette").innerHTML = palette.map(c => `<button title="${esc(c.n)} ${c.c}" data-c="${c.c}" class="${picks[target].c === c.c ? "on" : ""}" style="background:${c.h}">${c.c}</button>`).join("");
    const w = picks.wall, a = picks.accentWall;
    $("#wall").setAttribute("fill", w.h); $("#accentWall").setAttribute("fill", a.h);
    $("#pw").style.background = w.h; $("#pwn").textContent = `${w.n} ${w.c}`; $("#pa").style.background = a.h; $("#pan").textContent = `${a.n} ${a.c}`;
    $("#vizWa").href = wa(`مرحباً، أرغب في تنسيق ألوان جوتن:\nلون الجدران: ${w.n} (كود ${w.c})\nالحائط المميز: ${a.n} (كود ${a.c})`);
  };
  vizSet = c => { if (!palette.some(x => x.c === c.c)) palette = [c, ...palette].slice(0, 20); picks[target] = c; renderViz() };
  $("#palette").addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (!b) return; picks[target] = palette.find(c => c.c === b.dataset.c); renderViz() });
  $("#target").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; target = b.dataset.v; $$("#target button").forEach(x => x.classList.toggle("on", x === b)); renderViz() });
  $("#vizWa").addEventListener("click", () => { track("generate_lead", {lead_type: "colour_combo"}); logEvent("colour_combo", {details: `الجدران: ${picks.wall.n} ${picks.wall.c}\nالحائط المميز: ${picks.accentWall.n} ${picks.accentWall.c}`}) });
  renderViz();
}

/* ---------- الحاسبة ---------- */
function packsFor(qty, sizes) {
  const s = [...sizes].sort((a, b) => b - a), out = {}; let rem = qty;
  for (const z of s) { const n = Math.floor(rem / z + 1e-9); if (n) { out[z] = n; rem -= n * z } }
  if (rem > 1e-9) { const z = [...s].reverse().find(z => z >= rem) || s[s.length - 1]; out[z] = (out[z] || 0) + 1 }
  return out;
}
/* أنسب تركيبة عبوات (اللون الأبيض/الأساسي وبنفس وحدة المنتج) */
function packPlan(p, qty) {
  const L = PK(p).filter(k => isWhite(k) && k.u === p.u); if (!L.length) return null;
  const plan = packsFor(qty, [...new Set(L.map(k => k.s))]);
  return Object.entries(plan).map(([z, n]) => ({k: L.find(k => k.s === +z), n}));
}
const planTxt = plan => plan.slice().sort((a, b) => b.k.s - a.k.s).map(x => `${num(x.n)} × ${pkLabel(x.k)}`).join(" + ");
const planCost = plan => plan.some(x => x.k.p == null) ? null : plan.reduce((a, x) => a + x.k.p * x.n, 0);
if ($("#cP")) {
  const calcList = P.filter(p => ["interior", "deco", "exterior", "wood"].includes(p.cat) || p.floor);
  $("#cP").innerHTML = calcList.map(p => `<option value="${p.id}">${esc(p.ar)}${unitPrice(p) != null ? ` — من ${num(Math.round(unitPrice(p)))} ج.م/${p.u}` : ""}</option>`).join("");
  let coats = 2, last = null;
  const calc = () => {
    const L = +$("#cL").value || 0, W = +$("#cW").value || 0, H = +$("#cH").value || 0;
    const p = byId($("#cP").value);
    let area = p.floor ? L * W : 2 * (L + W) * H - (+$("#cD").value || 0) * 1.9 - (+$("#cWin").value || 0) * 1.5 + ($("#cCeil").value === "1" ? L * W : 0);
    area = Math.max(0, area);
    const qty = +(area * coats / p.cov * 1.05).toFixed(1);
    let cost = 0, unknown = false;
    const plan = packPlan(p, qty);
    if (plan) { const c = planCost(plan); if (c == null) unknown = true; else cost = c }
    else if (unitPrice(p) != null) cost = Math.ceil(qty) * unitPrice(p); else unknown = true;
    const primer = byId(p.cat === "exterior" ? "js-alkali-primer" : "pva-primer");
    let pq = 0, pplan = null;
    if ($("#cPrimer").checked && !p.floor && primer && primer.active !== false) {
      pq = Math.ceil(area / primer.cov); pplan = packPlan(primer, pq);
      const c = pplan ? planCost(pplan) : (unitPrice(primer) != null ? pq * unitPrice(primer) : null);
      if (c == null) unknown = true; else cost += c;
    }
    $("#rA").textContent = num(area.toFixed(1)) + " م²";
    $("#rQ").textContent = num(qty) + " " + p.u;
    $("#rPk").textContent = plan ? planTxt(plan) : `${num(Math.ceil(qty))} ${p.u} (حسب العبوات المتاحة)`;
    $("#rPr").textContent = pq ? `${primer.ar}: ${pplan ? planTxt(pplan) : num(pq) + " " + primer.u}` : "—";
    $("#rC").textContent = cost ? fmt(cost) + (unknown ? " +" : "") : "السعر عند الطلب";
    last = {p, qty, plan, primer, pq, pplan};
  };
  ["#cL", "#cW", "#cH", "#cD", "#cWin", "#cCeil", "#cP", "#cPrimer"].forEach(s => $(s).addEventListener("input", calc));
  $("#coats").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; coats = +b.dataset.v; $$("#coats button").forEach(x => x.classList.toggle("on", x === b)); calc() });
  $("#calcAdd").onclick = () => {
    const c = last; if (!c || !c.qty) return toast("أدخل المقاسات أولاً");
    if (c.plan) c.plan.forEach(x => addToCart(c.p.id + "|" + pkKey(x.k), x.n, true)); else addToCart(c.p.id + "|", Math.ceil(c.qty), true);
    if (c.pq) { if (c.pplan) c.pplan.forEach(x => addToCart(c.primer.id + "|" + pkKey(x.k), x.n, true)); else addToCart(c.primer.id + "|", c.pq, true) }
    window.everestOpenCart && everestOpenCart();
  };
  calc();
}

/* ---------- الباقات ---------- */
if ($("#pkgs")) {
  const pkgs = (DATA.packages || []).filter(k => k.active !== false);
  const est = (k, floor) => {
    const p = byId(k.product), pr = byId(k.primer), ac = k.accent ? byId(k.accent) : null;
    const walls = floor * (S.wallFactor || 2.8), area = walls + floor; // جدران + أسقف
    const accentArea = ac ? walls * 0.1 : 0;
    const qty = Math.ceil((area - accentArea) * k.coats / p.cov * 1.05);
    const pq = pr ? Math.ceil(area / pr.cov) : 0;
    const aq = ac ? Math.ceil(accentArea * 2 / ac.cov * 1.05) : 0;
    const up = x => x ? unitPrice(x) : 0;
    const known = up(p) != null && (!pr || up(pr) != null) && (!ac || up(ac) != null) && k.laborPerM2 != null;
    const cost = known ? qty * up(p) + pq * up(pr) + aq * up(ac) + k.laborPerM2 * area : null;
    return {p, pr, ac, area, qty, pq, aq, cost};
  };
  const render = () => {
    const floor = Math.max(20, +$("#pkArea").value || 100);
    $("#pkgs").innerHTML = pkgs.map((k, i) => {
      const e = est(k, floor);
      return `<div class="pkg ${i === 1 ? "hot" : ""}">
        <span class="tag">${esc(k.tag)}</span>
        <h3>${esc(k.name)}</h3>
        <div class="prod">${SRC(e.p) ? `<img src="${esc(SRC(e.p))}" alt="">` : ""}<div><b>${esc(e.p.ar)}</b><small>${num(k.coats)} طبقة + برايمر${e.ac ? " + " + esc(e.ac.ar) : ""}</small></div></div>
        <ul>${k.includes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="est">
          <small>مساحة الدهان التقريبية ${num(Math.round(e.area))} م² · خامات: ~${num(e.qty)} لتر دهان + ${num(e.pq)} لتر برايمر${e.aq ? ` + ${num(e.aq)} لتر ${esc(e.ac.ar)}` : ""}</small>
          ${e.cost != null ? `<b>${fmt(e.cost)}</b><small>شامل الخامات والتنفيذ – تقديري</small>` : `<b style="font-size:18px">عرض سعر بعد المعاينة</b><small>المعاينة والقياس مجاناً</small>`}
        </div>
        <button class="btn ${i === 1 ? "btn-primary" : "btn-navy"}" data-pk="${k.id}">اطلب هذه الباقة</button>
      </div>`;
    }).join("");
  };
  $("#pkArea").addEventListener("input", render);
  $("#pkgs").addEventListener("click", ev => {
    const b = ev.target.closest("[data-pk]"); if (!b) return;
    const k = pkgs.find(x => x.id === b.dataset.pk), floor = +$("#pkArea").value || 100, e = est(k, floor);
    track("generate_lead", {lead_type: "package", package: k.id, value: e.cost || 0, currency: "EGP"});
    logEvent("package", {total: e.cost || "", details: `${k.name} – مساحة ${floor} م² – ${e.p.ar}${e.ac ? " + " + e.ac.ar : ""}`});
    window.open(wa(`مرحباً، أرغب في ${k.name} 🏠\nمساحة الشقة: ${floor} م²\nالمنتج: ${e.p.ar}${e.ac ? "\nحائط مميز: " + e.ac.ar : ""}\n${e.cost != null ? "السعر التقديري: " + fmt(e.cost) : "برجاء تحديد موعد معاينة لعرض السعر."}`), "_blank");
  });
  render();
}

/* ---------- أعمالنا ---------- */
if ($("#proj")) {
  const PR = [["2029685","شقة سكنية فاخرة","المعادي","سكني"],["6538933","غرفة معيشة عصرية","التجمع","سكني"],["36284862","واجهة مبنى تجاري","مدينة نصر","تجاري"],["7746462","غرفة نوم أنيقة","الزمالك","سكني"],["34909557","صالة عرض","الشيخ زايد","تجاري"],["38800602","استوديو حديث","المعادي","سكني"]];
  $("#proj").innerHTML = PR.map(p => `<figure><img loading="lazy" src="https://images.pexels.com/photos/${p[0]}/pexels-photo-${p[0]}.jpeg?auto=compress&cs=tinysrgb&h=600&w=800" alt="${p[1]} - ${p[2]}"><figcaption><small>${p[3]}</small><div><b>${p[1]}</b> – ${p[2]}</div></figcaption></figure>`).join("");
}

/* ---------- الفيديوهات ---------- */
/* أنواع الفيديو: youtube | drive (مرفوع من لوحة التحكم) | tiktok | facebook | instagram | file (رابط mp4) */
const VID = {
  thumb: v => v.thumb || (v.type === "youtube" ? `https://i.ytimg.com/vi/${v.src}/hqdefault.jpg` : v.type === "drive" ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(v.src)}&sz=w800` : ""),
  embed: v => ({
    youtube: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.src)}?autoplay=1&rel=0`,
    drive: `https://drive.google.com/file/d/${encodeURIComponent(v.src)}/preview`,
    tiktok: `https://www.tiktok.com/embed/v2/${encodeURIComponent(v.src)}`,
    instagram: `https://www.instagram.com/p/${encodeURIComponent(v.src)}/embed`,
    facebook: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(v.src)}&show_text=false&autoplay=true`
  })[v.type],
  label: {youtube: "YouTube", drive: "فيديو", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook", file: "فيديو"}
};
if ($("#videos")) {
  const VIDS = (DATA.videos || []).filter(v => v.active !== false && v.src);
  $("#videos").hidden = false;
  $("#vidArrows").hidden = VIDS.length < 4;
  $("#vidList").innerHTML = VIDS.length ? VIDS.map((v, i) => `
    <button class="vcard ${v.vertical ? "vertical" : ""}" data-v="${i}">
      <span class="vthumb">${VID.thumb(v) ? `<img loading="lazy" src="${esc(VID.thumb(v))}" alt="" onerror="this.remove()">` : v.type === "file" ? `<video src="${esc((/^https?:/.test(v.src) ? v.src : BASE + v.src) + "#t=1")}" preload="metadata" muted playsinline tabindex="-1"></video>` : ""}<span class="vsrc">${VID.label[v.type] || ""}</span><span class="vplay"></span></span>
      <b>${esc(v.title || "")}</b>${v.desc ? `<small>${esc(v.desc)}</small>` : ""}
    </button>`).join("") : `<div class="empty" style="grid-column:1/-1">قريباً… فيديوهات لأعمالنا ونصائح الدهان.</div>`;
  const close = () => { $("#vFrame").innerHTML = ""; $("#vModal").hidden = true; document.body.style.overflow = "" };
  $("#vidList").addEventListener("click", e => {
    const b = e.target.closest("[data-v]"); if (!b) return; const v = VIDS[+b.dataset.v];
    $("#vBox").classList.toggle("vertical", !!v.vertical);
    $("#vFrame").innerHTML = v.type === "file"
      ? `<video src="${esc(/^https?:/.test(v.src) ? v.src : BASE + v.src)}" controls autoplay playsinline></video>`
      : `<iframe src="${esc(VID.embed(v))}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(v.title || "فيديو")}"></iframe>`;
    $("#vCap").innerHTML = `<b>${esc(v.title || "")}</b>${v.desc ? `<small>${esc(v.desc)}</small>` : ""}`;
    $("#vModal").hidden = false; document.body.style.overflow = "hidden";
    track("view_item", {item_name: "video: " + (v.title || v.src)});
  });
  $("#vClose").onclick = close;
  $("#vModal").addEventListener("click", e => { if (e.target.id === "vModal") close() });
  addEventListener("keydown", e => { if (e.key === "Escape" && !$("#vModal").hidden) close() });
  const vl = $("#vidList"), step = () => (vl.firstElementChild ? vl.firstElementChild.getBoundingClientRect().width : 300) + 24;
  $("#vidNext").onclick = () => vl.scrollBy({left: -step()}); $("#vidPrev").onclick = () => vl.scrollBy({left: step()});
}

/* ---------- آراء العملاء + تقييم جوجل ---------- */
const stars = r => "★★★★★".slice(0, Math.round(r)) + "☆☆☆☆☆".slice(0, 5 - Math.round(r));
const reviewLink = S.googleReviewUrl || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("إفرست للدهانات المرج");
if (S.googleRating && $("#heroRating")) { $("#heroRating").hidden = false; $("#heroRating").innerHTML = `<span class="stars">${stars(S.googleRating)}</span> <b>${num(S.googleRating)}</b> على جوجل${S.googleReviewCount ? ` من ${num(S.googleReviewCount)} تقييم` : ""}` }
if ($("#revList")) {
  $("#revBtn").href = reviewLink;
  if (S.googleRating) { $("#gScore").hidden = false; $("#gScore").innerHTML = `<b>${num(S.googleRating)}</b><div><span class="stars">${stars(S.googleRating)}</span><small class="muted" style="display:block">تقييم جوجل${S.googleReviewCount ? ` · ${num(S.googleReviewCount)} تقييم` : ""}</small></div>` }
  const R = (DATA.reviews || []).filter(r => r.active !== false);
  $("#revList").innerHTML = R.length ? R.map(r => `<article class="rv"><span class="stars">${stars(r.rating || 5)}</span><p>“${esc(r.text)}”</p><footer><b>${esc(r.name)}</b><span>${esc(r.area || "")}${r.date ? " · " + esc(r.date) : ""}</span></footer></article>`).join("")
    : `<div class="rev-empty" style="grid-column:1/-1">رأيك يهمنا! لو اتعاملت معانا قبل كده، شاركنا تجربتك على جوجل.</div>`;
}

/* ---------- حجز المعاينة بالتقويم ---------- */
if ($("#days")) {
  const DN = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const MN = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const now = cairoNow(), days = [];
  for (let i = 0; days.length < (S.bookingDaysAhead || 14) && i < 40; i++) { const d = new Date(now); d.setDate(now.getDate() + i); if (!S.closedDays.includes(d.getDay())) days.push(d) }
  let day = 0, slot = null;
  const fmtSlot = t => { const [h, m] = t.split(":").map(Number); return `${num(h > 12 ? h - 12 : h)}:${m ? num(m) : "٠٠"} ${h < 12 ? "ص" : "م"}` };
  const slotsFor = d => (S.bookingSlots || []).filter(t => { if (d.toDateString() !== now.toDateString()) return true; return +t.split(":")[0] > now.getHours() + 1 });
  const renderDays = () => $("#days").innerHTML = days.map((d, i) => `<button type="button" data-i="${i}" class="${i === day ? "on" : ""}"><small>${i === 0 && d.toDateString() === now.toDateString() ? "اليوم" : DN[d.getDay()]}</small><b>${num(d.getDate())}</b><small>${MN[d.getMonth()]}</small></button>`).join("");
  const renderSlots = () => { const s = slotsFor(days[day]); if (!s.includes(slot)) slot = null; $("#slots").innerHTML = s.length ? s.map(t => `<button type="button" data-t="${t}" class="${t === slot ? "on" : ""}">${fmtSlot(t)}</button>`).join("") : `<p class="muted" style="grid-column:1/-1">لا توجد مواعيد متبقية اليوم، اختار يوماً آخر.</p>` };
  $("#days").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (!b) return; day = +b.dataset.i; renderDays(); renderSlots() });
  $("#slots").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (!b) return; slot = b.dataset.t; renderSlots() });
  if (!slotsFor(days[0]).length && days.length > 1) day = 1;
  renderDays(); renderSlots();
  $("#bookForm").addEventListener("submit", e => {
    e.preventDefault(); if (!slot) return toast("اختار الساعة المناسبة أولاً");
    const f = new FormData(e.target), d = days[day];
    track("generate_lead", {lead_type: "booking", service: f.get("svc")});
    logEvent("booking", {name: f.get("name"), phone: f.get("phone"), area: f.get("area"), details: `الموعد: ${DN[d.getDay()]} ${d.getDate()} ${MN[d.getMonth()]} – ${fmtSlot(slot)}\nالخدمة: ${f.get("svc")}\n${f.get("msg") || ""}`});
    window.open(wa(`طلب حجز معاينة 📅\nالموعد: ${DN[d.getDay()]} ${d.getDate()} ${MN[d.getMonth()]} – ${fmtSlot(slot)}\nالاسم: ${f.get("name")}\nالهاتف: ${f.get("phone")}\nالمنطقة: ${f.get("area") || "-"}\nالخدمة: ${f.get("svc")}\nتفاصيل: ${f.get("msg") || "-"}`), "_blank");
  });
}

/* ---------- تسجيل المقاولين ---------- */
if ($("#proForm")) $("#proForm").addEventListener("submit", e => {
  e.preventDefault(); const f = new FormData(e.target);
  track("generate_lead", {lead_type: "wholesale"});
  logEvent("wholesale", {name: f.get("name"), phone: f.get("phone"), details: `الشركة: ${f.get("company") || "-"}\nالنشاط: ${f.get("type")}\nالاستهلاك الشهري: ${f.get("volume")}`});
  window.open(wa(`طلب تسجيل مقاول / جملة 🏗️\nالاسم: ${f.get("name")}\nالشركة: ${f.get("company") || "-"}\nالهاتف: ${f.get("phone")}\nالنشاط: ${f.get("type")}\nالاستهلاك الشهري: ${f.get("volume")}`), "_blank");
});

/* ---------- تأثيرات: الهيدر الذكي والظهور عند التمرير ---------- */
const hdr = $("#siteHeader");
if (hdr && !document.body.classList.contains("inner")) {
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY, heroH = ($(".hero") || {}).offsetHeight || 400;
    hdr.classList.toggle("solid", y > 140);
    hdr.classList.toggle("hide", y > heroH * .6 && y > lastY && !$("#nav").classList.contains("open"));
    lastY = y;
  };
  addEventListener("scroll", onScroll, {passive: true}); onScroll();
}
$$(".sec-head, .pkg, .svc .s, .proj figure, .rv, .faq details, .info .box, .calc-grid > *, .viz-grid > *, .pro-grid > *").forEach(el => el.classList.add("reveal"));
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target) } }), {rootMargin: "0px 0px -8% 0px"});
  $$(".reveal").forEach((el, i) => { el.style.transitionDelay = (el.matches(".pkg,.svc .s,.proj figure,.rv") ? (i % 4) * 90 : 0) + "ms"; io.observe(el) });
} else $$(".reveal").forEach(el => el.classList.add("in"));

/* ---------- صفحة المنتج (p/*.html) ---------- */
const pid = document.body.dataset.product || (document.body.dataset.dynamic && new URLSearchParams(location.search).get("id"));
const PD = pid && byId(pid);
if (document.body.dataset.dynamic) {
  if (!PD) { $(".pd").innerHTML = `<div class="empty">المنتج غير موجود. <a class="ulink" href="${BASE}#shop">ارجع للمتجر</a></div>` }
  else {
    const CN = {interior: "دهانات داخلية", deco: "تأثيرات ديكورية", exterior: "دهانات خارجية", prep: "تأسيس ومعاجين", wood: "دهانات أخشاب", industrial: "دهانات صناعية"};
    document.title = `${PD.ar} ${PD.en} | إفرست للدهانات`;
    $("#pdGal").innerHTML = SRC(PD) ? `<img src="${esc(SRC(PD).replace("width=562", "width=800"))}" alt="${esc(PD.en)}">` : `<div style="transform:scale(1.8)">${canHTML(PD.id)}</div>`;
    $("#pdLine").textContent = PD.line || ""; $("#pdName").textContent = PD.ar; $("#pdEn").textContent = PD.en || ""; $("#pdDesc").textContent = PD.d || "";
    $("#pdCrumb").textContent = PD.ar; $("#pdCat").textContent = CN[PD.cat] || "المنتجات";
    $("#pdFeats").innerHTML = (PD.f || []).map(x => `<span>${esc(x)}</span>`).join("");
    $("#pdCov").textContent = `✓ تغطية تقريبية ${PD.cov} م² لكل ${PD.u} للطبقة الواحدة`;
    if (PD.url) { $("#pdSpec").href = J + PD.url; $("#pdSpec").style.display = "" }
  }
}
if (PD && $("#pdBuy")) {
  $("#pdAdd").textContent = !hasPrice(PD) ? "أضف لطلب السعر" : "أضف للسلة";
  track("view_item", {currency: "EGP", value: packPrice(PD, sel[PD.id]) || 0, items: [{item_id: PD.id, item_name: PD.en}]});
  const draw = () => { $("#pdSizes").innerHTML = sizesHTML(PD); $("#pdPrice").outerHTML = cardPrice(PD).replace('class="price"', 'class="price" id="pdPrice"') + (S.priceNote ? `<small class="muted" style="display:block">${esc(S.priceNote)}</small>` : "") };
  $("#pdSizes").addEventListener("click", e => { const b = e.target.closest("[data-pack]"); if (!b) return; sel[PD.id] = b.dataset.pack; draw() });
  $("#pdAdd").onclick = () => { addToCart(PD.id + "|" + (sel[PD.id] ?? ""), 1, true); window.everestOpenCart && everestOpenCart() };
  $("#pdAsk").href = wa(`مرحباً، أستفسر عن ${PD.ar} (${PD.en})`);
  draw();
}

/* ---------- تصميم وتطوير: داش تكنولوجي (في آخر الفوتر في كل الصفحات) ---------- */
{
  const ft = document.querySelector("footer.site .wrap");
  if (ft && !document.querySelector(".dash-credit")) ft.insertAdjacentHTML("beforeend", `
    <div class="dash-credit">
      <div class="dc-brand">
        <svg class="dc-mark" viewBox="0 0 64 48" width="44" height="33" aria-hidden="true"><path d="M17 0h12L12 48H0z" fill="#8b74ff"/><path d="M41 0h12L36 48H24z" fill="#ff5a4f"/></svg>
        <div class="dc-txt">
          <span class="dc-by">تم التصميم والتطوير بواسطة</span>
          <span class="dc-name"><b dir="ltr"><i>D</i>a<i>S</i>h</b> داش تكنولوجي</span>
          <span class="dc-slogan">من الفكرة للإطلاق.. بسرعة <em dir="ltr">Idea to launch. Fast.</em></span>
        </div>
      </div>
      <div class="dc-contact">
        <a href="tel:+201280639874" dir="ltr"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>0128 063 9874</a>
        <a href="tel:+201011213950" dir="ltr"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>0101 121 3950</a>
        <a href="mailto:dashtechonlogy@gmail.com" dir="ltr"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>dashtechonlogy@gmail.com</a>
      </div>
    </div>`);
}

/* ---------- حساب العميل: شاشة تسجيل إجبارية قبل فتح المتجر ---------- */
(function () {
  const CK = "everest-customer", SEEN = "everest-customer-seen";
  const CTYPES = ["عميل", "فني", "مهندس", "مقاول", "تاجر"];
  const CINT = ["دهانات داخلية", "دهانات خارجية", "ديكورات وتأثيرات", "دهانات أخشاب", "أرضيات وصناعي", "عزل"];
  const CSRC = ["فيسبوك", "إنستجرام", "تيك توك", "جوجل", "واتساب", "صديق / قريب", "عدّيت على المحل"];
  const cartB = $("#openCart");
  let ME = store.get(CK, null);
  const ok = () => !!(ME && ME.name && ME.email && ME.type);
  const first = n => String(n || "").trim().split(/\s+/)[0];
  if (cartB) cartB.insertAdjacentHTML("beforebegin", `<button class="acct-btn" id="acctBtn" type="button"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg><span class="lbl" id="acctLbl"></span><i class="acct-dot"></i></button>`);
  document.body.insertAdjacentHTML("beforeend", `<div class="amodal" id="aModal" hidden><div class="abox" role="dialog" aria-modal="true" aria-labelledby="aTitle"><button class="aclose" id="aClose" type="button" aria-label="إغلاق">✕</button><div id="aBody"></div></div></div>`);
  const btn = $("#acctBtn"), modal = $("#aModal");
  let gated = false;
  const paint = () => { if (!btn) return; $("#acctLbl").textContent = ok() ? "أهلاً " + first(ME.name) : "تسجيل الدخول"; btn.title = ok() ? "حسابي: " + ME.name : "تسجيل الدخول"; btn.setAttribute("aria-label", btn.title); btn.classList.toggle("in", ok()) };
  const opt = (list, v) => `<option value="">— اختار —</option>` + list.map(x => `<option ${x === v ? "selected" : ""}>${esc(x)}</option>`).join("");
  const form = () => {
    const m = ME || {}, edit = ok();
    modal.classList.toggle("gate", gated);
    $("#aBody").innerHTML = `
      ${gated ? `<div class="agate-brand"><img src="${BASE}assets/logo.svg" alt="" width="46" height="46" onerror="this.remove()"><div><b>إفرست للدهانات والديكور</b><small>وكيل جوتن المعتمد</small></div></div>` : ""}
      <h3 id="aTitle">${edit ? "بياناتي" : gated ? "أهلاً بيك 👋 سجّل بياناتك للدخول" : "تسجيل الدخول"}</h3>
      <p class="muted">${edit ? "تقدر تعدّل بياناتك في أي وقت." : "سجّل اسمك وإيميلك مرة واحدة بس عشان تدخل المتجر – ومش هتحتاج تكتب بياناتك تاني مع كل طلب."}</p>
      <form id="aForm" novalidate>
        <div class="afields">
          <div class="field"><label>الاسم <b class="req">*</b></label><input name="name" required maxlength="80" autocomplete="name" value="${esc(m.name || "")}"></div>
          <div class="field"><label>الإيميل <b class="req">*</b></label><input name="email" type="email" required maxlength="120" dir="ltr" autocomplete="email" value="${esc(m.email || "")}"></div>
        </div>
        <div class="field atype"><label>إنت مين؟ <b class="req">*</b></label>
          <div class="achips big" role="radiogroup">${CTYPES.map(x => `<label><input type="radio" name="type" value="${esc(x)}" ${m.type === x ? "checked" : ""}><span>${esc(x)}</span></label>`).join("")}</div></div>
        <details class="aopt" ${edit && (m.phone || m.area || (m.interests || []).length || m.source) ? "open" : ""}>
          <summary><span>بيانات اختيارية <small>(لو حابب)</small></span></summary>
          <div class="afields">
            <div class="field"><label>رقم الموبايل</label><input name="phone" type="tel" maxlength="20" dir="ltr" autocomplete="tel" value="${esc(m.phone || "")}"></div>
            <div class="field"><label>المنطقة / العنوان</label><input name="area" maxlength="160" autocomplete="address-level2" value="${esc(m.area || "")}"></div>
            <div class="field"><label>عرفتنا منين؟</label><select name="source">${opt(CSRC, m.source)}</select></div>
          </div>
          <div class="field"><label>مهتم بإيه؟ <small>(اختار أكتر من حاجة)</small></label>
            <div class="achips">${CINT.map(x => `<label><input type="checkbox" name="interests" value="${esc(x)}" ${(m.interests || []).includes(x) ? "checked" : ""}><span>${esc(x)}</span></label>`).join("")}</div></div>
          <label class="acheck"><input type="checkbox" name="offers" ${m.offers !== false ? "checked" : ""}> ابعتولي العروض والخصومات</label>
        </details>
        <p class="aerr" id="aErr" role="alert"></p>
        <button class="btn btn-primary" type="submit">${edit ? "حفظ البيانات" : "دخول المتجر"}</button>
        ${edit ? `<button class="aout" id="aOut" type="button">تسجيل الخروج</button>` : ""}
      </form>`;
    $("#aForm").addEventListener("submit", submit);
    const out = $("#aOut"); if (out) out.onclick = () => { ME = null; try { localStorage.removeItem(CK); localStorage.removeItem(SEEN) } catch (e) {} paint(); toast("تم تسجيل الخروج"); gate() };
  };
  function submit(e) {
    e.preventDefault();
    const f = new FormData(e.target), g = k => String(f.get(k) || "").trim(), err = t => { $("#aErr").textContent = t; return false };
    const name = g("name"), email = g("email").toLowerCase(), type = g("type");
    if (name.length < 2) return err("من فضلك اكتب اسمك");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return err("من فضلك اكتب إيميل صحيح");
    if (!CTYPES.includes(type)) return err("من فضلك اختار: عميل ولا فني ولا مهندس ولا مقاول ولا تاجر");
    const isNew = !ok();
    ME = {name, email, type, phone: g("phone"), area: g("area"), source: g("source"), interests: f.getAll("interests"), offers: f.get("offers") === "on", since: (ME && ME.since) || new Date().toISOString()};
    store.set(CK, ME); store.set(SEEN, Date.now());
    logEvent("signup", {name, phone: ME.phone, area: ME.area, details: [
      "الإيميل: " + email,
      "نوع العميل: " + type,
      ME.interests.length && "مهتم بـ: " + ME.interests.join("، "),
      ME.source && "عرفنا من: " + ME.source,
      "العروض: " + (ME.offers ? "موافق" : "لا"),
      !isNew && "(تعديل بيانات)"
    ].filter(Boolean).join("\n")});
    track(isNew ? "sign_up" : "login", {method: "email", customer_type: type});
    gated = false; document.documentElement.classList.remove("cust-gate");
    paint(); fill(); close(); toast(isNew ? `أهلاً ${first(name)}، نورت المتجر ✓` : "تم حفظ بياناتك ✓");
  }
  /* بنملا خانات الاسم والموبايل في الطلب والحجز تلقائي */
  const fill = () => { if (!ME) return; for (const [s, v] of [["#oName", ME.name], ["#oPhone", ME.phone], ["#oAddr", ME.area], ["input[name=name]", ME.name], ["input[name=phone]", ME.phone]]) for (const el of document.querySelectorAll(s)) if (!el.closest("#aModal") && !el.value && v) el.value = v };
  const close = () => { if (gated) return; modal.hidden = true; document.body.style.overflow = "" };
  const open = () => { form(); modal.hidden = false; document.body.style.overflow = "hidden"; setTimeout(() => { const i = $("#aForm input[name=name]"); if (i && !i.value) i.focus() }, 50) };
  /* المتجر مقفول لحد ما الزائر يسجّل (ما عدا وضع المعاينة من لوحة التحكم) */
  const gate = () => { gated = true; document.documentElement.classList.add("cust-gate"); open() };
  if (btn) btn.onclick = open;
  $("#aClose").onclick = close;
  modal.addEventListener("click", e => { if (e.target === modal) close() });
  addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) close() });
  window.everestLogin = open;
  paint(); fill();
  if (!ok() && !preview) gate();
  else document.documentElement.classList.remove("cust-gate");
  /* زيارة جديدة لعميل مسجّل → بتظهر في اللوحة (مرة كل 6 ساعات بالكتير) */
  if (ok() && !preview && Date.now() - (+store.get(SEEN, 0) || 0) > 6 * 3600e3) { store.set(SEEN, Date.now()); logEvent("login", {name: ME.name, phone: ME.phone, area: ME.area, details: "الإيميل: " + ME.email + "\nنوع العميل: " + ME.type}) }
})();
})();