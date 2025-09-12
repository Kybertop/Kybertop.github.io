import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import * as cheerio from "cheerio";

const SOURCE_URL = process.env.SOURCE_URL;
const SELECTOR = process.env.SELECTOR || "div.vc_single_image-wrapper img";
const OUTPUT_PATH = process.env.OUTPUT_PATH || "assets/menu.jpg";

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

  const img = $(SELECTOR).first();
  if (!img || img.length === 0) throw new Error(`No <img> found by selector: ${SELECTOR}`);

  let src =
    img.attr("data-src") ||
    img.attr("data-lazy-src") ||
    pickFromSrcset(img.attr("srcset")) ||
    img.attr("src");

  if (!src) throw new Error("Image src not found");

  const absUrl = new URL(src, SOURCE_URL).href;

  const imgResp = await fetch(absUrl, {
    headers: { "User-Agent": "MenuBot/1.0 (+github actions)", "Referer": SOURCE_URL },
  });
  if (!imgResp.ok) throw new Error(`Image fetch ${imgResp.status}`);

  const buf = Buffer.from(await imgResp.arrayBuffer());

  await ensureDir(OUTPUT_PATH);

  let same = false;
  try {
    const old = await fs.readFile(OUTPUT_PATH);
    same = (await sha256(old)) === (await sha256(buf));
  } catch (_) {}

  if (same) {
    console.log("Image unchanged.");
    return;
  }

  await fs.writeFile(OUTPUT_PATH, buf);
  await fs.writeFile(
    OUTPUT_PATH + ".json",
    JSON.stringify({ source: SOURCE_URL, fetchedAt: new Date().toISOString(), img: absUrl }, null, 2)
  );

  console.log(`Saved ${OUTPUT_PATH} from ${absUrl}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
