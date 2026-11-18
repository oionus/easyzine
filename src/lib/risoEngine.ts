import {
  getAssetDataUrl,
  getRisoInk,
  HalftoneStyle,
  hexToRgb,
  PhotoAsset,
  PrintSettings,
  SeparationPlateStyle,
} from "@/types/zine";

const decodedImages = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement | null>>();
const risoCanvasCache = new Map<string, HTMLCanvasElement>();

const listeners = new Set<() => void>();

export function subscribeImageDecode(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyImageDecoded() {
  for (const cb of listeners) cb();
}

export function getDecodedAssetSync(asset: PhotoAsset): HTMLImageElement | null {
  const cached = decodedImages.get(asset.id);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return cached;
  }
  if (typeof Image !== "undefined" && !loadingPromises.has(asset.id)) {
    const src = getAssetDataUrl(asset);
    if (src) {
      const p = new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          decodedImages.set(asset.id, img);
          loadingPromises.delete(asset.id);
          notifyImageDecoded();
          resolve(img);
        };
        img.onerror = () => {
          loadingPromises.delete(asset.id);
          resolve(null);
        };
        img.src = src;
      });
      loadingPromises.set(asset.id, p);
    }
  }
  return null;
}

export async function ensureAssetsDecoded(assets: PhotoAsset[]): Promise<void> {
  if (typeof Image === "undefined") return;
  await Promise.all(
    assets.map((asset) => {
      const existing = decodedImages.get(asset.id);
      if (existing && existing.complete && existing.naturalWidth > 0) {
        return Promise.resolve(existing);
      }
      const pending = loadingPromises.get(asset.id);
      if (pending) return pending;
      getDecodedAssetSync(asset);
      return loadingPromises.get(asset.id) ?? Promise.resolve(null);
    })
  );
}

interface ChannelSpec {
  name: string;
  r: number;
  g: number;
  b: number;
  angle: number;
  dx: number;
  dy: number;
  values: Float32Array;
}

function inkNormalizedRgb(name: string): { r: number; g: number; b: number } {
  const { r, g, b } = hexToRgb(getRisoInk(name).hex);
  return { r: r / 255, g: g / 255, b: b / 255 };
}

