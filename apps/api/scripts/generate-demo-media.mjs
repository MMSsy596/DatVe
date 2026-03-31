import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, "..");
const publicRoot = path.join(apiRoot, "public", "demo-media");
const setupDbPath = path.join(__dirname, "setup-db.mjs");

function slugify(input) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashString(input) {
  let hash = 0;
  for (const char of String(input)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function paletteFor(seed) {
  const pairs = [
    ["#18090d", "#8d2237"],
    ["#0d1321", "#1d4ed8"],
    ["#1a0d15", "#e11d48"],
    ["#07151f", "#0f766e"],
    ["#160d24", "#7c3aed"],
    ["#120f0b", "#f97316"],
  ];
  return pairs[hashString(seed) % pairs.length];
}

function safeEvalArray(literal) {
  return Function(`"use strict"; return (${literal});`)();
}

function extractLiteral(source, variableName) {
  const marker = `const ${variableName} = `;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Không tìm thấy ${variableName} trong setup-db.mjs`);
  }
  const after = source.slice(start + marker.length);
  const end = after.indexOf("\n\n");
  if (end === -1) {
    throw new Error(`Không thể cắt block ${variableName}`);
  }
  return after.slice(0, end).trim().replace(/;$/, "");
}

function posterSvg({ title, subtitle, genre, seed }) {
  const [bgA, bgB] = paletteFor(seed);
  const glow = hashString(seed) % 2 === 0 ? "#f5d0fe" : "#fde68a";
  const accent = hashString(seed) % 3 === 0 ? "#7dd3fc" : "#fca5a5";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="720" height="1080" viewBox="0 0 720 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgA}"/>
      <stop offset="100%" stop-color="${bgB}"/>
    </linearGradient>
    <radialGradient id="halo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(520 180) rotate(132) scale(420 340)">
      <stop stop-color="${glow}" stop-opacity="0.72"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <rect width="720" height="1080" fill="url(#bg)"/>
  <rect width="720" height="1080" fill="url(#halo)"/>
  <ellipse cx="170" cy="840" rx="250" ry="180" fill="${accent}" fill-opacity="0.18"/>
  <rect x="52" y="48" width="616" height="984" rx="34" fill="url(#glass)" fill-opacity="0.08" stroke="rgba(255,255,255,0.22)"/>
  <rect x="88" y="88" width="544" height="904" rx="26" fill="rgba(8,10,18,0.14)" stroke="rgba(255,255,255,0.08)"/>
  <path d="M125 838C226 674 301 592 428 482C496 423 542 338 571 216" stroke="rgba(255,255,255,0.12)" stroke-width="10" stroke-linecap="round"/>
  <path d="M104 910C258 855 425 793 588 662" stroke="rgba(255,255,255,0.08)" stroke-width="8" stroke-linecap="round"/>
  <circle cx="545" cy="198" r="84" fill="rgba(255,255,255,0.08)"/>
  <circle cx="545" cy="198" r="62" fill="rgba(255,255,255,0.06)"/>
  <circle cx="545" cy="198" r="38" fill="rgba(255,255,255,0.09)"/>
  <rect x="104" y="114" width="196" height="42" rx="21" fill="rgba(10,12,20,0.52)" stroke="rgba(255,255,255,0.18)"/>
  <text x="202" y="141" text-anchor="middle" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="3">${genre.toUpperCase()}</text>
  <text x="104" y="660" fill="#FFF7ED" font-family="Arial, Helvetica, sans-serif" font-size="78" font-weight="800">${title.split(" ").slice(0, 2).join(" ").toUpperCase()}</text>
  <text x="104" y="742" fill="#FFF7ED" font-family="Arial, Helvetica, sans-serif" font-size="78" font-weight="800">${title.split(" ").slice(2).join(" ").toUpperCase()}</text>
  <text x="108" y="816" fill="rgba(255,245,245,0.82)" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="500">${subtitle}</text>
  <rect x="104" y="878" width="512" height="2" fill="rgba(255,255,255,0.18)"/>
  <text x="104" y="928" fill="rgba(255,255,255,0.72)" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="7">DAT VE CINEMA</text>
</svg>`;
}

function bannerSvg({ title, subtitle, seed, eyebrow }) {
  const [bgA, bgB] = paletteFor(seed);
  const glow = hashString(seed) % 2 === 0 ? "#7dd3fc" : "#f9a8d4";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="900" viewBox="0 0 1600 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgA}"/>
      <stop offset="100%" stop-color="${bgB}"/>
    </linearGradient>
    <radialGradient id="light" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1180 170) rotate(133) scale(500 360)">
      <stop stop-color="${glow}" stop-opacity="0.58"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#light)"/>
  <rect x="72" y="64" width="1456" height="772" rx="40" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.16)"/>
  <ellipse cx="1254" cy="644" rx="320" ry="210" fill="rgba(255,255,255,0.08)"/>
  <ellipse cx="1324" cy="624" rx="190" ry="150" fill="rgba(255,255,255,0.10)"/>
  <path d="M868 694C1087 607 1215 515 1391 295" stroke="rgba(255,255,255,0.10)" stroke-width="14" stroke-linecap="round"/>
  <path d="M940 770C1124 704 1301 607 1430 470" stroke="rgba(255,255,255,0.06)" stroke-width="10" stroke-linecap="round"/>
  <text x="134" y="178" fill="rgba(255,255,255,0.76)" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="6">${eyebrow.toUpperCase()}</text>
  <text x="128" y="334" fill="#FFF7ED" font-family="Arial, Helvetica, sans-serif" font-size="116" font-weight="800">${title.toUpperCase()}</text>
  <text x="134" y="430" fill="rgba(255,248,240,0.88)" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="500">${subtitle}</text>
  <rect x="132" y="516" width="250" height="56" rx="28" fill="rgba(8,10,18,0.46)" stroke="rgba(255,255,255,0.16)"/>
  <text x="257" y="553" text-anchor="middle" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="4">ĐẶT VÉ NGAY</text>
  <text x="132" y="796" fill="rgba(255,255,255,0.62)" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" letter-spacing="7">NANBAO CINEMA EXPERIENCE</text>
</svg>`;
}

async function main() {
  const source = await fs.readFile(setupDbPath, "utf8");
  const bannerLiteral = extractLiteral(source, "banners");
  const movieLiteral = extractLiteral(source, "movieSeedSource");
  const banners = safeEvalArray(bannerLiteral);
  const movieSeedSource = safeEvalArray(movieLiteral);

  const postersDir = path.join(publicRoot, "posters");
  const bannersDir = path.join(publicRoot, "banners");
  const promosDir = path.join(publicRoot, "promos");
  await fs.mkdir(postersDir, { recursive: true });
  await fs.mkdir(bannersDir, { recursive: true });
  await fs.mkdir(promosDir, { recursive: true });

  for (const [title, author, genre] of movieSeedSource) {
    const slug = slugify(title);
    const subtitle = `Đạo diễn ${author}`;
    await fs.writeFile(
      path.join(postersDir, `${slug}.svg`),
      posterSvg({ title, subtitle, genre, seed: slug }),
      "utf8"
    );
    await fs.writeFile(
      path.join(bannersDir, `${slug}.svg`),
      bannerSvg({ title, subtitle: genre, seed: `${slug}-banner`, eyebrow: "Phim đang chiếu" }),
      "utf8"
    );
  }

  for (const banner of banners) {
    await fs.writeFile(
      path.join(promosDir, `banner-${banner.id}.svg`),
      bannerSvg({
        title: banner.title,
        subtitle: banner.subtitle,
        seed: `promo-${banner.id}`,
        eyebrow: "Khuyến mãi Đặt Vé",
      }),
      "utf8"
    );
  }

  console.log(`Đã tạo asset demo local: ${movieSeedSource.length} poster, ${movieSeedSource.length} banner phim, ${banners.length} banner khuyến mãi.`);
}

await main();
