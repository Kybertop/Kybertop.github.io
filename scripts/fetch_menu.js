import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import * as cheerio from "cheerio";

const SOURCE_URL = process.env.SOURCE_URL;
const OUTPUT_PATH = process.env.OUTPUT_PATH || "assets/menu.jpg";
const USER_AGENT = "MenuBot/1.0 (+github actions)";

if (!SOURCE_URL) { console.error("Missing SOURCE_URL"); process.exit(1); }

function pickBestFromSrcset(srcset) {
  if (!srcset) return null;
  // vyber najväčší kandidát podľa w/x deskriptora
  const items = srcset.split(",").map(s => s.trim()).map(s => {
    const [u, d] = s.split(/\s+/);
    let score = 1;
    if (d?.endsWith("w")) score = parseInt(d) || 1;
    else if (d?.endsWith("x")) score = parseFloat(d) || 1;
    return { url: u, score };
  });
  items.sort((a,b)=>b.score-a.score);
  return items[0]?.url || null;
}
function getImgUrl($el){
  return (
    $el.attr("data-src") ||
    $el.attr("data-lazy-src") ||
    pickBestFromSrcset($el.attr("srcset")) ||
    $el.attr("src") ||
    null
  );
}
function parseYearFromUploads(u){
  const m = String(u).match(/\/uploads\/(\d{4})\//);
  return m ? parseInt(m[1],10) : null;
}
function aspectBonus(w,h){
  if (w && h && h > w) return 3; // portrét
  if (w && h && w >= h) return 0;
  return 0;
}
function sizeBonus(w,h){
  const area = (parseInt(w)||0) * (parseInt(h)||0);
  if (!area) return 0;
  if (area > 1_000_000) return 4;
  if (area > 500_000)  return 3;
  if (area > 200_000)  return 2;
  if (area > 80_000)   return 1;
  return 0;
}
function keywordBonus(url,alt,cls){
  const s = (url + " " + alt + " " + cls).toLowerCase();
  let sc = 0;
  if (/(jed[aá]ln|menu|tyzd|týžd)/i.test(s)) sc += 4;
  if (/screenshot/i.test(s)) sc += 1;          // často dávajú ako screenshot
  if (/ckr|logo|signature|majitel|owner|header|footer/i.test(s)) sc -= 5; // potlač
  return sc;
}
function absolutize(u){ try { return new URL(u, SOURCE_URL).href; } catch { return null; } }
function extractUrlFromStyle(style){
  if (!style) return null;
  const m = style.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
  return m?.[2] || null;
}

async function ensureDir(filePath){ await fs.mkdir(path.dirname(filePath), { recursive: true }); }
async function sha256(buf){ return crypto.createHash("sha256").update(buf).digest("hex"); }

async function main(){
  const pageResp = await fetch(SOURCE_URL, { headers: { "User-Agent": USER_AGENT, "Accept-Language":"sk,cs;q=0.9,en;q=0.8" }});
  if (!pageResp.ok) throw new Error(`Upstream ${pageResp.status}`);
  const html = await pageResp.text();
  const $ = cheerio.load(html);

  // Kandidáti: všetky <img> na stránke
  let candidates = $("img").map((_,el)=>{
    const $el = $(el);
    const url = getImgUrl($el);
    if (!url) return null;
    const abs = absolutize(url);
    const w = $el.attr("width"); const h = $el.attr("height");
    const alt = $el.attr("alt") || "";
    const cls = $el.attr("class") || "";
    const year = parseYearFromUploads(abs);
    let score = 0;
    score += sizeBonus(w,h);
    score += aspectBonus(w,h);
    score += keywordBonus(abs||"", alt, cls);
    if (year && year >= 2023) score += 3;         // preferuj nové uploady
    if (year && year < 2020)  score -= 4;         // potlač stariny (logo 2015)
    return { abs, score, year, w:parseInt(w)||0, h:parseInt(h)||0 };
  }).get().filter(Boolean);

  // Ak nič nenašlo, skús linky na obrázky a background-image
  if (!candidates.length){
    const link = $("a[href$='.png' i],a[href$='.jpg' i],a[href$='.jpeg' i]").first();
    if (link.length) candidates.push({ abs: absolutize(link.attr("href")), score: 1, year: parseYearFromUploads(link.attr("href"))||0 });
    $("[style*='background-image']").each((_,el)=>{
      const u = extractUrlFromStyle($(el).attr("style"));
      if (u) candidates.push({ abs: absolutize(u), score: 1, year: parseYearFromUploads(u)||0 });
    });
  }

  // finálny výber
  candidates = candidates.filter(c=>c.abs);
  candidates.sort((a,b)=>b.score-a.score);
  const chosen = candidates[0];
  if (!chosen) throw new Error("No image URL candidate matched.");

  const imgResp = await fetch(chosen.abs, {
    headers: { "User-Agent": USER_AGENT, "Referer": SOURCE_URL, "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
  });
  if (!imgResp.ok) throw new Error(`Image fetch ${imgResp.status} for ${chosen.abs}`);

  const buf = Buffer.from(await imgResp.arrayBuffer());
  await ensureDir(OUTPUT_PATH);

  let same = false;
  try {
    const old = await fs.readFile(OUTPUT_PATH);
    same = (await sha256(old)) === (await sha256(buf));
  } catch {}

  if (!same){
    await fs.writeFile(OUTPUT_PATH, buf);
    await fs.writeFile(OUTPUT_PATH + ".json", JSON.stringify({ source: SOURCE_URL, img: chosen.abs, fetchedAt: new Date().toISOString() }, null, 2));
    console.log(`Saved ${OUTPUT_PATH} from ${chosen.abs}`);
  } else {
    console.log("Image unchanged.");
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
