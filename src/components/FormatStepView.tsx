"use client";

import { SheetSideCanvas } from "@/components/RenderedCanvas";
import { bindingSheets, PhysicalSheetSide } from "@/lib/imposition";
import { getPaperTextureDataUrl } from "@/lib/paperTexture";
import { useStudio } from "@/store/studioStore";
import {
  BINDING_CATALOG,
  BindingType,
  getBindingMeta,
  getPageSizeMM,
  getPaperColorOption,
  getPaperStockMeta,
  getSpineThicknessMM,
  normalizePageCount,
  PAGE_SIZE_PRESETS,
  PAPER_COLOR_CATALOG,
  PAPER_STOCK_CATALOG,
} from "@/types/zine";
import { ArrowRight } from "lucide-react";
import React, { useMemo, useState } from "react";

export const FormatStepView: React.FC = () => {
  const store = useStudio();
  const { palette, project } = store;
  const format = project.format;

  const [selectedSheetTab, setSelectedSheetTab] = useState(0);
  const [showBackSide, setShowBackSide] = useState(false);
  const [customPageInput, setCustomPageInput] = useState("");

  const sheets = useMemo(
    () => bindingSheets(format.binding, format.pageCount),
    [format.binding, format.pageCount]
  );
  const bindingMeta = getBindingMeta(format.binding);
  const mm = getPageSizeMM(format);
  const spineMM = getSpineThicknessMM(format);
  const paperColor = getPaperColorOption(format.paperColorName);
  const paperStockMeta = getPaperStockMeta(format.paperStock);

  const activeSheet =
    selectedSheetTab > 0 && selectedSheetTab <= sheets.length
      ? sheets[selectedSheetTab - 1]
      : null;
  const activeSide = activeSheet
    ? (showBackSide ? activeSheet.back : null) ?? activeSheet.front
    : null;

  return (
    <div className="h-full overflow-y-auto px-6 py-7 md:px-12">
      <div className="mx-auto max-w-6xl space-y-6 pb-14">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div
              className="text-[11px] font-semibold tracking-[0.18em]"
              style={{ color: palette.inkSecondary }}
            >
              02 · FORMAT & BINDING
            </div>
            <h2
              className="text-2xl md:text-3xl font-bold"
              style={{
                fontFamily: '"Songti SC", "STSong", "Noto Serif SC", Georgia, serif',
                color: palette.inkPrimary,
              }}
            >
              开本、纸张与装帧结构
            </h2>
            <p className="text-xs md:text-sm" style={{ color: palette.inkSecondary }}>
              挑选装订工艺、裁切尺寸与特种纸肌理，实时预览印厂折手与印张正反面排布。
            </p>
          </div>

          <button
            onClick={() => store.setStage("design")}
            className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold text-white transition hover:brightness-105 active:opacity-80 cursor-pointer"
            style={{ backgroundColor: palette.accent }}
          >
            <span>进入画布创作</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Live Spec Ribbon */}
        <div
          className="flex flex-wrap items-center gap-6 rounded-2xl px-5 py-3.5"
          style={{
            backgroundColor: palette.cardSurface,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          {[
            ["装帧", bindingMeta.nameCN],
            ["页数 / 印张", `${format.pageCount}P · ${sheets.length} 张纸`],
            ["成品尺寸", `${Math.round(mm.width)} × ${Math.round(mm.height)} mm`],
            ["纸张", `${paperColor.nameCN} · ${paperStockMeta.nameCN}`],
            [
              "印刷模拟",
              project.printSettings.mode === "Risograph"
                ? "孔版印刷 Risograph"
                : project.printSettings.mode === "Offset"
                ? "传统胶印 Offset"
                : "数码快印 Digital",
            ],
          ].map(([label, val], idx) => (
            <React.Fragment key={label}>
              {idx > 0 && (
                <div
                  className="hidden sm:block h-6 w-px"
                  style={{ backgroundColor: palette.hairline }}
                />
              )}
              <div>
                <div className="text-[10.5px]" style={{ color: palette.inkMuted }}>
                  {label}
                </div>
                <div
                  className="text-xs font-semibold mt-0.5"
                  style={{ color: palette.inkPrimary }}
                >
                  {val}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* 1. Binding Selection Grid */}
        <section
          className="rounded-3xl p-5 space-y-4"
          style={{
            backgroundColor: palette.cardSurface,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          <div>
            <div className="text-xs font-semibold" style={{ color: palette.inkPrimary }}>
              装订方式 Binding
            </div>
            <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
              不同装订会自动匹配合规页数步进与印张折手算法
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {BINDING_CATALOG.map((b) => {
              const selected = format.binding === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    store.mutateProject((draft) => {
                      draft.format.binding = b.id;
                      draft.format.pageCount = normalizePageCount(
                        b.id,
                        draft.format.pageCount
                      );
                      return draft;
                    });
                    setSelectedSheetTab(0);
                  }}
                  className="flex flex-col justify-between rounded-2xl p-3.5 text-left transition cursor-pointer"
                  style={{
                    backgroundColor: selected
                      ? palette.cardElevated
                      : palette.deskSurface,
                    border: selected
                      ? `1.8px solid ${palette.accent}`
                      : `1px solid ${palette.hairline}`,
                  }}
                >
                  <div className="flex items-start justify-between w-full mb-2.5">
                    <BindingMiniSVG
                      binding={b.id}
                      stroke={selected ? palette.accent : palette.inkPrimary}
                    />
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
                      style={{
                        backgroundColor: selected
                          ? "rgba(210,88,54,0.12)"
                          : palette.deskSecondary,
                        color: selected ? palette.accent : palette.inkSecondary,
                      }}
                    >
                      {b.badgeText}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: palette.inkPrimary }}
                      >
                        {b.nameCN}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: palette.inkMuted }}
                      >
                        {b.nameEN}
                      </span>
                    </div>
                    <p
                      className="mt-1 text-[11.5px] leading-snug line-clamp-2"
                      style={{ color: palette.inkSecondary }}
                    >
                      {b.summary}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Page Count & Dimensions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Page Count */}
          <section
            className="rounded-3xl p-5 space-y-4"
            style={{
              backgroundColor: palette.cardSurface,
              border: `1px solid ${palette.hairline}`,
            }}
          >
            <div>
              <div className="text-xs font-semibold" style={{ color: palette.inkPrimary }}>
                总页数 Pages ({format.pageCount}P)
              </div>
              <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
                {format.binding === "miniFold8"
                  ? "一纸八页折页固定为单张 8 页"
                  : `范围 ${bindingMeta.minPages}–${bindingMeta.maxPages}P · 步进 ${bindingMeta.pageStep}P`}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {bindingMeta.presetPageCounts.map((count) => {
                const selected = format.pageCount === count;
                return (
                  <button
                    key={count}
                    onClick={() =>
                      store.mutateProject((draft) => {
                        draft.format.pageCount = count;
                        return draft;
                      })
                    }
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition cursor-pointer"
                    style={{
                      backgroundColor: selected
                        ? palette.accentInkPill
                        : palette.cardElevated,
                      color: selected
                        ? palette.accentInkPillForeground
                        : palette.inkPrimary,
                      border: selected
                        ? "1px solid transparent"
                        : `1px solid ${palette.hairline}`,
                    }}
                  >
                    {count}P
                  </button>
                );
              })}
            </div>

            {format.binding !== "miniFold8" && (
              <div
                className="flex flex-wrap items-center justify-between gap-3 pt-3"
                style={{ borderTop: `1px solid ${palette.hairline}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: palette.inkSecondary }}>
                    步进微调
                  </span>
                  <button
                    disabled={format.pageCount <= bindingMeta.minPages}
                    onClick={() =>
                      store.mutateProject((draft) => {
                        draft.format.pageCount = normalizePageCount(
                          draft.format.binding,
                          draft.format.pageCount - bindingMeta.pageStep
                        );
                        return draft;
                      })
                    }
                    className="h-7 w-7 rounded-full text-xs font-bold disabled:opacity-30 cursor-pointer"
                    style={{
                      backgroundColor: palette.cardElevated,
                      border: `1px solid ${palette.hairline}`,
                    }}
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-semibold px-1">
                    {format.pageCount} 页
                  </span>
                  <button
                    disabled={format.pageCount >= bindingMeta.maxPages}
                    onClick={() =>
                      store.mutateProject((draft) => {
                        draft.format.pageCount = normalizePageCount(
                          draft.format.binding,
                          draft.format.pageCount + bindingMeta.pageStep
                        );
                        return draft;
                      })
                    }
                    className="h-7 w-7 rounded-full text-xs font-bold disabled:opacity-30 cursor-pointer"
                    style={{
                      backgroundColor: palette.cardElevated,
                      border: `1px solid ${palette.hairline}`,
                    }}
                  >
                    +
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const parsed = parseInt(customPageInput, 10);
                    if (!Number.isNaN(parsed)) {
                      store.mutateProject((draft) => {
                        draft.format.pageCount = normalizePageCount(
                          draft.format.binding,
                          parsed
                        );
                        return draft;
                      });
                      setCustomPageInput("");
                    }
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="number"
                    value={customPageInput}
                    onChange={(e) => setCustomPageInput(e.target.value)}
                    placeholder="输入页数"
                    className="w-24 rounded-lg px-2.5 py-1 text-xs outline-none"
                    style={{
                      backgroundColor: palette.cardElevated,
                      border: `1px solid ${palette.hairline}`,
                      color: palette.inkPrimary,
                    }}
                  />
                  <button
                    type="submit"
                    className="rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer"
                    style={{
                      backgroundColor: palette.deskSecondary,
                      color: palette.inkPrimary,
                    }}
                  >
                    设定
                  </button>
                </form>
              </div>
            )}
          </section>

          {/* Trim Dimensions & Orientation */}
          <section
            className="rounded-3xl p-5 space-y-4"
            style={{
              backgroundColor: palette.cardSurface,
              border: `1px solid ${palette.hairline}`,
            }}
          >
            <div>
              <div className="text-xs font-semibold" style={{ color: palette.inkPrimary }}>
                裁切尺寸与方向 Size & Orientation
              </div>
              <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
                {Math.round(mm.width)} × {Math.round(mm.height)} mm · 预估书脊厚{" "}
                {spineMM.toFixed(1)} mm
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {PAGE_SIZE_PRESETS.map((preset) => {
                const selected = format.sizePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() =>
                      store.mutateProject((draft) => {
                        draft.format.sizePreset = preset.id;
                        return draft;
                      })
                    }
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition cursor-pointer"
                    style={{
                      backgroundColor: selected
                        ? palette.accentInkPill
                        : palette.cardElevated,
                      color: selected
                        ? palette.accentInkPillForeground
                        : palette.inkPrimary,
                      border: selected
                        ? "1px solid transparent"
                        : `1px solid ${palette.hairline}`,
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {format.sizePreset === "Custom" ? (
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                <label className="flex items-center gap-1.5">
                  <span style={{ color: palette.inkSecondary }}>宽 W</span>
                  <input
                    type="number"
                    min={50}
                    max={420}
                    value={format.customWidthMM}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      store.mutateProject((draft) => {
                        draft.format.customWidthMM = Math.min(420, Math.max(50, v || 50));
                        return draft;
                      });
                    }}
                    className="w-20 rounded-lg px-2.5 py-1 outline-none"
                    style={{
                      backgroundColor: palette.cardElevated,
                      border: `1px solid ${palette.hairline}`,
                    }}
                  />
                  <span style={{ color: palette.inkMuted }}>mm</span>
                </label>

                <label className="flex items-center gap-1.5">
                  <span style={{ color: palette.inkSecondary }}>高 H</span>
                  <input
                    type="number"
                    min={50}
                    max={594}
                    value={format.customHeightMM}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      store.mutateProject((draft) => {
                        draft.format.customHeightMM = Math.min(594, Math.max(50, v || 50));
                        return draft;
                      });
                    }}
                    className="w-20 rounded-lg px-2.5 py-1 outline-none"
                    style={{
                      backgroundColor: palette.cardElevated,
                      border: `1px solid ${palette.hairline}`,
                    }}
                  />
                  <span style={{ color: palette.inkMuted }}>mm</span>
                </label>
              </div>
            ) : format.sizePreset !== "Square" ? (
              <div className="flex items-center gap-2 pt-1">
                {(
                  [
                    ["portrait", "竖版 Portrait"],
                    ["landscape", "横版 Landscape"],
                  ] as const
                ).map(([id, label]) => {
                  const selected = format.orientation === id;
                  return (
                    <button
                      key={id}
                      onClick={() =>
                        store.mutateProject((draft) => {
                          draft.format.orientation = id;
                          return draft;
                        })
                      }
                      className="rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer"
                      style={{
                        backgroundColor: selected
                          ? palette.accentInkPill
                          : palette.cardElevated,
                        color: selected
                          ? palette.accentInkPillForeground
                          : palette.inkPrimary,
                        border: selected
                          ? "1px solid transparent"
                          : `1px solid ${palette.hairline}`,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>

        {/* 3. 12 Paper Stocks & 24 Paper Colors */}
        <section
          className="rounded-3xl p-5 space-y-5"
          style={{
            backgroundColor: palette.cardSurface,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold" style={{ color: palette.inkPrimary }}>
                纸张材质与纸色 Paper Stock & Color
              </div>
              <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
                共 12 款特种纸肌理与 24 色原浆纸底，硫酸描图纸支持真实背页透影叠印
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={format.backgroundIndependentPhotos}
                onChange={(e) =>
                  store.mutateProject((draft) => {
                    draft.format.backgroundIndependentPhotos = e.target.checked;
                    return draft;
                  })
                }
                className="accent-[#D25836]"
              />
              <span style={{ color: palette.inkSecondary }}>
                照片色彩独立于纸色 (白墨托底)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {PAPER_STOCK_CATALOG.map((stock) => {
              const selected = format.paperStock === stock.id;
              const texUrl = getPaperTextureDataUrl(stock.id);
              return (
                <button
                  key={stock.id}
                  onClick={() =>
                    store.mutateProject((draft) => {
                      draft.format.paperStock = stock.id;
                      return draft;
                    })
                  }
                  className="flex items-center gap-2.5 rounded-xl p-2.5 text-left transition cursor-pointer"
                  style={{
                    backgroundColor: selected
                      ? palette.cardElevated
                      : palette.deskSurface,
                    border: selected
                      ? `1.6px solid ${palette.accent}`
                      : `1px solid ${palette.hairline}`,
                  }}
                >
                  <div
                    className="relative h-7 w-7 shrink-0 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: paperColor.hex,
                      border: "1px solid rgba(0,0,0,0.14)",
                    }}
                  >
                    {texUrl && (
                      <div
                        className="absolute inset-0 mix-blend-multiply"
                        style={{
                          backgroundImage: `url(${texUrl})`,
                          backgroundSize: "64px 64px",
                        }}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="truncate text-xs font-semibold"
                      style={{ color: palette.inkPrimary }}
                    >
                      {stock.nameCN}
                    </div>
                    <div
                      className="truncate text-[10.5px]"
                      style={{ color: palette.inkSecondary }}
                    >
                      {stock.note}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className="pt-4 space-y-2.5"
            style={{ borderTop: `1px solid ${palette.hairline}` }}
          >
            <div className="text-xs font-medium" style={{ color: palette.inkSecondary }}>
              纸色：{paperColor.nameCN} ({paperColor.name})
            </div>
            <div className="flex flex-wrap gap-2.5">
              {PAPER_COLOR_CATALOG.map((opt) => {
                const chosen = format.paperColorName === opt.name;
                return (
                  <button
                    key={opt.name}
                    title={`${opt.nameCN} · ${opt.name}`}
                    onClick={() =>
                      store.mutateProject((draft) => {
                        draft.format.paperColorName = opt.name;
                        return draft;
                      })
                    }
                    className="h-7 w-7 rounded-full transition-transform cursor-pointer"
                    style={{
                      backgroundColor: opt.hex,
                      transform: chosen ? "scale(1.15)" : "scale(1)",
                      border: chosen
                        ? `2.5px solid ${palette.accent}`
                        : "1px solid rgba(0,0,0,0.16)",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Interactive Physical Binding Sheet Imposition Preview */}
        <section
          className="rounded-3xl p-5 space-y-4"
          style={{
            backgroundColor: palette.cardSurface,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold" style={{ color: palette.inkPrimary }}>
                印张折手排布预览 Binding Layout ({sheets.length} 张物理印张)
              </div>
              <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
                直观检视每一张物理印纸正反面的落版页码、180° 倒置关系与中缝半裁线
              </div>
            </div>

            {activeSheet?.back && (
              <div className="flex items-center gap-1.5">
                {[
                  [false, "正面 Front"],
                  [true, "背面 Back"],
                ].map(([isBack, label]) => {
                  const sel = showBackSide === isBack;
                  return (
                    <button
                      key={String(label)}
                      onClick={() => setShowBackSide(Boolean(isBack))}
                      className="rounded-full px-3 py-1 text-xs font-medium cursor-pointer"
                      style={{
                        backgroundColor: sel
                          ? palette.accentInkPill
                          : palette.cardElevated,
                        color: sel
                          ? palette.accentInkPillForeground
                          : palette.inkPrimary,
                        border: sel
                          ? "1px solid transparent"
                          : `1px solid ${palette.hairline}`,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sheet Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedSheetTab(0)}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer"
              style={{
                backgroundColor:
                  selectedSheetTab === 0
                    ? palette.accentInkPill
                    : palette.cardElevated,
                color:
                  selectedSheetTab === 0
                    ? palette.accentInkPillForeground
                    : palette.inkPrimary,
                border:
                  selectedSheetTab === 0
                    ? "1px solid transparent"
                    : `1px solid ${palette.hairline}`,
              }}
            >
              全部印张 ({sheets.length})
            </button>
            {sheets.map((s) => {
              const sel = selectedSheetTab === s.sheetNumber;
              return (
                <button
                  key={s.sheetNumber}
                  onClick={() => setSelectedSheetTab(s.sheetNumber)}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor: sel
                      ? palette.accentInkPill
                      : palette.cardElevated,
                    color: sel
                      ? palette.accentInkPillForeground
                      : palette.inkPrimary,
                    border: sel
                      ? "1px solid transparent"
                      : `1px solid ${palette.hairline}`,
                  }}
                >
                  印张 {s.sheetNumber}
                </button>
              );
            })}
          </div>

          {selectedSheetTab === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sheets.map((sheet) => (
                <button
                  key={sheet.sheetNumber}
                  onClick={() => setSelectedSheetTab(sheet.sheetNumber)}
                  className="rounded-2xl p-3.5 text-left transition hover:brightness-98 cursor-pointer space-y-2.5"
                  style={{
                    backgroundColor: palette.deskSurface,
                    border: `1px solid ${palette.hairline}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold"
                      style={{ color: palette.inkPrimary }}
                    >
                      印张 {sheet.sheetNumber}
                    </span>
                    <span
                      className="text-[10.5px]"
                      style={{ color: palette.inkSecondary }}
                    >
                      {sheet.signatureNote}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <MiniSheetMatrix
                      side={sheet.front}
                      title="正面"
                      paperHex={paperColor.hex}
                    />
                    {sheet.back && (
                      <MiniSheetMatrix
                        side={sheet.back}
                        title="背面"
                        paperHex={paperColor.hex}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : activeSheet && activeSide ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl p-6 space-y-3"
              style={{ backgroundColor: palette.deskSurface }}
            >
              <SheetSideCanvas
                project={project}
                sheetSide={activeSide}
                pixelMaxDimension={980}
                className="max-h-[380px] max-w-full object-contain shadow-md rounded-[2px]"
              />
              <div
                className="text-xs font-medium"
                style={{ color: palette.inkSecondary }}
              >
                印张 {activeSheet.sheetNumber} · {activeSheet.signatureNote} · 当前显示：
                {activeSide.label}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

const MiniSheetMatrix: React.FC<{
  side: PhysicalSheetSide;
  title: string;
  paperHex: string;
}> = ({ side, title, paperHex }) => {
  const { palette } = useStudio();
  return (
    <div className="space-y-1 text-center">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${side.columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: side.rows }).map((_, r) =>
          Array.from({ length: side.columns }).map((__, c) => {
            const slot = side.slots.find((s) => s.row === r && s.col === c);
            return (
              <div
                key={`${r}-${c}`}
                className="flex items-center justify-center rounded border font-mono text-[10px] font-semibold"
                style={{
                  height: side.rows > 1 ? 30 : 52,
                  backgroundColor: paperHex,
                  borderColor: "rgba(0,0,0,0.15)",
                  color: "#23201D",
                }}
              >
                <span
                  style={{
                    transform: slot?.rotated180 ? "rotate(180deg)" : undefined,
                  }}
                >
                  {slot?.displayPageNumber ?? "—"}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="text-[10px]" style={{ color: palette.inkMuted }}>
        {title}
      </div>
    </div>
  );
};

const BindingMiniSVG: React.FC<{ binding: BindingType; stroke: string }> = ({
  binding,
  stroke,
}) => {
  return (
    <svg width="46" height="54" viewBox="0 0 46 54" fill="none">
      <rect
        x="6"
        y="4"
        width="34"
        height="46"
        rx="3"
        stroke={stroke}
        strokeOpacity="0.75"
        strokeWidth="1.4"
      />
      {binding === "saddle" && (
        <>
          <line
            x1="23"
            y1="4"
            x2="23"
            y2="50"
            stroke={stroke}
            strokeOpacity="0.35"
            strokeWidth="1"
          />
          <line x1="23" y1="12" x2="23" y2="20" stroke={stroke} strokeWidth="2.4" />
          <line x1="23" y1="34" x2="23" y2="42" stroke={stroke} strokeWidth="2.4" />
        </>
      )}
      {binding === "stab" && (
        <>
          <line
            x1="12"
            y1="4"
            x2="12"
            y2="50"
            stroke={stroke}
            strokeOpacity="0.35"
            strokeWidth="0.9"
          />
          {[15, 27, 39].map((y) => (
            <line
              key={y}
              x1="12"
              y1={y - 3}
              x2="12"
              y2={y + 3}
              stroke={stroke}
              strokeWidth="2"
            />
          ))}
        </>
      )}
      {binding === "perfect" && (
        <rect x="6" y="4" width="5" height="46" fill={stroke} fillOpacity="0.8" />
      )}
      {(binding === "thread" || binding === "sewing") && (
        <line
          x1={binding === "sewing" ? 23 : 11}
          y1="8"
          x2={binding === "sewing" ? 23 : 11}
          y2="46"
          stroke={stroke}
          strokeWidth="1.8"
          strokeDasharray="4 3"
        />
      )}
      {binding === "japanese" && (
        <>
          <line x1="13" y1="4" x2="13" y2="50" stroke={stroke} strokeWidth="1.3" />
          {[13, 22, 32, 41].map((y) => (
            <line
              key={y}
              x1="6"
              y1={y}
              x2="13"
              y2={y}
              stroke={stroke}
              strokeWidth="1.3"
            />
          ))}
        </>
      )}
      {binding === "ring" &&
        [13, 22, 32, 41].map((y) => (
          <line
            key={y}
            x1="3"
            y1={y}
            x2="11"
            y2={y}
            stroke={stroke}
            strokeWidth="1.8"
          />
        ))}
      {binding === "miniFold8" && (
        <>
          <line
            x1="23"
            y1="4"
            x2="23"
            y2="50"
            stroke={stroke}
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
          <line
            x1="6"
            y1="27"
            x2="40"
            y2="27"
            stroke={stroke}
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
        </>
      )}
    </svg>
  );
};
