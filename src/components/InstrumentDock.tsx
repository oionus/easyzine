"use client";

import { useStudio } from "@/store/studioStore";
import {
  BRUSH_CATALOG,
  BrushKind,
  getRisoInk,
  RISO_INK_CATALOG,
  RISO_INK_CATEGORIES,
  RisoInkCategory,
  SHAPE_CATALOG,
} from "@/types/zine";
import { MousePointer2, Shapes, Type } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export const InstrumentDock: React.FC = () => {
  const store = useStudio();
  const { palette, activeTool } = store;

  const [showShapePopover, setShowShapePopover] = useState(false);
  const [showInkPopover, setShowInkPopover] = useState(false);
  const [inkCategory, setInkCategory] = useState<RisoInkCategory>("标准油墨 · 12");
  const dockRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setShowShapePopover(false);
        setShowInkPopover(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const activeTintHex = store.activeUseRisoInk
    ? getRisoInk(store.activeRisoInkName).hex
    : store.activeHexColor;

  const isPointer = activeTool.type === "pointer";
  const isShape = activeTool.type === "shape";

  return (
    <div
      ref={dockRef}
      className="relative flex items-center gap-2.5 rounded-full px-3 py-1.5 shadow-sm select-none"
      style={{
        backgroundColor: palette.cardSurface,
        border: `1px solid ${palette.hairline}`,
      }}
    >
      {/* Left Cluster: Pointer, Text, Shapes */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => store.setActiveTool({ type: "pointer" })}
          className="flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition cursor-pointer"
          style={{
            backgroundColor: isPointer ? palette.accentInkPill : "transparent",
            color: isPointer
              ? palette.accentInkPillForeground
              : palette.inkPrimary,
          }}
        >
          <MousePointer2 size={14} />
          <span className="text-[9.5px] font-medium">指针</span>
        </button>

        <button
          onClick={() => store.addTextElement(store.currentPageIndex)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition hover:opacity-80 cursor-pointer"
          style={{ color: palette.inkPrimary }}
        >
          <Type size={14} />
          <span className="text-[9.5px] font-medium">排字</span>
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setShowShapePopover((v) => !v);
              setShowInkPopover(false);
            }}
            className="flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition cursor-pointer"
            style={{
              backgroundColor:
                isShape || showShapePopover
                  ? palette.accentInkPill
                  : "transparent",
              color:
                isShape || showShapePopover
                  ? palette.accentInkPillForeground
                  : palette.inkPrimary,
            }}
          >
            <Shapes size={14} />
            <span className="text-[9.5px] font-medium">几何</span>
          </button>

          {showShapePopover && (
            <div
              className="absolute bottom-13 left-0 z-40 w-64 rounded-2xl p-3.5 shadow-xl space-y-2.5"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
                color: palette.inkPrimary,
              }}
            >
              <div className="text-xs font-semibold">置入几何与自由折点图形</div>
              <div className="grid grid-cols-3 gap-2">
                {SHAPE_CATALOG.map((sh) => (
                  <button
                    key={sh.id}
                    onClick={() => {
                      store.addShapeElement(sh.id, store.currentPageIndex);
                      setShowShapePopover(false);
                    }}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-[11px] font-medium transition hover:opacity-80 cursor-pointer"
                    style={{ backgroundColor: palette.deskSurface }}
                  >
                    <span>{sh.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="h-7 w-px"
        style={{ backgroundColor: palette.hairline }}
      />

      {/* Center Cluster: 8 Paper-Style Sculpted Physical Brushes */}
      <div className="flex h-[46px] items-end gap-1">
        {BRUSH_CATALOG.map((b) => {
          const selected =
            activeTool.type === "brush" && activeTool.brush === b.id;
          return (
            <button
              key={b.id}
              title={b.label}
              onClick={() => {
                if (selected) {
                  store.setActiveTool({ type: "pointer" });
                } else {
                  store.setActiveTool({ type: "brush", brush: b.id });
                  store.setActiveBrushWidth(b.defaultWidth);
                }
              }}
              className="group relative flex h-[46px] w-7 items-end justify-center cursor-pointer"
            >
              <div
                className="transition-transform duration-200"
                style={{
                  transform: selected
                    ? "translateY(-7px)"
                    : "translateY(0px)",
                }}
              >
                <SculptedBrushSVG
                  brush={b.id}
                  inkHex={activeTintHex}
                  isDark={palette.isDark}
                />
              </div>
              {selected && (
                <span
                  className="absolute -bottom-0.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: palette.accent }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        className="h-7 w-px"
        style={{ backgroundColor: palette.hairline }}
      />

      {/* Right Cluster: 48-Ink Risograph Ink Well */}
      <div className="relative">
        <button
          onClick={() => {
            setShowInkPopover((v) => !v);
            setShowShapePopover(false);
          }}
          className="flex items-center gap-2 rounded-full px-2.5 py-1.5 transition cursor-pointer"
          style={{
            backgroundColor: palette.cardElevated,
            border: `1px solid ${palette.hairline}`,
          }}
        >
          <span
            className="h-5 w-5 rounded-full shrink-0"
            style={{
              backgroundColor: activeTintHex,
              border: "1px solid rgba(0,0,0,0.18)",
            }}
          />
          <div className="text-left leading-tight hidden sm:block">
            <div
              className="text-[11px] font-semibold"
              style={{ color: palette.inkPrimary }}
            >
              {store.activeUseRisoInk
                ? getRisoInk(store.activeRisoInkName).nameCN
                : "自选印色"}
            </div>
            <div
              className="font-mono text-[9.5px]"
              style={{ color: palette.inkSecondary }}
            >
              {Math.round(store.activeInkDensity * 100)}% ·{" "}
              {store.activeBrushWidth.toFixed(1)}pt
            </div>
          </div>
        </button>

        {showInkPopover && (
          <div
            className="absolute bottom-13 right-0 z-40 w-[330px] rounded-2xl p-4 shadow-2xl space-y-3.5"
            style={{
              backgroundColor: palette.cardElevated,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">墨池与笔触调节</span>
              <div
                className="flex rounded-lg p-0.5 text-[11px]"
                style={{ backgroundColor: palette.deskSurface }}
              >
                <button
                  onClick={() => store.setActiveUseRisoInk(true)}
                  className="rounded-md px-2 py-1 font-medium cursor-pointer"
                  style={{
                    backgroundColor: store.activeUseRisoInk
                      ? palette.accentInkPill
                      : "transparent",
                    color: store.activeUseRisoInk
                      ? palette.accentInkPillForeground
                      : palette.inkSecondary,
                  }}
                >
                  Riso 专色 (48)
                </button>
                <button
                  onClick={() => store.setActiveUseRisoInk(false)}
                  className="rounded-md px-2 py-1 font-medium cursor-pointer"
                  style={{
                    backgroundColor: !store.activeUseRisoInk
                      ? palette.accentInkPill
                      : "transparent",
                    color: !store.activeUseRisoInk
                      ? palette.accentInkPillForeground
                      : palette.inkSecondary,
                  }}
                >
                  常规色
                </button>
              </div>
            </div>

            {store.activeUseRisoInk ? (
              <div className="space-y-2.5">
                <div className="flex gap-1">
                  {RISO_INK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setInkCategory(cat)}
                      className="flex-1 rounded-lg py-1 text-[10.5px] font-medium cursor-pointer"
                      style={{
                        backgroundColor:
                          inkCategory === cat
                            ? palette.deskSecondary
                            : "transparent",
                        color:
                          inkCategory === cat
                            ? palette.inkPrimary
                            : palette.inkSecondary,
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-8 gap-2">
                  {RISO_INK_CATALOG.filter((i) => i.category === inkCategory).map(
                    (ink) => {
                      const chosen = store.activeRisoInkName === ink.name;
                      return (
                        <button
                          key={ink.name}
                          title={`${ink.nameCN} · ${ink.name}`}
                          onClick={() => {
                            store.setActiveRisoInkName(ink.name);
                            if (store.selectedElement) {
                              store.updateSelectedElement(
                                {
                                  ...store.selectedElement,
                                  useRisoInk: true,
                                  risoInkName: ink.name,
                                },
                                true
                              );
                            }
                          }}
                          className="h-6.5 w-6.5 rounded-full cursor-pointer"
                          style={{
                            backgroundColor: ink.hex,
                            border: chosen
                              ? `2.2px solid ${palette.inkPrimary}`
                              : "1px solid rgba(0,0,0,0.16)",
                          }}
                        />
                      );
                    }
                  )}
                </div>

                <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
                  当前专色：{getRisoInk(store.activeRisoInkName).nameCN} (
                  {store.activeRisoInkName})
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <span>拾取印刷颜色</span>
                <input
                  type="color"
                  value={store.activeHexColor}
                  onChange={(e) => {
                    const hex = e.target.value;
                    store.setActiveHexColor(hex);
                    if (store.selectedElement) {
                      store.updateSelectedElement(
                        {
                          ...store.selectedElement,
                          useRisoInk: false,
                          fillHex: hex,
                        },
                        false
                      );
                    }
                  }}
                  className="h-8 w-14 cursor-pointer rounded border-0 bg-transparent"
                />
              </div>
            )}

            <div
              className="pt-2.5 space-y-2 text-[11px]"
              style={{ borderTop: `1px solid ${palette.hairline}` }}
            >
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0">油墨浓度</span>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.02}
                  value={store.activeInkDensity}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    store.setActiveInkDensity(v);
                    if (store.selectedElement && store.selectedElement.useRisoInk) {
                      store.updateSelectedElement(
                        { ...store.selectedElement, inkDensity: v },
                        false
                      );
                    }
                  }}
                  className="flex-1 accent-[#D25836]"
                />
                <span className="w-9 text-right font-mono">
                  {Math.round(store.activeInkDensity * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0">笔尖粗细</span>
                <input
                  type="range"
                  min={1}
                  max={38}
                  step={0.5}
                  value={store.activeBrushWidth}
                  onChange={(e) => store.setActiveBrushWidth(Number(e.target.value))}
                  className="flex-1 accent-[#D25836]"
                />
                <span className="w-9 text-right font-mono">
                  {Math.round(store.activeBrushWidth)}pt
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SculptedBrushSVG: React.FC<{
  brush: BrushKind;
  inkHex: string;
  isDark: boolean;
}> = ({ brush, inkHex, isDark }) => {
  const bodyFill = isDark ? "#43403C" : "#EDE9E0";
  const edgeStroke = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.16)";

  return (
    <svg width="26" height="42" viewBox="0 0 26 42" fill="none">
      {brush === "Pen" && (
        <>
          <rect x="6.5" y="18" width="13" height="24" fill="#2C2A28" />
          <rect x="6.5" y="15" width="13" height="3.2" fill="#C89D54" />
          <polygon points="13,3 18.5,15 7.5,15" fill={inkHex} />
          <line x1="13" y1="3" x2="13" y2="11" stroke="#FFFFFF" strokeOpacity="0.75" />
        </>
      )}
      {brush === "Marker" && (
        <>
          <rect
            x="4.5"
            y="14"
            width="17"
            height="28"
            rx="2.5"
            fill={bodyFill}
            stroke={edgeStroke}
            strokeWidth="0.8"
          />
          <polygon points="7.5,5 18.5,8.5 18.5,14 7.5,14" fill={inkHex} />
        </>
      )}
      {brush === "Brush" && (
        <>
          <rect x="7.5" y="18" width="11" height="24" fill="#C59B6D" />
          <path d="M13 2 Q19.5 10.5 18.5 18 L7.5 18 Q6.5 10.5 13 2 Z" fill={inkHex} />
        </>
      )}
      {brush === "Pencil" && (
        <>
          <rect x="7" y="17" width="12" height="25" fill="#E0A44F" />
          <polygon points="13,4 19,17 7,17" fill="#EAD2AC" />
          <polygon points="13,4 15.4,9.5 10.6,9.5" fill={inkHex} />
        </>
      )}
      {brush === "Crayon" && (
        <>
          <rect x="6" y="13" width="14" height="29" fill={inkHex} fillOpacity="0.84" />
          <rect x="6" y="19" width="14" height="3" fill="rgba(0,0,0,0.3)" />
          <polygon points="10.2,4.5 15.8,4.5 20,13 6,13" fill={inkHex} />
        </>
      )}
      {brush === "Oil pastel" && (
        <>
          <rect x="5" y="5" width="16" height="19" rx="6" fill={inkHex} />
          <rect
            x="5"
            y="16"
            width="16"
            height="26"
            fill={bodyFill}
            stroke={edgeStroke}
            strokeWidth="0.8"
          />
        </>
      )}
      {brush === "Spray" && (
        <>
          <rect x="4.5" y="15" width="17" height="27" rx="3" fill={inkHex} />
          <rect
            x="9"
            y="9.5"
            width="8"
            height="5.5"
            rx="1.5"
            fill={bodyFill}
            stroke={edgeStroke}
            strokeWidth="0.8"
          />
          <circle cx="8.5" cy="5.5" r="1.2" fill={inkHex} />
          <circle cx="13" cy="4" r="1.2" fill={inkHex} />
          <circle cx="17.5" cy="6" r="1.2" fill={inkHex} />
        </>
      )}
      {brush === "Eraser" && (
        <>
          <rect x="4.5" y="7" width="17" height="35" rx="4" fill="#F0A899" />
          <rect x="4.5" y="20" width="17" height="22" fill="#3B4B59" />
        </>
      )}
    </svg>
  );
};
