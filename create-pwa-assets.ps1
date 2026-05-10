Write-Host "`n=== Creating CampusX PWA Assets ===`n" -ForegroundColor Cyan

if (!(Test-Path "package.json")) {
  Write-Host "Run this inside your CampusX project root." -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path "public/icons" | Out-Null
New-Item -ItemType Directory -Force -Path "scripts" | Out-Null

@"
import fs from "node:fs";
import zlib from "node:zlib";

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);

  return Buffer.concat([length, typeBuf, data, crc]);
}

function makePng(width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;

    for (let x = 0; x < width; x++) {
      const i = rowStart + 1 + x * 4;

      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const radius = Math.min(width, height) * 0.32;

      const isLogoCircle = distance <= radius;
      const isInnerCircle = distance <= radius * 0.58;

      if (isLogoCircle) {
        raw[i] = isInnerCircle ? 255 : 139;
        raw[i + 1] = isInnerCircle ? 255 : 92;
        raw[i + 2] = isInnerCircle ? 255 : 246;
        raw[i + 3] = 255;
      } else {
        raw[i] = 0;
        raw[i + 1] = 0;
        raw[i + 2] = 0;
        raw[i + 3] = 255;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync("public/icons", { recursive: true });

fs.writeFileSync("public/icons/icon-192.png", makePng(192, 192));
fs.writeFileSync("public/icons/icon-512.png", makePng(512, 512));
fs.writeFileSync("public/og-image.png", makePng(1200, 630));

console.log("Created:");
console.log("- public/icons/icon-192.png");
console.log("- public/icons/icon-512.png");
console.log("- public/og-image.png");
"@ | Set-Content "scripts/generate-pwa-assets.mjs"

node scripts/generate-pwa-assets.mjs

Write-Host "`nDone. Now run:" -ForegroundColor Green
Write-Host "npm.cmd run build"