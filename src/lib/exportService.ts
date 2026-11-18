import { exportSheets } from "@/lib/imposition";
import {
  drawPrepressGuides,
  drawSheetSide,
  getSheetCanvasPointSize,
  renderSheetSideCanvas,
} from "@/lib/pageRenderer";
import { ensureAssetsDecoded } from "@/lib/risoEngine";
import {
  ExportLayoutMode,
  syncProjectPageCount,
  ZineProject,
} from "@/types/zine";
import { jsPDF } from "jspdf";
import JSZip from "jszip";

function sanitizeFilename(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "Zine";
  return trimmed.replace(/[/\\:?%*|"<>\s]+/g, "-");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality = 0.93
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas export failed"));
      },
      mime,
      quality
    );
  });
}

export async function exportProjectPDF(project: ZineProject): Promise<number> {
  await ensureAssetsDecoded(project.assets);
  const sides = exportSheets(
    project.exportSettings.layout,
    project.format.binding,
    project.pages.length
  );
  if (sides.length === 0) return 0;

  const firstSize = getSheetCanvasPointSize(project, sides[0], true);
  const firstOrient = firstSize.width >= firstSize.height ? "l" : "p";

  const doc = new jsPDF({
    orientation: firstOrient,
    unit: "pt",
    format: [firstSize.width, firstSize.height],
    compress: true,
  });

  for (let i = 0; i < sides.length; i++) {
    const side = sides[i];
    const pageSize = getSheetCanvasPointSize(project, side, true);
    if (i > 0) {
      doc.addPage(
        [pageSize.width, pageSize.height],
        pageSize.width >= pageSize.height ? "l" : "p"
      );
    }

    const canvas = renderSheetSideCanvas(project, side, 1900, true, {
      includeGuides: project.bleedGuides.includeInPDF,
      renderSpineHardware:
        project.exportSettings.layout === "Spread" &&
        project.exportSettings.sheetBackground !== "None",
      separationInk: null,
      maxPhotoDimension: 1600,
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
    doc.addImage(dataUrl, "JPEG", 0, 0, pageSize.width, pageSize.height, undefined, "FAST");
  }

  const safeTitle = sanitizeFilename(project.title);
  const layoutName = sanitizeFilename(project.exportSettings.layout);
  doc.save(`${safeTitle}-${layoutName}.pdf`);
  return sides.length;
}

export async function exportProjectJPEGs(
  project: ZineProject,
  onlyIndex?: number
): Promise<number> {
  await ensureAssetsDecoded(project.assets);
  const mode: ExportLayoutMode =
    project.exportSettings.layout === "Spread" ? "Spread" : "Single page";
  const sides = exportSheets(mode, project.format.binding, project.pages.length);
  const safeTitle = sanitizeFilename(project.title);
  const unitName = mode === "Spread" ? "spread" : "page";

  if (onlyIndex !== undefined) {
    const side = sides[onlyIndex];
    if (!side) return 0;
    const canvas = renderSheetSideCanvas(project, side, 1900, true, {
      includeGuides: project.bleedGuides.includeInPDF,
      renderSpineHardware: true,
      maxPhotoDimension: 1500,
    });
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.93);
    const suffix = String(onlyIndex + 1).padStart(2, "0");
    triggerDownload(blob, `${safeTitle}-${unitName}-${suffix}.jpg`);
    return 1;
  }

  const zip = new JSZip();
  for (let i = 0; i < sides.length; i++) {
    const canvas = renderSheetSideCanvas(project, sides[i], 1900, true, {
      includeGuides: project.bleedGuides.includeInPDF,
      renderSpineHardware: true,
      maxPhotoDimension: 1500,
    });
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.93);
    const suffix = String(i + 1).padStart(2, "0");
    zip.file(`${safeTitle}-${unitName}-${suffix}.jpg`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, `${safeTitle}-${unitName}-JPGs.zip`);
  return sides.length;
}

export async function exportRisoSeparations(
  project: ZineProject,
  inks: string[]
): Promise<number> {
  await ensureAssetsDecoded(project.assets);
  const unitMode: ExportLayoutMode = project.exportSettings.separationUnitSpread
    ? "Spread"
    : "Single page";
  const sides = exportSheets(unitMode, project.format.binding, project.pages.length);
  if (sides.length === 0 || inks.length === 0) return 0;

  const safeTitle = sanitizeFilename(project.title);

  if (project.exportSettings.separationFormat === "PDF") {
    const zip = new JSZip();
    let singlePdfDoc: jsPDF | null = null;
    let singlePdfName = "";

    for (const inkName of inks) {
      const safeInk = sanitizeFilename(inkName);
      const cropPad = project.exportSettings.separationCropMarks ? 28.0 : 0.0;
      const firstBase = getSheetCanvasPointSize(project, sides[0], false);
      const firstFullW = firstBase.width + cropPad * 2;
      const firstFullH = firstBase.height + cropPad * 2;

      const doc = new jsPDF({
        orientation: firstFullW >= firstFullH ? "l" : "p",
        unit: "pt",
        format: [firstFullW, firstFullH],
        compress: true,
      });

      for (let sIdx = 0; sIdx < sides.length; sIdx++) {
        const side = sides[sIdx];
        const sSize = getSheetCanvasPointSize(project, side, false);
        const fullW = sSize.width + cropPad * 2;
        const fullH = sSize.height + cropPad * 2;
        if (sIdx > 0) {
          doc.addPage([fullW, fullH], fullW >= fullH ? "l" : "p");
        }

        const scale = Math.max(1.5, 1700 / Math.max(fullW, fullH, 1));
        const plateCanvas = document.createElement("canvas");
        plateCanvas.width = Math.round(fullW * scale);
        plateCanvas.height = Math.round(fullH * scale);
        const pCtx = plateCanvas.getContext("2d");
        if (pCtx) {
          pCtx.save();
          pCtx.scale(scale, scale);
          pCtx.fillStyle = "#FFFFFF";
          pCtx.fillRect(0, 0, fullW, fullH);
          pCtx.translate(cropPad, cropPad);
          drawSheetSide(
            pCtx,
            project,
            side,
            { x: 0, y: 0, width: sSize.width, height: sSize.height },
            false,
            {
              includeGuides: false,
              renderSpineHardware: false,
              separationInk: inkName,
              separationPlateStyle: project.exportSettings.separationPlateStyle,
              maxPhotoDimension: 1500,
            }
          );
          if (project.exportSettings.separationCropMarks) {
            drawPrepressGuides(
              pCtx,
              { x: 0, y: 0, width: sSize.width, height: sSize.height },
              {
                bleed3mm: false,
                trimLine: false,
                cropMarks: true,
                centerMarks: true,
                centerLineV: false,
                centerLineH: false,
                rulerMM: false,
                includeInPDF: true,
                lineColorHex: "#000000",
              }
            );
          }
          pCtx.restore();
        }

        const dataUrl = plateCanvas.toDataURL("image/jpeg", 0.94);
        doc.addImage(dataUrl, "JPEG", 0, 0, fullW, fullH, undefined, "FAST");
      }

      const filename = `${safeTitle}-PLATE-${safeInk}.pdf`;
      if (inks.length === 1) {
        singlePdfDoc = doc;
        singlePdfName = filename;
      } else {
        const pdfBlob = doc.output("blob");
        zip.file(filename, pdfBlob);
      }
    }

    if (singlePdfDoc) {
      singlePdfDoc.save(singlePdfName);
      return 1;
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    triggerDownload(zipBlob, `${safeTitle}-RISO-PLATES-PDF.zip`);
    return inks.length;
  }

  // PNG sequence export bundled into a ZIP
  const zip = new JSZip();
  let count = 0;
  for (const inkName of inks) {
    const safeInk = sanitizeFilename(inkName);
    for (let sIdx = 0; sIdx < sides.length; sIdx++) {
      const side = sides[sIdx];
      const canvas = renderSheetSideCanvas(project, side, 1650, false, {
        includeGuides: false,
        renderSpineHardware: false,
        separationInk: inkName,
        separationPlateStyle: project.exportSettings.separationPlateStyle,
        maxPhotoDimension: 1500,
      });
      const blob = await canvasToBlob(canvas, "image/png");
      const num = String(sIdx + 1).padStart(2, "0");
      zip.file(`${safeTitle}-${safeInk}-${num}.png`, blob);
      count++;
    }
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, `${safeTitle}-RISO-PLATES-PNG.zip`);
  return count;
}

export function exportProjectJSON(project: ZineProject) {
  const safeTitle = sanitizeFilename(project.title);
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  triggerDownload(blob, `${safeTitle}-project.json`);
}

export async function parseProjectJSONFile(file: File): Promise<ZineProject> {
  const text = await file.text();
  const raw = JSON.parse(text);
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.pages)) {
    throw new Error("无效的工程文件格式");
  }
  const imported: ZineProject = syncProjectPageCount({
    ...raw,
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  });
  return imported;
}
