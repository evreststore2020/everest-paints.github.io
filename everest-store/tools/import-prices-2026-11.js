#!/usr/bin/env node
/* =====================================================================
   استيراد أسعار المستهلك من قائمة جوتن (PRICE BOOK 2026 – اعتباراً من 4/11/2026)
   الأسعار للون الأبيض وشاملة ضريبة القيمة المضافة 14٪ – سعر لكل عبوة.
   الاستخدام (من داخل مجلد everest-store):  node tools/import-prices-2026-11.js
   - يحدّث أسعار وعبوات المنتجات الموجودة، ويضيف المنتجات الجديدة من القائمة.
   - المنتجات اللي مش في القائمة بتفضل زي ما هي.
   ===================================================================== */
const fs = require("fs"), path = require("path");
const FILE = path.join(__dirname, "../data/store.json");
const D = JSON.parse(fs.readFileSync(FILE, "utf8"));
const L = "لتر", K = "كجم", W = "أبيض", SP = "ألوان خاصة", RD = "ألوان جاهزة";
const pk = (...rows) => rows.map(([s, u, p, v]) => v ? {s, u, p, v} : {s, u, p});

/* ---------- أسعار المنتجات الموجودة ---------- */
const PRICES = {
  "emulsion-primer":    {ar: "فينوماستيك برايمر", en: "Fenomastic Primer", d: "برايمر مائي (بادئ) يجهز الجدران الداخلية لاستقبال الدهان النهائي بثبات وتغطية مثالية.", packs: pk([9, L, 692], [20, L, 1495])},
  "pva-primer":         {ar: "بي في إيه برايمر", d: "برايمر مائي (بادئ) يغلق المسام ويثبت الأسطح الداخلية قبل الدهان.", packs: pk([9, L, 506], [20, L, 1095])},
  "alkyd":              {ar: "ألكيد رد أندركوت", en: "Alkyd Red Undercoat", cat: "prep", line: "Jotun", d: "برايمر زيتي (ألكيد) أحمر للأسطح المعدنية والخشبية قبل الدهان الزيتي.", f: ["برايمر زيتي", "للمعادن والأخشاب"], packs: pk([0.75, L, 219], [3, L, 846], [10, L, 2735])},
  "myhome-rich-matt":   {packs: pk([3, L, 1034], [9, L, 3013])},
  "myhome-smooth-silk": {packs: pk([3, L, 1026], [9, L, 2984])},
  "wonderwall-life":    {packs: pk([2.5, L, 1296], [8, L, 4006])},
  "wonderwall-lux":     {packs: pk([2.5, L, 1271], [8, L, 3926])},
  "ld-glaze":           {packs: pk([0.45, L, 327])},
  "ld-pearl":           {packs: pk([0.9, L, 893], [2.7, L, 2599])},
  "ld-stucco":          {packs: pk([1.4, K, 346], [4.2, K, 978], [14, K, 3258])},
  "ld-romano":          {packs: pk([4, L, 827], [10, L, 2009])},
  "ld-velvet":          {packs: pk([0.9, L, 1289], [2.7, L, 3778])},
  "ld-suede":           {packs: pk([0.9, L, 1776], [2.7, L, 5174])},
  "js-alkali-primer":   {packs: pk([10, L, 1070], [20, L, 2077])},
  "js-eterna":          {packs: pk([1, L, 370], [10, L, 3566])},
  "js-colourlast-matt": {packs: pk([10, L, 2916])},
  "js-colourlast":      {packs: pk([10, L, 2989])},
  "js-tex-ultra":       {packs: pk([10, L, 3390])},
  "js-tex-fine":        {packs: pk([10, L, 3028])},
  "js-tex-medium":      {packs: pk([10, L, 2973])},
  "js-travertine":      {packs: pk([10, L, 2087])},
  "js-traditional":     {packs: pk([10, L, 1857, W], [20, L, 3605, W], [10, L, 2191, SP], [20, L, 3893, SP])},
  "js-highbuild":       {packs: pk([10, L, 1517, W], [20, L, 2946, W], [10, L, 1639, SP], [20, L, 3181, SP])},
  "js-highbuild-fine":  {isNew: true, packs: pk([10, L, 1610, W], [20, L, 3125, W], [10, L, 1739, SP], [3, L, 497, RD], [10, L, 1610, RD])}
};

