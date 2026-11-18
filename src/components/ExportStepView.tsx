"use client";

import { SheetSideCanvas } from "@/components/RenderedCanvas";
import { exportSheets } from "@/lib/imposition";
import { useStudio } from "@/store/studioStore";
import {
  EXPORT_LAYOUT_MODES,
  ExportLayoutMode,
  getActiveRisoInks,
  getBindingMeta,
  getRisoInk,
  PORTRAIT_FRAME_RATIOS,
  SeparationFileFormat,
  SeparationPlateStyle,
  SHEET_BACKGROUNDS,
  SheetBackgroundStyle,
} from "@/types/zine";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eye,
  FileDown,
  Images,
  Layers,
  Upload,
  X,
} from "lucide-react";
import React, { useMemo, useState } from "react";

export const ExportStepView: React.FC = () => {
  const store = useStudio();
  const { palette, project } = store;
  const exp = project.exportSettings;

  const [previewSheetIndex, setPreviewSheetIndex] = useState(0);
  const [previewSeparationInk, setPreviewSeparationInk] = useState<string | null>(
    null
  );
  const [deselectedInks, setDeselectedInks] = useState<Set<string>>(new Set());

  const sides = useMemo(
    () =>
      exportSheets(exp.layout, project.format.binding, project.pages.length),
    [exp.layout, project.format.binding, project.pages.length]
  );

  const safeIdx = Math.min(
    Math.max(0, previewSheetIndex),
    Math.max(0, sides.length - 1)
  );
  const activeSide = sides[safeIdx] ?? null;

  const detectedInks = useMemo(() => getActiveRisoInks(project), [project]);
  const activeExportInks = detectedInks.filter((i) => !deselectedInks.has(i));

  const jpgCount =
    exp.layout === "Spread" ? store.spreads.length : project.pages.length;

  const previewOptions = useMemo(
    () => ({
      includeGuides: project.bleedGuides.includeInPDF,
      renderSpineHardware: true,
      separationInk: previewSeparationInk,
      separationPlateStyle: exp.separationPlateStyle,
      maxPhotoDimension: 960,
    }),
    [
      project.bleedGuides.includeInPDF,
      previewSeparationInk,
      exp.separationPlateStyle,
    ]
  );

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden px-6 py-5 md:px-9">
      {/* Left Column: Live High-Res Press & Separation Master Preview */}
      <div className="flex flex-1 flex-col gap-3.5 min-h-[380px]">
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-sm font-semibold"
              style={{ color: palette.inkPrimary }}
            >
              {previewSeparationInk
                ? `孔版分色母版预览 · ${
                    getRisoInk(previewSeparationInk).nameCN
                  } (${previewSeparationInk})`
                : "印前成稿与画幅预览"}
            </div>
            {activeSide && (
              <div
                className="text-[11.5px]"
                style={{ color: palette.inkSecondary }}
              >
                {activeSide.label} · 共 {sides.length} 张输出印面
              </div>
            )}
          </div>

          {previewSeparationInk && (
            <button
              onClick={() => setPreviewSeparationInk(null)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
                color: palette.inkPrimary,
              }}
            >
              <X size={12.5} />
              <span>返回全彩成稿预览</span>
            </button>
          )}
        </div>

        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl p-6"
          style={{
            backgroundColor: palette.deskSecondary,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          {activeSide && (
            <SheetSideCanvas
              project={project}
              sheetSide={activeSide}
              pixelMaxDimension={1020}
              applyExportFraming={previewSeparationInk === null}
              options={previewOptions}
              className="max-h-full max-w-full object-contain shadow-md"
            />
          )}
        </div>

        {/* Sheet Flipper Strip */}
        {sides.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewSheetIndex(Math.max(0, safeIdx - 1))}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full cursor-pointer"
              style={{
                backgroundColor: palette.cardSurface,
                border: `1px solid ${palette.hairline}`,
              }}
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
              {sides.map((side, idx) => {
                const selected = idx === safeIdx;
                return (
                  <button
                    key={side.id}
                    onClick={() => setPreviewSheetIndex(idx)}
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-medium cursor-pointer"
                    style={{
                      backgroundColor: selected
                        ? palette.accentInkPill
                        : palette.cardSurface,
                      color: selected
                        ? palette.accentInkPillForeground
                        : palette.inkPrimary,
                      border: selected
                        ? "1px solid transparent"
                        : `1px solid ${palette.hairline}`,
                    }}
                  >
                    {side.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                setPreviewSheetIndex(Math.min(sides.length - 1, safeIdx + 1))
              }
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full cursor-pointer"
              style={{
                backgroundColor: palette.cardSurface,
                border: `1px solid ${palette.hairline}`,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Export Configuration & Action Cards */}
      <div className="w-full lg:w-[392px] shrink-0 overflow-y-auto space-y-4 pb-8 text-xs">
        {/* 1. Book Info */}
        <section
          className="rounded-2xl p-4 space-y-2.5"
          style={{
            backgroundColor: palette.cardSurface,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          <div>
            <div className="text-xs font-semibold" style={{ color: palette.inkPrimary }}>
              小志档案 Book Info
            </div>
            <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
              {project.pages.length} 页 · {project.assets.length} 张图像 ·{" "}
              {project.format.sizePreset}{" "}
              {getBindingMeta(project.format.binding).nameCN}
            </div>
          </div>

          <input
            type="text"
            value={project.title}
            onChange={(e) =>
              store.mutateProject((draft) => {
                draft.title = e.target.value;
                return draft;
              }, false)
            }
            placeholder="作品标题"
            className="w-full rounded-xl px-3 py-1.5 outline-none"
            style={{
              backgroundColor: palette.cardElevated,
              border: `1px solid ${palette.hairline}`,
            }}
          />

          <input
            type="text"
            value={project.author}
            onChange={(e) =>
              store.mutateProject((draft) => {
                draft.author = e.target.value;
                return draft;
              }, false)
            }
            placeholder="作者 / 工作室署名"
            className="w-full rounded-xl px-3 py-1.5 outline-none"
            style={{
              backgroundColor: palette.cardElevated,
              border: `1px solid ${palette.hairline}`,
            }}
          />

          <input
            type="text"
            value={project.summary}
            onChange={(e) =>
              store.mutateProject((draft) => {
                draft.summary = e.target.value;
                return draft;
              }, false)
            }
            placeholder="版本说明或印数备注…"
            className="w-full rounded-xl px-3 py-1.5 outline-none"
            style={{
              backgroundColor: palette.cardElevated,
              border: `1px solid ${palette.hairline}`,
            }}
          />
        </section>

        {/* 2. Layout, Backdrop & Social Portrait Framing */}
        <section
          className="rounded-2xl p-4 space-y-3"
          style={{
            backgroundColor: palette.cardSurface,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          <div>
            <div className="text-xs font-semibold" style={{ color: palette.inkPrimary }}>
              拼版与展示画幅 Layout & Framing
            </div>
            <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
              支持印刷折手拼版、4/8 合一及小红书/IG 展示画框
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: palette.inkSecondary }}>
              拼版模式
            </label>
            <select
              value={exp.layout}
              onChange={(e) => {
                setPreviewSheetIndex(0);
                store.mutateProject((draft) => {
                  draft.exportSettings.layout = e.target.value as ExportLayoutMode;
                  return draft;
                }, false);
              }}
              className="w-full rounded-xl px-2.5 py-1.5 outline-none"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
              }}
            >
              {EXPORT_LAYOUT_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: palette.inkSecondary }}>
              衬底背景
            </label>
            <select
              value={exp.sheetBackground}
              onChange={(e) =>
                store.mutateProject((draft) => {
                  draft.exportSettings.sheetBackground =
                    e.target.value as SheetBackgroundStyle;
                  return draft;
                }, false)
              }
              className="w-full rounded-xl px-2.5 py-1.5 outline-none"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
              }}
            >
              {SHEET_BACKGROUNDS.map((bg) => (
                <option key={bg.id} value={bg.id}>
                  {bg.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px]" style={{ color: palette.inkSecondary }}>
              社媒竖幅框
            </span>
            <div className="flex items-center gap-1">
              {PORTRAIT_FRAME_RATIOS.map((ratio) => {
                const selected = exp.portraitFrame === ratio;
                return (
                  <button
                    key={ratio}
                    onClick={() =>
                      store.mutateProject((draft) => {
                        draft.exportSettings.portraitFrame = ratio;
                        return draft;
                      }, false)
                    }
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium cursor-pointer"
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
                    {ratio}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            disabled={store.isExporting}
            onClick={store.handleExportPDF}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white transition hover:brightness-105 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: palette.accent }}
          >
            <FileDown size={15} />
            <span>导出印刷级 PDF ({sides.length} 张印面)</span>
          </button>
        </section>

        {/* 3. JPG Sequence Export */}
        <section
          className="rounded-2xl p-4 space-y-2.5"
          style={{
            backgroundColor: palette.cardSurface,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          <div>
            <div className="text-xs font-semibold" style={{ color: palette.inkPrimary }}>
              JPG 高清图集导出 ({exp.layout === "Spread" ? "按跨页" : "按单页"})
            </div>
            <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
              点击单个编号单独下载，或一键打包全部 JPG (.zip)
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {Array.from({ length: jpgCount }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => store.handleExportJPGs(idx)}
                className="shrink-0 rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold transition hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: palette.deskSurface }}
              >
                {String(idx + 1).padStart(2, "0")}
              </button>
            ))}
          </div>

          <button
            disabled={store.isExporting}
            onClick={() => store.handleExportJPGs(undefined)}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition hover:opacity-85 cursor-pointer"
            style={{
              backgroundColor: palette.cardElevated,
              border: `1px solid ${palette.hairline}`,
            }}
          >
            <Images size={13.5} />
            <span>打包导出全部 JPG ({jpgCount} 张 · .zip)</span>
          </button>
        </section>

        {/* 4. Risograph Ink Plate Separations */}
        <section
          className="rounded-2xl p-4 space-y-3"
          style={{
            backgroundColor: palette.cardSurface,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          <div>
            <div className="text-xs font-semibold" style={{ color: palette.inkPrimary }}>
              Risograph 孔版分色制版稿
            </div>
            <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
              为每支理想专色油墨单独输出带套准角线的灰度制版母片
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
              已检测专色油墨通道 (点「检视母版」可在左侧实时预览)：
            </div>
            {detectedInks.map((inkName) => {
              const ink = getRisoInk(inkName);
              const enabled = !deselectedInks.has(inkName);
              const previewing = previewSeparationInk === inkName;

              return (
                <div
                  key={inkName}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setDeselectedInks((prev) => {
                          const next = new Set(prev);
                          if (enabled) next.add(inkName);
                          else next.delete(inkName);
                          return next;
                        });
                      }}
                      className="cursor-pointer"
                      style={{
                        color: enabled ? palette.accent : palette.inkMuted,
                      }}
                    >
                      {enabled ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Circle size={15} />
                      )}
                    </button>
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{
                        backgroundColor: ink.hex,
                        border: "1px solid rgba(0,0,0,0.16)",
                      }}
                    />
                    <span className="font-medium">
                      {ink.nameCN} · {ink.name}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      setPreviewSeparationInk(previewing ? null : inkName)
                    }
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-medium cursor-pointer"
                    style={{
                      backgroundColor: palette.deskSurface,
                      color: previewing ? palette.accent : palette.inkSecondary,
                    }}
                  >
                    <Eye size={11.5} />
                    <span>检视母版</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div
            className="grid grid-cols-2 rounded-xl p-0.5"
            style={{ backgroundColor: palette.deskSurface }}
          >
            {(
              [
                [false, "单页 Single"],
                [true, "跨页 Spread"],
              ] as const
            ).map(([isSp, label]) => {
              const active = exp.separationUnitSpread === isSp;
              return (
                <button
                  key={label}
                  onClick={() =>
                    store.mutateProject((draft) => {
                      draft.exportSettings.separationUnitSpread = isSp;
                      return draft;
                    }, false)
                  }
                  className="rounded-lg py-1 font-medium cursor-pointer"
                  style={{
                    backgroundColor: active
                      ? palette.accentInkPill
                      : "transparent",
                    color: active
                      ? palette.accentInkPillForeground
                      : palette.inkSecondary,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <select
            value={exp.separationPlateStyle}
            onChange={(e) =>
              store.mutateProject((draft) => {
                draft.exportSettings.separationPlateStyle =
                  e.target.value as SeparationPlateStyle;
                return draft;
              }, false)
            }
            className="w-full rounded-xl px-2.5 py-1.5 outline-none"
            style={{
              backgroundColor: palette.cardElevated,
              border: `1px solid ${palette.hairline}`,
            }}
          >
            <option value="Grayscale">灰度制版稿 (供 Riso 制版机网屏)</option>
            <option value="Halftoned">预挂网点稿 (所见即所得)</option>
          </select>

          <select
            value={exp.separationFormat}
            onChange={(e) =>
              store.mutateProject((draft) => {
                draft.exportSettings.separationFormat =
                  e.target.value as SeparationFileFormat;
                return draft;
              }, false)
            }
            className="w-full rounded-xl px-2.5 py-1.5 outline-none"
            style={{
              backgroundColor: palette.cardElevated,
              border: `1px solid ${palette.hairline}`,
            }}
          >
            <option value="PDF">PDF (每种油墨独立成册)</option>
            <option value="PNG">PNG (油墨 × 页码序列图 .zip)</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exp.separationCropMarks}
              onChange={(e) =>
                store.mutateProject((draft) => {
                  draft.exportSettings.separationCropMarks = e.target.checked;
                  return draft;
                }, false)
              }
              className="accent-[#D25836]"
            />
            <span>每版统一打印四角套准十字线 (Registration Marks)</span>
          </label>

          <button
            disabled={activeExportInks.length === 0 || store.isExporting}
            onClick={() => store.handleExportSeparations(activeExportInks)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
            style={{
              backgroundColor: palette.accentInkPill,
              color: palette.accentInkPillForeground,
            }}
          >
            <Layers size={14} />
            <span>
              导出分色印版 ({activeExportInks.length} 色 · {exp.separationFormat})
            </span>
          </button>
        </section>

        {/* 5. Portable JSON Project Save / Resume */}
        <section
          className="rounded-2xl p-4 space-y-2.5"
          style={{
            backgroundColor: palette.cardSurface,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          <div>
            <div className="text-xs font-semibold" style={{ color: palette.inkPrimary }}>
              工程存档与迁移 Save & Resume
            </div>
            <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
              自动持久保存于浏览器本地书架，也支持与 macOS 版 Paperfold 互通 .json 工程包
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={store.handleExportJSON}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium cursor-pointer"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
              }}
            >
              <Upload size={13} />
              <span>导出 .json 工程</span>
            </button>

            <button
              onClick={store.triggerImportJSON}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium cursor-pointer"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
              }}
            >
              <Download size={13} />
              <span>导入 .json 工程</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
