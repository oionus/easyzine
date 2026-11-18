export type StudioStage = "shelf" | "upload" | "format" | "design" | "export";

export const STUDIO_STAGES: {
  id: StudioStage;
  stepNumber: string;
  title: string;
  subtitle: string;
}[] = [
  { id: "shelf", stepNumber: "00", title: "书架", subtitle: "Journals" },
  { id: "upload", stepNumber: "01", title: "素材", subtitle: "Library" },
  { id: "format", stepNumber: "02", title: "开本", subtitle: "Format" },
  { id: "design", stepNumber: "03", title: "创作", subtitle: "Atelier" },
  { id: "export", stepNumber: "04", title: "印前", subtitle: "Press" },
];

export type BindingType =
  | "saddle"
  | "stab"
  | "perfect"
  | "thread"
  | "sewing"
  | "japanese"
  | "ring"
  | "miniFold8";

export interface BindingMeta {
  id: BindingType;
  nameCN: string;
  nameEN: string;
  badgeText: string;
  summary: string;
  pageStep: number;
  minPages: number;
  maxPages: number;
  presetPageCounts: number[];
}

export const BINDING_CATALOG: BindingMeta[] = [
  {
    id: "saddle",
    nameCN: "骑马订",
    nameEN: "Saddle Stitch",
    badgeText: "书钉 · 8–200P",
    summary: "对折嵌套后在书脊订书针装订，最经典的独立 Zine 装帧",
    pageStep: 4,
    minPages: 8,
    maxPages: 200,
    presetPageCounts: [8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48],
  },
  {
    id: "stab",
    nameCN: "平订侧钉",
    nameEN: "Stab Binding",
    badgeText: "侧钉 · 8–40P",
    summary: "单页双面叠合后在书口内侧打钉，硬朗利落的手工感",
    pageStep: 2,
    minPages: 8,
    maxPages: 40,
    presetPageCounts: [8, 12, 16, 20, 24, 32, 40],
  },
  {
    id: "perfect",
    nameCN: "无线胶装",
    nameEN: "Perfect Glue",
    badgeText: "胶装 · 16–200P",
    summary: "书脊铣背刷胶包封套，适合页数较多的摄影集与画册",
    pageStep: 2,
    minPages: 16,
    maxPages: 200,
    presetPageCounts: [16, 24, 32, 48, 64, 80, 100, 128, 150, 200],
  },
  {
    id: "thread",
    nameCN: "锁线胶装",
    nameEN: "Thread Sewn",
    badgeText: "锁线 · 32–300P",
    summary: "多折手锁线后再胶装成册，可 180° 完全平摊阅读",
    pageStep: 2,
    minPages: 32,
    maxPages: 300,
    presetPageCounts: [32, 48, 64, 80, 100, 128, 150, 200, 250, 300],
  },
  {
    id: "sewing",
    nameCN: "中缝线装",
    nameEN: "Pamphlet Sewing",
    badgeText: "线缝 · 8–200P",
    summary: "单折手沿中缝穿线手缝，温润细腻的艺术书质感",
    pageStep: 4,
    minPages: 8,
    maxPages: 200,
    presetPageCounts: [8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48],
  },
  {
    id: "japanese",
    nameCN: "日式四目缀",
    nameEN: "Japanese 4-Hole",
    badgeText: "古线装 · 12–48P",
    summary: "外露四孔麻线穿缀书脊，极具东方手作温度",
    pageStep: 2,
    minPages: 12,
    maxPages: 48,
    presetPageCounts: [12, 16, 20, 24, 32, 40, 48],
  },
  {
    id: "ring",
    nameCN: "双线圈装",
    nameEN: "Twin Ring",
    badgeText: "金属圈 · 8–200P",
    summary: "书脊打孔穿金属双线圈，可 360° 翻折平铺",
    pageStep: 2,
    minPages: 8,
    maxPages: 200,
    presetPageCounts: [8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 100, 128, 150, 200],
  },
  {
    id: "miniFold8",
    nameCN: "一纸八页折页",
    nameEN: "1-Sheet 8P Zine",
    badgeText: "免钉裁折 · 8P",
    summary: "单张纸正中剪开一刀即可折叠成 8 页口袋小志",
    pageStep: 8,
    minPages: 8,
    maxPages: 8,
    presetPageCounts: [8],
  },
];

export function getBindingMeta(binding: BindingType): BindingMeta {
  return BINDING_CATALOG.find((b) => b.id === binding) ?? BINDING_CATALOG[0];
}

