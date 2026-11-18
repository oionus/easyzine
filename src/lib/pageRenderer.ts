import { PhysicalSheetSide } from "@/lib/imposition";
import { getPaperTextureCanvas } from "@/lib/paperTexture";
import { getDecodedAssetSync, renderRisoPhotoCanvas } from "@/lib/risoEngine";
import {
  BindingType,
  BleedGuideSettings,
  CanvasElement,
  FontWeightOption,
  getPageSizeMM,
  getPaperColorOption,
  getPortraitFrameAspect,
  getRisoInk,
  hexWithAlpha,
  resolveFontCSSStack,
  SeparationPlateStyle,
  SheetBackgroundStyle,
  ZineFormatSpec,
  ZinePage,
  ZineProject,
} from "@/types/zine";

export const PT_PER_MM = 72.0 / 25.4;

export interface RenderOptions {
  includeGuides?: boolean;
  renderSpineHardware?: boolean;
  separationInk?: string | null;
  separationPlateStyle?: SeparationPlateStyle;
  maxPhotoDimension?: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getPagePointSize(format: ZineFormatSpec): { width: number; height: number } {
  const mm = getPageSizeMM(format);
  return {
    width: mm.width * PT_PER_MM,
    height: mm.height * PT_PER_MM,
  };
}

function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) || 987654321;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  const cr = Math.max(0, Math.min(radius, Math.min(r.width, r.height) * 0.5));
  ctx.beginPath();
  if (cr <= 0.1) {
    ctx.rect(r.x, r.y, r.width, r.height);
  } else {
    ctx.roundRect(r.x, r.y, r.width, r.height, cr);
  }
}

function optionsNeedsMargin(project: ZineProject): boolean {
  const g = project.bleedGuides;
  return g.includeInPDF && (g.cropMarks || g.bleed3mm || g.rulerMM);
}

export function getSheetCanvasPointSize(
  project: ZineProject,
  sheetSide: PhysicalSheetSide,
  applyExportFraming: boolean
): { width: number; height: number } {
  const singlePt = getPagePointSize(project.format);
  const gap =
    (sheetSide.columns > 2 || sheetSide.rows > 1) && !sheetSide.hasMiniZineSlit
      ? 14.0
      : 0.0;
  const gridW =
    singlePt.width * sheetSide.columns + gap * Math.max(0, sheetSide.columns - 1);
  const gridH =
    singlePt.height * sheetSide.rows + gap * Math.max(0, sheetSide.rows - 1);

  const hasBg =
    applyExportFraming &&
    (project.exportSettings.sheetBackground !== "None" ||
      project.exportSettings.portraitFrame !== "Off");
  const pad = hasBg ? 48.0 : optionsNeedsMargin(project) ? 28.0 : 0.0;
  let outW = gridW + pad * 2;
  let outH = gridH + pad * 2;

  if (applyExportFraming) {
    const targetAspect = getPortraitFrameAspect(project.exportSettings.portraitFrame);
    if (targetAspect !== null) {
      const currentAspect = outW / Math.max(outH, 1);
      if (currentAspect > targetAspect) {
        outH = outW / targetAspect;
      } else {
        outW = outH * targetAspect;
      }
    }
  }
  return { width: outW, height: outH };
}

