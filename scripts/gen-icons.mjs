// Генератор PWA-иконок без внешних зависимостей: рисуем паровозик из
// public/favicon.svg в пиксельный буфер и кодируем PNG средствами встроенного zlib.
// Иконки full-bleed (фон на весь холст) → годятся как maskable.
// Запуск: node scripts/gen-icons.mjs
import zlib from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const BG = [59, 42, 26, 255]; // #3b2a1a
const BODY = [168, 113, 50, 255]; // #a87132
const CABIN = [214, 183, 133, 255]; // #d6b785
const DARK = [43, 28, 13, 255]; // #2b1c0d

// CRC32 для PNG-чанков
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function makeIcon(N) {
  const buf = Buffer.alloc(N * N * 4);
  const px = (x, y, c) => {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    const i = (y * N + x) * 4;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = c[3];
  };
  const rect = (x, y, w, h, c) => {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++)
      for (let xx = Math.round(x); xx < Math.round(x + w); xx++) px(xx, yy, c);
  };
  const circle = (cx, cy, r, c) => {
    for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++)
      for (let xx = Math.floor(cx - r); xx <= Math.ceil(cx + r); xx++)
        if ((xx - cx) ** 2 + (yy - cy) ** 2 <= r * r) px(xx, yy, c);
  };

  // фон на весь холст (maskable-safe)
  rect(0, 0, N, N, BG);

  // рисунок из viewBox 0..32, вписан в внутренние ~78% (safe zone для maskable)
  const s = (N * 0.78) / 32;
  const o = N * 0.11;
  const m = (v) => o + v * s;
  rect(m(6), m(13), 20 * s, 9 * s, BODY); // корпус
  rect(m(9), m(9), 14 * s, 6 * s, CABIN); // кабина
  rect(m(22), m(11), 3 * s, 5 * s, BG); // труба
  circle(m(11), m(24), 2.5 * s, DARK); // колесо
  circle(m(21), m(24), 2.5 * s, DARK); // колесо

  return encodePng(N, N, buf);
}

for (const N of [192, 512]) {
  const file = join(OUT, `icon-${N}.png`);
  writeFileSync(file, makeIcon(N));
  console.log(`wrote ${file}`);
}
