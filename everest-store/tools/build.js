#!/usr/bin/env node
/* =====================================================================
   أداة تحسين الظهور في جوجل (SEO)
   الاستخدام (من داخل مجلد everest-store):   node tools/build.js
   - تولّد صفحة لكل منتج في مجلد p/ بعنوان ووصف وبيانات منظمة (Product)
   - تولّد product.html لعرض أي منتج جديد تضيفه من لوحة التحكم قبل تشغيل الأداة
   - تولّد sitemap.xml و robots.txt و data/pages.json
   - تحدّث بيانات المتجر المنظمة (PaintStore) والرابط الأساسي في index.html
   ===================================================================== */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "data/store.json"), "utf8"));
const S = D.settings;
const SITE = (S.siteUrl || "https://www.example.com").replace(/\/+$/, "") + "/";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const IMG = id => `https://cdn-pim.jotun.com/images/ProductImages/${id}/1300x1334/${id}.png?format=webp&width=800&quality=75`;
const SRC = p => p.img ? IMG(p.img) : (p.image || "");
const J = "https://www.jotun.com/eg-ar/decorative/products/";
const CAT = {interior: "دهانات داخلية", deco: "تأثيرات ديكورية", exterior: "دهانات خارجية", prep: "تأسيس ومعاجين", wood: "دهانات أخشاب", industrial: "دهانات صناعية"};
const P = D.products.filter(p => p.active !== false && /^[a-z0-9-]+$/.test(p.id));
const today = new Date().toISOString().slice(0, 10);
const ldJson = o => JSON.stringify(o).replace(/</g, "\\u003c");
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;600&family=Noto+Sans:wght@400;600&display=swap" rel="stylesheet">`;

const business = {
  "@context": "https://schema.org", "@type": "PaintStore", "@id": SITE + "#store",
  name: S.storeName, url: SITE, telephone: S.phone,
  image: "https://images.pexels.com/photos/6538933/pexels-photo-6538933.jpeg?auto=compress&cs=tinysrgb&w=1200",
  address: {"@type": "PostalAddress", streetAddress: "شارع مؤسسة الزكاة، بركة النصر", addressLocality: "المرج", addressRegion: "القاهرة", addressCountry: "EG"},
  openingHoursSpecification: [{"@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"], opens: String(S.openHour).padStart(2, "0") + ":00", closes: String(S.closeHour).padStart(2, "0") + ":00"}],
  brand: {"@type": "Brand", name: "Jotun"}
};
if (S.googleRating && S.googleReviewCount) business.aggregateRating = {"@type": "AggregateRating", ratingValue: S.googleRating, reviewCount: S.googleReviewCount, bestRating: 5};

/* ---------- index.html ---------- */
let index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
index = index.replace(/(<script type="application\/ld\+json" id="ld-business">)[\s\S]*?(<\/script>)/, `$1\n${ldJson(business)}\n$2`)
  .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${SITE}">`)
  .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${SITE}">`);
fs.writeFileSync(path.join(ROOT, "index.html"), index);