export function renderSinglePageCanvas(
  project: ZineProject,
  pageIndex: number,
  pixelHeight = 820,
  options: RenderOptions = {}
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const basePt = getPagePointSize(project.format);
  const g = project.bleedGuides;
  const hasMarginGuides =
    Boolean(options.includeGuides) && (g.bleed3mm || g.cropMarks || g.rulerMM);
  const bleedMM = hasMarginGuides ? 10.0 : 0.0;
  const marginPt = bleedMM * PT_PER_MM;
  const totalPtW = basePt.width + marginPt * 2;
  const totalPtH = basePt.height + marginPt * 2;
  const scale = Math.max(0.4, pixelHeight / Math.max(totalPtH, 1));

  canvas.width = Math.max(16, Math.round(totalPtW * scale));
  canvas.height = Math.max(16, Math.round(totalPtH * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.save();
  ctx.scale(scale, scale);

  const pageRect: Rect = {
    x: marginPt,
    y: marginPt,
    width: basePt.width,
    height: basePt.height,
  };
  drawSinglePage(ctx, project, pageIndex, pageRect, null, options);

  if (options.includeGuides) {
    drawPrepressGuides(ctx, pageRect, project.bleedGuides);
  } else if (options.separationInk && project.exportSettings.separationCropMarks) {
    drawPrepressGuides(ctx, pageRect, {
      bleed3mm: false,
      trimLine: false,
      cropMarks: true,
      centerMarks: true,
      centerLineV: false,
      centerLineH: false,
      rulerMM: false,
      includeInPDF: true,
      lineColorHex: "#000000",
    });
  }

  ctx.restore();
  return canvas;
}

export function renderSheetSideCanvas(
  project: ZineProject,
  sheetSide: PhysicalSheetSide,
  pixelMaxDimension = 1200,
  applyExportFraming = false,
  options: RenderOptions = {}
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const canvasSize = getSheetCanvasPointSize(project, sheetSide, applyExportFraming);
  const scale = Math.max(
    0.35,
    pixelMaxDimension / Math.max(canvasSize.width, canvasSize.height, 1)
  );
  canvas.width = Math.max(24, Math.round(canvasSize.width * scale));
  canvas.height = Math.max(24, Math.round(canvasSize.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.save();
  ctx.scale(scale, scale);
  drawSheetSide(
    ctx,
    project,
    sheetSide,
    { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    applyExportFraming,
    options
  );
  ctx.restore();
  return canvas;
}

export function drawSheetSide(
  ctx: CanvasRenderingContext2D,
  project: ZineProject,
  sheetSide: PhysicalSheetSide,
  canvasRect: Rect,
  applyExportFraming: boolean,
  options: RenderOptions
) {
  ctx.save();

  if (applyExportFraming) {
    drawSheetBackdrop(ctx, canvasRect, project.exportSettings.sheetBackground);
  } else if (options.separationInk) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(canvasRect.x, canvasRect.y, canvasRect.width, canvasRect.height);
  }

  const singlePt = getPagePointSize(project.format);
  const isTightGrid =
    sheetSide.hasMiniZineSlit || (sheetSide.rows === 1 && sheetSide.columns <= 2);
  const gap = isTightGrid ? 0.0 : 14.0;
  const rawGridW =
    singlePt.width * sheetSide.columns + gap * Math.max(0, sheetSide.columns - 1);
  const rawGridH =
    singlePt.height * sheetSide.rows + gap * Math.max(0, sheetSide.rows - 1);

  const hasFramePad =
    applyExportFraming &&
    (project.exportSettings.sheetBackground !== "None" ||
      project.exportSettings.portraitFrame !== "Off");
  const availW = canvasRect.width - (hasFramePad ? 76.0 : 0.0);
  const availH = canvasRect.height - (hasFramePad ? 76.0 : 0.0);
  const fitScale = Math.min(
    1.0,
    Math.min(availW / Math.max(rawGridW, 1), availH / Math.max(rawGridH, 1))
  );

  const scaledGridW = rawGridW * fitScale;
  const scaledGridH = rawGridH * fitScale;
  const originX = canvasRect.x + (canvasRect.width - scaledGridW) * 0.5;
  const originY = canvasRect.y + (canvasRect.height - scaledGridH) * 0.5;

  ctx.translate(originX, originY);
  ctx.scale(fitScale, fitScale);

  // Subtle drop shadow behind book/sheet when framed on backdrop
  if (hasFramePad && !options.separationInk) {
    if (sheetSide.rows === 1 && sheetSide.columns === 2) {
      const leftSlot = sheetSide.slots.find((s) => s.col === 0)?.pageIndex ?? null;
      const rightSlot = sheetSide.slots.find((s) => s.col === 1)?.pageIndex ?? null;
      let shadowRect: Rect = { x: 0, y: 0, width: rawGridW, height: rawGridH };
      if (leftSlot === null && rightSlot !== null) {
        shadowRect = {
          x: singlePt.width,
          y: 0,
          width: singlePt.width,
          height: singlePt.height,
        };
      } else if (rightSlot === null && leftSlot !== null) {
        shadowRect = { x: 0, y: 0, width: singlePt.width, height: singlePt.height };
      }
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.22)";
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = getPaperColorOption(project.format.paperColorName).hex;
      ctx.fillRect(shadowRect.x, shadowRect.y, shadowRect.width, shadowRect.height);
      ctx.restore();
    }
  }

  if (sheetSide.rows === 1 && sheetSide.columns === 2 && gap === 0) {
    const leftSlot = sheetSide.slots.find((s) => s.col === 0);
    const rightSlot = sheetSide.slots.find((s) => s.col === 1);
    drawSpread(
      ctx,
      project,
      leftSlot?.pageIndex ?? null,
      rightSlot?.pageIndex ?? null,
      { x: 0, y: 0, width: rawGridW, height: rawGridH },
      options
    );
  } else {
    for (const slot of sheetSide.slots) {
      if (slot.pageIndex === null) continue;
      const slotX = slot.col * (singlePt.width + gap);
      const slotY = slot.row * (singlePt.height + gap);
      const slotRect: Rect = {
        x: slotX,
        y: slotY,
        width: singlePt.width,
        height: singlePt.height,
      };

      ctx.save();
      if (slot.rotated180) {
        const cx = slotRect.x + slotRect.width * 0.5;
        const cy = slotRect.y + slotRect.height * 0.5;
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI);
        ctx.translate(-cx, -cy);
      }
      drawSinglePage(ctx, project, slot.pageIndex, slotRect, null, options);
      ctx.restore();

      if (options.includeGuides) {
        drawPrepressGuides(ctx, slotRect, project.bleedGuides);
      }
    }
  }

  if (sheetSide.hasMiniZineSlit && !options.separationInk) {
    drawMiniZineFoldAndCutOverlay(ctx, {
      x: 0,
      y: 0,
      width: rawGridW,
      height: rawGridH,
    });
  }

  ctx.restore();
}

export function drawSpread(
  ctx: CanvasRenderingContext2D,
  project: ZineProject,
  leftPageIndex: number | null,
  rightPageIndex: number | null,
  spreadRect: Rect,
  options: RenderOptions
) {
  const pageW = spreadRect.width * 0.5;
  const leftRect: Rect = {
    x: spreadRect.x,
    y: spreadRect.y,
    width: pageW,
    height: spreadRect.height,
  };
  const rightRect: Rect = {
    x: spreadRect.x + pageW,
    y: spreadRect.y,
    width: pageW,
    height: spreadRect.height,
  };

  if (leftPageIndex !== null) {
    drawSinglePage(ctx, project, leftPageIndex, leftRect, null, options);
  }
  if (rightPageIndex !== null) {
    const readerPairLeft =
      rightPageIndex > 0 && rightPageIndex % 2 === 0 ? rightPageIndex - 1 : null;
    drawSinglePage(ctx, project, rightPageIndex, rightRect, readerPairLeft, options);
  }

  if ((options.renderSpineHardware ?? true) && !options.separationInk) {
    drawSpineAndBindingDetails(
      ctx,
      project.format.binding,
      spreadRect,
      leftPageIndex !== null,
      rightPageIndex !== null
    );
  }

  if (options.includeGuides) {
    let activeRect = spreadRect;
    if (leftPageIndex === null && rightPageIndex !== null) activeRect = rightRect;
    if (rightPageIndex === null && leftPageIndex !== null) activeRect = leftRect;
    drawPrepressGuides(ctx, activeRect, project.bleedGuides);
  } else if (options.separationInk && project.exportSettings.separationCropMarks) {
    drawPrepressGuides(ctx, spreadRect, {
      bleed3mm: false,
      trimLine: false,
      cropMarks: true,
      centerMarks: true,
      centerLineV: false,
      centerLineH: false,
      rulerMM: false,
      includeInPDF: true,
      lineColorHex: "#000000",
    });
  }
}

export function drawSinglePage(
  ctx: CanvasRenderingContext2D,
  project: ZineProject,
  pageIndex: number,
  pageRect: Rect,
  pairedLeftPageIndex: number | null = null,
  options: RenderOptions = {}
) {
  if (pageIndex < 0 || pageIndex >= project.pages.length) return;
  const page = project.pages[pageIndex];
  const isSeparation = Boolean(options.separationInk);
  const paperColor = getPaperColorOption(project.format.paperColorName);

  ctx.save();
  ctx.beginPath();
  ctx.rect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
  ctx.clip();

  // 1. Paper Base Fill
  if (isSeparation) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
  } else {
    ctx.fillStyle = paperColor.hex;
    ctx.fillRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);

    // Tracing paper translucency: faint mirrored ghost of backing leaf!
    if (project.format.paperStock === "Tracing") {
      const ghostIndex = pageIndex % 2 === 0 ? pageIndex + 1 : pageIndex - 1;
      if (ghostIndex >= 0 && ghostIndex < project.pages.length) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        const midX = pageRect.x + pageRect.width * 0.5;
        ctx.translate(midX, 0);
        ctx.scale(-1, 1);
        ctx.translate(-midX, 0);
        drawPageElementsOnly(
          ctx,
          project,
          project.pages[ghostIndex],
          pageRect,
          paperColor.hex,
          options
        );
        ctx.restore();
      }
    }
  }

  // 2. Book-wide Solid Underbase & Per-Page Tint
  if (options.separationInk) {
    if (project.printSettings.solidFillRisoInk === options.separationInk) {
      const d = Math.min(1, Math.max(0, project.printSettings.solidFillDensity));
      ctx.fillStyle = `rgba(0,0,0,${d})`;
      ctx.fillRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
    }
    if (page.pageRisoInkName === options.separationInk) {
      const d = Math.min(1, Math.max(0, page.pageInkDensity));
      ctx.fillStyle = `rgba(0,0,0,${d})`;
      ctx.fillRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
    }
  } else {
    if (project.printSettings.solidFillRisoInk) {
      const inkHex = getRisoInk(project.printSettings.solidFillRisoInk).hex;
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = hexWithAlpha(inkHex, project.printSettings.solidFillDensity);
      ctx.fillRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
      ctx.restore();
    } else if (
      project.printSettings.solidFillHex &&
      project.printSettings.solidFillHex.toUpperCase() !== "#FFFFFF"
    ) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = hexWithAlpha(
        project.printSettings.solidFillHex,
        project.printSettings.solidFillDensity
      );
      ctx.fillRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
      ctx.restore();
    }

    if (page.pageRisoInkName) {
      const inkHex = getRisoInk(page.pageRisoInkName).hex;
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = hexWithAlpha(inkHex, page.pageInkDensity);
      ctx.fillRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
      ctx.restore();
    } else if (page.pageBackgroundHex) {
      ctx.fillStyle = page.pageBackgroundHex;
      ctx.fillRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
    }
  }

  // 3. Overflowing Spread Elements from Left Page onto Right Page
  const inferredLeftIndex =
    pairedLeftPageIndex !== null
      ? pairedLeftPageIndex
      : pageIndex > 0 && pageIndex % 2 === 0
      ? pageIndex - 1
      : null;

  if (
    inferredLeftIndex !== null &&
    inferredLeftIndex >= 0 &&
    inferredLeftIndex < project.pages.length
  ) {
    const leftPage = project.pages[inferredLeftIndex];
    const shiftedLeftRect: Rect = {
      x: pageRect.x - pageRect.width,
      y: pageRect.y,
      width: pageRect.width,
      height: pageRect.height,
    };
    for (const el of leftPage.elements) {
      if (el.spansSpread || el.x + el.width > 1.001) {
        drawElement(ctx, el, project, shiftedLeftRect, paperColor.hex, options);
      }
    }
  }

  // 4. Current Page Elements
  drawPageElementsOnly(ctx, project, page, pageRect, paperColor.hex, options);

  // 5. Automatic Page Numbers
  if (project.pageNumbers.enabled) {
    drawPageNumber(ctx, project, pageIndex, pageRect, options);
  }

  // 6. Tactile Paper Grain & Sheen Overlay
  if (!isSeparation) {
    const grainCanvas = getPaperTextureCanvas(project.format.paperStock);
    if (grainCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(
        grainCanvas,
        pageRect.x,
        pageRect.y,
        pageRect.width,
        pageRect.height
      );
      ctx.restore();
    }

    if (project.format.paperStock === "Gloss") {
      const grad = ctx.createLinearGradient(
        pageRect.x,
        pageRect.y,
        pageRect.x + pageRect.width,
        pageRect.y + pageRect.height
      );
      grad.addColorStop(0, "rgba(255,255,255,0.14)");
      grad.addColorStop(0.45, "rgba(255,255,255,0)");
      grad.addColorStop(1, "rgba(255,255,255,0.06)");
      ctx.fillStyle = grad;
      ctx.fillRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
    }

    ctx.strokeStyle = "rgba(25, 25, 25, 0.09)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
  }

  ctx.restore();
}