export function normalizePageCount(binding: BindingType, requested: number): number {
  if (binding === "miniFold8") return 8;
  const meta = getBindingMeta(binding);
  const clamped = Math.min(Math.max(Math.round(requested || meta.minPages), meta.minPages), meta.maxPages);
  const step = meta.pageStep;
  const rem = clamped % step;
  if (rem === 0) return clamped;
  const roundedUp = clamped + (step - rem);
  return roundedUp <= meta.maxPages ? roundedUp : clamped - rem;
}

export type PageSizePreset = "A4" | "B5" | "A5" | "A6" | "Square" | "Custom";

export const PAGE_SIZE_PRESETS: {
  id: PageSizePreset;
  label: string;
  widthMM: number;
  heightMM: number;
}[] = [
  { id: "A4", label: "A4", widthMM: 210, heightMM: 297 },
  { id: "B5", label: "B5", widthMM: 182, heightMM: 257 },
  { id: "A5", label: "A5", widthMM: 148, heightMM: 210 },
  { id: "A6", label: "A6 口袋本", widthMM: 105, heightMM: 148 },
  { id: "Square", label: "Square 方本", widthMM: 210, heightMM: 210 },
  { id: "Custom", label: "Custom 自定义", widthMM: 148, heightMM: 210 },
];

export type PageOrientation = "portrait" | "landscape";

export type PaperStock =
  | "Matte"
  | "Gloss"
  | "Fine"
  | "Coated"
  | "Kraft"
  | "Newsprint"
  | "Recycled"
  | "Art"
  | "Tracing"
  | "Cotton"
  | "Linen"
  | "Board";

export interface PaperStockMeta {
  id: PaperStock;
  nameCN: string;
  note: string;
  grainIntensity: number;
  caliperMM: number;
}

export const PAPER_STOCK_CATALOG: PaperStockMeta[] = [
  { id: "Matte", nameCN: "哑粉纸", note: "柔和低反光", grainIntensity: 0.04, caliperMM: 0.11 },
  { id: "Gloss", nameCN: "亮光铜版", note: "色彩浓郁光泽", grainIntensity: 0.015, caliperMM: 0.11 },
  { id: "Fine", nameCN: "纯质道林", note: "细腻温润触感", grainIntensity: 0.05, caliperMM: 0.13 },
  { id: "Coated", nameCN: "微涂布纸", note: "均衡印刷表现", grainIntensity: 0.025, caliperMM: 0.11 },
  { id: "Kraft", nameCN: "本色牛皮", note: "粗犷木浆长纤维", grainIntensity: 0.17, caliperMM: 0.16 },
  { id: "Newsprint", nameCN: "新闻报刊纸", note: "复古颗粒吸墨", grainIntensity: 0.14, caliperMM: 0.08 },
  { id: "Recycled", nameCN: "环保再生纸", note: "自然杂色纸屑", grainIntensity: 0.13, caliperMM: 0.13 },
  { id: "Art", nameCN: "艺术微喷纸", note: "博物馆级层次", grainIntensity: 0.065, caliperMM: 0.16 },
  { id: "Tracing", nameCN: "硫酸描图纸", note: "半透明隐约透页", grainIntensity: 0.045, caliperMM: 0.07 },
  { id: "Cotton", nameCN: "纯棉版画纸", note: "冷压凹凸肌理", grainIntensity: 0.12, caliperMM: 0.22 },
  { id: "Linen", nameCN: "亚麻布纹纸", note: "经纬编织压纹", grainIntensity: 0.11, caliperMM: 0.16 },
  { id: "Board", nameCN: "厚灰板卡纸", note: "挺括厚实纤维", grainIntensity: 0.19, caliperMM: 0.35 },
];

export function getPaperStockMeta(stock: PaperStock): PaperStockMeta {
  return PAPER_STOCK_CATALOG.find((s) => s.id === stock) ?? PAPER_STOCK_CATALOG[9];
}

export interface PaperColorOption {
  name: string;
  nameCN: string;
  hex: string;
}

