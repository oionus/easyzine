import { getPaperStockMeta, PaperStock } from "@/types/zine";

const textureCache = new Map<PaperStock, HTMLCanvasElement>();
const dataUrlCache = new Map<PaperStock, string>();

function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 123456789;
}

export function getPaperTextureCanvas(stock: PaperStock): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const cached = textureCache.get(stock);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const imgData = ctx.createImageData(size, size);
  const pixels = imgData.data;

  let seed = hashString(stock);
  const nextRand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967295;
  };

  const amp = getPaperStockMeta(stock).grainIntensity;
  const alphaByte = Math.min(95, Math.max(12, Math.round(amp * 340)));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n1 = nextRand() - 0.5;
      let delta = n1 * amp * 255.0;

      if (stock === "Linen") {
        const wx = Math.sin(x * 1.15) * 9.0;
        const wy = Math.sin(y * 1.15) * 9.0;
        delta += (wx + wy) * 0.75;
      } else if (stock === "Cotton" || stock === "Art") {
        const cloud = Math.sin(x * 0.14 + n1) * Math.cos(y * 0.14 - n1) * 14.0;
        delta += cloud;
      } else if (stock === "Kraft" || stock === "Board") {
        const streak = Math.sin(y * 0.45 + x * 0.05) * 8.0;
        delta += streak;
        if (nextRand() > 0.986) delta -= 42.0;
      } else if (stock === "Recycled" || stock === "Newsprint") {
        if (nextRand() > 0.982) delta -= 36.0;
        else if (nextRand() > 0.991) delta += 24.0;
      } else if (stock === "Gloss") {
        const sheen = Math.sin((x + y) * 0.035) * 6.0;
        delta += sheen;
      }

      const shade = Math.min(255, Math.max(185, 248.0 + delta));
      pixels[idx] = Math.round(shade);
      pixels[idx + 1] = Math.round(Math.max(180, shade - (stock === "Kraft" ? 5 : 1)));
      pixels[idx + 2] = Math.round(Math.max(175, shade - (stock === "Kraft" ? 11 : 2)));
      pixels[idx + 3] = alphaByte;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  textureCache.set(stock, canvas);
  return canvas;
}

export function getPaperTextureDataUrl(stock: PaperStock): string {
  const hit = dataUrlCache.get(stock);
  if (hit) return hit;
  const c = getPaperTextureCanvas(stock);
  if (!c) return "";
  const url = c.toDataURL("image/png");
  dataUrlCache.set(stock, url);
  return url;
}
