import {
  BindingType,
  ExportLayoutMode,
  normalizePageCount,
} from "@/types/zine";

export interface PlacedPageSlot {
  id: string;
  row: number;
  col: number;
  /** 0-based index into project.pages; null = blank cover partner */
  pageIndex: number | null;
  rotated180: boolean;
  displayPageNumber: string;
}

export interface PhysicalSheetSide {
  id: string;
  label: string;
  columns: number;
  rows: number;
  slots: PlacedPageSlot[];
  hasCenterFoldV: boolean;
  hasMiniZineSlit: boolean;
}

export interface PhysicalBindingSheet {
  sheetNumber: number; // 1-based
  signatureNote: string;
  front: PhysicalSheetSide;
  back: PhysicalSheetSide | null;
}

export interface ReaderSpreadItem {
  index: number;
  leftPageIndex: number | null;
  rightPageIndex: number | null;
  title: string;
}

function makeSlot(
  row: number,
  col: number,
  pageIndex: number | null,
  rotated180 = false
): PlacedPageSlot {
  return {
    id: `${row}-${col}-${pageIndex ?? -1}`,
    row,
    col,
    pageIndex,
    rotated180,
    displayPageNumber: pageIndex === null ? "—" : `${pageIndex + 1}`,
  };
}

function makeSpreadTitle(left: number | null, right: number | null): string {
  if (left === null && right !== null) return `封面 · P${right + 1}`;
  if (left !== null && right === null) return `封底 · P${left + 1}`;
  if (left !== null && right !== null) return `P${left + 1} – P${right + 1}`;
  return "空白跨页";
}

export function readerSpreads(pageCount: number): ReaderSpreadItem[] {
  if (pageCount <= 0) return [];
  const result: ReaderSpreadItem[] = [];
  result.push({
    index: 0,
    leftPageIndex: null,
    rightPageIndex: 0,
    title: makeSpreadTitle(null, 0),
  });
  let p = 1;
  let spreadIdx = 1;
  while (p < pageCount) {
    if (p + 1 < pageCount) {
      result.push({
        index: spreadIdx,
        leftPageIndex: p,
        rightPageIndex: p + 1,
        title: makeSpreadTitle(p, p + 1),
      });
      p += 2;
    } else {
      result.push({
        index: spreadIdx,
        leftPageIndex: p,
        rightPageIndex: null,
        title: makeSpreadTitle(p, null),
      });
      p += 1;
    }
    spreadIdx += 1;
  }
  return result;
}

export function spreadIndexForPage(pageIndex: number): number {
  if (pageIndex <= 0) return 0;
  return Math.floor((pageIndex + 1) / 2);
}

export function bindingSheets(
  binding: BindingType,
  rawCount: number
): PhysicalBindingSheet[] {
  const count = normalizePageCount(binding, rawCount);

  if (binding === "miniFold8") {
    const slots: PlacedPageSlot[] = [
      makeSlot(0, 0, 4, true),
      makeSlot(0, 1, 3, true),
      makeSlot(0, 2, 2, true),
      makeSlot(0, 3, 1, true),
      makeSlot(1, 0, 5, false),
      makeSlot(1, 1, 6, false),
      makeSlot(1, 2, 7, false),
      makeSlot(1, 3, 0, false),
    ];
    return [
      {
        sheetNumber: 1,
        signatureNote: "单张双折 · 中缝半裁免钉成册",
        front: {
          id: "s1-front",
          label: "单面印张 (印后沿中横线剪开中段折叠)",
          columns: 4,
          rows: 2,
          slots,
          hasCenterFoldV: true,
          hasMiniZineSlit: true,
        },
        back: null,
      },
    ];
  }

  if (binding === "saddle" || binding === "sewing") {
    const sheetTotal = Math.max(1, Math.floor(count / 4));
    return Array.from({ length: sheetTotal }, (_, s) => {
      const frontLeft = count - 1 - 2 * s;
      const frontRight = 2 * s;
      const backLeft = 2 * s + 1;
      const backRight = count - 2 - 2 * s;
      return {
        sheetNumber: s + 1,
        signatureNote:
          s === 0 ? "外层封面印张 · 对折嵌套" : `第 ${s + 1} 层内芯印张 · 对折嵌套`,
        front: {
          id: `s${s + 1}-f`,
          label: "正面 Front",
          columns: 2,
          rows: 1,
          slots: [makeSlot(0, 0, frontLeft), makeSlot(0, 1, frontRight)],
          hasCenterFoldV: true,
          hasMiniZineSlit: false,
        },
        back: {
          id: `s${s + 1}-b`,
          label: "背面 Back",
          columns: 2,
          rows: 1,
          slots: [makeSlot(0, 0, backLeft), makeSlot(0, 1, backRight)],
          hasCenterFoldV: true,
          hasMiniZineSlit: false,
        },
      };
    });
  }

  // stab, perfect, thread, japanese, ring -> duplex leaves
  const leafCount = Math.max(1, Math.floor(count / 2));
  return Array.from({ length: leafCount }, (_, leaf) => {
    const frontIdx = leaf * 2;
    const backIdx = leaf * 2 + 1;
    const sigNumber = Math.floor(leaf / 8) + 1;
    let note = `平订双面单叶 · 页 ${frontIdx + 1}/${backIdx + 1}`;
    if (binding === "thread") {
      note = `第 ${sigNumber} 折手锁线叶 · 页 ${frontIdx + 1}/${backIdx + 1}`;
    } else if (binding === "japanese") {
      note = `四目古线装单叶 · 页 ${frontIdx + 1}/${backIdx + 1}`;
    } else if (binding === "ring") {
      note = `打孔活页单张 · 页 ${frontIdx + 1}/${backIdx + 1}`;
    } else if (binding === "perfect") {
      note = `无线胶装铣背单叶 · 页 ${frontIdx + 1}/${backIdx + 1}`;
    }

    return {
      sheetNumber: leaf + 1,
      signatureNote: note,
      front: {
        id: `l${leaf + 1}-f`,
        label: `正面 Recto (P${frontIdx + 1})`,
        columns: 1,
        rows: 1,
        slots: [makeSlot(0, 0, frontIdx)],
        hasCenterFoldV: false,
        hasMiniZineSlit: false,
      },
      back: {
        id: `l${leaf + 1}-b`,
        label: `背面 Verso (P${backIdx + 1})`,
        columns: 1,
        rows: 1,
        slots: [makeSlot(0, 0, backIdx)],
        hasCenterFoldV: false,
        hasMiniZineSlit: false,
      },
    };
  });
}

