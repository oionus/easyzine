"use client";

import { InspectorTab, useStudio } from "@/store/studioStore";
import {
  BINDING_CATALOG,
  BindingType,
  EDITORIAL_FONTS,
  FontWeightOption,
  GUIDE_COLOR_PRESETS,
  HalftoneStyle,
  normalizePageCount,
  OverlapMode,
  PAGE_NUMBER_POSITIONS,
  PageNumberPosition,
  PAPER_COLOR_CATALOG,
  PAPER_STOCK_CATALOG,
  PaperStock,
  PrintMode,
  RISO_INK_CATALOG,
  RisoSeparationMode,
  TextAlignmentOption,
} from "@/types/zine";
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDown,
  ArrowUp,
  BookMarked,
  Crop,
  Droplets,
  FileText,
  Image as ImageIcon,
  PenTool,
  Plus,
  Shapes,
  SlidersHorizontal,
  Trash2,
  Type,
} from "lucide-react";
import React from "react";

const TABS: { id: InspectorTab; label: string; icon: React.ReactNode }[] = [
  { id: "element", label: "对象", icon: <SlidersHorizontal size={14} /> },
  { id: "text", label: "排字", icon: <Type size={14} /> },
  { id: "paper", label: "纸张", icon: <FileText size={14} /> },
  { id: "print", label: "孔版", icon: <Droplets size={14} /> },
  { id: "binding", label: "装订", icon: <BookMarked size={14} /> },
];

