"use client";

import { Book3DPreview } from "@/components/Book3DPreview";
import { DesignInspectors } from "@/components/DesignInspectors";
import { InstrumentDock } from "@/components/InstrumentDock";
import { SinglePageCanvas } from "@/components/RenderedCanvas";
import { useStudio } from "@/store/studioStore";
import {
  BindingType,
  CanvasElement,
  getAssetDataUrl,
  getFormatAspectRatio,
  getRisoInk,
  NormalizedPoint,
} from "@/types/zine";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crop,
  Crosshair,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface VisibleCanvasItem {
  pageIndex: number;
  pageOriginX: number;
  layerRank: number;
  element: CanvasElement;
}

export const DesignStepView: React.FC = () => {
  const store = useStudio();

  if (store.viewMode === "All") {
    return <StoryboardOverview />;
  }
  if (store.viewMode === "3D") {
    return <Book3DPreview />;
  }
  return <PinnedCenterAtelierWorkspace />;
};

const PinnedCenterAtelierWorkspace: React.FC = () => {
  const store = useStudio();
  const { palette, project } = store;

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const strokeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [workspaceSize, setWorkspaceSize] = useState({ width: 1280, height: 760 });
  const [inlineEditingText, setInlineEditingText] = useState(false);

  // Measure workspace so book always stays pinned around exact window center
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) {
        setWorkspaceSize({ width: rect.width, height: rect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isSpread = store.viewMode === "Spread";
  const showLeft = store.showLibraryDrawer;
  const hasRightPanel = store.activeInspector !== null;

  const leftPanelW = showLeft ? 208 : 0;
  const rightPanelW = (hasRightPanel ? 282 : 0) + 50;
  const maxSideW = Math.max(leftPanelW, rightPanelW);

  const bottomBarReserve = 108;
  const stageAvailH = Math.max(200, workspaceSize.height - bottomBarReserve - 24);
  const symmetricAvailW = Math.max(240, workspaceSize.width - maxSideW * 2 - 24);

  const singleAspect = getFormatAspectRatio(project.format);
  const targetAspect = isSpread ? singleAspect * 2.0 : singleAspect;

  const maxBookW = Math.max(150, symmetricAvailW - 96);
  const maxBookH = Math.max(150, stageAvailH);

  const baseSize = useMemo(() => {
    let h = maxBookH * 0.93;
    let w = h * targetAspect;
    if (w > maxBookW) {
      w = maxBookW;
      h = w / Math.max(targetAspect, 0.05);
    }
    return { width: w, height: h };
  }, [maxBookW, maxBookH, targetAspect]);

  const fittedSize = {
    width: baseSize.width * store.canvasZoom,
    height: baseSize.height * store.canvasZoom,
  };
  const singlePageSize = {
    width: isSpread ? fittedSize.width * 0.5 : fittedSize.width,
    height: fittedSize.height,
  };

  const hasGuides = useMemo(() => {
    const g = project.bleedGuides;
    return (
      g.bleed3mm ||
      g.trimLine ||
      g.cropMarks ||
      g.centerMarks ||
      g.centerLineV ||
      g.centerLineH ||
      g.rulerMM
    );
  }, [project.bleedGuides]);

  const canSpanSpread =
    isSpread &&
    store.currentSpread.leftPageIndex !== null &&
    store.currentSpread.rightPageIndex !== null;

  const isAtFirstStep = isSpread
    ? store.currentSpreadIndex <= 0
    : store.currentPageIndex <= 0;
  const isAtLastStep = isSpread
    ? store.currentSpreadIndex >= Math.max(0, store.spreads.length - 1)
    : store.currentPageIndex >= Math.max(0, project.pages.length - 1);

  const flatItems: VisibleCanvasItem[] = useMemo(() => {
    const pagesToShow: { pageIndex: number; originX: number }[] = [];
    if (isSpread) {
      if (store.currentSpread.leftPageIndex !== null) {
        pagesToShow.push({
          pageIndex: store.currentSpread.leftPageIndex,
          originX: 0,
        });
      }
      if (store.currentSpread.rightPageIndex !== null) {
        pagesToShow.push({
          pageIndex: store.currentSpread.rightPageIndex,
          originX: singlePageSize.width,
        });
      }
    } else {
      pagesToShow.push({ pageIndex: store.currentPageIndex, originX: 0 });
    }

    const items: VisibleCanvasItem[] = [];
    let rank = 0;
    for (const entry of pagesToShow) {
      const page = project.pages[entry.pageIndex];
      if (!page) continue;
      for (const el of page.elements) {
        items.push({
          pageIndex: entry.pageIndex,
          pageOriginX: entry.originX,
          layerRank: rank++,
          element: el,
        });
      }
    }
    return items;
  }, [
    isSpread,
    project.pages,
    singlePageSize.width,
    store.currentPageIndex,
    store.currentSpread.leftPageIndex,
    store.currentSpread.rightPageIndex,
  ]);

  // Live Freehand Brush Drawing State
  const activeStrokeRef = useRef<{
    points: NormalizedPoint[];
    pageIndex: number | null;
  }>({ points: [], pageIndex: null });

  const handleBrushPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (store.activeTool.type !== "brush") return;
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const locX = e.clientX - rect.left;
    const locY = e.clientY - rect.top;

    let targetPage: number | null = null;
    let localX = locX;
    if (isSpread) {
      if (locX < singlePageSize.width) {
        targetPage = store.currentSpread.leftPageIndex;
      } else {
        targetPage = store.currentSpread.rightPageIndex;
        localX = locX - singlePageSize.width;
      }
    } else {
      targetPage = store.currentPageIndex;
    }
    if (targetPage === null) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const nx = Math.min(1, Math.max(0, localX / Math.max(singlePageSize.width, 1)));
    const ny = Math.min(1, Math.max(0, locY / Math.max(singlePageSize.height, 1)));
    activeStrokeRef.current = { points: [{ x: nx, y: ny }], pageIndex: targetPage };
  };

  const handleBrushPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (store.activeTool.type !== "brush") return;
    const st = activeStrokeRef.current;
    if (st.pageIndex === null) return;
    const stageEl = stageRef.current;
    const canvas = strokeCanvasRef.current;
    if (!stageEl || !canvas) return;

    const rect = stageEl.getBoundingClientRect();
    const locX = e.clientX - rect.left;
    const locY = e.clientY - rect.top;
    const pageOffsetX =
      isSpread && st.pageIndex === store.currentSpread.rightPageIndex
        ? singlePageSize.width
        : 0;

    const nx = Math.min(
      1,
      Math.max(0, (locX - pageOffsetX) / Math.max(singlePageSize.width, 1))
    );
    const ny = Math.min(1, Math.max(0, locY / Math.max(singlePageSize.height, 1)));
    st.points.push({ x: nx, y: ny });

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (st.points.length < 2) return;

    const previewHex =
      store.activeTool.brush === "Eraser"
        ? "#FFFFFF"
        : store.activeUseRisoInk
        ? getRisoInk(store.activeRisoInkName).hex
        : store.activeHexColor;

    ctx.strokeStyle = previewHex;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = store.activeBrushWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(
      pageOffsetX + st.points[0].x * singlePageSize.width,
      st.points[0].y * singlePageSize.height
    );
    for (let i = 1; i < st.points.length; i++) {
      ctx.lineTo(
        pageOffsetX + st.points[i].x * singlePageSize.width,
        st.points[i].y * singlePageSize.height
      );
    }
    ctx.stroke();
  };

  const handleBrushPointerUp = () => {
    if (store.activeTool.type !== "brush") return;
    const st = activeStrokeRef.current;
    if (st.pageIndex !== null && st.points.length >= 2) {
      store.appendBrushStroke(store.activeTool.brush, st.points, st.pageIndex);
    }
    activeStrokeRef.current = { points: [], pageIndex: null };
    const canvas = strokeCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div ref={workspaceRef} className="relative h-full w-full overflow-hidden select-none">
      {/* 1. CENTER ISLAND: Pinned at Exact Window Center X = W / 2 */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-center overflow-hidden"
        style={{ height: workspaceSize.height - bottomBarReserve }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            store.setSelectedRef(null);
            store.setIsCroppingPhoto(false);
            setInlineEditingText(false);
          }
        }}
      >
        <div className="flex items-center gap-3.5">
          <button
            disabled={isAtFirstStep}
            onClick={() => store.stepPage(-1)}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full transition disabled:opacity-25 cursor-pointer disabled:cursor-default z-10"
            style={{
              backgroundColor: palette.cardSurface,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
          >
            <ChevronLeft size={15} />
          </button>

          {/* Book Canvas Stage */}
          <div
            ref={stageRef}
            className="relative"
            style={{ width: fittedSize.width, height: fittedSize.height }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const locX = e.clientX - rect.left;
              const locY = e.clientY - rect.top;

              if (e.dataTransfer.files?.length) {
                store.importImageFiles(e.dataTransfer.files);
                return;
              }

              const assetId = e.dataTransfer.getData("text/easyzine-asset-id");
              if (assetId) {
                const asset = project.assets.find((a) => a.id === assetId);
                if (!asset) return;
                let targetPage = store.currentPageIndex;
                if (isSpread) {
                  if (
                    locX < singlePageSize.width &&
                    store.currentSpread.leftPageIndex !== null
                  ) {
                    targetPage = store.currentSpread.leftPageIndex;
                  } else if (store.currentSpread.rightPageIndex !== null) {
                    targetPage = store.currentSpread.rightPageIndex;
                  }
                }
                const nearSpine =
                  canSpanSpread && Math.abs(locX - singlePageSize.width) < 42;
                const ownerPage = nearSpine
                  ? store.currentSpread.leftPageIndex ?? targetPage
                  : targetPage;
                const localX =
                  isSpread && locX >= singlePageSize.width
                    ? locX - singlePageSize.width
                    : locX;
                store.placeAssetOnPage(
                  asset,
                  ownerPage,
                  {
                    x: Math.min(0.9, Math.max(0.1, localX / singlePageSize.width)),
                    y: Math.min(0.9, Math.max(0.1, locY / singlePageSize.height)),
                  },
                  nearSpine
                );
              }
            }}
          >
            {/* Paper Contact Shadow */}
            <BookContactShadow
              isSpread={isSpread}
              hasLeft={store.currentSpread.leftPageIndex !== null}
              hasRight={store.currentSpread.rightPageIndex !== null}
              totalWidth={fittedSize.width}
              totalHeight={fittedSize.height}
              isDark={palette.isDark}
            />

            {/* Rendered Zine Page(s) */}
            {isSpread ? (
              <div className="relative flex h-full w-full pointer-events-none">
                {store.currentSpread.leftPageIndex !== null ? (
                  <SinglePageCanvas
                    project={project}
                    pageIndex={store.currentSpread.leftPageIndex}
                    pixelHeight={Math.round(singlePageSize.height * 1.85)}
                    includeGuides={hasGuides}
                    style={{
                      width: singlePageSize.width,
                      height: singlePageSize.height,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: singlePageSize.width,
                      height: singlePageSize.height,
                    }}
                  />
                )}

                {store.currentSpread.rightPageIndex !== null ? (
                  <SinglePageCanvas
                    project={project}
                    pageIndex={store.currentSpread.rightPageIndex}
                    pairedLeftPageIndex={
                      store.currentSpread.rightPageIndex > 0 &&
                      store.currentSpread.rightPageIndex % 2 === 0
                        ? store.currentSpread.rightPageIndex - 1
                        : null
                    }
                    pixelHeight={Math.round(singlePageSize.height * 1.85)}
                    includeGuides={hasGuides}
                    style={{
                      width: singlePageSize.width,
                      height: singlePageSize.height,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: singlePageSize.width,
                      height: singlePageSize.height,
                    }}
                  />
                )}

                {/* Spine Crease & Binding Hardware SVG Overlay */}
                <SpineHardwareSVG
                  binding={project.format.binding}
                  hasLeft={store.currentSpread.leftPageIndex !== null}
                  hasRight={store.currentSpread.rightPageIndex !== null}
                  width={fittedSize.width}
                  height={fittedSize.height}
                />
              </div>
            ) : (
              <div className="pointer-events-none h-full w-full">
                <SinglePageCanvas
                  project={project}
                  pageIndex={store.currentPageIndex}
                  pixelHeight={Math.round(singlePageSize.height * 1.85)}
                  includeGuides={hasGuides}
                  style={{
                    width: singlePageSize.width,
                    height: singlePageSize.height,
                  }}
                />
              </div>
            )}

            {/* Interactive Pointer Overlay OR Brush Canvas */}
            {store.activeTool.type === "pointer" ? (
              <div
                className="absolute inset-0"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) {
                    store.setSelectedRef(null);
                    store.setIsCroppingPhoto(false);
                    setInlineEditingText(false);
                  }
                }}
              >
                {flatItems.map((item) => (
                  <InteractiveElementBox
                    key={item.element.id}
                    item={item}
                    allItems={flatItems}
                    singlePageSize={singlePageSize}
                    stageRef={stageRef}
                    inlineEditingText={inlineEditingText}
                    setInlineEditingText={setInlineEditingText}
                  />
                ))}
              </div>
            ) : store.activeTool.type === "brush" ? (
              <canvas
                ref={strokeCanvasRef}
                width={Math.max(10, Math.round(fittedSize.width))}
                height={Math.max(10, Math.round(fittedSize.height))}
                onPointerDown={handleBrushPointerDown}
                onPointerMove={handleBrushPointerMove}
                onPointerUp={handleBrushPointerUp}
                onPointerCancel={handleBrushPointerUp}
                className="absolute inset-0 cursor-crosshair touch-none"
              />
            ) : null}
          </div>

          <button
            disabled={isAtLastStep}
            onClick={() => store.stepPage(1)}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full transition disabled:opacity-25 cursor-pointer disabled:cursor-default z-10"
            style={{
              backgroundColor: palette.cardSurface,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* 2. BOTTOM ISLAND: Instrument Dock + Page Strip & Zoom */}
      <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5">
        <div className="pointer-events-auto">
          <InstrumentDock />
        </div>
        <div className="pointer-events-auto">
          <PageStripAndZoomBar />
        </div>
      </div>

      {/* 3. LEFT ISLAND: Photo Filmstrip Drawer */}
      {showLeft && (
        <aside
          className="absolute left-0 top-0 bottom-0 z-10 flex w-[208px] flex-col"
          style={{
            backgroundColor: palette.cardSurface,
            borderRight: `1px solid ${palette.hairline}`,
          }}
        >
          <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
            <span
              className="text-xs font-semibold"
              style={{ color: palette.inkPrimary }}
            >
              底片夹 ({project.assets.length})
            </span>
            <button
              onClick={store.triggerPhotoPicker}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
              style={{
                backgroundColor: "rgba(210,88,54,0.12)",
                color: palette.accent,
              }}
            >
              <Plus size={11} />
              <span>导入</span>
            </button>
          </div>

          {project.assets.length === 0 ? (
            <div
              className="flex flex-1 flex-col items-center justify-center p-4 text-center text-xs"
              style={{ color: palette.inkSecondary }}
            >
              尚无照片
              <br />
              点击导入或直接拖入画布
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2.5">
              {project.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded-xl p-1.5 space-y-1.5"
                  style={{ backgroundColor: palette.deskSurface }}
                >
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/easyzine-asset-id", asset.id);
                    }}
                    onClick={() => {
                      const target = isSpread
                        ? store.currentSpread.rightPageIndex ??
                          store.currentSpread.leftPageIndex ??
                          store.currentPageIndex
                        : store.currentPageIndex;
                      store.placeAssetOnPage(asset, target);
                    }}
                    className="h-27 w-full overflow-hidden rounded-lg cursor-pointer"
                    style={{ border: `1px solid ${palette.hairline}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getAssetDataUrl(asset)}
                      alt={asset.filename}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1 px-0.5">
                    <span
                      className="truncate text-[10.5px]"
                      style={{ color: palette.inkSecondary }}
                    >
                      {asset.filename}
                    </span>
                    {canSpanSpread && (
                      <button
                        onClick={() => {
                          if (store.currentSpread.leftPageIndex !== null) {
                            store.placeAssetOnPage(
                              asset,
                              store.currentSpread.leftPageIndex,
                              undefined,
                              true
                            );
                          }
                        }}
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer"
                        style={{
                          backgroundColor: "rgba(210,88,54,0.11)",
                          color: palette.accent,
                        }}
                      >
                        跨页大图
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* 4. RIGHT ISLAND: Inspector Column + Vertical Rail */}
      <div className="absolute right-0 top-0 bottom-0 z-10">
        <DesignInspectors />
      </div>
    </div>
  );
};

// Interactive Manipulation Box for Each Visible Element
const InteractiveElementBox: React.FC<{
  item: VisibleCanvasItem;
  allItems: VisibleCanvasItem[];
  singlePageSize: { width: number; height: number };
  stageRef: React.RefObject<HTMLDivElement | null>;
  inlineEditingText: boolean;
  setInlineEditingText: (v: boolean) => void;
}> = ({
  item,
  allItems,
  singlePageSize,
  stageRef,
  inlineEditingText,
  setInlineEditingText,
}) => {
  const store = useStudio();
  const { palette } = store;
  const { element, pageIndex, pageOriginX, layerRank } = item;

  const isSelected =
    store.selectedRef?.pageIndex === pageIndex &&
    store.selectedRef?.elementID === element.id;

  const frameW = Math.max(18, element.width * singlePageSize.width);
  const frameH = Math.max(18, element.height * singlePageSize.height);
  const left = pageOriginX + element.x * singlePageSize.width;
  const top = element.y * singlePageSize.height;

  const containsStagePoint = (
    pt: { x: number; y: number },
    cand: VisibleCanvasItem
  ): boolean => {
    const w = Math.max(18, cand.element.width * singlePageSize.width);
    const h = Math.max(18, cand.element.height * singlePageSize.height);
    const cx = cand.pageOriginX + cand.element.x * singlePageSize.width + w * 0.5;
    const cy = cand.element.y * singlePageSize.height + h * 0.5;
    let dx = pt.x - cx;
    let dy = pt.y - cy;
    if (
      cand.element.kind !== "stroke" &&
      Math.abs(cand.element.rotationDegrees) > 0.01
    ) {
      const rad = (-cand.element.rotationDegrees * Math.PI) / 180.0;
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
      dx = rx;
      dy = ry;
    }
    return Math.abs(dx) <= w * 0.5 && Math.abs(dy) <= h * 0.5;
  };

  const handleMouseDownMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startSnapshot = structuredClone(element);
    let moved = false;

    const onMove = (me: MouseEvent) => {
      const dist = Math.hypot(me.clientX - startClientX, me.clientY - startClientY);
      if (!moved && dist < 2.5) return;

      if (!moved) {
        moved = true;
        if (!isSelected) {
          store.setSelectedRef({ pageIndex, elementID: element.id });
          store.setCurrentPageIndex(pageIndex);
        }
        store.recordUndoCheckpoint();
      }

      const dx = (me.clientX - startClientX) / Math.max(singlePageSize.width, 1);
      const dy = (me.clientY - startClientY) / Math.max(singlePageSize.height, 1);
      const updated = structuredClone(startSnapshot);

      if (store.isCroppingPhoto && updated.kind === "photo") {
        updated.cropOffsetX = Math.min(0.85, Math.max(-0.85, updated.cropOffsetX + dx));
        updated.cropOffsetY = Math.min(0.85, Math.max(-0.85, updated.cropOffsetY + dy));
      } else if (updated.kind === "stroke") {
        updated.x += dx;
        updated.y += dy;
        updated.strokePoints = startSnapshot.strokePoints.map((p) => ({
          x: p.x + dx,
          y: p.y + dy,
        }));
      } else {
        updated.x += dx;
        updated.y += dy;
        if (store.viewMode === "Spread" && updated.x + updated.width > 1.02) {
          updated.spansSpread = true;
        }
      }
      store.updateSelectedElementLive(updated);
    };

    const onUp = (ue: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (moved) {
        store.commitLiveChanges();
        return;
      }

      // Stationary single click -> topmost hit test + Alt/Option layer cycle
      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) {
        store.setSelectedRef({ pageIndex, elementID: element.id });
        store.setCurrentPageIndex(pageIndex);
        return;
      }
      const pt = {
        x: ue.clientX - stageRect.left,
        y: ue.clientY - stageRect.top,
      };
      const hitsTopFirst = [...allItems]
        .reverse()
        .filter((cand) => containsStagePoint(pt, cand));

      if (isSelected && ue.altKey && hitsTopFirst.length > 1) {
        const curPos = hitsTopFirst.findIndex((h) => h.element.id === element.id);
        const nextItem = hitsTopFirst[(curPos + 1) % hitsTopFirst.length];
        store.setSelectedRef({
          pageIndex: nextItem.pageIndex,
          elementID: nextItem.element.id,
        });
        store.setCurrentPageIndex(nextItem.pageIndex);
      } else if (hitsTopFirst.length > 0) {
        const topItem = hitsTopFirst[0];
        store.setSelectedRef({
          pageIndex: topItem.pageIndex,
          elementID: topItem.element.id,
        });
        store.setCurrentPageIndex(topItem.pageIndex);
      } else {
        store.setSelectedRef({ pageIndex, elementID: element.id });
        store.setCurrentPageIndex(pageIndex);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startCornerResize = (
    e: React.MouseEvent,
    corner: "tl" | "tr" | "bl" | "br"
  ) => {
    e.stopPropagation();
    store.recordUndoCheckpoint();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = structuredClone(element);
    const minSize = 0.05;

    const onMove = (me: MouseEvent) => {
      const dw = (me.clientX - startX) / Math.max(singlePageSize.width, 1);
      const dh = (me.clientY - startY) / Math.max(singlePageSize.height, 1);
      const updated = { ...start };

      if (corner === "br") {
        updated.width = Math.max(minSize, start.width + dw);
        updated.height = Math.max(minSize, start.height + dh);
      } else if (corner === "bl") {
        const nw = Math.max(minSize, start.width - dw);
        updated.x = start.x + (start.width - nw);
        updated.width = nw;
        updated.height = Math.max(minSize, start.height + dh);
      } else if (corner === "tr") {
        const nh = Math.max(minSize, start.height - dh);
        updated.width = Math.max(minSize, start.width + dw);
        updated.y = start.y + (start.height - nh);
        updated.height = nh;
      } else {
        const nw = Math.max(minSize, start.width - dw);
        const nh = Math.max(minSize, start.height - dh);
        updated.x = start.x + (start.width - nw);
        updated.y = start.y + (start.height - nh);
        updated.width = nw;
        updated.height = nh;
      }

      if (store.viewMode === "Spread" && updated.x + updated.width > 1.02) {
        updated.spansSpread = true;
      }
      store.updateSelectedElementLive(updated);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      store.commitLiveChanges();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: frameW,
        height: frameH,
        transform:
          element.kind === "stroke"
            ? undefined
            : `rotate(${element.rotationDegrees}deg)`,
        zIndex: isSelected ? 1000 : layerRank + 1,
      }}
    >
      <div
        onMouseDown={handleMouseDownMove}
        onDoubleClick={(e) => {
          e.stopPropagation();
          store.setSelectedRef({ pageIndex, elementID: element.id });
          if (element.kind === "text") {
            setInlineEditingText(true);
          } else if (element.kind === "photo") {
            store.setIsCroppingPhoto((v) => !v);
          }
        }}
        className="h-full w-full cursor-move"
        style={{
          border: isSelected
            ? `${store.isCroppingPhoto ? "1.5px dashed" : "1.5px solid"} ${
                palette.accent
              }`
            : "1px solid transparent",
        }}
      />

      {/* Resize Handles */}
      {isSelected && element.kind !== "stroke" && (
        <>
          {(
            [
              ["tl", "-left-1.5 -top-1.5 cursor-nwse-resize"],
              ["tr", "-right-1.5 -top-1.5 cursor-nesw-resize"],
              ["bl", "-left-1.5 -bottom-1.5 cursor-nesw-resize"],
              ["br", "-right-1.5 -bottom-1.5 cursor-nwse-resize"],
            ] as const
          ).map(([corner, posCls]) => (
            <div
              key={corner}
              onMouseDown={(e) => startCornerResize(e, corner)}
              className={`absolute h-2.5 w-2.5 rounded-full bg-white ${posCls}`}
              style={{ border: `1.8px solid ${palette.accent}` }}
            />
          ))}
        </>
      )}

      {/* Polygon Vertex Handles */}
      {isSelected &&
        element.kind === "shape" &&
        element.shapeKind === "Freeform" &&
        store.isEditingPolygonPoints &&
        element.polygonPoints.map((pt, ptIdx) => (
          <div
            key={ptIdx}
            onMouseDown={(e) => {
              e.stopPropagation();
              store.recordUndoCheckpoint();
              const sx = e.clientX;
              const sy = e.clientY;
              const startPt = { ...pt };
              const onMove = (me: MouseEvent) => {
                const nx = Math.min(
                  1.2,
                  Math.max(-0.2, startPt.x + (me.clientX - sx) / Math.max(frameW, 1))
                );
                const ny = Math.min(
                  1.2,
                  Math.max(-0.2, startPt.y + (me.clientY - sy) / Math.max(frameH, 1))
                );
                const nextPts = [...element.polygonPoints];
                nextPts[ptIdx] = { x: nx, y: ny };
                store.updateSelectedElementLive({
                  ...element,
                  polygonPoints: nextPts,
                });
              };
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
                store.commitLiveChanges();
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white cursor-pointer"
            style={{
              left: `${pt.x * 100}%`,
              top: `${pt.y * 100}%`,
              backgroundColor: palette.accent,
            }}
          />
        ))}

      {/* Floating Selection Quick Toolbar */}
      {isSelected && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full px-2 py-0.5 shadow-md whitespace-nowrap"
          style={{
            backgroundColor: palette.cardElevated,
            border: `1px solid ${palette.hairline}`,
            color: palette.inkPrimary,
          }}
        >
          <button
            onClick={() => {
              store.alignSelectedHorizontal("center");
              store.alignSelectedVertical("middle");
            }}
            title="页面居中"
            className="p-1.5 hover:opacity-75 cursor-pointer"
          >
            <Crosshair size={12} />
          </button>

          {element.kind === "photo" && (
            <>
              <button
                onClick={() => store.setIsCroppingPhoto((v) => !v)}
                title="框内裁切平移"
                className="p-1.5 hover:opacity-75 cursor-pointer"
                style={{
                  color: store.isCroppingPhoto
                    ? palette.accent
                    : palette.inkPrimary,
                }}
              >
                <Crop size={12} />
              </button>
              <button
                onClick={store.resetPhotoAspectRatio}
                title="还原原始比例"
                className="p-1.5 hover:opacity-75 cursor-pointer"
              >
                <RotateCcw size={12} />
              </button>
            </>
          )}

          <button
            onClick={store.matchSelectedToFullBleed}
            title="铺满页面"
            className="p-1.5 hover:opacity-75 cursor-pointer"
          >
            <Maximize2 size={12} />
          </button>

          <button
            onClick={store.duplicateSelected}
            title="复制图层 (⌘D)"
            className="p-1.5 hover:opacity-75 cursor-pointer"
          >
            <Copy size={12} />
          </button>

          <button
            onClick={store.deleteSelected}
            title="删除"
            className="p-1.5 text-red-500 hover:opacity-75 cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Inline Text Editor Popover */}
      {isSelected && inlineEditingText && element.kind === "text" && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50 w-64 rounded-2xl p-3 shadow-2xl space-y-1.5"
          style={{
            backgroundColor: palette.cardElevated,
            border: `1px solid ${palette.hairline}`,
            color: palette.inkPrimary,
          }}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span>编辑文本内容</span>
            <button
              onClick={() => setInlineEditingText(false)}
              className="text-[11px] cursor-pointer"
              style={{ color: palette.accent }}
            >
              完成
            </button>
          </div>
          <textarea
            autoFocus
            value={element.text}
            onChange={(e) =>
              store.updateSelectedElement({ ...element, text: e.target.value })
            }
            rows={4}
            className="w-full rounded-xl p-2 text-xs outline-none"
            style={{
              backgroundColor: palette.deskSurface,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
          />
        </div>
      )}
    </div>
  );
};

// Storyboard All-Pages Overview with Drag-and-Drop Reordering
const StoryboardOverview: React.FC = () => {
  const store = useStudio();
  const { palette, project } = store;
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <div className="mx-auto max-w-6xl space-y-5 pb-10">
        <div>
          <div
            className="text-xs font-semibold"
            style={{ color: palette.inkPrimary }}
          >
            全书台本鸟瞰 Storyboard ({project.pages.length}P)
          </div>
          <div className="text-[11.5px]" style={{ color: palette.inkSecondary }}>
            单击任意页进入细编 · 拖拽单页缩略图可自由调换全书叙事顺序
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {store.spreads.map((sp) => (
            <div key={sp.index} className="flex flex-col items-center gap-2">
              <div
                className="grid w-full grid-cols-2 gap-1 rounded-2xl p-2"
                style={{
                  backgroundColor: palette.cardSurface,
                  border: `1px solid ${palette.hairline}`,
                }}
              >
                {[sp.leftPageIndex, sp.rightPageIndex].map((pIdx, side) =>
                  pIdx !== null ? (
                    <div
                      key={side}
                      draggable
                      onDragStart={() => setDragFromIdx(pIdx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragFromIdx !== null && dragFromIdx !== pIdx) {
                          store.movePage(dragFromIdx, pIdx);
                        }
                        setDragFromIdx(null);
                      }}
                      onClick={() => {
                        store.setCurrentPageIndex(pIdx);
                        store.setViewMode("Spread");
                      }}
                      className="relative flex h-44 items-center justify-center overflow-hidden rounded cursor-pointer transition hover:opacity-90"
                    >
                      <SinglePageCanvas
                        project={project}
                        pageIndex={pIdx}
                        pixelHeight={280}
                        className="max-h-full max-w-full object-contain"
                      />
                      <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-white">
                        {pIdx + 1}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={side}
                      className="flex h-44 items-center justify-center rounded text-xs"
                      style={{
                        backgroundColor: palette.deskSecondary,
                        opacity: 0.45,
                        color: palette.inkMuted,
                      }}
                    >
                      —
                    </div>
                  )
                )}
              </div>
              <span
                className="font-mono text-[11.5px]"
                style={{ color: palette.inkSecondary }}
              >
                {sp.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Bottom Page Strip + Zoom Controls
const PageStripAndZoomBar: React.FC = () => {
  const store = useStudio();
  const { palette, project } = store;
  const pageCount = project.pages.length;
  const isSpread = store.viewMode === "Spread";
  const zoomPct = Math.round(store.canvasZoom * 100);

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center gap-1 rounded-full px-2.5 py-1"
        style={{
          backgroundColor: palette.cardSurface,
          border: `1px solid ${palette.hairline}`,
        }}
      >
        <button
          onClick={() => store.stepPage(-1)}
          className="flex h-5.5 w-6 items-center justify-center cursor-pointer"
          style={{ color: palette.inkPrimary }}
        >
          <ArrowLeft size={11} />
        </button>

        <div className="flex max-w-[380px] items-center gap-0.5 overflow-x-auto no-scrollbar">
          {Array.from({ length: pageCount }).map((_, p) => {
            const highlighted = isSpread
              ? store.currentSpread.leftPageIndex === p ||
                store.currentSpread.rightPageIndex === p
              : store.currentPageIndex === p;
            return (
              <button
                key={p}
                onClick={() => {
                  store.setCurrentPageIndex(p);
                  store.setSelectedRef(null);
                }}
                className="min-w-[24px] h-5.5 rounded-md font-mono text-[11px] transition cursor-pointer"
                style={{
                  backgroundColor: highlighted
                    ? palette.accentInkPill
                    : "transparent",
                  color: highlighted
                    ? palette.accentInkPillForeground
                    : palette.inkSecondary,
                  fontWeight: highlighted ? 700 : 500,
                }}
              >
                {p + 1}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => store.stepPage(1)}
          className="flex h-5.5 w-6 items-center justify-center cursor-pointer"
          style={{ color: palette.inkPrimary }}
        >
          <ArrowRight size={11} />
        </button>

        <div
          className="mx-1 h-3 w-px"
          style={{ backgroundColor: palette.hairline }}
        />

        <span
          className="font-mono text-[10.5px] pr-1"
          style={{ color: palette.inkSecondary }}
        >
          {store.currentPageIndex + 1}/{pageCount}
        </span>
      </div>

      <div
        className="flex items-center gap-0.5 rounded-full px-1.5 py-1"
        style={{
          backgroundColor: palette.cardSurface,
          border: `1px solid ${palette.hairline}`,
        }}
      >
        <button
          onClick={() =>
            store.setCanvasZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))
          }
          className="flex h-5.5 w-6 items-center justify-center cursor-pointer"
          style={{ color: palette.inkPrimary }}
        >
          <Minus size={11} />
        </button>
        <button
          onClick={() => store.setCanvasZoom(1.0)}
          className="min-w-[38px] h-5.5 font-mono text-[10.5px] cursor-pointer"
          style={{ color: palette.inkSecondary }}
        >
          {zoomPct}%
        </button>
        <button
          onClick={() =>
            store.setCanvasZoom((z) => Math.min(2.4, +(z + 0.15).toFixed(2)))
          }
          className="flex h-5.5 w-6 items-center justify-center cursor-pointer"
          style={{ color: palette.inkPrimary }}
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
};

const BookContactShadow: React.FC<{
  isSpread: boolean;
  hasLeft: boolean;
  hasRight: boolean;
  totalWidth: number;
  totalHeight: number;
  isDark: boolean;
}> = ({ isSpread, hasLeft, hasRight, totalWidth, totalHeight, isDark }) => {
  const halfW = totalWidth * 0.5;
  let left = 0;
  let width = totalWidth;
  if (isSpread) {
    if (!hasLeft && hasRight) {
      left = halfW;
      width = halfW;
    } else if (!hasRight && hasLeft) {
      left = 0;
      width = halfW;
    }
  }
  return (
    <div
      className="pointer-events-none absolute top-0"
      style={{
        left,
        width,
        height: totalHeight,
        boxShadow: isDark
          ? "0 8px 28px rgba(0,0,0,0.45)"
          : "0 6px 22px rgba(0,0,0,0.09)",
      }}
    />
  );
};

const SpineHardwareSVG: React.FC<{
  binding: BindingType;
  hasLeft: boolean;
  hasRight: boolean;
  width: number;
  height: number;
}> = ({ binding, hasLeft, hasRight, width, height }) => {
  const spineX = width * 0.5;
  const dir = hasLeft && !hasRight ? -1 : 1;
  const seamX = spineX + dir * 11;
  const ringCount = Math.max(8, Math.floor(height / 26));

  return (
    <svg
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0"
    >
      <defs>
        <linearGradient id="spineGutterGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="47%" stopColor="rgba(0,0,0,0.08)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="53%" stopColor="rgba(0,0,0,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
      </defs>

      {hasLeft && hasRight && (
        <rect
          x={spineX - 12}
          y={0}
          width={24}
          height={height}
          fill="url(#spineGutterGrad)"
        />
      )}

      {binding === "saddle" &&
        [0.24, 0.76].map((f) => {
          const len = Math.min(18, height * 0.06);
          const cy = height * f;
          return (
            <line
              key={f}
              x1={spineX}
              y1={cy - len * 0.5}
              x2={spineX}
              y2={cy + len * 0.5}
              stroke="#8A8E94"
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          );
        })}

      {(binding === "sewing" || binding === "thread") && (
        <line
          x1={spineX}
          y1={height * 0.1}
          x2={spineX}
          y2={height * 0.9}
          stroke="rgba(200,90,50,0.82)"
          strokeWidth={1.4}
          strokeDasharray="8 5"
        />
      )}

      {binding === "japanese" && (
        <g stroke="rgba(158,59,43,0.85)" strokeWidth={1.4}>
          <line x1={seamX} y1={0} x2={seamX} y2={height} />
          {[0.16, 0.39, 0.61, 0.84].map((f) => (
            <line
              key={f}
              x1={seamX}
              y1={height * f}
              x2={spineX}
              y2={height * f}
            />
          ))}
        </g>
      )}

      {binding === "ring" &&
        Array.from({ length: ringCount }).map((_, i) => {
          const ry = (i + 0.8) * (height / (ringCount + 1));
          return (
            <line
              key={i}
              x1={spineX - 6}
              y1={ry}
              x2={spineX + 6}
              y2={ry}
              stroke="#6B6F76"
              strokeWidth={1.8}
            />
          );
        })}
    </svg>
  );
};