export const PAPER_COLOR_CATALOG: PaperColorOption[] = [
  { name: "White", nameCN: "雪白", hex: "#FAF9F6" },
  { name: "Ivory", nameCN: "象牙", hex: "#F6F1E3" },
  { name: "Cream", nameCN: "奶油", hex: "#F2E8CF" },
  { name: "Lemon", nameCN: "柠檬", hex: "#FBF0A6" },
  { name: "Sun Yellow", nameCN: "日光黄", hex: "#F8D66D" },
  { name: "Pumpkin", nameCN: "南瓜橙", hex: "#F2A65A" },
  { name: "Coral", nameCN: "珊瑚粉", hex: "#F29C8B" },
  { name: "Cherry", nameCN: "樱桃红", hex: "#DE6461" },
  { name: "Pink", nameCN: "樱花粉", hex: "#F4C6D7" },
  { name: "Magenta", nameCN: "洋红", hex: "#D96BA0" },
  { name: "Plum", nameCN: "梅子紫", hex: "#9E6B8E" },
  { name: "Lavender", nameCN: "薰衣草", hex: "#D8CEF0" },
  { name: "Purple", nameCN: "紫罗兰", hex: "#9C89C9" },
  { name: "Indigo", nameCN: "靛青", hex: "#5C6B9C" },
  { name: "Navy", nameCN: "藏青", hex: "#2F3E5C" },
  { name: "Sky", nameCN: "晴空蓝", hex: "#BBD9EE" },
  { name: "Cobalt", nameCN: "钴蓝", hex: "#5B88C9" },
  { name: "Teal", nameCN: "松石绿", hex: "#68A6A8" },
  { name: "Mint", nameCN: "薄荷绿", hex: "#CBE8D8" },
  { name: "Sage", nameCN: "鼠尾草", hex: "#C2CCB8" },
  { name: "Olive", nameCN: "橄榄绿", hex: "#9BA376" },
  { name: "Stone", nameCN: "暖石灰", hex: "#D8D3C8" },
  { name: "Slate", nameCN: "板岩灰", hex: "#7E848C" },
  { name: "Black", nameCN: "墨黑卡", hex: "#1E1E1D" },
];

export function getPaperColorOption(name: string): PaperColorOption {
  return PAPER_COLOR_CATALOG.find((c) => c.name === name) ?? PAPER_COLOR_CATALOG[1];
}

export type PrintMode = "Offset" | "On-demand" | "Risograph";
export type HalftoneStyle = "Off" | "Halftone" | "Error diffusion";
export type RisoSeparationMode = "Lum" | "CMYK" | "Nega";
export type RisoInkCategory = "标准油墨 · 12" | "扩展专色 · 32" | "荧光油墨 · 4";

export interface RisoInk {
  name: string;
  nameCN: string;
  hex: string;
  category: RisoInkCategory;
}

export const RISO_INK_CATEGORIES: RisoInkCategory[] = [
  "标准油墨 · 12",
  "扩展专色 · 32",
  "荧光油墨 · 4",
];

