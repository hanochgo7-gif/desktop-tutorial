// Writes the favicon and app icons from the logo mark (src/lib/brand.ts), and a compressed copy
// of the Canva logo lockup. Run after changing the mark:  npx tsx scripts/build-icons.ts
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { markSvg } from "../src/lib/brand";

async function main() {
  writeFileSync("public/icon.svg", markSvg({ tile: true, size: 64 }));
  const tile = Buffer.from(markSvg({ tile: true, size: 1024 }));
  await sharp(tile).resize(180, 180).png().toFile("public/apple-icon.png");
  await sharp(tile).resize(192, 192).png().toFile("public/icon-192.png");
  await sharp(tile).resize(512, 512).png().toFile("public/icon-512.png");
  // The lockup as designed in Canva, palette-compressed (it's flat colour).
  const src = process.argv[2];
  if (src) {
    const info = await sharp(src)
      .trim({ threshold: 8 })
      .resize({ width: 1040 })
      .extend({ top: 80, bottom: 80, left: 80, right: 80, background: "#ffffff" })
      .png({ palette: true, colours: 48, compressionLevel: 9 })
      .toFile("public/brand/dira-ready-logo.png");
    console.log("lockup", info.width, info.height, info.size);
  }
  console.log("icons written");
}
main();