/* ---------- أجزاء مشتركة ---------- */
const part = (re, pre) => index.match(re)[0].replace(/href="#top"/g, `href="${pre || "./"}"`).replace(/href="#([a-z]+)"/g, `href="${pre}#$1"`).replace('src="assets/', `src="${pre}assets/`).replace('href="admin.html"', `href="${pre}admin.html"`);
const shell = (pre, headExtra, bodyAttrs, main) => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${headExtra}
${FONTS}
<link rel="icon" type="image/svg+xml" href="${pre}assets/logo.svg">
<link rel="stylesheet" href="${pre}assets/style.css">
</head>
<body class="inner" ${bodyAttrs}>
${part(/<header class="main"[\s\S]*?<\/header>/, pre)}
<main class="wrap">
${main}
</main>
${part(/<footer class="site">[\s\S]*?<\/footer>/, pre)}
${index.match(/<div class="overlay"[\s\S]*?<div class="toast" id="toast"><\/div>/)[0]}
<script src="${pre}assets/config.js"></script>
<script src="${pre}assets/supa.js"></script>
<script src="${pre}assets/app.js"></script>
</body>
</html>
`;
const productBody = (p, pre) => `
  <nav class="crumbs" aria-label="مسار التنقل"><a href="${pre || "./"}">الرئيسية</a> / <a href="${pre}#shop" id="pdCat">${esc(CAT[p.cat] || "المنتجات")}</a> / <span id="pdCrumb">${esc(p.ar)}</span></nav>
  <div class="pd">
    <div class="gal" id="pdGal">${SRC(p) ? `<img src="${esc(SRC(p))}" alt="${esc(p.en + " – " + p.ar)}">` : p.id ? `<div class="can" style="transform:scale(1.8)"><div class="band" style="background:${esc(p.col || "#1f1f1f")}">JOTUN</div><div class="nm">${esc(p.en)}</div></div>` : ""}</div>
    <div class="buy">
      <div class="eyebrow" id="pdLine">${esc(p.line)}</div>
      <h1 id="pdName">${esc(p.ar)}</h1>
      <div class="muted" id="pdEn" style="direction:ltr;text-align:right;font-family:'Noto Sans',Arial,sans-serif">${esc(p.en)}</div>
      <p style="font-size:17px" id="pdDesc">${esc(p.d)}</p>
      <div class="feats" id="pdFeats">${(p.f || []).map(x => `<span>${esc(x)}</span>`).join("")}</div>
      <div class="sizes" id="pdSizes"></div>
      <div class="price" id="pdPrice"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap" id="pdBuy">
        <button class="btn btn-primary" id="pdAdd">أضف للسلة</button>
        <a class="btn btn-wa" id="pdAsk" target="_blank" rel="noopener" href="https://wa.me/${esc(S.whatsapp)}">اسأل على واتساب</a>
      </div>
      <ul class="muted" style="list-style:none;font-size:14px;display:flex;flex-direction:column;gap:4px">
        <li>✓ منتج جوتن أصلي من الوكيل المعتمد</li>
        <li>✓ مزج أي لون من كتالوج جوتن بالكمبيوتر</li>
        <li id="pdCov">✓ تغطية تقريبية ${esc(p.cov)} م² لكل ${esc(p.u)} للطبقة الواحدة</li>
      </ul>
      <a class="spec" id="pdSpec" style="color:var(--ink-2);text-decoration:underline;${p.url ? "" : "display:none"}" href="${p.url ? J + p.url : "#"}" target="_blank" rel="noopener">المواصفات الفنية وأوراق البيانات على موقع جوتن ↗</a>
    </div>
  </div>`;

/* ---------- صفحات المنتجات ---------- */
const pdir = path.join(ROOT, "p");
fs.mkdirSync(pdir, {recursive: true});
for (const f of fs.readdirSync(pdir)) if (f.endsWith(".html")) fs.unlinkSync(path.join(pdir, f));

for (const p of P) {
  const url = `${SITE}p/${p.id}.html`;
  const title = `${p.ar} ${p.en} | ${CAT[p.cat] || "جوتن"} – إفرست وكيل جوتن بالقاهرة`;
  const packs = p.packs && p.packs.length ? p.packs : (p.sizes || []).map(s => ({s, u: p.u, p: p.price != null ? Math.round(p.price * s) : null}));
  const sizesTxt = [...new Set(packs.map(k => `${k.s} ${k.u}`))].join(" و ");
  const desc = `${p.ar} (${p.en}) من جوتن: ${p.d} ${sizesTxt ? "متوفر في عبوات " + sizesTxt + "." : ""} متوفر لدى إفرست للدهانات – وكيل جوتن المعتمد في المرج، القاهرة.`.slice(0, 300);
  const product = {"@context": "https://schema.org", "@type": "Product", name: `${p.en} – ${p.ar}`, description: p.d, sku: p.id, brand: {"@type": "Brand", name: "Jotun"}, category: CAT[p.cat], url};
  if (SRC(p)) product.image = SRC(p);
  const prices = packs.length ? packs.map(k => k.p).filter(x => x != null) : (p.price != null ? [p.price] : []);
  if (prices.length) product.offers = {"@type": "AggregateOffer", priceCurrency: "EGP", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability: "https://schema.org/InStock", seller: {"@id": SITE + "#store"}};
  const crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    {"@type": "ListItem", position: 1, name: "الرئيسية", item: SITE},
    {"@type": "ListItem", position: 2, name: CAT[p.cat] || "المنتجات", item: SITE + "#shop"},
    {"@type": "ListItem", position: 3, name: p.ar, item: url}]};
  const related = P.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  const head = `<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="product">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(p.ar + " – " + p.en)}">
<meta property="og:description" content="${esc(p.d)}">
${SRC(p) ? `<meta property="og:image" content="${esc(SRC(p))}">` : ""}
<script type="application/ld+json">${ldJson(product)}</script>
<script type="application/ld+json">${ldJson(crumbs)}</script>`;
  const main = productBody(p, "../") + (related.length ? `
  <section style="padding:20px 0 70px"><h2 class="title" style="font-size:26px">منتجات مشابهة</h2><div class="products" style="margin-top:16px">${related.map(r => `
    <a class="card" href="${r.id}.html"><div class="vis">${SRC(r) ? `<img loading="lazy" src="${esc(SRC(r))}" alt="${esc(r.en)}">` : ""}</div><div class="body"><div class="line">${esc(r.line)}</div><h3>${esc(r.ar)}</h3><div class="en">${esc(r.en)}</div></div></a>`).join("")}</div></section>` : "");
  fs.writeFileSync(path.join(pdir, p.id + ".html"), shell("../", head, `data-product="${p.id}"`, main));
}

/* ---------- صفحة عامة للمنتجات الجديدة ---------- */
fs.writeFileSync(path.join(ROOT, "product.html"), shell("", `<title>منتج | إفرست للدهانات</title>\n<meta name="robots" content="noindex">`, `data-dynamic="1"`, productBody({cat: "", f: []}, "")));

/* ---------- pages.json + sitemap.xml + robots.txt ---------- */
fs.writeFileSync(path.join(ROOT, "data/pages.json"), JSON.stringify(P.map(p => p.id)));
const urls = [SITE, ...P.map(p => `${SITE}p/${p.id}.html`)];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /product.html\nDisallow: /tools/\n\nSitemap: ${SITE}sitemap.xml\n`);

console.log(`تم: ${P.length} صفحة منتج + product.html + sitemap.xml + robots.txt (الموقع: ${SITE})`);
if (/example\.com/.test(SITE)) console.log("⚠ غيّر رابط الموقع siteUrl في لوحة التحكم إلى الدومين الحقيقي ثم شغّل الأداة مرة أخرى.");