export const RISO_INK_CATALOG: RisoInk[] = [
  // 12 Standard
  { name: "Black", nameCN: "理想黑", hex: "#141414", category: "标准油墨 · 12" },
  { name: "Burgundy", nameCN: "勃艮第酒红", hex: "#914E72", category: "标准油墨 · 12" },
  { name: "Pink", nameCN: "玫瑰粉", hex: "#FF48B0", category: "标准油墨 · 12" },
  { name: "Red", nameCN: "理想正红", hex: "#FF665E", category: "标准油墨 · 12" },
  { name: "Orange", nameCN: "鲜柑橙", hex: "#FF6C2F", category: "标准油墨 · 12" },
  { name: "Yellow", nameCN: "明黄", hex: "#FFE800", category: "标准油墨 · 12" },
  { name: "Green", nameCN: "松林绿", hex: "#00A95C", category: "标准油墨 · 12" },
  { name: "Teal", nameCN: "孔雀青", hex: "#00838A", category: "标准油墨 · 12" },
  { name: "Light Blue", nameCN: "浅天蓝", hex: "#4982CF", category: "标准油墨 · 12" },
  { name: "Blue", nameCN: "理想中蓝", hex: "#0078BF", category: "标准油墨 · 12" },
  { name: "Purple", nameCN: "电光紫", hex: "#765BA7", category: "标准油墨 · 12" },
  { name: "Gray", nameCN: "铅灰", hex: "#88898A", category: "标准油墨 · 12" },

  // 32 Extended
  { name: "Maroon", nameCN: "栗红", hex: "#9E4747", category: "扩展专色 · 32" },
  { name: "Crimson", nameCN: "绯红", hex: "#E43D40", category: "扩展专色 · 32" },
  { name: "Coral", nameCN: "珊瑚橘", hex: "#FF8E91", category: "扩展专色 · 32" },
  { name: "Apricot", nameCN: "杏子色", hex: "#F6A04D", category: "扩展专色 · 32" },
  { name: "Paprika", nameCN: "红椒橙", hex: "#EE5A36", category: "扩展专色 · 32" },
  { name: "Pumpkin", nameCN: "南瓜黄", hex: "#FF7F3F", category: "扩展专色 · 32" },
  { name: "Sunflower", nameCN: "向日葵", hex: "#FFB511", category: "扩展专色 · 32" },
  { name: "Gold", nameCN: "金属金", hex: "#AC936E", category: "扩展专色 · 32" },
  { name: "Olive", nameCN: "暗橄榄", hex: "#82804F", category: "扩展专色 · 32" },
  { name: "Moss", nameCN: "苔藓绿", hex: "#68724D", category: "扩展专色 · 32" },
  { name: "Forest", nameCN: "深林绿", hex: "#3D6E57", category: "扩展专色 · 32" },
  { name: "Kelly Green", nameCN: "凯莉绿", hex: "#67B346", category: "扩展专色 · 32" },
  { name: "Emerald", nameCN: "祖母绿", hex: "#19975D", category: "扩展专色 · 32" },
  { name: "Mint", nameCN: "薄荷青", hex: "#82D8D5", category: "扩展专色 · 32" },
  { name: "Lagoon", nameCN: "泻湖蓝", hex: "#2F6165", category: "扩展专色 · 32" },
  { name: "Aqua", nameCN: "水碧蓝", hex: "#5EC8E5", category: "扩展专色 · 32" },
  { name: "Cyan", nameCN: "印前青", hex: "#00A4E4", category: "扩展专色 · 32" },
  { name: "Sky", nameCN: "晴空色", hex: "#62A8E5", category: "扩展专色 · 32" },
  { name: "Cornflower", nameCN: "矢车菊蓝", hex: "#62A8E5", category: "扩展专色 · 32" },
  { name: "Cobalt", nameCN: "钴蓝", hex: "#2E54A8", category: "扩展专色 · 32" },
  { name: "Indigo", nameCN: "蓝染靛", hex: "#2B3570", category: "扩展专色 · 32" },
  { name: "Midnight", nameCN: "午夜蓝", hex: "#1D243B", category: "扩展专色 · 32" },
  { name: "Violet", nameCN: "紫罗兰", hex: "#9D7AD2", category: "扩展专色 · 32" },
  { name: "Plum", nameCN: "深李紫", hex: "#845991", category: "扩展专色 · 32" },
  { name: "Orchid", nameCN: "兰花紫", hex: "#BB76CF", category: "扩展专色 · 32" },
  { name: "Wine", nameCN: "陈酿红", hex: "#914E72", category: "扩展专色 · 32" },
  { name: "Rose", nameCN: "野蔷薇", hex: "#E66B8A", category: "扩展专色 · 32" },
  { name: "Salmon", nameCN: "鲑鱼粉", hex: "#FF9B85", category: "扩展专色 · 32" },
  { name: "Brown", nameCN: "烘焙棕", hex: "#925F52", category: "扩展专色 · 32" },
  { name: "Terracotta", nameCN: "赤陶土", hex: "#BD6439", category: "扩展专色 · 32" },
  { name: "Warm Gray", nameCN: "暖云灰", hex: "#9E978E", category: "扩展专色 · 32" },
  { name: "Slate", nameCN: "石板青灰", hex: "#5E6973", category: "扩展专色 · 32" },

  // 4 Fluorescent
  { name: "Fluorescent Pink", nameCN: "荧光粉", hex: "#FF48B0", category: "荧光油墨 · 4" },
  { name: "Fluorescent Yellow", nameCN: "荧光黄", hex: "#FFE91F", category: "荧光油墨 · 4" },
  { name: "Fluorescent Orange", nameCN: "荧光橙", hex: "#FF7477", category: "荧光油墨 · 4" },
  { name: "Fluorescent Green", nameCN: "荧光绿", hex: "#44D62C", category: "荧光油墨 · 4" },
];

export function getRisoInk(name: string): RisoInk {
  return RISO_INK_CATALOG.find((i) => i.name === name) ?? RISO_INK_CATALOG[9];
}

export interface ZineFormatSpec {
  binding: BindingType;
  pageCount: number;
  sizePreset: PageSizePreset;
  customWidthMM: number;
  customHeightMM: number;
  orientation: PageOrientation;
  paperStock: PaperStock;
  paperColorName: string;
  backgroundIndependentPhotos: boolean;
}

