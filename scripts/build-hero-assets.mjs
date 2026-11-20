/**
 * Builds the transparent hero plant cutouts from the owner-provided sources.
 * Usage: node scripts/build-hero-assets.mjs
 *
 * Sources live in the workspace root `hero-source/` (not committed). Sharp is
 * already installed in the repo (Next's image pipeline); no new dependency.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
let sharp;
try {
  // The backend repo already has the native sharp build; the frontend copy is
  // only needed by Next and can be a WASM fallback without its optional runtime.
  sharp = require("../../backend/node_modules/sharp");
} catch {
  sharp = require("sharp");
}

const SOURCE_DIR = resolve(process.cwd(), "..", "hero-source");
const OUT_DIR = resolve(process.cwd(), "public", "hero");
const STAGE_ASPECT = 11 / 10;
const QUALITY = 55;
const PAD_FRACTION = 0.06;

const PLANTS = [
  {
    key: "monstera",
    source: "monstera.webp",
    targetHeight: 640,
    mirror: false,
    visibleHeight: 66,
    visibleLeft: 3,
    visibleBottom: 4,
    potTop: 0.74,
    pivotX: 0.45,
    amp: 0.5,
    phase: 1.8,
  },
  {
    key: "palm",
    source: "arica palm.webp",
    targetHeight: 760,
    mirror: false,
    visibleHeight: 94,
    visibleLeft: 30,
    visibleBottom: 1,
    potTop: 0.807,
    pivotX: 0.49,
    amp: 1.0,
    phase: 0,
  },
  {
    key: "snake",
    source: "snake plant.webp",
    targetHeight: 560,
    mirror: false,
    visibleHeight: 48,
    visibleLeft: 24,
    visibleBottom: 0,
    potTop: 0.66,
    pivotX: 0.52,
    amp: 0.35,
    phase: 3.1,
  },
  {
    key: "calathea",
    source: "calathea.webp",
    targetHeight: 620,
    mirror: true,
    visibleHeight: 50,
    visibleLeft: 62,
    visibleBottom: 0,
    potTop: 0.74,
    pivotX: 0.5,
    amp: 0.7,
    phase: 6.4,
  },
];

function alphaBox(buffer, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = buffer[(y * width + x) * 4 + 3];
      if (alpha > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < left || bottom < top) throw new Error("No visible alpha pixels");
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function equalize(buffer) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < buffer.length; i += 4) {
    if (buffer[i + 3] <= 20) continue;
    const luminance = 0.3 * buffer[i] + 0.59 * buffer[i + 1] + 0.11 * buffer[i + 2];
    sum += luminance;
    count += 1;
  }
  const mean = count > 0 ? sum / count : 95;
  const gain = Math.min(1.2, Math.max(0.82, Math.sqrt(95 / Math.max(1, mean))));
  for (let i = 0; i < buffer.length; i += 4) {
    if (buffer[i + 3] === 0) continue;
    buffer[i] = Math.min(255, Math.round(buffer[i] * gain));
    buffer[i + 1] = Math.min(255, Math.round(buffer[i + 1] * gain));
    buffer[i + 2] = Math.min(255, Math.round(buffer[i + 2] * gain));
  }
  return { gain, mean: Math.round(mean) };
}

async function buildPlant(plant) {
  const input = await sharp(resolve(SOURCE_DIR, plant.source))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const box = alphaBox(input.data, input.info.width, input.info.height);
  let image = sharp(input.data, {
    raw: { width: input.info.width, height: input.info.height, channels: 4 },
  }).extract({ left: box.left, top: box.top, width: box.width, height: box.height });

  if (plant.mirror) image = image.flop();

  const cropped = await image.raw().toBuffer({ resolveWithObject: true });
  const { gain, mean } = equalize(cropped.data);

  // Resize the visible plant first, then add the transparent wind margin. Doing
  // it in this order keeps the source aspect ratio and makes the composition
  // percentages exact.
  const visibleHeight = plant.targetHeight;
  const resizedVisible = await sharp(cropped.data, {
    raw: { width: cropped.info.width, height: cropped.info.height, channels: 4 },
  })
    .resize({ height: visibleHeight })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const visibleWidth = resizedVisible.info.width;
  const pad = Math.round(visibleHeight * PAD_FRACTION);
  const paddedHeight = visibleHeight + pad * 2;
  const paddedWidth = visibleWidth + pad * 2;

  const padded = Buffer.alloc(paddedWidth * paddedHeight * 4);
  for (let y = 0; y < resizedVisible.info.height; y += 1) {
    for (let x = 0; x < resizedVisible.info.width; x += 1) {
      const source = (y * resizedVisible.info.width + x) * 4;
      const target = ((y + pad) * paddedWidth + (x + pad)) * 4;
      padded[target] = resizedVisible.data[source];
      padded[target + 1] = resizedVisible.data[source + 1];
      padded[target + 2] = resizedVisible.data[source + 2];
      padded[target + 3] = resizedVisible.data[source + 3];
    }
  }

  const resized = await sharp(padded, {
    raw: { width: paddedWidth, height: paddedHeight, channels: 4 },
  })
    .webp({ quality: QUALITY, alphaQuality: 70, effort: 6 })
    .toBuffer();

  const finalWidth = paddedWidth;
  const finalHeight = paddedHeight;
  const padFinal = pad;
  const visibleWidthFinal = visibleWidth;
  const visibleHeightFinal = visibleHeight;
  const smallHeight = Math.round(finalHeight * 0.6);
  const small = await sharp(resized).resize({ height: smallHeight }).webp({
    quality: QUALITY,
    alphaQuality: 70,
    effort: 6,
  }).toBuffer();

  await writeFile(resolve(OUT_DIR, `${plant.key}.webp`), resized);
  await writeFile(resolve(OUT_DIR, `${plant.key}-small.webp`), small);
  let mobileWidth = null;
  let mobileHeight = null;
  let mediumWidth = null;
  let mediumHeight = null;
  if (plant.key === "palm") {
    mobileHeight = Math.round(finalHeight * 0.45);
    const mobile = await sharp(resized).resize({ height: mobileHeight }).webp({
      quality: QUALITY,
      alphaQuality: 70,
      effort: 6,
    }).toBuffer();
    mobileWidth = Math.round((finalWidth * mobileHeight) / finalHeight);
    await writeFile(resolve(OUT_DIR, `${plant.key}-mobile.webp`), mobile);
    mediumHeight = Math.round(finalHeight * 0.75);
    const medium = await sharp(resized).resize({ height: mediumHeight }).webp({
      quality: QUALITY,
      alphaQuality: 70,
      effort: 6,
    }).toBuffer();
    mediumWidth = Math.round((finalWidth * mediumHeight) / finalHeight);
    await writeFile(resolve(OUT_DIR, `${plant.key}-medium.webp`), medium);
  }

  const visibleWidthPct =
    ((visibleWidthFinal / visibleHeightFinal) * plant.visibleHeight) / STAGE_ASPECT;
  const padPctOfStageWidth = (PAD_FRACTION * plant.visibleHeight) / STAGE_ASPECT;
  const padPctOfStageHeight = PAD_FRACTION * plant.visibleHeight;
  const pivotPx = padFinal + plant.pivotX * visibleWidthFinal;
  const pivotPy = padFinal + plant.potTop * visibleHeightFinal;
  const potCenterPct = plant.visibleLeft + plant.pivotX * visibleWidthPct;

  return {
    key: plant.key,
    source: plant.source,
    drawOrder: PLANTS.findIndex((entry) => entry.key === plant.key),
    width: finalWidth,
    height: finalHeight,
    smallWidth: Math.round((finalWidth * smallHeight) / finalHeight),
    smallHeight,
    mobileWidth,
    mobileHeight,
    mediumWidth,
    mediumHeight,
    aspect: finalWidth / finalHeight,
    textureAspect: finalWidth / finalHeight,
    visibleWidth,
    visibleHeight: visibleHeightFinal,
    pad: padFinal,
    pivot: {
      x: Number((pivotPx / finalWidth).toFixed(5)),
      y: Number((pivotPy / finalHeight).toFixed(5)),
    },
    leftPct: Number((plant.visibleLeft - padPctOfStageWidth).toFixed(3)),
    bottomPct: Number((plant.visibleBottom - padPctOfStageHeight).toFixed(3)),
    heightPct: Number(((finalHeight / visibleHeightFinal) * plant.visibleHeight).toFixed(3)),
    visibleWidthPct: Number(visibleWidthPct.toFixed(3)),
    potCenterPct: Number(potCenterPct.toFixed(3)),
    shadow: {
      widthPct: Number((visibleWidthPct * 0.55).toFixed(3)),
      heightPct: 5,
      leftPct: Number((potCenterPct - (visibleWidthPct * 0.55) / 2).toFixed(3)),
      bottomPct: Number(Math.max(0, plant.visibleBottom - 1.5).toFixed(3)),
    },
    amp: plant.amp,
    phase: plant.phase,
    mirror: plant.mirror,
    gain: Number(gain.toFixed(3)),
    meanLuminance: mean,
    bytes: resized.length,
  };
}

await mkdir(OUT_DIR, { recursive: true });
const plants = [];
for (const plant of PLANTS) {
  const built = await buildPlant(plant);
  plants.push(built);
  process.stdout.write(
    `${plant.key}: ${built.width}x${built.height} ${(built.bytes / 1024).toFixed(1)} KB gain=${built.gain} pivot=${built.pivot.x},${built.pivot.y} pot=${built.potCenterPct}%\n`,
  );
}
const scene = {
  stageAspect: STAGE_ASPECT,
  generatedAt: new Date().toISOString(),
  order: PLANTS.map((plant) => plant.key),
  desktopBytes: plants.reduce((sum, plant) => sum + plant.bytes, 0),
  plants,
};
await writeFile(resolve(OUT_DIR, "scene.json"), `${JSON.stringify(scene, null, 2)}\n`);
await writeFile(
  resolve(process.cwd(), "src", "features", "catalog", "hero-scene.generated.ts"),
  `/* Generated by scripts/build-hero-assets.mjs; do not hand-edit. */\nexport const HERO_SCENE = ${JSON.stringify(scene, null, 2)} as const;\nexport type HeroSceneData = typeof HERO_SCENE;\n`,
);
process.stdout.write(
  `total desktop ${(scene.desktopBytes / 1024).toFixed(1)} KB -> ${OUT_DIR}\n`,
);
