/* eslint-disable no-restricted-globals */

// Messages in
type MsgIn =
  | { type: 'init'; width: number; height: number }
  | { type: 'frame'; bitmap: ImageBitmap; ts: number };

// Messages out
type GoodOut = {
  type: 'good';
  ts: number;
  bbox: { x: number; y: number; w: number; h: number };
  sharp: number; // Laplacian variance
  motion: number; // EMA of abs-diff
  yellowRatio: number;
};
type StatusOut = {
  type: 'status';
  ts: number;
  sharp: number;
  motion: number;
  yellowRatio: number;
};

let W = 0,
  H = 0;
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let lastGray: Uint8ClampedArray | null = null;
let emaMotion = 0;
let lockCount = 0;

// Tunables (preview ~640px wide)
const SHARP_MIN = 90; // raise if many false positives
const MOTION_MAX = 9; // lower → stricter stability
const YELLOW_RATIO_MIN = 0.04; // % of preview pixels "yellowish"
const LOCK_FRAMES = 2; // consecutive good frames needed

function toGray(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray((data.length / 4) | 0);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    out[j] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }
  return out;
}

function laplacianVar(gray: Uint8ClampedArray, w: number, h: number): number {
  let sum = 0,
    sumSq = 0,
    n = 0;
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const c =
        -gray[row - w + x - 1] -
        gray[row - w + x] * 2 -
        gray[row - w + x + 1] -
        gray[row + x - 1] * 2 +
        gray[row + x] * 8 -
        gray[row + x + 1] * 2 -
        gray[row + w + x - 1] -
        gray[row + w + x] * 2 -
        gray[row + w + x + 1];
      sum += c;
      sumSq += c * c;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

// Quick HSV “yellow” check
function isYellow(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    v = max / 255;
  const d = max - min || 1;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (max !== min) {
    if (max === r) h = (60 * ((g - b) / d) + 360) % 360;
    else if (max === g) h = (60 * ((b - r) / d) + 120) % 360;
    else h = (60 * ((r - g) / d) + 240) % 360;
  }
  return h >= 45 && h <= 70 && s >= 0.3 && v >= 0.55;
}

function yellowBBoxAndRatio(img: ImageData) {
  const { data, width: w, height: h } = img;
  let xmin = w,
    xmax = 0,
    ymin = h,
    ymax = 0,
    count = 0;
  for (let y = 0; y < h; y++) {
    let idx = y * w * 4;
    for (let x = 0; x < w; x++, idx += 4) {
      if (isYellow(data[idx], data[idx + 1], data[idx + 2])) {
        count++;
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
      }
    }
  }
  const ratio = count / (w * h);
  const ok = count > 0 && xmax > xmin && ymax > ymin;
  return {
    ratio,
    bbox: ok
      ? { x: xmin, y: ymin, w: xmax - xmin + 1, h: ymax - ymin + 1 }
      : { x: 0, y: 0, w: 0, h: 0 },
  };
}

self.onmessage = async (e: MessageEvent<MsgIn>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    W = msg.width;
    H = msg.height;
    canvas = new OffscreenCanvas(W, H);
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    lastGray = null;
    emaMotion = 0;
    lockCount = 0;
    return;
  }

  if (msg.type === 'frame' && ctx && canvas) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(msg.bitmap, 0, 0, W, H);
    msg.bitmap.close();

    const img = ctx.getImageData(0, 0, W, H);
    const gray = toGray(img.data);
    const sharp = laplacianVar(gray, W, H);

    // motion (EMA of abs diff, stride)
    let motion = 0;
    if (lastGray && lastGray.length === gray.length) {
      let acc = 0;
      for (let i = 0; i < gray.length; i += 4) {
        const d = gray[i] - lastGray[i];
        acc += d < 0 ? -d : d;
      }
      motion = acc / (gray.length / 4);
    }
    lastGray = gray;
    emaMotion = emaMotion ? emaMotion * 0.85 + motion * 0.15 : motion;

    const { ratio, bbox } = yellowBBoxAndRatio(img);
    const ar = bbox.w > 0 ? bbox.w / Math.max(1, bbox.h) : 0;
    const arOk = ar > 1.2 && ar < 2.2;

    const looksGood =
      sharp >= SHARP_MIN && emaMotion <= MOTION_MAX && ratio >= YELLOW_RATIO_MIN && arOk;
    lockCount = looksGood ? Math.min(lockCount + 1, 10) : 0;

    if (lockCount >= LOCK_FRAMES) {
      const out: GoodOut = {
        type: 'good',
        ts: msg.ts,
        bbox,
        sharp,
        motion: emaMotion,
        yellowRatio: ratio,
      };
      (self as any).postMessage(out);
    } else {
      const out: StatusOut = {
        type: 'status',
        ts: msg.ts,
        sharp,
        motion: emaMotion,
        yellowRatio: ratio,
      };
      (self as any).postMessage(out);
    }
  }
};