export function getPageSizeMM(format: ZineFormatSpec): { width: number; height: number } {
  if (format.sizePreset === "Custom") {
    return {
      width: Math.min(Math.max(format.customWidthMM || 148, 50), 420),
      height: Math.min(Math.max(format.customHeightMM || 210, 50), 594),
    };
  }
  const preset = PAGE_SIZE_PRESETS.find((p) => p.id === format.sizePreset) ?? PAGE_SIZE_PRESETS[2];
  if (format.sizePreset === "Square" || format.orientation === "portrait") {
    return { width: preset.widthMM, height: preset.heightMM };
  }
  return { width: preset.heightMM, height: preset.widthMM };
}

export function getFormatAspectRatio(format: ZineFormatSpec): number {
  const s = getPageSizeMM(format);
  return s.width / Math.max(s.height, 1);
}

export function getSpineThicknessMM(format: ZineFormatSpec): number {
  const leaves = Math.max(1, Math.floor(format.pageCount / 2));
  const caliper = getPaperStockMeta(format.paperStock).caliperMM;
  return Math.max(0.8, leaves * caliper);
}

export interface PrintSettings {
  mode: PrintMode;
  solidFillHex: string | null;
  solidFillRisoInk: string | null;
  solidFillDensity: number;
  halftone: HalftoneStyle;
  separationMode: RisoSeparationMode;
  primaryRisoInk: string;
  secondaryRisoInk: string;
  dotScale: number;
  registrationJitterMM: number;
}

export interface BleedGuideSettings {
  bleed3mm: boolean;
  trimLine: boolean;
  cropMarks: boolean;
  centerMarks: boolean;
  centerLineV: boolean;
  centerLineH: boolean;
  rulerMM: boolean;
  includeInPDF: boolean;
  lineColorHex: string;
}

export const GUIDE_COLOR_PRESETS = ["#FF3B30", "#00C2FF", "#1FBF4B", "#111111", "#FF00FF"];

export type PageNumberPosition = "Bottom center" | "Bottom outer" | "Top center" | "Top outer";

export const PAGE_NUMBER_POSITIONS: { id: PageNumberPosition; label: string }[] = [
  { id: "Bottom center", label: "底部居中" },
  { id: "Bottom outer", label: "底部外侧" },
  { id: "Top center", label: "顶部居中" },
  { id: "Top outer", label: "顶部外侧" },
];

export interface PageNumberSettings {
  enabled: boolean;
  skipCovers: boolean;
  position: PageNumberPosition;
  offsetXMM: number;
  offsetYMM: number;
  fontName: string;
  fontSizePt: number;
  startAt: number;
  colorHex: string;
}

export type ExportLayoutMode =
  | "Single page"
  | "Spread"
  | "Binding sheets"
  | "4-up"
  | "8-up"
  | "All pages · 1 sheet";

export const EXPORT_LAYOUT_MODES: { id: ExportLayoutMode; label: string }[] = [
  { id: "Single page", label: "单页逐页 Single" },
  { id: "Spread", label: "阅读跨页 Spread" },
  { id: "Binding sheets", label: "装订折手印张 Imposition" },
  { id: "4-up", label: "四合一拼版 4-up" },
  { id: "8-up", label: "八合一拼版 8-up" },
  { id: "All pages · 1 sheet", label: "全书总览海报 1-Sheet" },
];

export type SheetBackgroundStyle =
  | "None"
  | "Warm Linen"
  | "Black"
  | "Gray"
  | "White + grid"
  | "Green + grid";

export const SHEET_BACKGROUNDS: { id: SheetBackgroundStyle; label: string }[] = [
  { id: "None", label: "纯透明/满版" },
  { id: "Warm Linen", label: "亚麻画案" },
  { id: "Black", label: "暗房深黑" },
  { id: "Gray", label: "中性展灰" },
  { id: "White + grid", label: "白底裁切格" },
  { id: "Green + grid", label: "绿底切割垫" },
];

export type PortraitFrameRatio = "Off" | "4:5" | "3:4" | "9:16" | "1:1";

export const PORTRAIT_FRAME_RATIOS: PortraitFrameRatio[] = ["Off", "4:5", "3:4", "9:16", "1:1"];

export function getPortraitFrameAspect(ratio: PortraitFrameRatio): number | null {
  switch (ratio) {
    case "Off":
      return null;
    case "4:5":
      return 4 / 5;
    case "3:4":
      return 3 / 4;
    case "9:16":
      return 9 / 16;
    case "1:1":
      return 1;
  }
}