function nUpSheets(
  pageCount: number,
  columns: number,
  rows: number,
  prefix: string
): PhysicalSheetSide[] {
  const perSheet = columns * rows;
  const sheetCount = Math.max(1, Math.ceil(pageCount / perSheet));
  return Array.from({ length: sheetCount }, (_, s) => {
    const slots: PlacedPageSlot[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const p = s * perSheet + r * columns + c;
        slots.push(makeSlot(r, c, p < pageCount ? p : null, false));
      }
    }
    return {
      id: `${prefix}-${s + 1}`,
      label: `${prefix} · Sheet ${s + 1}`,
      columns,
      rows,
      slots,
      hasCenterFoldV: false,
      hasMiniZineSlit: false,
    };
  });
}

export function exportSheets(
  mode: ExportLayoutMode,
  binding: BindingType,
  pageCount: number
): PhysicalSheetSide[] {
  switch (mode) {
    case "Single page":
      return Array.from({ length: pageCount }, (_, idx) => ({
        id: `single-${idx}`,
        label: `Page ${String(idx + 1).padStart(2, "0")}`,
        columns: 1,
        rows: 1,
        slots: [makeSlot(0, 0, idx)],
        hasCenterFoldV: false,
        hasMiniZineSlit: false,
      }));

    case "Spread": {
      const spreads = readerSpreads(pageCount);
      return spreads.map((sp) => ({
        id: `spread-${sp.index}`,
        label: sp.title,
        columns: 2,
        rows: 1,
        slots: [
          makeSlot(0, 0, sp.leftPageIndex),
          makeSlot(0, 1, sp.rightPageIndex),
        ],
        hasCenterFoldV: true,
        hasMiniZineSlit: false,
      }));
    }

    case "Binding sheets": {
      const physical = bindingSheets(binding, pageCount);
      const sides: PhysicalSheetSide[] = [];
      for (const sheet of physical) {
        sides.push({
          ...sheet.front,
          id: `imp-${sheet.sheetNumber}-f`,
          label: `印张 ${sheet.sheetNumber} · ${sheet.front.label}`,
        });
        if (sheet.back) {
          sides.push({
            ...sheet.back,
            id: `imp-${sheet.sheetNumber}-b`,
            label: `印张 ${sheet.sheetNumber} · ${sheet.back.label}`,
          });
        }
      }
      return sides;
    }

    case "4-up":
      return nUpSheets(pageCount, 2, 2, "4-up");

    case "8-up":
      return nUpSheets(pageCount, 4, 2, "8-up");

    case "All pages · 1 sheet": {
      const spreads = readerSpreads(pageCount);
      const cols = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(spreads.length)))) * 2;
      const spreadCols = cols / 2;
      const rows = Math.max(1, Math.ceil(spreads.length / spreadCols));
      const slots: PlacedPageSlot[] = [];
      for (let r = 0; r < rows; r++) {
        for (let sc = 0; sc < spreadCols; sc++) {
          const idx = r * spreadCols + sc;
          if (idx < spreads.length) {
            const sp = spreads[idx];
            slots.push(makeSlot(r, sc * 2, sp.leftPageIndex));
            slots.push(makeSlot(r, sc * 2 + 1, sp.rightPageIndex));
          } else {
            slots.push(makeSlot(r, sc * 2, null));
            slots.push(makeSlot(r, sc * 2 + 1, null));
          }
        }
      }
      return [
        {
          id: "all-1-sheet",
          label: `全书一图总览 (${pageCount}P)`,
          columns: cols,
          rows,
          slots,
          hasCenterFoldV: false,
          hasMiniZineSlit: false,
        },
      ];
    }
  }
}
