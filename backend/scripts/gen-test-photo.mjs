// Génère une image PNG de test (fond gris + un carré sombre simulant le QR) — usage dev ponctuel.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { crc32 } from "node:zlib";

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data])) >>> 0;
  crcBuf.writeUInt32BE(crcVal);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const W = 600,
  H = 400;
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  const rowStart = y * (1 + W * 3);
  raw[rowStart] = 0; // filter none
  for (let x = 0; x < W; x++) {
    const inQr = x > 240 && x < 360 && y > 140 && y < 260; // carré sombre = "QR"
    const [r, g, b] = inQr ? [30, 30, 30] : [190, 195, 200];
    const o = rowStart + 1 + x * 3;
    raw[o] = r;
    raw[o + 1] = g;
    raw[o + 2] = b;
  }
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const idat = deflateSync(raw);
const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = process.argv[2] || "test-photo.png";
writeFileSync(out, png);
console.log("wrote", out, png.length, "bytes");