export type SeparationPlateStyle = "Grayscale" | "Halftoned";
export type SeparationFileFormat = "PDF" | "PNG";

export interface ExportSettings {
  layout: ExportLayoutMode;
  sheetBackground: SheetBackgroundStyle;
  portraitFrame: PortraitFrameRatio;
  separationUnitSpread: boolean;
  separationPlateStyle: SeparationPlateStyle;
  separationFormat: SeparationFileFormat;
  separationCropMarks: boolean;
}

export type DesignViewMode = "Single" | "Spread" | "All" | "3D";

export const DESIGN_VIEW_MODES: { id: DesignViewMode; label: string; shortLabel: string }[] = [
  { id: "Single", label: "单页", shortLabel: "单页" },
  { id: "Spread", label: "跨页", shortLabel: "跨页" },
  { id: "All", label: "台本总览", shortLabel: "台本" },
  { id: "3D", label: "3D 翻阅", shortLabel: "3D" },
];

export type ShapeKind =
  | "Line"
  | "Rectangle"
  | "Ellipse"
  | "Triangle"
  | "Arrow"
  | "Speech bubble"
  | "Star"
  | "Hexagon"
  | "Freeform";

export const SHAPE_CATALOG: { id: ShapeKind; label: string }[] = [
  { id: "Line", label: "直线" },
  { id: "Rectangle", label: "矩形" },
  { id: "Ellipse", label: "椭圆" },
  { id: "Triangle", label: "三角" },
  { id: "Arrow", label: "箭头" },
  { id: "Speech bubble", label: "对话泡" },
  { id: "Star", label: "星形" },
  { id: "Hexagon", label: "六边形" },
  { id: "Freeform", label: "自由折点" },
];

export type BrushKind =
  | "Pen"
  | "Marker"
  | "Brush"
  | "Pencil"
  | "Crayon"
  | "Oil pastel"
  | "Spray"
  | "Eraser";

export const BRUSH_CATALOG: { id: BrushKind; label: string; defaultWidth: number }[] = [
  { id: "Pen", label: "钢笔", defaultWidth: 2.4 },
  { id: "Marker", label: "马克笔", defaultWidth: 14.0 },
  { id: "Brush", label: "秀丽毛笔", defaultWidth: 7.5 },
  { id: "Pencil", label: "石墨铅笔", defaultWidth: 3.2 },
  { id: "Crayon", label: "粗纹蜡笔", defaultWidth: 9.5 },
  { id: "Oil pastel", label: "油画棒", defaultWidth: 13.0 },
  { id: "Spray", label: "颗粒喷漆", defaultWidth: 22.0 },
  { id: "Eraser", label: "软橡皮", defaultWidth: 18.0 },
];

export type StudioTool =
  | { type: "pointer" }
  | { type: "text" }
  | { type: "shape"; shape: ShapeKind }
  | { type: "brush"; brush: BrushKind };

export type OverlapMode = "On top" | "Mix (overprint)";
export type TextAlignmentOption = "left" | "center" | "right";
export type FontWeightOption = "Thin" | "Reg" | "Med" | "Bold";
export type ElementKind = "photo" | "text" | "shape" | "stroke";

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface PhotoAsset {
  id: string;
  filename: string;
  /** Base64 image data or full data URL; compatible with macOS Paperfold JSON */
  imageData: string;
  mimeType?: string;
  pixelWidth: number;
  pixelHeight: number;
  createdAt: string | number;
}