/* ---------- منتجات جديدة من القائمة (بدون صور – تقدر تضيف صورة من لوحة التحكم) ---------- */
const NEW = [
  // تجهيز الأسطح الداخلية
  {id: "bengalac-aluminium", cat: "industrial", line: "Jotun", ar: "بنجالاك ألومنيوم", en: "Bengalac Aluminium", d: "دهان ألومنيوم لأعمدة الإنارة والعلامات والأسطح المعدنية.", f: ["لأعمدة الإنارة", "للعلامات المعدنية"], col: "#9aa3ab", cov: 10, packs: pk([0.75, L, 380], [3, L, 1477], [9, L, 4301])},
  {id: "jotun-stucco", cat: "prep", line: "Jotun", ar: "ستوكو – معجون مائي", en: "Jotun Stucco", d: "معجون ذو أساس مائي لتسوية الجدران الداخلية ومعالجة العيوب قبل الدهان.", f: ["معجون مائي", "تنعيم الأسطح"], col: "#e8a33d", u: K, cov: 1.2, packs: pk([2.7, L, 155], [15, K, 466], [20, L, 1085])},
  {id: "jotun-prefix", cat: "prep", line: "Jotun", ar: "بريفيكس – معجون مائي", en: "Jotun Prefix", d: "معجون ذو أساس مائي لتجهيز وتسوية الأسطح الداخلية.", f: ["معجون مائي", "تجهيز الأسطح"], col: "#e8a33d", u: K, cov: 1.2, packs: pk([14, K, 324], [18, L, 756])},
  {id: "julifix-white", cat: "interior", line: "Jotun", ar: "جوليفكس – أبيض", en: "Jotun Julifix", d: "دهان بلاستيك (طبقة نهائية) للجدران والأسقف الداخلية باللون الأبيض.", f: ["طبقة نهائية", "أبيض"], col: "#d9d9d6", cov: 10, packs: pk([9, L, 855], [20, L, 1842])},
  // ديوروسان
  {id: "durosan-action-pro", cat: "interior", line: "Durosan", ar: "ديوروسان أكشن برو – أبيض", en: "Durosan Action Pro", d: "دهان مائي داخلي من عائلة ديوروسان أكشن باللون الأبيض.", f: ["دهان مائي", "أبيض"], col: "#7aa6c2", cov: 10, isNew: true, packs: pk([2.5, L, 411], [9, L, 1437])},
  {id: "durosan-action-semigloss", cat: "interior", line: "Durosan", ar: "ديوروسان أكشن سيمي جلوسي", en: "Durosan Action Semi Gloss", d: "دهان مائي داخلي نصف لامع من عائلة ديوروسان أكشن.", f: ["نصف لامع", "دهان مائي"], col: "#7aa6c2", cov: 10, packs: pk([3, L, 654], [9, L, 1902])},
  {id: "durosan-silk", cat: "interior", line: "Durosan", ar: "ديوروسان داخلي سيلك", en: "Durosan Interior Silk", d: "دهان مائي داخلي بلمسة حريرية من عائلة ديوروسان.", f: ["حريري", "دهان مائي"], col: "#7aa6c2", cov: 10, packs: pk([2.25, L, 465], [9, L, 1629])},
  {id: "durosan-matt", cat: "interior", line: "Durosan", ar: "ديوروسان داخلي مط", en: "Durosan Interior Matt", d: "دهان مائي داخلي مطفي اقتصادي من عائلة ديوروسان.", f: ["مطفي", "اقتصادي"], col: "#7aa6c2", cov: 10, packs: pk([2.5, L, 311], [9, L, 1087])},
  {id: "durosan-enamel-matt", cat: "interior", line: "Durosan", ar: "ديوروسان إنامل مط", en: "Durosan Enamel Matt", d: "دهان إنامل مطفي من عائلة ديوروسان للأخشاب والمعادن والجدران.", f: ["إنامل", "مطفي"], col: "#7aa6c2", cov: 12, packs: pk([0.7, L, 279], [2.15, L, 836], [9, L, 3496])},
  {id: "durosan-enamel-gloss", cat: "interior", line: "Durosan", ar: "ديوروسان إنامل جلوس", en: "Durosan Enamel Gloss", d: "دهان إنامل لامع من عائلة ديوروسان للأخشاب والمعادن.", f: ["إنامل", "لامع"], col: "#7aa6c2", cov: 12, packs: pk([0.7, L, 353], [2.1, L, 1030])},
  // فينوماستيك
  {id: "pure-colours-matt", cat: "interior", line: "Fenomastic", ar: "فينوماستيك ألوان ناصعة إيملشن مط", en: "Fenomastic Pure Colours Emulsion Matt", d: "دهان داخلي مطفي بألوان نقية ثابتة من عائلة فينوماستيك.", f: ["مطفي", "ألوان ناصعة"], col: "#c8102e", cov: 11, packs: pk([3, L, 827], [9, L, 2408])},
  {id: "pure-colours-semigloss", cat: "interior", line: "Fenomastic", ar: "فينوماستيك ألوان ناصعة إيملشن سيمي جلوس", en: "Fenomastic Pure Colours Emulsion Semi Gloss", d: "دهان داخلي نصف لامع بألوان نقية ثابتة من عائلة فينوماستيك.", f: ["نصف لامع", "ألوان ناصعة"], col: "#c8102e", cov: 11, packs: pk([3, L, 991], [9, L, 2884])},
  {id: "fenomastic-enamel-matt", cat: "interior", line: "Fenomastic", ar: "فينوماستيك إنامل مط", en: "Fenomastic Enamel Matt", d: "إنامل داخلي مطفي عالي الجودة من عائلة فينوماستيك.", f: ["إنامل", "مطفي"], col: "#0b2a4a", cov: 12, packs: pk([0.9, L, 619], [3, L, 1799], [9, L, 5824])},
  {id: "fenomastic-enamel-semigloss", cat: "interior", line: "Fenomastic", ar: "فينوماستيك إنامل سيمي جلوس", en: "Fenomastic Enamel Semi Gloss", d: "إنامل داخلي نصف لامع عالي الجودة من عائلة فينوماستيك.", f: ["إنامل", "نصف لامع"], col: "#0b2a4a", cov: 12, packs: pk([0.9, L, 581], [3, L, 1693], [9, L, 5479])},
  {id: "fenomastic-enamel-gloss", cat: "interior", line: "Fenomastic", ar: "فينوماستيك إنامل جلوس", en: "Fenomastic Enamel Gloss", d: "إنامل داخلي لامع عالي الجودة من عائلة فينوماستيك.", f: ["إنامل", "لامع"], col: "#0b2a4a", cov: 12, packs: pk([0.9, L, 607], [3, L, 1769], [9, L, 5158])},
  // ليدي
  {id: "ld-metallic-sand", cat: "deco", line: "Lady Design", ar: "تصميمات ليدي ميتلك ساند", en: "Lady Design Metallic Sand", d: "تأثير ديكوري بمظهر وملمس معدني رملي.", f: ["ملمس معدني", "تأثير ديكوري"], col: "#a8875f", cov: 6, packs: pk([0.9, L, 1266])},
  // تجهيز الأسطح الخارجية
  {id: "penetrating-sealer", cat: "prep", line: "Jotun", ar: "جوتن بنتريتنج سيلر", en: "Jotun Penetrating Sealer", d: "برايمر ذو أساس مذيب يتغلغل في الأسطح ويقويها قبل الدهان.", f: ["برايمر مذيب", "يقوي الأسطح"], col: "#d39b2a", cov: 10, packs: pk([0.9, L, 362], [3, L, 1112], [20, L, 7060])},
  {id: "block-filler", cat: "prep", line: "Jotun", ar: "جوتن بلوك فيلر", en: "Jotun Block Filler", d: "معجون مخصص لتجهيز الأسطح الخارجية وسد مسام الطوب والبلوك.", f: ["للأسطح الخارجية", "سد المسام"], col: "#e8a33d", u: K, cov: 1.5, packs: pk([15, K, 563], [20, L, 1285])},
  {id: "crack-fix", cat: "prep", line: "Jotun", ar: "كراك فيكس", en: "Jotun Crack Fix", d: "معجون شروخ مطاطي لمعالجة الشروخ قبل الدهان.", f: ["معجون مطاطي", "علاج الشروخ"], col: "#c94b4b", cov: 2, packs: pk([1, L, 264], [3, L, 780])},
  {id: "texo-compound", cat: "exterior", line: "Jotun", ar: "جوتن تكسو كمبوند – أبيض", en: "Jotun Texo Compound", d: "طبقة زخرفية خارجية قابلة للرش باللون الأبيض.", f: ["طبقة زخرفية", "قابل للرش"], col: "#e8a33d", cov: 3, packs: pk([9, L, 757], [20, L, 1632])},
  // إيزي كوت
  {id: "easycoat-plus-matt", cat: "exterior", line: "Easycoat", ar: "إيزي كوت بلس مط – أبيض", en: "Easycoat Plus Matt", d: "دهان مائي ناعم للأسطح الخارجية، مطفي، باللون الأبيض.", f: ["خارجي ناعم", "مطفي"], col: "#2b2b2b", cov: 9, packs: pk([9, L, 1529])},
  {id: "easycoat-plus-silk", cat: "exterior", line: "Easycoat", ar: "إيزي كوت بلس سيلك – أبيض", en: "Easycoat Plus Silk", d: "دهان مائي ناعم للأسطح الخارجية بلمسة حريرية، باللون الأبيض.", f: ["خارجي ناعم", "حريري"], col: "#2b2b2b", cov: 9, packs: pk([10, L, 1841])},
  {id: "easycoat-finotex", cat: "exterior", line: "Easycoat", ar: "إيزي كوت فينوتكس – أبيض", en: "Easycoat Finotex", d: "دهان مائي زخرفي للأسطح الخارجية بملمس ناعم.", f: ["زخرفي", "ملمس ناعم"], col: "#2b2b2b", cov: 4, packs: pk([10, L, 1493])},
  {id: "easycoat-protex-fine", cat: "exterior", line: "Easycoat", ar: "إيزي كوت بروتكس فاين", en: "Easycoat Protex Fine", d: "دهان مائي زخرفي للأسطح الخارجية بملمس ناعم.", f: ["زخرفي", "خارجي"], col: "#2b2b2b", cov: 4, isNew: true, packs: pk([20, L, 2404, W], [20, L, 2597, SP])},
  {id: "easycoat-medium-tex", cat: "exterior", line: "Easycoat", ar: "إيزي كوت ميديم تكس", en: "Easycoat Medium Tex", d: "دهان مائي زخرفي للأسطح الخارجية بملمس متوسط.", f: ["زخرفي", "ملمس متوسط"], col: "#2b2b2b", cov: 3.5, packs: pk([20, L, 2667, W], [20, L, 2880, SP], [20, L, 2667, RD])},
  {id: "easycoat-hevitex", cat: "exterior", line: "Easycoat", ar: "إيزي كوت هيفيتكس", en: "Easycoat Hevitex", d: "دهان مائي زخرفي للأسطح الخارجية بملمس خشن.", f: ["زخرفي", "ملمس خشن"], col: "#2b2b2b", cov: 3, packs: pk([10, L, 1167, W], [20, L, 2267, W], [10, L, 1260, SP], [20, L, 2448, SP])},
  {id: "easycoat-profile-decor", cat: "exterior", line: "Easycoat", ar: "إيزي كوت بروفيل ديكور", en: "Easycoat Profile Decor", d: "دهان مائي زخرفي للأسطح الخارجية.", f: ["زخرفي", "خارجي"], col: "#2b2b2b", cov: 3, packs: pk([10, L, 1314, W], [20, L, 2435, W], [10, L, 1419, SP], [20, L, 2630, SP])},
  // جوتاشيلد
  {id: "js-kanva", cat: "exterior", line: "Jotashield", ar: "جوتاشيلد كانڤا", en: "Jotashield Kanva", d: "دهان خارجي جديد من عائلة جوتاشيلد.", f: ["خارجي", "جديد"], col: "#1b3a6b", cov: 9, isNew: true, url: null, packs: pk([10, L, 2524])},
  {id: "js-carbo-matt", cat: "exterior", line: "Jotashield", ar: "جوتاشيلد كاربو مط", en: "Jotashield Carbo Matt", d: "دهان مائي ناعم مضاد للكربنة، مخصص لمواقف السيارات المغلقة.", f: ["مضاد للكربنة", "مواقف السيارات"], col: "#1b3a6b", cov: 9, packs: pk([10, L, 2576])},
  {id: "js-carbo-silk", cat: "exterior", line: "Jotashield", ar: "جوتاشيلد كاربو سيلك", en: "Jotashield Carbo Silk", d: "دهان مائي ناعم حريري مضاد للكربنة، مخصص لمواقف السيارات المغلقة.", f: ["مضاد للكربنة", "حريري"], col: "#1b3a6b", cov: 9, packs: pk([10, L, 2640])},
  {id: "js-decor-glaze", cat: "exterior", line: "Jotashield Decor", ar: "جوتاشيلد ديكور جليز", en: "Jotashield Decor Glaze", d: "طبقة جليز ديكورية للواجهات من عائلة جوتاشيلد ديكور.", f: ["جليز", "ديكوري"], col: "#1b3a6b", cov: 10, packs: pk([2.7, L, 982])},
  {id: "js-decor-glaze-thinner", cat: "exterior", line: "Jotashield Decor", ar: "جوتاشيلد ديكور جليز تنر", en: "Jotashield Decor Glaze Thinner", d: "مخفف خاص لجوتاشيلد ديكور جليز.", f: ["مخفف"], col: "#8a8f96", cov: 10, packs: pk([2.7, L, 157])},
  // دهانات أخشاب
  {id: "woodshield-stain-int", cat: "wood", line: "Woodshield", ar: "صبغة وود شيلد داخلي مط/لامع", en: "Woodshield Interior Stain", d: "صبغة للأخشاب الداخلية بتشطيب مطفي أو لامع.", f: ["صبغة أخشاب", "داخلي"], col: "#7a4b2a", cov: 12, packs: pk([0.9, L, 599], [2.7, L, 1852])},
  {id: "woodshield-stain-ext", cat: "wood", line: "Woodshield", ar: "صبغة وود شيلد خارجي مط/لامع", en: "Woodshield Exterior Stain", d: "صبغة للأخشاب الخارجية بتشطيب مطفي أو لامع.", f: ["صبغة أخشاب", "خارجي"], col: "#7a4b2a", cov: 12, packs: pk([0.9, L, 646], [2.7, L, 1995])},
  {id: "woodshield-varnish-int", cat: "wood", line: "Woodshield", ar: "ورنيش وود شيلد داخلي مط/لامع", en: "Woodshield Interior Varnish", d: "ورنيش شفاف لحماية الأخشاب الداخلية بتشطيب مطفي أو لامع.", f: ["ورنيش", "داخلي"], col: "#a0703c", cov: 12, packs: pk([1, L, 654], [3, L, 2022])},
  {id: "woodshield-varnish-ext", cat: "wood", line: "Woodshield", ar: "ورنيش وود شيلد خارجي مط/لامع", en: "Woodshield Exterior Varnish", d: "ورنيش شفاف لحماية الأخشاب الخارجية بتشطيب مطفي أو لامع.", f: ["ورنيش", "خارجي"], col: "#a0703c", cov: 12, packs: pk([1, L, 725], [3, L, 2240])}
];

let updated = 0, added = 0;
for (const [id, ch] of Object.entries(PRICES)) {
  const p = D.products.find(x => x.id === id); if (!p) { console.warn("مش موجود:", id); continue }
  Object.assign(p, ch); p.price = null; p.sizes = null; updated++;
}
for (const n of NEW) {
  const base = {active: true, f: [], img: null, u: L, url: null, best: false, price: null, sizes: null};
  const ex = D.products.find(x => x.id === n.id);
  if (ex) { Object.assign(ex, n, {price: null, sizes: null}); updated++ }
  else { D.products.push(Object.assign(base, n)); added++ }
}
D.settings.priceNote = "الأسعار للون الأبيض وشاملة ضريبة القيمة المضافة 14٪ – أسعار الألوان حسب المزج. سارية من 4/11/2026.";
D.settings.priceListDate = "2026-11-04";
fs.writeFileSync(FILE, JSON.stringify(D, null, 2));
console.log(`تم: تحديث ${updated} منتج، وإضافة ${added} منتج جديد. إجمالي المنتجات: ${D.products.length}`);
console.log("بدون سعر:", D.products.filter(p => !(p.packs && p.packs.some(k => k.p != null)) && p.price == null).map(p => p.id).join(", ") || "لا شيء");