export function renderRisoPhotoCanvas(
  asset: PhotoAsset,
  settings: PrintSettings,
  targetInk: string | null = null,
  plateStyle: SeparationPlateStyle | null = null,
  maxDimension = 680
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const sourceImg = getDecodedAssetSync(asset);
  if (!sourceImg) return null;

  const dotBucket = Math.round(settings.dotScale * 20);
  const jitterBucket = Math.round(settings.registrationJitterMM * 20);
  const dimBucket = maxDimension > 1000 ? 1400 : 680;
  const key = [
    asset.id,
    settings.separationMode,
    settings.halftone,
    settings.primaryRisoInk,
    settings.secondaryRisoInk,
    dotBucket,
    jitterBucket,
    targetInk ?? "composite",
    plateStyle ?? "none",
    dimBucket,
  ].join("|");

  const hit = risoCanvasCache.get(key);
  if (hit) return hit;

  const srcW = sourceImg.naturalWidth || asset.pixelWidth || 100;
  const srcH = sourceImg.naturalHeight || asset.pixelHeight || 100;
  const scale = Math.min(1.0, dimBucket / Math.max(srcW, srcH, 1));
  const w = Math.max(16, Math.round(srcW * scale));
  const h = Math.max(16, Math.round(srcH * scale));

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = w;
  srcCanvas.height = h;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) return null;

  srcCtx.imageSmoothingEnabled = true;
  srcCtx.imageSmoothingQuality = "high";
  srcCtx.drawImage(sourceImg, 0, 0, w, h);

  const srcPixels = srcCtx.getImageData(0, 0, w, h).data;
  const jitterPx = Math.round(settings.registrationJitterMM * 2.4);

  let channels: ChannelSpec[] = [];
  if (settings.separationMode === "CMYK") {
    const c1 = inkNormalizedRgb("Blue");
    const c2 = inkNormalizedRgb("Fluorescent Pink");
    const c3 = inkNormalizedRgb("Yellow");
    const c4 = inkNormalizedRgb("Black");
    channels = [
      { name: "Blue", ...c1, angle: 0.26, dx: 0, dy: 0, values: new Float32Array(w * h) },
      {
        name: "Fluorescent Pink",
        ...c2,
        angle: 1.31,
        dx: jitterPx,
        dy: -jitterPx,
        values: new Float32Array(w * h),
      },
      { name: "Yellow", ...c3, angle: 0.0, dx: -jitterPx, dy: 0, values: new Float32Array(w * h) },
      { name: "Black", ...c4, angle: 0.785, dx: 0, dy: jitterPx, values: new Float32Array(w * h) },
    ];
  } else {
    const p1 = inkNormalizedRgb(settings.primaryRisoInk);
    const p2 = inkNormalizedRgb(settings.secondaryRisoInk);
    channels = [
      {
        name: settings.primaryRisoInk,
        ...p1,
        angle: 0.32,
        dx: 0,
        dy: 0,
        values: new Float32Array(w * h),
      },
      {
        name: settings.secondaryRisoInk,
        ...p2,
        angle: 1.18,
        dx: jitterPx,
        dy: jitterPx,
        values: new Float32Array(w * h),
      },
    ];
  }

  const totalPx = w * h;
  for (let i = 0; i < totalPx; i++) {
    const p = i * 4;
    const a = srcPixels[p + 3] / 255.0;
    if (a < 0.01) continue;
    const r = srcPixels[p] / 255.0;
    const g = srcPixels[p + 1] / 255.0;
    const b = srcPixels[p + 2] / 255.0;

    if (settings.separationMode === "CMYK") {
      const k = Math.min(1.0 - r, Math.min(1.0 - g, 1.0 - b));
      const denom = Math.max(0.001, 1.0 - k);
      const c = Math.max(0, (1.0 - r - k) / denom) * 0.88;
      const m = Math.max(0, (1.0 - g - k) / denom) * 0.88;
      const y = Math.max(0, (1.0 - b - k) / denom) * 0.88;
      channels[0].values[i] = c * a;
      channels[1].values[i] = m * a;
      channels[2].values[i] = y * a;
      channels[3].values[i] = Math.pow(k, 1.2) * 0.92 * a;
    } else if (settings.separationMode === "Lum") {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const warmth = Math.max(0, (r - b) * 0.65 + (1.0 - lum) * 0.42);
      channels[0].values[i] = Math.min(1.0, Math.pow(Math.max(0, 1.0 - lum), 1.05) * 0.96) * a;
      channels[1].values[i] = Math.min(1.0, warmth * 0.85) * a;
    } else {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      channels[0].values[i] = Math.min(1.0, Math.pow(lum, 1.1) * 0.94) * a;
      channels[1].values[i] = Math.min(1.0, Math.max(0, (b - r) * 0.5 + lum * 0.35)) * a;
    }
  }

  let effectiveHalftone: HalftoneStyle = settings.halftone;
  if (plateStyle) {
    effectiveHalftone =
      plateStyle === "Grayscale"
        ? "Off"
        : settings.halftone === "Off"
        ? "Halftone"
        : settings.halftone;
  }

  const cellPeriod = Math.max(3.2, 5.6 * settings.dotScale);
  for (let cIdx = 0; cIdx < channels.length; cIdx++) {
    const ch = channels[cIdx];
    if (targetInk && ch.name !== targetInk) continue;

    if (effectiveHalftone === "Halftone") {
      const cosA = Math.cos(ch.angle);
      const sinA = Math.sin(ch.angle);
      const out = new Float32Array(ch.values);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const d = out[i];
          if (d <= 0.01) {
            out[i] = 0;
            continue;
          }
          const rx = (x * cosA - y * sinA) / cellPeriod;
          const ry = (x * sinA + y * cosA) / cellPeriod;
          const fx = rx - Math.floor(rx) - 0.5;
          const fy = ry - Math.floor(ry) - 0.5;
          const distSq = (fx * fx + fy * fy) * 2.0;
          const threshold = d * 1.08;
          const edge = 0.14;
          if (distSq < threshold - edge) {
            out[i] = Math.min(1.0, 0.82 + d * 0.18);
          } else if (distSq < threshold + edge) {
            const t = 1.0 - (distSq - (threshold - edge)) / (2.0 * edge);
            out[i] = Math.max(0, Math.min(1, t));
          } else {
            out[i] = 0;
          }
        }
      }
      ch.values = out;
    } else if (effectiveHalftone === "Error diffusion") {
      const buf = new Float32Array(ch.values);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const oldVal = buf[i];
          const newVal = oldVal >= 0.48 ? 0.92 : 0.0;
          buf[i] = newVal;
          const err = oldVal - newVal;
          if (x + 1 < w) buf[i + 1] += err * (7 / 16);
          if (y + 1 < h) {
            if (x > 0) buf[(y + 1) * w + (x - 1)] += err * (3 / 16);
            buf[(y + 1) * w + x] += err * (5 / 16);
            if (x + 1 < w) buf[(y + 1) * w + (x + 1)] += err * (1 / 16);
          }
        }
      }
      ch.values = buf;
    }
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) return null;

  const outImgData = outCtx.createImageData(w, h);
  const dst = outImgData.data;

  if (targetInk) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let density = 0;
        for (const ch of channels) {
          if (ch.name !== targetInk) continue;
          const sx = Math.min(w - 1, Math.max(0, x - ch.dx));
          const sy = Math.min(h - 1, Math.max(0, y - ch.dy));
          density = Math.max(density, ch.values[sy * w + sx]);
        }
        const p = i * 4;
        dst[p] = 0;
        dst[p + 1] = 0;
        dst[p + 2] = 0;
        dst[p + 3] = Math.min(255, Math.max(0, Math.round(density * 255)));
      }
    }
  } else {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const srcAlpha = srcPixels[i * 4 + 3] / 255.0;
        if (srcAlpha < 0.01) continue;

        let outR = 1.0;
        let outG = 1.0;
        let outB = 1.0;
        let maxInk = 0.0;

        for (const ch of channels) {
          const sx = Math.min(w - 1, Math.max(0, x - ch.dx));
          const sy = Math.min(h - 1, Math.max(0, y - ch.dy));
          const d = Math.min(1.0, Math.max(0.0, ch.values[sy * w + sx]));
          if (d > 0.002) {
            if (d > maxInk) maxInk = d;
            outR *= 1.0 - d * (1.0 - ch.r);
            outG *= 1.0 - d * (1.0 - ch.g);
            outB *= 1.0 - d * (1.0 - ch.b);
          }
        }

        const inkPresence = Math.min(1.0, maxInk * 1.15) * srcAlpha;
        if (inkPresence > 0.005) {
          const p = i * 4;
          // Standard straight RGBA for HTML5 Canvas ImageData!
          dst[p] = Math.min(255, Math.max(0, Math.round(outR * 255)));
          dst[p + 1] = Math.min(255, Math.max(0, Math.round(outG * 255)));
          dst[p + 2] = Math.min(255, Math.max(0, Math.round(outB * 255)));
          dst[p + 3] = Math.min(255, Math.max(0, Math.round(inkPresence * 255)));
        }
      }
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  if (risoCanvasCache.size > 96) {
    const firstKey = risoCanvasCache.keys().next().value;
    if (firstKey) risoCanvasCache.delete(firstKey);
  }
  risoCanvasCache.set(key, outCanvas);
  return outCanvas;
}