export function getAssetDataUrl(asset: PhotoAsset): string {
  if (!asset.imageData) return "";
  if (asset.imageData.startsWith("data:")) return asset.imageData;
  const mime = asset.mimeType || (asset.filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
  return `data:${mime};base64,${asset.imageData}`;
}

export interface CanvasElement {
  id: string;
  kind: ElementKind;
  name: string;

  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
  opacity: number;
  overlap: OverlapMode;

  useRisoInk: boolean;
  risoInkName: string;
  inkDensity: number;
  fillHex: string | null;
  strokeHex: string | null;
  strokeWidthPt: number;
  cornerRadiusPt: number;

  assetID: string | null;
  cropZoom: number;
  cropOffsetX: number;
  cropOffsetY: number;
  spansSpread: boolean;

  text: string;
  fontFamily: string;
  fontSizePt: number;
  fontWeight: FontWeightOption;
  isItalic: boolean;
  textAlignment: TextAlignmentOption;
  textOutline: boolean;
  lineHeightMultiple: number;
  trackingPx: number;
  kerningEnabled: boolean;
  tightCJK: boolean;

  shapeKind: ShapeKind;
  polygonPoints: NormalizedPoint[];

  brushKind: BrushKind;
  strokePoints: NormalizedPoint[];
  brushWidthPt: number;
}

export interface ZinePage {
  id: string;
  pageBackgroundHex: string | null;
  pageRisoInkName: string | null;
  pageInkDensity: number;
  elements: CanvasElement[];
}

export interface ZineProject {
  id: string;
  title: string;
  author: string;
  summary: string;
  updatedAt: string | number;
  coverAccentHex: string;

  format: ZineFormatSpec;
  printSettings: PrintSettings;
  bleedGuides: BleedGuideSettings;
  pageNumbers: PageNumberSettings;
  exportSettings: ExportSettings;

  assets: PhotoAsset[];
  pages: ZinePage[];
}

export interface FontEntry {
  displayName: string;
  family: string;
  cssStack: string;
  category: string;
}

export const EDITORIAL_FONTS: FontEntry[] = [
  {
    displayName: "Baskerville · 经典衬线",
    family: "Baskerville",
    cssStack: 'Baskerville, "Libre Baskerville", Georgia, "Songti SC", "Noto Serif SC", serif',
    category: "Serif",
  },
  {
    displayName: "Didot · 时尚高对比",
    family: "Didot",
    cssStack: 'Didot, "Bodoni MT", "Playfair Display", Georgia, serif',
    category: "Serif",
  },
  {
    displayName: "Bodoni 72 · 现代雕版",
    family: "Bodoni 72",
    cssStack: '"Bodoni 72", "Bodoni MT", Didot, Georgia, serif',
    category: "Serif",
  },
  {
    displayName: "Palatino · 人文书体",
    family: "Palatino",
    cssStack: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
    category: "Serif",
  },
  {
    displayName: "Georgia · 杂志正文",
    family: "Georgia",
    cssStack: 'Georgia, "Times New Roman", "Songti SC", serif',
    category: "Serif",
  },
  {
    displayName: "Times New Roman · 报刊体",
    family: "Times New Roman",
    cssStack: '"Times New Roman", Times, serif',
    category: "Serif",
  },
  {
    displayName: "Cochin · 法式古典",
    family: "Cochin",
    cssStack: 'Cochin, Baskerville, Georgia, serif',
    category: "Serif",
  },
  {
    displayName: "American Typewriter · 打字机",
    family: "American Typewriter",
    cssStack: '"American Typewriter", "Courier Prime", "Courier New", monospace',
    category: "Slab",
  },
  {
    displayName: "Futura · 几何现代",
    family: "Futura",
    cssStack: 'Futura, "Avenir Next", Montserrat, system-ui, sans-serif',
    category: "Sans",
  },
  {
    displayName: "Avenir Next · 清朗无衬线",
    family: "Avenir Next",
    cssStack: '"Avenir Next", Avenir, "Helvetica Neue", system-ui, sans-serif',
    category: "Sans",
  },
  {
    displayName: "Helvetica Neue · 瑞士国际",
    family: "Helvetica Neue",
    cssStack: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
    category: "Sans",
  },
  {
    displayName: "Gill Sans · 英伦人文",
    family: "Gill Sans",
    cssStack: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif',
    category: "Sans",
  },
  {
    displayName: "Optima · 优雅碑刻",
    family: "Optima",
    cssStack: 'Optima, Candara, "Noto Sans", sans-serif',
    category: "Sans",
  },
  {
    displayName: "Menlo · 等宽代码",
    family: "Menlo",
    cssStack: 'Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    category: "Mono",
  },
  {
    displayName: "Courier New · 复古电报",
    family: "Courier New",
    cssStack: '"Courier New", Courier, monospace',
    category: "Mono",
  },
  {
    displayName: "Songti SC · 思源/华文宋体",
    family: "Songti SC",
    cssStack: '"Songti SC", "STSong", "Noto Serif SC", "SimSun", Georgia, serif',
    category: "CJK",
  },
  {
    displayName: "PingFang SC · 苹方黑体",
    family: "PingFang SC",
    cssStack: '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif',
    category: "CJK",
  },
  {
    displayName: "Kaiti SC · 书卷楷体",
    family: "Kaiti SC",
    cssStack: '"Kaiti SC", "STKaiti", "KaiTi", "Noto Serif SC", serif',
    category: "CJK",
  },
  {
    displayName: "Heiti SC · 现代黑体",
    family: "Heiti SC",
    cssStack: '"Heiti SC", "STHeiti", "PingFang SC", "Microsoft YaHei", sans-serif',
    category: "CJK",
  },
  {
    displayName: "Hiragino Mincho ProN · 日系明朝",
    family: "Hiragino Mincho ProN",
    cssStack: '"Hiragino Mincho ProN", "Yu Mincho", "Songti SC", "Noto Serif JP", serif',
    category: "CJK",
  },
  {
    displayName: "Hiragino Sans · 日系角ゴ",
    family: "Hiragino Sans",
    cssStack: '"Hiragino Sans", "Yu Gothic", "PingFang SC", sans-serif',
    category: "CJK",
  },
];

export function resolveFontCSSStack(family: string): string {
  const found = EDITORIAL_FONTS.find((f) => f.family === family);
  return found ? found.cssStack : `"${family}", "Songti SC", Georgia, sans-serif`;
}

export function makeDefaultElement(partial: Partial<CanvasElement> & { kind: ElementKind }): CanvasElement {
  return {
    id: crypto.randomUUID(),
    name: "",
    x: 0.2,
    y: 0.2,
    width: 0.5,
    height: 0.3,
    rotationDegrees: 0,
    opacity: 1.0,
    overlap: "Mix (overprint)",
    useRisoInk: false,
    risoInkName: "Blue",
    inkDensity: 0.92,
    fillHex: "#23201D",
    strokeHex: null,
    strokeWidthPt: 0,
    cornerRadiusPt: 0,
    assetID: null,
    cropZoom: 1.0,
    cropOffsetX: 0,
    cropOffsetY: 0,
    spansSpread: false,
    text: "",
    fontFamily: "Baskerville",
    fontSizePt: 18,
    fontWeight: "Reg",
    isItalic: false,
    textAlignment: "left",
    textOutline: false,
    lineHeightMultiple: 1.4,
    trackingPx: 0,
    kerningEnabled: true,
    tightCJK: true,
    shapeKind: "Rectangle",
    polygonPoints: [
      { x: 0.12, y: 0.08 },
      { x: 0.92, y: 0.18 },
      { x: 0.8, y: 0.92 },
      { x: 0.08, y: 0.78 },
    ],
    brushKind: "Pen",
    strokePoints: [],
    brushWidthPt: 4.0,
    ...partial,
  };
}

export function makeEmptyPage(): ZinePage {
  return {
    id: crypto.randomUUID(),
    pageBackgroundHex: null,
    pageRisoInkName: null,
    pageInkDensity: 0.15,
    elements: [],
  };
}

export function syncProjectPageCount(project: ZineProject): ZineProject {
  const validCount = normalizePageCount(project.format.binding, project.format.pageCount);
  const pages = [...project.pages];
  if (pages.length < validCount) {
    for (let i = pages.length; i < validCount; i++) {
      pages.push(makeEmptyPage());
    }
  } else if (pages.length > validCount) {
    pages.length = validCount;
  }
  return {
    ...project,
    format: {
      ...project.format,
      pageCount: validCount,
    },
    pages,
  };
}

export function getActiveRisoInks(project: ZineProject): string[] {
  const used = new Set<string>();
  if (project.printSettings.mode === "Risograph") {
    const hasPhotos = project.pages.some((p) => p.elements.some((el) => el.kind === "photo"));
    if (hasPhotos) {
      if (project.printSettings.separationMode === "CMYK") {
        used.add("Blue");
        used.add("Fluorescent Pink");
        used.add("Yellow");
        used.add("Black");
      } else {
        used.add(project.printSettings.primaryRisoInk);
        used.add(project.printSettings.secondaryRisoInk);
      }
    }
    if (project.printSettings.solidFillRisoInk) {
      used.add(project.printSettings.solidFillRisoInk);
    }
  }
  for (const page of project.pages) {
    if (page.pageRisoInkName) {
      used.add(page.pageRisoInkName);
    }
    for (const el of page.elements) {
      if (el.useRisoInk) {
        if (el.kind === "stroke" && el.brushKind === "Eraser") continue;
        used.add(el.risoInkName);
      }
    }
  }
  if (used.size === 0) {
    used.add(project.printSettings.primaryRisoInk);
  }
  return RISO_INK_CATALOG.map((i) => i.name).filter((n) => used.has(n));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = (hex || "#23201D").trim().replace(/^#/, "");
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num) || cleaned.length !== 6) {
    return { r: 35, g: 32, b: 29 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