function drawPageElementsOnly(
  ctx: CanvasRenderingContext2D,
  project: ZineProject,
  page: ZinePage,
  pageRect: Rect,
  paperHex: string,
  options: RenderOptions
) {
  for (const el of page.elements) {
    drawElement(ctx, el, project, pageRect, paperHex, options);
  }
}

function resolveElementColor(
  element: CanvasElement,
  fallbackHex: string | null,
  options: RenderOptions
): string | null {
  if (options.separationInk) {
    if (!element.useRisoInk || element.risoInkName !== options.separationInk) {
      return null;
    }
    const d = Math.min(1, Math.max(0.02, element.inkDensity));
    return `rgba(0,0,0,${d})`;
  }
  if (element.useRisoInk) {
    const hex = getRisoInk(element.risoInkName).hex;
    return hexWithAlpha(hex, Math.min(1, Math.max(0.05, element.inkDensity)));
  }
  if (!fallbackHex) return null;
  return fallbackHex;
}

function drawElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  project: ZineProject,
  owningPageRect: Rect,
  paperHex: string,
  options: RenderOptions
) {
  const rect: Rect = {
    x: owningPageRect.x + element.x * owningPageRect.width,
    y: owningPageRect.y + element.y * owningPageRect.height,
    width: element.width * owningPageRect.width,
    height: element.height * owningPageRect.height,
  };

  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, element.opacity));

  if (
    element.overlap === "Mix (overprint)" &&
    !options.separationInk &&
    !(element.kind === "stroke" && element.brushKind === "Eraser")
  ) {
    ctx.globalCompositeOperation = "multiply";
  }

  if (Math.abs(element.rotationDegrees) > 0.01 && element.kind !== "stroke") {
    const cx = rect.x + rect.width * 0.5;
    const cy = rect.y + rect.height * 0.5;
    ctx.translate(cx, cy);
    ctx.rotate((element.rotationDegrees * Math.PI) / 180.0);
    ctx.translate(-cx, -cy);
  }

  switch (element.kind) {
    case "photo":
      drawPhotoElement(ctx, element, rect, project, options);
      break;
    case "shape":
      drawShapeElement(ctx, element, rect, options);
      break;
    case "stroke":
      drawStrokeElement(ctx, element, owningPageRect, paperHex, options);
      break;
    case "text":
      drawTextElement(ctx, element, rect, owningPageRect, options);
      break;
  }

  ctx.restore();
}

function drawPhotoElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  rect: Rect,
  project: ZineProject,
  options: RenderOptions
) {
  if (rect.width <= 1 || rect.height <= 1) return;
  const asset = element.assetID
    ? project.assets.find((a) => a.id === element.assetID)
    : undefined;

  if (!asset) {
    if (!options.separationInk) {
      ctx.fillStyle = "rgba(210, 206, 198, 0.5)";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    return;
  }

  let sourceDrawable: CanvasImageSource | null = null;
  let imgW = asset.pixelWidth || 100;
  let imgH = asset.pixelHeight || 100;
  const maxDim = options.maxPhotoDimension ?? 720;

  if (options.separationInk) {
    if (project.printSettings.mode === "Risograph") {
      const c = renderRisoPhotoCanvas(
        asset,
        project.printSettings,
        options.separationInk,
        options.separationPlateStyle ?? "Grayscale",
        maxDim
      );
      if (c) {
        sourceDrawable = c;
        imgW = c.width;
        imgH = c.height;
      }
    } else if (element.useRisoInk && element.risoInkName === options.separationInk) {
      const custom = {
        ...project.printSettings,
        separationMode: "Lum" as const,
        primaryRisoInk: options.separationInk,
        secondaryRisoInk: options.separationInk,
      };
      const c = renderRisoPhotoCanvas(
        asset,
        custom,
        options.separationInk,
        options.separationPlateStyle ?? "Grayscale",
        maxDim
      );
      if (c) {
        sourceDrawable = c;
        imgW = c.width;
        imgH = c.height;
      }
    }
  } else if (project.printSettings.mode === "Risograph") {
    const c = renderRisoPhotoCanvas(asset, project.printSettings, null, null, maxDim);
    if (c) {
      sourceDrawable = c;
      imgW = c.width;
      imgH = c.height;
    }
  } else {
    const decoded = getDecodedAssetSync(asset);
    if (decoded) {
      sourceDrawable = decoded;
      imgW = decoded.naturalWidth || imgW;
      imgH = decoded.naturalHeight || imgH;
    }
  }

  if (!sourceDrawable) {
    if (!options.separationInk) {
      ctx.fillStyle = "rgba(216, 211, 202, 0.45)";
      roundedRectPath(ctx, rect, element.cornerRadiusPt);
      ctx.fill();
    }
    return;
  }

  ctx.save();
  roundedRectPath(ctx, rect, element.cornerRadiusPt);
  ctx.clip();

  if (!options.separationInk) {
    if (project.format.backgroundIndependentPhotos) {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    } else if (
      project.printSettings.mode !== "Risograph" &&
      project.format.paperColorName !== "White" &&
      project.format.paperColorName !== "Black"
    ) {
      ctx.globalCompositeOperation = "multiply";
    }
  }

  const imgAspect = imgW / Math.max(imgH, 1);
  const boxAspect = rect.width / Math.max(rect.height, 1);
  let drawW = rect.width;
  let drawH = rect.height;
  if (imgAspect > boxAspect) {
    drawH = rect.height;
    drawW = drawH * imgAspect;
  } else {
    drawW = rect.width;
    drawH = drawW / Math.max(imgAspect, 0.01);
  }
  const zoom = Math.max(1.0, element.cropZoom || 1.0);
  drawW *= zoom;
  drawH *= zoom;
  const dx = (element.cropOffsetX || 0) * drawW * 0.5;
  const dy = (element.cropOffsetY || 0) * drawH * 0.5;
  const imgX = rect.x + rect.width * 0.5 - drawW * 0.5 + dx;
  const imgY = rect.y + rect.height * 0.5 - drawH * 0.5 + dy;

  ctx.drawImage(sourceDrawable, imgX, imgY, drawW, drawH);
  ctx.restore();
}

function drawShapeElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  rect: Rect,
  options: RenderOptions
) {
  const fillColor = resolveElementColor(element, element.fillHex, options);
  const strokeColor =
    element.strokeWidthPt > 0.05
      ? resolveElementColor(
          element,
          element.strokeHex ?? element.fillHex ?? "#23201D",
          options
        )
      : null;

  if (!fillColor && !strokeColor) return;

  ctx.beginPath();
  switch (element.shapeKind) {
    case "Line":
      ctx.moveTo(rect.x, rect.y + rect.height);
      ctx.lineTo(rect.x + rect.width, rect.y);
      break;
    case "Rectangle":
      roundedRectPath(ctx, rect, element.cornerRadiusPt);
      break;
    case "Ellipse":
      ctx.ellipse(
        rect.x + rect.width * 0.5,
        rect.y + rect.height * 0.5,
        rect.width * 0.5,
        rect.height * 0.5,
        0,
        0,
        Math.PI * 2
      );
      break;
    case "Triangle":
      ctx.moveTo(rect.x + rect.width * 0.5, rect.y);
      ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
      ctx.lineTo(rect.x, rect.y + rect.height);
      ctx.closePath();
      break;
    case "Arrow": {
      const startX = rect.x;
      const startY = rect.y + rect.height;
      const endX = rect.x + rect.width;
      const endY = rect.y;
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      const angle = Math.atan2(endY - startY, endX - startX);
      const headLen = Math.max(10, Math.min(rect.width, rect.height) * 0.28);
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLen * Math.cos(angle - 0.48),
        endY - headLen * Math.sin(angle - 0.48)
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLen * Math.cos(angle + 0.48),
        endY - headLen * Math.sin(angle + 0.48)
      );
      break;
    }
    case "Speech bubble": {
      const bodyH = rect.height * 0.78;
      const cr = Math.min(14, Math.min(rect.width, bodyH) * 0.28);
      ctx.roundRect(rect.x, rect.y, rect.width, bodyH, cr);
      ctx.moveTo(rect.x + rect.width * 0.24, rect.y + bodyH - 1);
      ctx.lineTo(rect.x + rect.width * 0.16, rect.y + rect.height);
      ctx.lineTo(rect.x + rect.width * 0.42, rect.y + bodyH - 1);
      ctx.closePath();
      break;
    }
    case "Star": {
      const cx = rect.x + rect.width * 0.5;
      const cy = rect.y + rect.height * 0.5;
      const outerR = Math.min(rect.width, rect.height) * 0.5;
      const innerR = outerR * 0.42;
      for (let i = 0; i < 10; i++) {
        const rad = (i * Math.PI) / 5.0 - Math.PI / 2.0;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx + Math.cos(rad) * r;
        const py = cy + Math.sin(rad) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case "Hexagon": {
      const cx = rect.x + rect.width * 0.5;
      const cy = rect.y + rect.height * 0.5;
      const rx = rect.width * 0.5;
      const ry = rect.height * 0.5;
      for (let i = 0; i < 6; i++) {
        const rad = (i * Math.PI) / 3.0 - Math.PI / 2.0;
        const px = cx + Math.cos(rad) * rx;
        const py = cy + Math.sin(rad) * ry;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case "Freeform": {
      const pts = element.polygonPoints;
      if (pts.length > 0) {
        ctx.moveTo(rect.x + pts[0].x * rect.width, rect.y + pts[0].y * rect.height);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(rect.x + pts[i].x * rect.width, rect.y + pts[i].y * rect.height);
        }
        ctx.closePath();
      }
      break;
    }
  }

  const isOpenLine = element.shapeKind === "Line" || element.shapeKind === "Arrow";
  if (!isOpenLine && fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  const effectiveStroke = strokeColor ?? (isOpenLine ? fillColor : null);
  if (effectiveStroke) {
    ctx.strokeStyle = effectiveStroke;
    ctx.lineWidth = Math.max(isOpenLine ? 2.0 : 0.5, element.strokeWidthPt);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

function drawStrokeElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  owningPageRect: Rect,
  paperHex: string,
  options: RenderOptions
) {
  if (element.strokePoints.length < 2) return;
  const pts = element.strokePoints.map((p) => ({
    x: owningPageRect.x + p.x * owningPageRect.width,
    y: owningPageRect.y + p.y * owningPageRect.height,
  }));

  if (element.brushKind === "Eraser") {
    if (options.separationInk) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = paperHex;
    ctx.lineWidth = element.brushWidthPt;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const baseColor = resolveElementColor(
    element,
    element.fillHex ?? "#23201D",
    options
  );
  if (!baseColor) return;

  const width = Math.max(1.0, element.brushWidthPt);
  let rng = hashId(element.id);
  const nextUnit = () => {
    rng ^= rng << 13;
    rng ^= rng >>> 17;
    rng ^= rng << 5;
    return (rng >>> 0) / 4294967295;
  };

  switch (element.brushKind) {
    case "Pen": {
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const midX = (pts[i - 1].x + pts[i].x) * 0.5;
        const midY = (pts[i - 1].y + pts[i].y) * 0.5;
        ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      break;
    }

    case "Marker": {
      ctx.save();
      if (!options.separationInk) ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha *= 0.65;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = width;
      ctx.lineCap = "butt";
      ctx.lineJoin = "bevel";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case "Brush": {
      ctx.fillStyle = baseColor;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const steps = Math.max(1, Math.ceil(dist / 2.0));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const progress = (i - 1 + t) / Math.max(1, pts.length - 1);
          const taper =
            Math.sin(Math.min(1.0, progress * 3.5) * Math.PI * 0.5) *
            (1.0 - Math.pow(progress, 3.2) * 0.55);
          const r = Math.max(0.8, width * 0.55 * taper);
          const x = p0.x + (p1.x - p0.x) * t;
          const y = p0.y + (p1.y - p0.y) * t;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case "Pencil": {
      ctx.save();
      ctx.strokeStyle = baseColor;
      ctx.globalAlpha *= 0.5;
      ctx.lineWidth = Math.max(0.7, width * 0.42);
      for (let strand = 0; strand < 3; strand++) {
        const offset = (strand - 1) * (width * 0.22);
        ctx.setLineDash([3.0, 1.2]);
        ctx.lineDashOffset = strand * 2.0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x + offset, pts[0].y + offset);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(
            pts[i].x + offset + (nextUnit() - 0.5) * 0.9,
            pts[i].y + offset + (nextUnit() - 0.5) * 0.9
          );
        }
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case "Crayon":
    case "Oil pastel": {
      const isPastel = element.brushKind === "Oil pastel";
      const density = isPastel ? 9 : 5;
      ctx.save();
      ctx.fillStyle = baseColor;
      ctx.globalAlpha *= isPastel ? 0.72 : 0.48;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const steps = Math.max(1, Math.ceil(dist / 3.2));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const cx = p0.x + (p1.x - p0.x) * t;
          const cy = p0.y + (p1.y - p0.y) * t;
          for (let k = 0; k < density; k++) {
            const ox = (nextUnit() - 0.5) * width;
            const oy = (nextUnit() - 0.5) * width;
            if (ox * ox + oy * oy <= width * width * 0.32) {
              const grainR = Math.max(
                0.85,
                width * (isPastel ? 0.21 : 0.14) * (0.5 + nextUnit())
              );
              ctx.beginPath();
              ctx.arc(cx + ox, cy + oy, grainR, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      ctx.restore();
      break;
    }

    case "Spray": {
      ctx.save();
      ctx.fillStyle = baseColor;
      ctx.globalAlpha *= 0.6;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const steps = Math.max(1, Math.ceil(dist / 4.2));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const cx = p0.x + (p1.x - p0.x) * t;
          const cy = p0.y + (p1.y - p0.y) * t;
          for (let k = 0; k < 16; k++) {
            const angle = nextUnit() * Math.PI * 2;
            const rad = Math.pow(nextUnit(), 0.65) * width * 0.85;
            const px = cx + Math.cos(angle) * rad;
            const py = cy + Math.sin(angle) * rad;
            const dotR = 0.65 + nextUnit() * 0.95;
            ctx.beginPath();
            ctx.arc(px, py, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
      break;
    }
  }
}

function mapFontWeightCss(weight: FontWeightOption): string {
  switch (weight) {
    case "Thin":
      return "300";
    case "Reg":
      return "400";
    case "Med":
      return "500";
    case "Bold":
      return "700";
  }
}

function wrapParagraphLines(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number
): string[] {
  if (!paragraph) return [""];
  const tokens = paragraph.match(/[\u4e00-\u9fff\u3000-\u30ff\uff00-\uffef]|[^\s\u4e00-\u9fff\u3000-\u30ff\uff00-\uffef]+|\s+/g) ?? [paragraph];
  const lines: string[] = [];
  let current = "";

  for (const token of tokens) {
    const candidate = current + token;
    if (current.length > 0 && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current.trimEnd());
      current = token.trimStart();
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines;
}

function drawTextElement(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  rect: Rect,
  owningPageRect: Rect,
  options: RenderOptions
) {
  if (!element.text) return;
  const color = resolveElementColor(
    element,
    element.fillHex ?? "#23201D",
    options
  );
  if (!color) return;

  const a5BaseHeight = 210 * PT_PER_MM;
  const scaleRatio = owningPageRect.height / Math.max(a5BaseHeight, 1);
  const effectivePtSize = Math.max(5.0, element.fontSizePt * scaleRatio);
  const weightStr = mapFontWeightCss(element.fontWeight);
  const italicStr = element.isItalic ? "italic " : "";
  const cssFamily = resolveFontCSSStack(element.fontFamily);

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x - 2, rect.y - 2, rect.width + 4, rect.height + 8);
  ctx.clip();

  ctx.font = `${italicStr}${weightStr} ${effectivePtSize}px ${cssFamily}`;
  ctx.textBaseline = "top";
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = element.kerningEnabled
      ? `${(element.trackingPx * scaleRatio).toFixed(2)}px`
      : "0px";
  }

  let displayStr = element.text;
  if (element.tightCJK) {
    displayStr = displayStr.replace(/，\s+/g, "，").replace(/。\s+/g, "。");
  }

  const rawParagraphs = displayStr.split("\n");
  const allLines: string[] = [];
  for (const para of rawParagraphs) {
    allLines.push(...wrapParagraphLines(ctx, para, Math.max(12, rect.width)));
  }

  const lineH = effectivePtSize * Math.max(0.85, element.lineHeightMultiple);
  let curY = rect.y;

  for (const line of allLines) {
    if (curY > rect.y + rect.height + lineH * 0.4) break;
    let drawX = rect.x;
    if (element.textAlignment === "center") {
      ctx.textAlign = "center";
      drawX = rect.x + rect.width * 0.5;
    } else if (element.textAlignment === "right") {
      ctx.textAlign = "right";
      drawX = rect.x + rect.width;
    } else {
      ctx.textAlign = "left";
    }

    if (element.textOutline) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.8, effectivePtSize * 0.045);
      ctx.strokeText(line, drawX, curY);
    } else {
      ctx.fillStyle = color;
      ctx.fillText(line, drawX, curY);
    }
    curY += lineH;
  }

  ctx.restore();
}

function drawPageNumber(
  ctx: CanvasRenderingContext2D,
  project: ZineProject,
  pageIndex: number,
  pageRect: Rect,
  options: RenderOptions
) {
  const cfg = project.pageNumbers;
  if (cfg.skipCovers && (pageIndex === 0 || pageIndex === project.pages.length - 1)) {
    return;
  }
  if (options.separationInk) {
    if (
      project.printSettings.mode === "Risograph" &&
      options.separationInk !== project.printSettings.primaryRisoInk
    ) {
      return;
    }
  }

  const label = `${cfg.startAt + pageIndex}`;
  const color = options.separationInk ? "#000000" : cfg.colorHex;
  const isLeftVerso = pageIndex % 2 === 1;
  const marginX = cfg.offsetXMM * PT_PER_MM;
  const marginY = cfg.offsetYMM * PT_PER_MM;
  const fontSize = cfg.fontSizePt;
  const boxH = fontSize * 1.4;

  const y =
    cfg.position === "Bottom center" || cfg.position === "Bottom outer"
      ? pageRect.y + pageRect.height - marginY - boxH
      : pageRect.y + marginY;

  ctx.save();
  ctx.font = `400 ${fontSize}px ${resolveFontCSSStack(cfg.fontName)}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";

  if (cfg.position === "Bottom center" || cfg.position === "Top center") {
    ctx.textAlign = "center";
    ctx.fillText(label, pageRect.x + pageRect.width * 0.5, y);
  } else if (isLeftVerso) {
    ctx.textAlign = "left";
    ctx.fillText(label, pageRect.x + marginX, y);
  } else {
    ctx.textAlign = "right";
    ctx.fillText(label, pageRect.x + pageRect.width - marginX, y);
  }
  ctx.restore();
}

export function drawSpineAndBindingDetails(
  ctx: CanvasRenderingContext2D,
  binding: BindingType,
  spreadRect: Rect,
  hasLeft: boolean,
  hasRight: boolean
) {
  const spineX = spreadRect.x + spreadRect.width * 0.5;
  const topY = spreadRect.y;
  const botY = spreadRect.y + spreadRect.height;
  const h = spreadRect.height;

  ctx.save();

  if (hasLeft && hasRight) {
    const gutterW = Math.min(26, spreadRect.width * 0.045);
    const grad = ctx.createLinearGradient(spineX - gutterW, topY, spineX + gutterW, topY);
    grad.addColorStop(0.0, "rgba(0,0,0,0)");
    grad.addColorStop(0.47, "rgba(0,0,0,0.11)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.14)");
    grad.addColorStop(0.53, "rgba(0,0,0,0.06)");
    grad.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(spineX - gutterW, topY, gutterW * 2, h);
  }

  switch (binding) {
    case "saddle": {
      const stapleLen = Math.min(22, h * 0.065);
      ctx.strokeStyle = "#8F9399";
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      for (const frac of [0.24, 0.76]) {
        const cy = topY + h * frac;
        ctx.beginPath();
        ctx.moveTo(spineX, cy - stapleLen * 0.5);
        ctx.lineTo(spineX, cy + stapleLen * 0.5);
        ctx.stroke();
      }
      break;
    }

    case "stab": {
      const offset = hasRight && !hasLeft ? 10 : hasLeft && !hasRight ? -10 : 8;
      const sx = spineX + offset;
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(sx, topY);
      ctx.lineTo(sx, botY);
      ctx.stroke();

      ctx.strokeStyle = "#7D8187";
      ctx.lineWidth = 1.8;
      for (const frac of [0.2, 0.5, 0.8]) {
        const cy = topY + h * frac;
        ctx.beginPath();
        ctx.moveTo(sx, cy - 7);
        ctx.lineTo(sx, cy + 7);
        ctx.stroke();
      }
      break;
    }

    case "sewing":
    case "thread": {
      ctx.strokeStyle = "rgba(200, 90, 50, 0.82)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([9, 6]);
      ctx.lineDashOffset = 3;
      ctx.beginPath();
      ctx.moveTo(spineX, topY + h * 0.1);
      ctx.lineTo(spineX, botY - h * 0.1);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }

    case "japanese": {
      const dir = hasLeft && !hasRight ? -1.0 : 1.0;
      const seamX = spineX + dir * 12.0;
      const holeFracs = [0.16, 0.39, 0.61, 0.84];
      ctx.strokeStyle = "rgba(158, 59, 43, 0.88)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(seamX, topY);
      ctx.lineTo(seamX, botY);
      for (const f of holeFracs) {
        const hy = topY + h * f;
        ctx.moveTo(seamX, hy);
        ctx.lineTo(spineX, hy);
      }
      ctx.stroke();

      ctx.fillStyle = "#332924";
      for (const f of holeFracs) {
        const hy = topY + h * f;
        ctx.beginPath();
        ctx.arc(seamX, hy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "ring": {
      const ringCount = Math.max(8, Math.floor(h / 26));
      for (let i = 0; i < ringCount; i++) {
        const ry = topY + (i + 0.8) * (h / (ringCount + 1));
        ctx.fillStyle = "rgba(46,46,46,0.75)";
        if (hasLeft) {
          ctx.beginPath();
          ctx.arc(spineX - 6.7, ry, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (hasRight) {
          ctx.beginPath();
          ctx.arc(spineX + 6.7, ry, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "#6B6F76";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(spineX - 7, ry - 1.2);
        ctx.lineTo(spineX + 7, ry - 1.2);
        ctx.moveTo(spineX - 7, ry + 1.2);
        ctx.lineTo(spineX + 7, ry + 1.2);
        ctx.stroke();
      }
      break;
    }

    case "perfect":
    case "miniFold8": {
      ctx.strokeStyle = "rgba(0,0,0,0.16)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(spineX, topY);
      ctx.lineTo(spineX, botY);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function drawMiniZineFoldAndCutOverlay(ctx: CanvasRenderingContext2D, totalRect: Rect) {
  ctx.save();
  ctx.strokeStyle = "rgba(74, 124, 155, 0.65)";
  ctx.lineWidth = 0.9;
  ctx.setLineDash([5, 4]);
  for (let c = 1; c <= 3; c++) {
    const x = totalRect.x + totalRect.width * (c / 4.0);
    ctx.beginPath();
    ctx.moveTo(x, totalRect.y);
    ctx.lineTo(x, totalRect.y + totalRect.height);
    ctx.stroke();
  }

  const midY = totalRect.y + totalRect.height * 0.5;
  ctx.beginPath();
  ctx.moveTo(totalRect.x, midY);
  ctx.lineTo(totalRect.x + totalRect.width * 0.25, midY);
  ctx.moveTo(totalRect.x + totalRect.width * 0.75, midY);
  ctx.lineTo(totalRect.x + totalRect.width, midY);
  ctx.stroke();

  // Bold vermilion center cut slit across middle two columns
  ctx.setLineDash([8, 3]);
  ctx.strokeStyle = "rgba(224, 62, 45, 0.92)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(totalRect.x + totalRect.width * 0.25, midY);
  ctx.lineTo(totalRect.x + totalRect.width * 0.75, midY);
  ctx.stroke();
  ctx.restore();
}

export function drawPrepressGuides(
  ctx: CanvasRenderingContext2D,
  pageRect: Rect,
  guides: BleedGuideSettings
) {
  ctx.save();
  const guideHex = guides.lineColorHex || "#FF3B30";
  const bleedOffset = 3.0 * PT_PER_MM;

  if (guides.bleed3mm) {
    ctx.strokeStyle = hexWithAlpha(guideHex, 0.75);
    ctx.lineWidth = 0.75;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(
      pageRect.x - bleedOffset,
      pageRect.y - bleedOffset,
      pageRect.width + bleedOffset * 2,
      pageRect.height + bleedOffset * 2
    );
    ctx.setLineDash([]);
  }

  if (guides.trimLine) {
    ctx.strokeStyle = hexWithAlpha(guideHex, 0.85);
    ctx.lineWidth = 0.65;
    ctx.strokeRect(pageRect.x, pageRect.y, pageRect.width, pageRect.height);
  }

  if (guides.cropMarks) {
    ctx.strokeStyle = guideHex;
    ctx.lineWidth = 0.7;
    const gap = 4.0;
    const len = 14.0;
    const corners: [number, number, number, number][] = [
      [pageRect.x, pageRect.y, -1, -1],
      [pageRect.x + pageRect.width, pageRect.y, 1, -1],
      [pageRect.x, pageRect.y + pageRect.height, -1, 1],
      [pageRect.x + pageRect.width, pageRect.y + pageRect.height, 1, 1],
    ];
    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * gap, cy);
      ctx.lineTo(cx + sx * (gap + len), cy);
      ctx.moveTo(cx, cy + sy * gap);
      ctx.lineTo(cx, cy + sy * (gap + len));
      ctx.stroke();
    }
  }

  if (guides.centerMarks) {
    ctx.strokeStyle = guideHex;
    ctx.lineWidth = 0.65;
    const centers = [
      { x: pageRect.x + pageRect.width * 0.5, y: pageRect.y - 11 },
      { x: pageRect.x + pageRect.width * 0.5, y: pageRect.y + pageRect.height + 11 },
      { x: pageRect.x - 11, y: pageRect.y + pageRect.height * 0.5 },
      { x: pageRect.x + pageRect.width + 11, y: pageRect.y + pageRect.height * 0.5 },
    ];
    for (const c of centers) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x - 6, c.y);
      ctx.lineTo(c.x + 6, c.y);
      ctx.moveTo(c.x, c.y - 6);
      ctx.lineTo(c.x, c.y + 6);
      ctx.stroke();
    }
  }

  if (guides.centerLineV) {
    ctx.strokeStyle = hexWithAlpha(guideHex, 0.55);
    ctx.lineWidth = 0.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pageRect.x + pageRect.width * 0.5, pageRect.y);
    ctx.lineTo(pageRect.x + pageRect.width * 0.5, pageRect.y + pageRect.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (guides.centerLineH) {
    ctx.strokeStyle = hexWithAlpha(guideHex, 0.55);
    ctx.lineWidth = 0.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pageRect.x, pageRect.y + pageRect.height * 0.5);
    ctx.lineTo(pageRect.x + pageRect.width, pageRect.y + pageRect.height * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (guides.rulerMM) {
    ctx.strokeStyle = hexWithAlpha(guideHex, 0.75);
    ctx.lineWidth = 0.5;
    const totalWMM = Math.floor(pageRect.width / PT_PER_MM);
    for (let mm = 0; mm <= totalWMM; mm += 5) {
      const x = pageRect.x + mm * PT_PER_MM;
      const tick = mm % 10 === 0 ? 6.0 : 3.0;
      ctx.beginPath();
      ctx.moveTo(x, pageRect.y);
      ctx.lineTo(x, pageRect.y - tick);
      ctx.stroke();
    }
    const totalHMM = Math.floor(pageRect.height / PT_PER_MM);
    for (let mm = 0; mm <= totalHMM; mm += 5) {
      const y = pageRect.y + mm * PT_PER_MM;
      const tick = mm % 10 === 0 ? 6.0 : 3.0;
      ctx.beginPath();
      ctx.moveTo(pageRect.x, y);
      ctx.lineTo(pageRect.x - tick, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawSheetBackdrop(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  style: SheetBackgroundStyle
) {
  switch (style) {
    case "None":
      break;
    case "Warm Linen": {
      ctx.fillStyle = "#E6E0D5";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      const tex = getPaperTextureCanvas("Linen");
      if (tex) {
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        for (let ty = rect.y; ty < rect.y + rect.height; ty += 180) {
          for (let tx = rect.x; tx < rect.x + rect.width; tx += 180) {
            ctx.drawImage(tex, tx, ty, 180, 180);
          }
        }
        ctx.restore();
      }
      break;
    }
    case "Black":
      ctx.fillStyle = "#161615";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      break;
    case "Gray":
      ctx.fillStyle = "#D6D5D2";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      break;
    case "White + grid":
      ctx.fillStyle = "#FBFBF9";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      drawCuttingGrid(ctx, rect, "rgba(190,190,190,0.45)");
      break;
    case "Green + grid":
      ctx.fillStyle = "#2D5A47";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      drawCuttingGrid(ctx, rect, "rgba(235,240,236,0.22)");
      break;
  }
}

function drawCuttingGrid(ctx: CanvasRenderingContext2D, rect: Rect, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  const step = 20.0;
  for (let x = rect.x; x <= rect.x + rect.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, rect.y);
    ctx.lineTo(x, rect.y + rect.height);
    ctx.stroke();
  }
  for (let y = rect.y; y <= rect.y + rect.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(rect.x, y);
    ctx.lineTo(rect.x + rect.width, y);
    ctx.stroke();
  }
  ctx.restore();
}
