// Minimal, dependency-free PNG statistics — enough to tell "did the page actually paint?"
// apart from "the DOM is fine but an opaque white layer covers the viewport".
//
// WHY (2026-10-13, arc-contracts §70): the `arc_mode=dark` cookie makes Chromium paint the whole
// viewport white while `document.body.innerText` and the AUP node count stay perfectly healthy.
// Every DOM-based check we have (the browser probe's verdict, HTTP 200, deployed-byte equality)
// passes on such a page, so the only honest signal is the painted pixels.
//
// Scope: 8-bit, non-interlaced PNGs of colour types 0/2/4/6 — which is what Chrome's
// `Page.captureScreenshot` emits. Anything else throws rather than guessing.
import { inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** Decode to raw 8-bit samples (no interlace, no palette). Returns { width, height, channels, data }. */
export function decodePng(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('not a PNG (bad signature)');
  }
  let offset = 8;
  let header = null;
  const idat = [];
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('latin1', offset + 4, offset + 8);
    const body = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        bitDepth: body[8],
        colorType: body[9],
        interlace: body[12],
      };
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (!header) throw new Error('PNG has no IHDR');
  const channels = CHANNELS[header.colorType];
  if (header.bitDepth !== 8 || header.interlace !== 0 || !channels) {
    throw new Error(
      `unsupported PNG (bitDepth=${header.bitDepth} colorType=${header.colorType} interlace=${header.interlace})`,
    );
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = header.width * channels;
  const data = Buffer.alloc(stride * header.height);
  let src = 0;
  for (let y = 0; y < header.height; y += 1) {
    const filter = raw[src];
    src += 1;
    const rowStart = y * stride;
    const prevStart = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[src + x];
      const left = x >= channels ? data[rowStart + x - channels] : 0;
      const up = y > 0 ? data[prevStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? data[prevStart + x - channels] : 0;
      let out;
      switch (filter) {
        case 0: out = value; break;
        case 1: out = value + left; break;
        case 2: out = value + up; break;
        case 3: out = value + ((left + up) >> 1); break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          out = value + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default: throw new Error(`unsupported PNG filter ${filter} on row ${y}`);
      }
      data[rowStart + x] = out & 0xff;
    }
    src += stride;
  }
  return { width: header.width, height: header.height, channels, data };
}

const WHITE = 254.5;

/**
 * Painted-pixel summary. `meanLuminance` ≈ 255 means an all-white viewport (the §70 signature);
 * `whiteFraction` is the share of sampled pixels at/above white.
 */
export function pngStats(buf, { step = 2 } = {}) {
  const { width, height, channels, data } = decodePng(buf);
  let sum = 0;
  let white = 0;
  let samples = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * channels;
      let lum;
      if (channels >= 3) lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      else lum = data[i];
      // Ignore fully transparent pixels (Chrome paints them white in the PNG, but they are not paint).
      if (channels === 4 && data[i + 3] === 0) lum = -1;
      if (lum < 0) continue;
      sum += lum;
      if (lum >= WHITE) white += 1;
      samples += 1;
    }
  }
  if (!samples) return { width, height, samples: 0, meanLuminance: 0, whiteFraction: 1 };
  return {
    width,
    height,
    samples,
    meanLuminance: sum / samples,
    whiteFraction: white / samples,
  };
}
