/**
 * Regenerates every Android launcher icon + splash from the ByaHero logo.
 *
 * Usage: node scripts/gen-icon-assets.mjs
 *
 * Pipeline:
 *   1. Build source art from the logo (SVG -> PNG via sharp)
 *   2. Run @capacitor/assets to expand into all densities + adaptive XMLs
 *   3. Patch the adaptive-icon XMLs: @capacitor/assets wraps both layers in
 *      <inset inset="16.7%">, which shrinks the background into a visible square
 *      instead of bleeding to the mask edge. We want a full-bleed background.
 */
import sharp from 'sharp';
import { execSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const NAVY = '#151D48';
const RED = '#DC2626';
const WHITE = '#FFFFFF';

// The jeepney mark, in the original 400x400 coordinate space.
const MOTIF = `
  <rect x="100" y="70" width="200" height="260" rx="50" fill="${NAVY}"/>
  <path d="M 115 150 Q 150 130 200 150 Q 250 130 285 150 L 270 190 Q 200 170 130 190 Z" fill="${WHITE}"/>
  <path d="M 100 220 L 300 220 L 300 280 Q 200 350 100 280 Z" fill="${RED}"/>
  <circle cx="200" cy="265" r="18" fill="${WHITE}"/>
  <circle cx="200" cy="265" r="8" fill="${NAVY}"/>
  <rect x="196" y="340" width="8" height="40" rx="4" fill="${WHITE}"/>
`;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 400 400">${body}</svg>`;

// Adaptive foreground: mark inside the 72dp safe zone, transparent background.
// The navy body rect is invisible against the navy background layer.
const foreground = svg(
  `<g transform="translate(200,200) scale(0.75) translate(-200,-225)">${MOTIF}</g>`
);

// Legacy (pre-Android 8) icon: full-bleed navy tile with the mark.
const legacy = svg(
  `<rect width="400" height="400" rx="88" fill="${NAVY}"/>
   <g transform="translate(0,-25)">${MOTIF}</g>`
);

// Splash screen: navy canvas, mark at ~26% height.
const splash = svg(
  `<rect width="400" height="400" fill="${NAVY}"/>
   <g transform="translate(200,200) scale(0.34) translate(-200,-225)">${MOTIF}</g>`
);

await mkdir('assets', { recursive: true });

for (const [out, source, size] of [
  ['assets/icon.png', legacy, 1024],
  ['assets/icon-foreground.png', foreground, 1024],
  ['assets/splash.png', splash, 2732],
]) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(out);
  console.log('wrote', out, `${size}x${size}`);
}

await sharp({ create: { width: 1024, height: 1024, channels: 4, background: NAVY } })
  .png()
  .toFile('assets/icon-background.png');
console.log('wrote assets/icon-background.png 1024x1024');

execSync('npx capacitor-assets generate --android', { stdio: 'inherit' });

// Drop the 16.7% inset wrapper so the background bleeds to the mask edge.
const patched = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

for (const f of [
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
]) {
  await readFile(f, 'utf8');
  await writeFile(f, patched);
  console.log('patched', f);
}
