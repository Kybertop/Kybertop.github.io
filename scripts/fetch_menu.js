// scripts/fetch_menu.js
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import * as cheerio from "cheerio";

const SOURCE_URL = process.env.SOURCE_URL;
const OUTPUT_PATH = process.env.OUTPUT_PATH || "assets/menu.jpg";

// ak chceš, môžeš ponechať SELECTOR z env, ale máme aj fallbacky
const SELECTOR =
  process.env.SELECTOR ||
  [
    "#jedalnylistok .vc_single_image-wrapper img",
    "#jedalnylistok img",
    ".vc_single_image-wrapper img",
    ".vc_single_image img",
    ".wpb_single_image img",
    "figure.wp-block-image img",
    ".elementor-widget-image img",
  ].join(", ");

if (!SOURCE_URL) {
  console.error("Missing SOURCE_URL env var");
  process.exit(1);
}

function pickFromSrcset(srcset) {
  if (!srcset) return null;
  const first = srcset.split(",")[0]?.trim();
  if (!first) return null;
  return first.split(/\s+/)[0];
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}
async function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function extractUrlFromStyle(style) {
  if (!style) return null;
  const m = style.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/i);
  return m?.[2] || null;
}

function absolutize(u) {
  try { return new URL(u, SOURCE_URL).href; } catch { return null; }
}

function firstTruthy(...vals) {
  for (const v of vals) if (v) return v;
  return null;
}

async function main() {
  const pageResp = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "MenuBot/1.0 (+github actions)",
      "Accept-Language": "sk,cs;q=0.9,en;q=0.8",
    },
  });
  if (!pageResp.ok) throw new Error(`Upstream ${pageResp.status}`);
  const html = await pageResp.text();
  const $ = cheerio.load(html);

  let foundUrl = null;

  // 1) Primárny selektor na <img>
  const img = $(SELECTOR).first();
  if (img && img.length) {
    foundUrl = firstTruthy(
      img.attr("data-src"),
      img.attr("data-lazy-src"),
      pickFromSrcset(img.attr("srcset")),
      img.attr("src")
    );
  }

  // 2) Ak nič, skús <a href="...jpg/png"> v známych kontajneroch
  if (!foundUrl) {
    const link = $(
      [
        "#jedalnylistok a[href$='.jpg' i], #jedalnylistok a[href$='.jpeg' i], #jedalnylistok a[href$='.png' i]",
        ".vc_single_image-wrapper a[href$='.jpg' i], .vc_single_image-wrapper a[href$='.jpeg' i], .vc_single_image-wrapper a[href$='.png' i]",
        "a[href$='.jpg' i], a[href$='.jpeg' i], a[href$='.png' i]",
      ].join(", ")
    ).first();
    if (link && link.length) foundUrl = link.attr("href");
  }

  // 3) Ak nič, skús background-image na wrapperoch
  if (!foundUrl) {
    const bg = $(
      [
        "#jedalnylistok .vc_single_image-wrapper",
        ".vc_single_image-wrapper",
        ".wpb_single_image",
        ".elementor-image, .elementor-widget-image",
        "[style*='background-image']",
      ].join(", ")
    ).filter((_, el) => extractUrlFromStyle($(el).attr("style"))).first();

    if (bg && bg.length) {
      foundUrl = extractUrlFromStyle(bg.attr("style"));
    }
  }

  // 4) Ak stále nič, vyber najpravdepodobnejší <img> na celej stránke
  if (!foundUrl) {
    const candidates = $("img")
      .map((_, el) => {
        const $el = $(el);
        const url =
          firstTruthy(
            $el.attr("data-src"),
            $el.attr("data-lazy-src"),
            pickFromSrcset($el.attr("srcset")),
            $el.attr("src")
          ) || "";
        const alt = ($el.attr("alt") || "").toLowerCase();
        const cls = ($el.attr("class") || "").toLowerCase();
        const name = url.toLowerCase();
        // skóruj podľa toho, či názov/alt obsahuje menu/jedál
        let score = 0;
        if (/jed[aá]ln/i.test(alt + " " + cls + " " + name)) score += 5;
        if (/menu/i.test(alt + " " + cls + " " + name)) score += 3;
        // preferuj väčšie obrázky
        const w = parseInt($el.attr("width") || "0", 10) || 0;
        const h = parseInt($el.attr("height") || "0", 10) || 0;
        score += Math.min(Math.floor((w * h) / 50000), 4); // hrubý bonus
        return { url, score };
      })
      .get()
      .filter(x => x.url)
      .sort((a, b) => b.score - a.score);

    if (candidates.length) foundUrl = candidates[0].url;
  }

  if (!foundUrl) {
    throw new Error(`No image URL found with given strategies. SELECTOR used: ${SELECTOR}`);
  }

  const absUrl = absolutize(foundUrl);
  if (!absUrl) throw new Error(`Bad image URL: ${foundUrl}`);

  const imgResp = await fetch(absUrl, {
    headers: {
      "User-Agent": "MenuBot/1.0 (+github actions)",
      "Referer": SOURCE_URL,
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  });
  if (!imgResp.ok) throw new Error(`Image fetch ${imgResp.status} for ${absUrl}`);

  const buf = Buffer.from(await imgResp.arrayBuffer());
  await ensureDir(OUTPUT_PATH);

  let same = false;
  try {
    const old = await fs.readFile(OUTPUT_PATH);
    same = (await sha256(old)) === (await sha256(buf));
  } catch {}

  if (same) {
    console.log("Image unchanged.");
    return;
  }

  await fs.writeFile(OUTPUT_PATH, buf);
  await fs.writeFile(
    OUTPUT_PATH + ".json",
    JSON.stringify(
      { source: SOURCE_URL, img: absUrl, fetchedAt: new Date().toISOString() },
      null, 2
    )
  );

  console.log(`Saved ${OUTPUT_PATH} from ${absUrl}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
