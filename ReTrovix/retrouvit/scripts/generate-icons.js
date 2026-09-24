#!/usr/bin/env node
/**
 * Generate PWA icons from SVG source.
 * Run: node scripts/generate-icons.js
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SVG_PATH = path.join(__dirname, "../public/icons/icon-source.svg");
const OUTPUT_DIR = path.join(__dirname, "../public/icons");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512, 1024];
const SHORTCUT_SIZES = [96];

// Shortcut configs (simple colored icons)
const SHORTCUTS = [
  { name: "shortcut-publish", color: "#16a34a", icon: "M" }, // Plus icon
  { name: "shortcut-feed", color: "#2563eb", icon: "F" },    // Feed icon
  { name: "shortcut-wallet", color: "#d97706", icon: "W" },   // Wallet icon
];

async function generateMainIcons() {
  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ quality: 90 })
      .toFile(outputPath);
    console.log(`  ✓ icon-${size}x${size}.png`);
  }
}

async function generateShortcutIcons() {
  for (const shortcut of SHORTCUTS) {
    const size = 96;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="20" fill="${shortcut.color}"/>
      <text x="48" y="64" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" font-weight="700" fill="white">${shortcut.icon}</text>
    </svg>`;

    const outputPath = path.join(OUTPUT_DIR, `${shortcut.name}.png`);
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png({ quality: 90 })
      .toFile(outputPath);
    console.log(`  ✓ ${shortcut.name}.png`);
  }
}

async function generateScreenshotPlaceholders() {
  const screenshotDir = path.join(__dirname, "../public/screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Wide screenshot (landing page)
  const wideSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
    <rect width="1280" height="720" fill="#f8fafc"/>
    <rect x="40" y="30" width="1200" height="60" rx="8" fill="#16a34a" opacity="0.1"/>
    <rect x="60" y="140" width="500" height="20" rx="4" fill="#e2e8f0"/>
    <rect x="60" y="180" width="350" height="14" rx="4" fill="#e2e8f0" opacity="0.6"/>
    <rect x="60" y="220" width="400" height="14" rx="4" fill="#e2e8f0" opacity="0.6"/>
    <rect x="60" y="280" width="200" height="48" rx="12" fill="#16a34a"/>
    <rect x="280" y="280" width="200" height="48" rx="12" fill="#16a34a" opacity="0.15"/>
    <rect x="600" y="100" width="600" height="500" rx="16" fill="#16a34a" opacity="0.08"/>
    <circle cx="900" cy="350" r="120" fill="#16a34a" opacity="0.15"/>
    <text x="640" y="370" text-anchor="middle" font-family="system-ui" font-size="24" fill="#16a34a" opacity="0.4">RetrouvIt</text>
  </svg>`;
  await sharp(Buffer.from(wideSvg))
    .resize(1280, 720)
    .png()
    .toFile(path.join(screenshotDir, "landing.png"));
  console.log("  ✓ screenshots/landing.png");

  // Narrow screenshot (feed)
  const narrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844">
    <rect width="390" height="844" fill="#ffffff"/>
    <rect x="0" y="0" width="390" height="56" fill="#16a34a"/>
    <text x="195" y="36" text-anchor="middle" font-family="system-ui" font-size="16" font-weight="600" fill="white">Fil d'objets</text>
    <rect x="16" y="72" width="358" height="44" rx="12" fill="#f1f5f9"/>
    <rect x="16" y="130" width="358" height="160" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>
    <rect x="32" y="148" width="120" height="12" rx="4" fill="#e2e8f0"/>
    <rect x="32" y="172" width="280" height="10" rx="4" fill="#f1f5f9"/>
    <rect x="32" y="192" width="200" height="10" rx="4" fill="#f1f5f9"/>
    <rect x="32" y="220" width="80" height="24" rx="12" fill="#16a34a" opacity="0.15"/>
    <rect x="16" y="306" width="358" height="160" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>
    <rect x="32" y="324" width="140" height="12" rx="4" fill="#e2e8f0"/>
    <rect x="32" y="348" width="260" height="10" rx="4" fill="#f1f5f9"/>
    <rect x="32" y="368" width="180" height="10" rx="4" fill="#f1f5f9"/>
    <rect x="32" y="396" width="100" height="24" rx="12" fill="#2563eb" opacity="0.15"/>
    <rect x="16" y="482" width="358" height="160" rx="12" fill="#f8fafc" stroke="#e2e8f0"/>
    <rect x="32" y="500" width="100" height="12" rx="4" fill="#e2e8f0"/>
    <rect x="32" y="524" width="300" height="10" rx="4" fill="#f1f5f9"/>
    <rect x="32" y="544" width="220" height="10" rx="4" fill="#f1f5f9"/>
  </svg>`;
  await sharp(Buffer.from(narrowSvg))
    .resize(390, 844)
    .png()
    .toFile(path.join(screenshotDir, "feed.png"));
  console.log("  ✓ screenshots/feed.png");
}

async function main() {
  console.log("Generating PWA icons...");

  // Ensure dirs exist
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await generateMainIcons();
  console.log("\nGenerating shortcut icons...");
  await generateShortcutIcons();
  console.log("\nGenerating screenshots...");
  await generateScreenshotPlaceholders();

  console.log("\n✅ All icons generated!");
}

main().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
