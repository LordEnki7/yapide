import sharp from "sharp";
import { mkdirSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const src = resolve(root, "public/logo.png");

async function resizeTo(size, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  await sharp(src)
    .resize(size, size, { fit: "contain", background: { r: 4, g: 15, b: 38, alpha: 1 } })
    .png()
    .toFile(dest);
  console.log(`✔ ${size}x${size} → ${dest.replace(root + "/", "")}`);
}

async function main() {
  console.log("\n📱 Generating YaPide icons from logo.png...\n");

  // Web manifest icons
  const webSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  mkdirSync(resolve(root, "public/icons"), { recursive: true });
  for (const s of webSizes) {
    await resizeTo(s, resolve(root, `public/icons/icon-${s}.png`));
  }

  // Android mipmap icons
  const androidDensities = [
    { dir: "mipmap-mdpi",    size: 48 },
    { dir: "mipmap-hdpi",    size: 72 },
    { dir: "mipmap-xhdpi",   size: 96 },
    { dir: "mipmap-xxhdpi",  size: 144 },
    { dir: "mipmap-xxxhdpi", size: 192 },
  ];
  const androidRes = resolve(root, "android/app/src/main/res");
  for (const { dir, size } of androidDensities) {
    const destDir = resolve(androidRes, dir);
    await resizeTo(size, resolve(destDir, "ic_launcher.png"));
    await resizeTo(size, resolve(destDir, "ic_launcher_round.png"));
    // Foreground (same icon, no background for adaptive)
    await sharp(src)
      .resize(Math.round(size * 1.5), Math.round(size * 1.5), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(resolve(destDir, "ic_launcher_foreground.png"));
  }

  // Android splash drawables
  const splashSizes = [
    { dir: "drawable-port-mdpi",    w: 320,  h: 480  },
    { dir: "drawable-port-hdpi",    w: 480,  h: 800  },
    { dir: "drawable-port-xhdpi",   w: 720,  h: 1280 },
    { dir: "drawable-port-xxhdpi",  w: 960,  h: 1600 },
    { dir: "drawable-port-xxxhdpi", w: 1280, h: 1920 },
  ];
  for (const { dir, w, h } of splashSizes) {
    const destDir = resolve(androidRes, dir);
    mkdirSync(destDir, { recursive: true });
    const logoSize = Math.round(Math.min(w, h) * 0.35);
    await sharp({
      create: { width: w, height: h, channels: 4, background: { r: 4, g: 15, b: 38, alpha: 1 } },
    })
      .composite([{
        input: await sharp(src).resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
        gravity: "centre",
      }])
      .png()
      .toFile(resolve(destDir, "splash.png"));
    console.log(`✔ splash ${w}x${h} → android/app/src/main/res/${dir}/splash.png`);
  }

  // iOS App Icon sizes (AppIcon.appiconset)
  const iosIconSizes = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];
  const iosIconDir = resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
  mkdirSync(iosIconDir, { recursive: true });

  const iosContents = { images: [], info: { author: "xcode", version: 1 } };
  for (const size of iosIconSizes) {
    const filename = `AppIcon-${size}.png`;
    await resizeTo(size, resolve(iosIconDir, filename));
    iosContents.images.push({ filename, idiom: size >= 167 ? "ipad" : "iphone", scale: "1x", size: `${size}x${size}` });
  }
  // Write Contents.json
  const { writeFileSync } = await import("fs");
  writeFileSync(resolve(iosIconDir, "Contents.json"), JSON.stringify(iosContents, null, 2));
  console.log("✔ iOS Contents.json written");

  // iOS Launch Screen splash
  const iosSplashDir = resolve(root, "ios/App/App/Assets.xcassets/Splash.imageset");
  mkdirSync(iosSplashDir, { recursive: true });
  for (const [filename, w, h] of [["Default@1x.png", 375, 812], ["Default@2x.png", 750, 1624], ["Default@3x.png", 1125, 2436]]) {
    const logoSize = Math.round(Math.min(w, h) * 0.35);
    await sharp({
      create: { width: w, height: h, channels: 4, background: { r: 4, g: 15, b: 38, alpha: 1 } },
    })
      .composite([{
        input: await sharp(src).resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
        gravity: "centre",
      }])
      .png()
      .toFile(resolve(iosSplashDir, filename));
    console.log(`✔ iOS splash ${w}x${h} → ${filename}`);
  }
  const { writeFileSync: wf } = await import("fs");
  wf(resolve(iosSplashDir, "Contents.json"), JSON.stringify({
    images: [
      { filename: "Default@1x.png", idiom: "universal", scale: "1x" },
      { filename: "Default@2x.png", idiom: "universal", scale: "2x" },
      { filename: "Default@3x.png", idiom: "universal", scale: "3x" },
    ],
    info: { author: "xcode", version: 1 },
  }, null, 2));

  console.log("\n✅ All icons generated successfully!\n");
}

main().catch(e => { console.error(e); process.exit(1); });