export const DesignInspectors: React.FC = () => {
  const store = useStudio();
  const { palette, activeInspector } = store;

  return (
    <div className="flex h-full shrink-0 select-none">
      {activeInspector && (
        <div
          className="h-full w-[282px] overflow-y-auto p-4 space-y-4 text-xs"
          style={{
            backgroundColor: palette.cardSurface,
            borderLeft: `1px solid ${palette.hairline}`,
            color: palette.inkPrimary,
          }}
        >
          {activeInspector === "element" && <ElementInspectorPanel />}
          {activeInspector === "text" && <TypographyInspectorPanel />}
          {activeInspector === "paper" && <PaperInspectorPanel />}
          {activeInspector === "print" && <PrintRisoInspectorPanel />}
          {activeInspector === "binding" && <BindingGuidesInspectorPanel />}
        </div>
      )}

      {/* Vertical 50px Icon Rail */}
      <div
        className="flex h-full w-[50px] flex-col items-center gap-1.5 pt-3 px-1"
        style={{
          backgroundColor: palette.traySurface,
          borderLeft: `1px solid ${palette.hairline}`,
        }}
      >
        {TABS.map((t) => {
          const active = activeInspector === t.id;
          return (
            <button
              key={t.id}
              onClick={() => store.setActiveInspector(active ? null : t.id)}
              className="flex h-11 w-10 flex-col items-center justify-center gap-1 rounded-xl transition cursor-pointer"
              style={{
                backgroundColor: active ? palette.accentInkPill : "transparent",
                color: active
                  ? palette.accentInkPillForeground
                  : palette.inkPrimary,
              }}
              title={active ? `收起${t.label}面板` : `展开${t.label}面板`}
            >
              {t.icon}
              <span className="text-[9.5px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ElementInspectorPanel: React.FC = () => {
  const store = useStudio();
  const { palette, selectedElement: el } = store;

  const activePageIdx = store.selectedRef?.pageIndex ?? store.currentPageIndex;
  const pageElements = store.project.pages[activePageIdx]?.elements ?? [];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold">对象与图层 Object & Layers</div>
        <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
          对齐、裁切、叠印与层级
        </div>
      </div>

      {el ? (
        <div className="space-y-3.5">
          {/* Alignment */}
          <div className="space-y-1.5">
            <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
              页面对齐与铺满
            </div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => store.alignSelectedHorizontal("left")}
                  className="flex h-7 w-7 items-center justify-center rounded-lg cursor-pointer"
                  style={{ backgroundColor: palette.deskSurface }}
                  title="左对齐"
                >
                  <AlignStartVertical size={13} />
                </button>
                <button
                  onClick={() => store.alignSelectedHorizontal("center")}
                  className="flex h-7 w-7 items-center justify-center rounded-lg cursor-pointer"
                  style={{ backgroundColor: palette.deskSurface }}
                  title="水平居中"
                >
                  <AlignCenterVertical size={13} />
                </button>
                <button
                  onClick={() => store.alignSelectedHorizontal("right")}
                  className="flex h-7 w-7 items-center justify-center rounded-lg cursor-pointer"
                  style={{ backgroundColor: palette.deskSurface }}
                  title="右对齐"
                >
                  <AlignEndVertical size={13} />
                </button>
                <button
                  onClick={() => store.alignSelectedVertical("top")}
                  className="flex h-7 w-7 items-center justify-center rounded-lg cursor-pointer"
                  style={{ backgroundColor: palette.deskSurface }}
                  title="顶对齐"
                >
                  <AlignStartHorizontal size={13} />
                </button>
                <button
                  onClick={() => store.alignSelectedVertical("middle")}
                  className="flex h-7 w-7 items-center justify-center rounded-lg cursor-pointer"
                  style={{ backgroundColor: palette.deskSurface }}
                  title="垂直居中"
                >
                  <AlignCenterHorizontal size={13} />
                </button>
                <button
                  onClick={() => store.alignSelectedVertical("bottom")}
                  className="flex h-7 w-7 items-center justify-center rounded-lg cursor-pointer"
                  style={{ backgroundColor: palette.deskSurface }}
                  title="底对齐"
                >
                  <AlignEndHorizontal size={13} />
                </button>
              </div>
              <button
                onClick={store.matchSelectedToFullBleed}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                style={{
                  backgroundColor: palette.cardElevated,
                  border: `1px solid ${palette.hairline}`,
                }}
              >
                铺满
              </button>
            </div>
          </div>

          {/* Photo Controls */}
          {el.kind === "photo" && (
            <div
              className="space-y-2.5 pt-3"
              style={{ borderTop: `1px solid ${palette.hairline}` }}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={el.spansSpread}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    store.updateSelectedElement(
                      {
                        ...el,
                        spansSpread: checked,
                        width: checked && el.width < 1.15 ? 1.45 : el.width,
                      },
                      true
                    );
                  }}
                  className="accent-[#D25836]"
                />
                <span>跨页横跨对开页 (Spread Photo)</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0">框内缩放</span>
                <input
                  type="range"
                  min={1.0}
                  max={3.0}
                  step={0.05}
                  value={el.cropZoom}
                  onChange={(e) =>
                    store.updateSelectedElement({
                      ...el,
                      cropZoom: Number(e.target.value),
                    })
                  }
                  className="flex-1 accent-[#D25836]"
                />
                <span className="font-mono text-[10.5px] w-8 text-right">
                  {el.cropZoom.toFixed(1)}×
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0">圆角半径</span>
                <input
                  type="range"
                  min={0}
                  max={36}
                  step={1}
                  value={el.cornerRadiusPt}
                  onChange={(e) =>
                    store.updateSelectedElement({
                      ...el,
                      cornerRadiusPt: Number(e.target.value),
                    })
                  }
                  className="flex-1 accent-[#D25836]"
                />
                <span className="font-mono text-[10.5px] w-8 text-right">
                  {Math.round(el.cornerRadiusPt)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => store.setIsCroppingPhoto((v) => !v)}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium cursor-pointer"
                  style={{
                    backgroundColor: store.isCroppingPhoto
                      ? palette.accentInkPill
                      : palette.cardElevated,
                    color: store.isCroppingPhoto
                      ? palette.accentInkPillForeground
                      : palette.inkPrimary,
                    border: `1px solid ${palette.hairline}`,
                  }}
                >
                  <Crop size={12} />
                  <span>
                    {store.isCroppingPhoto ? "完成裁切平移" : "拖拽框内构图"}
                  </span>
                </button>

                <button
                  onClick={store.resetPhotoAspectRatio}
                  className="rounded-full px-3 py-1.5 text-[11px] font-medium cursor-pointer"
                  style={{
                    backgroundColor: palette.cardElevated,
                    border: `1px solid ${palette.hairline}`,
                  }}
                >
                  还原比例
                </button>
              </div>
            </div>
          )}

          {/* Shape Controls */}
          {el.kind === "shape" && (
            <div
              className="space-y-2.5 pt-3"
              style={{ borderTop: `1px solid ${palette.hairline}` }}
            >
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0">描边粗细</span>
                <input
                  type="range"
                  min={0}
                  max={16}
                  step={0.5}
                  value={el.strokeWidthPt}
                  onChange={(e) =>
                    store.updateSelectedElement({
                      ...el,
                      strokeWidthPt: Number(e.target.value),
                    })
                  }
                  className="flex-1 accent-[#D25836]"
                />
                <span className="font-mono text-[10.5px] w-8 text-right">
                  {Math.round(el.strokeWidthPt)}pt
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0">圆角半径</span>
                <input
                  type="range"
                  min={0}
                  max={48}
                  step={1}
                  value={el.cornerRadiusPt}
                  onChange={(e) =>
                    store.updateSelectedElement({
                      ...el,
                      cornerRadiusPt: Number(e.target.value),
                    })
                  }
                  className="flex-1 accent-[#D25836]"
                />
                <span className="font-mono text-[10.5px] w-8 text-right">
                  {Math.round(el.cornerRadiusPt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const noFill = el.fillHex === null && !el.useRisoInk;
                    store.updateSelectedElement(
                      {
                        ...el,
                        useRisoInk: noFill ? store.activeUseRisoInk : false,
                        fillHex: noFill ? store.activeHexColor : null,
                        strokeWidthPt:
                          !noFill && el.strokeWidthPt < 1 ? 2.0 : el.strokeWidthPt,
                      },
                      true
                    );
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium cursor-pointer"
                  style={{ backgroundColor: palette.deskSurface }}
                >
                  切换无填充 (No fill)
                </button>

                {el.shapeKind === "Freeform" && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={store.isEditingPolygonPoints}
                      onChange={(e) =>
                        store.setIsEditingPolygonPoints(e.target.checked)
                      }
                      className="accent-[#D25836]"
                    />
                    <span>编辑折点</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Blend, Opacity & Rotation */}
          <div
            className="space-y-2.5 pt-3"
            style={{ borderTop: `1px solid ${palette.hairline}` }}
          >
            <div
              className="grid grid-cols-2 rounded-xl p-0.5"
              style={{ backgroundColor: palette.deskSurface }}
            >
              {(["On top", "Mix (overprint)"] as OverlapMode[]).map((m) => {
                const active = el.overlap === m;
                return (
                  <button
                    key={m}
                    onClick={() =>
                      store.updateSelectedElement({ ...el, overlap: m }, true)
                    }
                    className="rounded-lg py-1 text-[11px] font-medium cursor-pointer"
                    style={{
                      backgroundColor: active
                        ? palette.accentInkPill
                        : "transparent",
                      color: active
                        ? palette.accentInkPillForeground
                        : palette.inkSecondary,
                    }}
                  >
                    {m === "On top" ? "叠压覆盖" : "油墨叠印"}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0">不透明度</span>
              <input
                type="range"
                min={0.08}
                max={1.0}
                step={0.02}
                value={el.opacity}
                onChange={(e) =>
                  store.updateSelectedElement({
                    ...el,
                    opacity: Number(e.target.value),
                  })
                }
                className="flex-1 accent-[#D25836]"
              />
              <span className="font-mono text-[10.5px] w-9 text-right">
                {Math.round(el.opacity * 100)}%
              </span>
            </div>

            {el.kind !== "stroke" && (
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0">旋转角度</span>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={el.rotationDegrees}
                  onChange={(e) =>
                    store.updateSelectedElement({
                      ...el,
                      rotationDegrees: Number(e.target.value),
                    })
                  }
                  className="flex-1 accent-[#D25836]"
                />
                <span className="font-mono text-[10.5px] w-9 text-right">
                  {Math.round(el.rotationDegrees)}°
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => store.moveLayer(1)}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                  style={{
                    backgroundColor: palette.cardElevated,
                    border: `1px solid ${palette.hairline}`,
                  }}
                >
                  <ArrowUp size={12} />
                  <span>上移</span>
                </button>
                <button
                  onClick={() => store.moveLayer(-1)}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                  style={{
                    backgroundColor: palette.cardElevated,
                    border: `1px solid ${palette.hairline}`,
                  }}
                >
                  <ArrowDown size={12} />
                  <span>下移</span>
                </button>
              </div>

              <button
                onClick={store.deleteSelected}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                title="删除图层"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl p-3 text-[11.5px]"
          style={{
            backgroundColor: palette.deskSurface,
            color: palette.inkSecondary,
          }}
        >
          在画布上点击任意照片、文字、图形或笔触即可调整细节。
        </div>
      )}

      {/* Layer Stack */}
      <div
        className="space-y-2 pt-3"
        style={{ borderTop: `1px solid ${palette.hairline}` }}
      >
        <div
          className="text-[11.5px] font-semibold"
          style={{ color: palette.inkSecondary }}
        >
          当前页图层 (P{activePageIdx + 1} · {pageElements.length})
        </div>

        {pageElements.length === 0 ? (
          <div className="text-[11px]" style={{ color: palette.inkMuted }}>
            此页尚无图层
          </div>
        ) : (
          <div className="space-y-1">
            {[...pageElements].reverse().map((item) => {
              const isSel = store.selectedRef?.elementID === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    store.setSelectedRef({
                      pageIndex: activePageIdx,
                      elementID: item.id,
                    })
                  }
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition cursor-pointer"
                  style={{
                    backgroundColor: isSel
                      ? "rgba(210,88,54,0.14)"
                      : palette.deskSurface,
                    fontWeight: isSel ? 600 : 400,
                  }}
                >
                  <span style={{ color: palette.accent }}>
                    {item.kind === "photo" ? (
                      <ImageIcon size={12} />
                    ) : item.kind === "text" ? (
                      <Type size={12} />
                    ) : item.kind === "shape" ? (
                      <Shapes size={12} />
                    ) : (
                      <PenTool size={12} />
                    )}
                  </span>
                  <span className="truncate flex-1">
                    {item.name || item.kind}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const TypographyInspectorPanel: React.FC = () => {
  const store = useStudio();
  const { palette, selectedElement: el, project } = store;
  const pn = project.pageNumbers;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold">活字排印 Typography</div>
        <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
          中西文字体、字距与自动页码
        </div>
      </div>

      {el && el.kind === "text" ? (
        <div className="space-y-3">
          <textarea
            value={el.text}
            onChange={(e) =>
              store.updateSelectedElement({ ...el, text: e.target.value })
            }
            rows={4}
            className="w-full rounded-xl p-2.5 text-xs outline-none resize-y"
            style={{
              backgroundColor: palette.deskSurface,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
          />

          <select
            value={el.fontFamily}
            onChange={(e) =>
              store.updateSelectedElement(
                { ...el, fontFamily: e.target.value },
                true
              )
            }
            className="w-full rounded-xl px-2.5 py-1.5 text-xs outline-none"
            style={{
              backgroundColor: palette.cardElevated,
              border: `1px solid ${palette.hairline}`,
            }}
          >
            {EDITORIAL_FONTS.map((f) => (
              <option key={f.family} value={f.family}>
                {f.displayName}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              {[10, 12, 16, 22, 32].map((pt) => (
                <button
                  key={pt}
                  onClick={() =>
                    store.updateSelectedElement({ ...el, fontSizePt: pt })
                  }
                  className="rounded-full px-2 py-0.5 font-mono text-[10.5px] cursor-pointer"
                  style={{
                    backgroundColor:
                      Math.round(el.fontSizePt) === pt
                        ? "rgba(210,88,54,0.2)"
                        : palette.deskSurface,
                  }}
                >
                  {pt}
                </button>
              ))}
            </div>
            <span className="font-mono text-[11px]">
              {Math.round(el.fontSizePt)}pt
            </span>
          </div>

          <input
            type="range"
            min={7}
            max={72}
            step={0.5}
            value={el.fontSizePt}
            onChange={(e) =>
              store.updateSelectedElement({
                ...el,
                fontSizePt: Number(e.target.value),
              })
            }
            className="w-full accent-[#D25836]"
          />

          <div className="flex items-center gap-1.5">
            <div
              className="grid flex-1 grid-cols-4 rounded-xl p-0.5"
              style={{ backgroundColor: palette.deskSurface }}
            >
              {(["Thin", "Reg", "Med", "Bold"] as FontWeightOption[]).map((w) => {
                const active = el.fontWeight === w;
                return (
                  <button
                    key={w}
                    onClick={() =>
                      store.updateSelectedElement({ ...el, fontWeight: w })
                    }
                    className="rounded-lg py-1 text-[10.5px] font-medium cursor-pointer"
                    style={{
                      backgroundColor: active
                        ? palette.accentInkPill
                        : "transparent",
                      color: active
                        ? palette.accentInkPillForeground
                        : palette.inkSecondary,
                    }}
                  >
                    {w}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                store.updateSelectedElement({ ...el, isItalic: !el.isItalic })
              }
              className="rounded-xl px-2.5 py-1 text-xs italic font-serif cursor-pointer"
              style={{
                backgroundColor: el.isItalic
                  ? palette.accentInkPill
                  : palette.deskSurface,
                color: el.isItalic
                  ? palette.accentInkPillForeground
                  : palette.inkPrimary,
              }}
            >
              I
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div
              className="flex rounded-xl p-0.5"
              style={{ backgroundColor: palette.deskSurface }}
            >
              {(
                [
                  ["left", <AlignLeft key="l" size={13} />],
                  ["center", <AlignCenter key="c" size={13} />],
                  ["right", <AlignRight key="r" size={13} />],
                ] as [TextAlignmentOption, React.ReactNode][]
              ).map(([align, icon]) => {
                const active = el.textAlignment === align;
                return (
                  <button
                    key={align}
                    onClick={() =>
                      store.updateSelectedElement({ ...el, textAlignment: align })
                    }
                    className="rounded-lg px-2.5 py-1 cursor-pointer"
                    style={{
                      backgroundColor: active
                        ? palette.accentInkPill
                        : "transparent",
                      color: active
                        ? palette.accentInkPillForeground
                        : palette.inkPrimary,
                    }}
                  >
                    {icon}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={el.textOutline}
                onChange={(e) =>
                  store.updateSelectedElement({
                    ...el,
                    textOutline: e.target.checked,
                  })
                }
                className="accent-[#D25836]"
              />
              <span>空心描边</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0">
              行距 {el.lineHeightMultiple.toFixed(1)}
            </span>
            <input
              type="range"
              min={0.9}
              max={2.2}
              step={0.05}
              value={el.lineHeightMultiple}
              onChange={(e) =>
                store.updateSelectedElement({
                  ...el,
                  lineHeightMultiple: Number(e.target.value),
                })
              }
              className="flex-1 accent-[#D25836]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0">
              字距 {el.trackingPx.toFixed(1)}
            </span>
            <input
              type="range"
              min={-1.5}
              max={8.0}
              step={0.2}
              value={el.trackingPx}
              onChange={(e) =>
                store.updateSelectedElement({
                  ...el,
                  trackingPx: Number(e.target.value),
                })
              }
              className="flex-1 accent-[#D25836]"
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={el.kerningEnabled}
                onChange={(e) =>
                  store.updateSelectedElement({
                    ...el,
                    kerningEnabled: e.target.checked,
                  })
                }
                className="accent-[#D25836]"
              />
              <span>Kerning</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={el.tightCJK}
                onChange={(e) =>
                  store.updateSelectedElement({
                    ...el,
                    tightCJK: e.target.checked,
                  })
                }
                className="accent-[#D25836]"
              />
              <span>中日文标点挤压</span>
            </label>
          </div>
        </div>
      ) : (
        <button
          onClick={() => store.addTextElement(store.currentPageIndex)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 font-semibold cursor-pointer"
          style={{ backgroundColor: palette.deskSurface }}
        >
          <Plus size={14} />
          <span>在当前页置入文本框</span>
        </button>
      )}

      {/* Automatic Page Numbers */}
      <div
        className="space-y-3 pt-3"
        style={{ borderTop: `1px solid ${palette.hairline}` }}
      >
        <div className="text-xs font-semibold">全书页码 Page Numbers</div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={pn.enabled}
            onChange={(e) =>
              store.mutateProject((draft) => {
                draft.pageNumbers.enabled = e.target.checked;
                return draft;
              })
            }
            className="accent-[#D25836]"
          />
          <span>显示自动页码</span>
        </label>

        {pn.enabled && (
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pn.skipCovers}
                onChange={(e) =>
                  store.mutateProject((draft) => {
                    draft.pageNumbers.skipCovers = e.target.checked;
                    return draft;
                  })
                }
                className="accent-[#D25836]"
              />
              <span>跳过封面与封底 (Skip covers)</span>
            </label>

            <select
              value={pn.position}
              onChange={(e) =>
                store.mutateProject((draft) => {
                  draft.pageNumbers.position =
                    e.target.value as PageNumberPosition;
                  return draft;
                })
              }
              className="w-full rounded-xl px-2.5 py-1.5 text-xs outline-none"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
              }}
            >
              {PAGE_NUMBER_POSITIONS.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.label}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-between rounded-lg px-2 py-1" style={{ backgroundColor: palette.deskSurface }}>
                <span>边距 X</span>
                <input
                  type="number"
                  min={3}
                  max={40}
                  value={pn.offsetXMM}
                  onChange={(e) =>
                    store.mutateProject((draft) => {
                      draft.pageNumbers.offsetXMM = Number(e.target.value) || 10;
                      return draft;
                    })
                  }
                  className="w-12 text-right font-mono bg-transparent outline-none"
                />
              </label>

              <label className="flex items-center justify-between rounded-lg px-2 py-1" style={{ backgroundColor: palette.deskSurface }}>
                <span>边距 Y</span>
                <input
                  type="number"
                  min={3}
                  max={40}
                  value={pn.offsetYMM}
                  onChange={(e) =>
                    store.mutateProject((draft) => {
                      draft.pageNumbers.offsetYMM = Number(e.target.value) || 10;
                      return draft;
                    })
                  }
                  className="w-12 text-right font-mono bg-transparent outline-none"
                />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5">
                <span>起始码</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={pn.startAt}
                  onChange={(e) =>
                    store.mutateProject((draft) => {
                      draft.pageNumbers.startAt = Number(e.target.value) || 1;
                      return draft;
                    })
                  }
                  className="w-14 rounded-lg px-2 py-1 font-mono outline-none"
                  style={{ backgroundColor: palette.deskSurface }}
                />
              </label>

              <input
                type="color"
                value={pn.colorHex}
                onChange={(e) =>
                  store.mutateProject((draft) => {
                    draft.pageNumbers.colorHex = e.target.value;
                    return draft;
                  }, false)
                }
                className="h-7 w-10 cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PaperInspectorPanel: React.FC = () => {
  const store = useStudio();
  const { palette, project } = store;
  const fmt = project.format;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold">纸张质感 Paper</div>
        <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
          实时切换全书纸质与原浆底色
        </div>
      </div>

      <select
        value={fmt.paperStock}
        onChange={(e) =>
          store.mutateProject((draft) => {
            draft.format.paperStock = e.target.value as PaperStock;
            return draft;
          })
        }
        className="w-full rounded-xl px-2.5 py-2 text-xs outline-none"
        style={{
          backgroundColor: palette.cardElevated,
          border: `1px solid ${palette.hairline}`,
        }}
      >
        {PAPER_STOCK_CATALOG.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nameCN} · {s.id}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-6 gap-2">
        {PAPER_COLOR_CATALOG.map((c) => {
          const sel = fmt.paperColorName === c.name;
          return (
            <button
              key={c.name}
              title={c.nameCN}
              onClick={() =>
                store.mutateProject((draft) => {
                  draft.format.paperColorName = c.name;
                  return draft;
                })
              }
              className="h-7 w-7 rounded-full cursor-pointer"
              style={{
                backgroundColor: c.hex,
                border: sel
                  ? `2.2px solid ${palette.accent}`
                  : "1px solid rgba(0,0,0,0.16)",
              }}
            />
          );
        })}
      </div>

      <label className="flex items-center gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={fmt.backgroundIndependentPhotos}
          onChange={(e) =>
            store.mutateProject((draft) => {
              draft.format.backgroundIndependentPhotos = e.target.checked;
              return draft;
            })
          }
          className="accent-[#D25836]"
        />
        <span>照片原色白墨托底</span>
      </label>
    </div>
  );
};

const PrintRisoInspectorPanel: React.FC = () => {
  const store = useStudio();
  const { palette, project } = store;
  const ps = project.printSettings;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold">印刷与孔版模拟 Print & Riso</div>
        <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
          大豆油墨叠印、网点挂网与套准微偏
        </div>
      </div>

      <div
        className="grid grid-cols-3 rounded-xl p-0.5"
        style={{ backgroundColor: palette.deskSurface }}
      >
        {(["Offset", "On-demand", "Risograph"] as PrintMode[]).map((m) => {
          const active = ps.mode === m;
          return (
            <button
              key={m}
              onClick={() =>
                store.mutateProject((draft) => {
                  draft.printSettings.mode = m;
                  return draft;
                })
              }
              className="rounded-lg py-1.5 text-[11px] font-medium cursor-pointer"
              style={{
                backgroundColor: active ? palette.accentInkPill : "transparent",
                color: active
                  ? palette.accentInkPillForeground
                  : palette.inkSecondary,
              }}
            >
              {m === "Offset" ? "胶印" : m === "On-demand" ? "数码" : "Riso"}
            </button>
          );
        })}
      </div>

      {ps.mode === "Risograph" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: palette.inkSecondary }}>
              网点挂网方式
            </label>
            <select
              value={ps.halftone}
              onChange={(e) =>
                store.mutateProject((draft) => {
                  draft.printSettings.halftone = e.target.value as HalftoneStyle;
                  return draft;
                })
              }
              className="w-full rounded-xl px-2.5 py-1.5 text-xs outline-none"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
              }}
            >
              <option value="Off">连续调 Off</option>
              <option value="Halftone">经典角度网点 Halftone</option>
              <option value="Error diffusion">误差扩散噪点 Diffusion</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px]" style={{ color: palette.inkSecondary }}>
              图像分色模式
            </label>
            <select
              value={ps.separationMode}
              onChange={(e) =>
                store.mutateProject((draft) => {
                  draft.printSettings.separationMode =
                    e.target.value as RisoSeparationMode;
                  return draft;
                })
              }
              className="w-full rounded-xl px-2.5 py-1.5 text-xs outline-none"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
              }}
            >
              <option value="Lum">明度双色 Lum</option>
              <option value="CMYK">四色孔版 CMYK</option>
              <option value="Nega">负片反相 Nega</option>
            </select>
          </div>

          {ps.separationMode !== "CMYK" && (
            <>
              <div className="space-y-1">
                <label className="text-[11px]" style={{ color: palette.inkSecondary }}>
                  暗部主滚筒墨
                </label>
                <select
                  value={ps.primaryRisoInk}
                  onChange={(e) =>
                    store.mutateProject((draft) => {
                      draft.printSettings.primaryRisoInk = e.target.value;
                      return draft;
                    })
                  }
                  className="w-full rounded-xl px-2.5 py-1.5 text-xs outline-none"
                  style={{
                    backgroundColor: palette.cardElevated,
                    border: `1px solid ${palette.hairline}`,
                  }}
                >
                  {RISO_INK_CATALOG.map((ink) => (
                    <option key={ink.name} value={ink.name}>
                      {ink.nameCN} ({ink.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px]" style={{ color: palette.inkSecondary }}>
                  亮部副滚筒墨
                </label>
                <select
                  value={ps.secondaryRisoInk}
                  onChange={(e) =>
                    store.mutateProject((draft) => {
                      draft.printSettings.secondaryRisoInk = e.target.value;
                      return draft;
                    })
                  }
                  className="w-full rounded-xl px-2.5 py-1.5 text-xs outline-none"
                  style={{
                    backgroundColor: palette.cardElevated,
                    border: `1px solid ${palette.hairline}`,
                  }}
                >
                  {RISO_INK_CATALOG.map((ink) => (
                    <option key={ink.name} value={ink.name}>
                      {ink.nameCN} ({ink.name})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0">网点粒径</span>
            <input
              type="range"
              min={0.65}
              max={2.0}
              step={0.05}
              value={ps.dotScale}
              onChange={(e) =>
                store.mutateProject((draft) => {
                  draft.printSettings.dotScale = Number(e.target.value);
                  return draft;
                }, false)
              }
              className="flex-1 accent-[#D25836]"
            />
            <span className="font-mono text-[10.5px] w-8 text-right">
              {ps.dotScale.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0">套准微偏</span>
            <input
              type="range"
              min={0}
              max={1.6}
              step={0.05}
              value={ps.registrationJitterMM}
              onChange={(e) =>
                store.mutateProject((draft) => {
                  draft.printSettings.registrationJitterMM = Number(
                    e.target.value
                  );
                  return draft;
                }, false)
              }
              className="flex-1 accent-[#D25836]"
            />
            <span className="font-mono text-[10.5px] w-9 text-right">
              {ps.registrationJitterMM.toFixed(1)}mm
            </span>
          </div>
        </div>
      )}

      {/* Book-wide Solid Underbase */}
      <div
        className="space-y-2.5 pt-3"
        style={{ borderTop: `1px solid ${palette.hairline}` }}
      >
        <div
          className="text-[11.5px] font-semibold"
          style={{ color: palette.inkSecondary }}
        >
          整书满版铺底墨 (Solid Fill)
        </div>

        <select
          value={ps.solidFillRisoInk ?? "None"}
          onChange={(e) =>
            store.mutateProject((draft) => {
              draft.printSettings.solidFillRisoInk =
                e.target.value === "None" ? null : e.target.value;
              return draft;
            })
          }
          className="w-full rounded-xl px-2.5 py-1.5 text-xs outline-none"
          style={{
            backgroundColor: palette.cardElevated,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          <option value="None">无铺底 (None)</option>
          {RISO_INK_CATALOG.map((ink) => (
            <option key={ink.name} value={ink.name}>
              {ink.nameCN} · {ink.name}
            </option>
          ))}
        </select>

        {ps.solidFillRisoInk && (
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0">铺底浓度</span>
            <input
              type="range"
              min={0.04}
              max={0.65}
              step={0.02}
              value={ps.solidFillDensity}
              onChange={(e) =>
                store.mutateProject((draft) => {
                  draft.printSettings.solidFillDensity = Number(e.target.value);
                  return draft;
                }, false)
              }
              className="flex-1 accent-[#D25836]"
            />
          </div>
        )}
      </div>
    </div>
  );
};

const BindingGuidesInspectorPanel: React.FC = () => {
  const store = useStudio();
  const { palette, project } = store;
  const g = project.bleedGuides;

  const toggleGuide = (key: keyof typeof g, val: boolean) => {
    store.mutateProject((draft) => {
      (draft.bleedGuides[key] as boolean) = val;
      return draft;
    }, false);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold">装订与印前参考线</div>
        <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
          出血、裁切线、角线与毫米标尺
        </div>
      </div>

      <select
        value={project.format.binding}
        onChange={(e) => {
          const b = e.target.value as BindingType;
          store.mutateProject((draft) => {
            draft.format.binding = b;
            draft.format.pageCount = normalizePageCount(b, draft.format.pageCount);
            return draft;
          });
        }}
        className="w-full rounded-xl px-2.5 py-2 text-xs outline-none"
        style={{
          backgroundColor: palette.cardElevated,
          border: `1px solid ${palette.hairline}`,
        }}
      >
        {BINDING_CATALOG.map((b) => (
          <option key={b.id} value={b.id}>
            {b.nameCN} ({b.nameEN})
          </option>
        ))}
      </select>

      <div
        className="space-y-2 pt-3"
        style={{ borderTop: `1px solid ${palette.hairline}` }}
      >
        {(
          [
            ["bleed3mm", "3mm 出血框 (Bleed 3mm)"],
            ["trimLine", "成品裁切框 (Trim line)"],
            ["cropMarks", "四角裁切线 (Crop marks)"],
            ["centerMarks", "十字套准标 (Center marks)"],
            ["centerLineV", "纵向中轴线 (Center V)"],
            ["centerLineH", "横向中轴线 (Center H)"],
            ["rulerMM", "毫米刻度尺 (Ruler mm)"],
          ] as [keyof typeof g, string][]
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(g[key])}
              onChange={(e) => toggleGuide(key, e.target.checked)}
              className="accent-[#D25836]"
            />
            <span>{label}</span>
          </label>
        ))}

        <div
          className="pt-2"
          style={{ borderTop: `1px solid ${palette.hairline}` }}
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={g.includeInPDF}
              onChange={(e) => toggleGuide("includeInPDF", e.target.checked)}
              className="accent-[#D25836]"
            />
            <span>导出 PDF 时包含参考线</span>
          </label>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span style={{ color: palette.inkSecondary }}>标线颜色</span>
          <div className="flex items-center gap-1.5">
            {GUIDE_COLOR_PRESETS.map((hex) => (
              <button
                key={hex}
                onClick={() =>
                  store.mutateProject((draft) => {
                    draft.bleedGuides.lineColorHex = hex;
                    return draft;
                  }, false)
                }
                className="h-4.5 w-4.5 rounded-full cursor-pointer"
                style={{
                  backgroundColor: hex,
                  border:
                    g.lineColorHex === hex
                      ? `2px solid ${palette.inkPrimary}`
                      : "1px solid rgba(0,0,0,0.18)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
