"use client";

import { useStudio } from "@/store/studioStore";
import { getAssetDataUrl } from "@/types/zine";
import { ArrowRight, Grid2X2, ImagePlus, X } from "lucide-react";
import React, { useState } from "react";

export const LibraryStepView: React.FC = () => {
  const store = useStudio();
  const { palette, project } = store;
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div className="h-full overflow-y-auto px-6 py-7 md:px-12">
      <div className="mx-auto max-w-6xl space-y-7 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div
              className="text-[11px] font-semibold tracking-[0.18em]"
              style={{ color: palette.inkSecondary }}
            >
              01 · LIGHT TABLE
            </div>
            <h2
              className="text-2xl md:text-3xl font-bold"
              style={{
                fontFamily: '"Songti SC", "STSong", "Noto Serif SC", Georgia, serif',
                color: palette.inkPrimary,
              }}
            >
              看片台与图像素材
            </h2>
            <p className="text-xs md:text-sm" style={{ color: palette.inkSecondary }}>
              支持批量拖入 JPG · PNG · WebP · GIF · AVIF · SVG 原片，随时在画布单页或横跨书脊跨页铺排。
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {project.assets.length > 0 && (
              <button
                onClick={store.autoFillPagesFromLibrary}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition active:opacity-75 cursor-pointer"
                style={{
                  backgroundColor: palette.cardElevated,
                  border: `1px solid ${palette.hairline}`,
                  color: palette.inkPrimary,
                }}
              >
                <Grid2X2 size={13.5} />
                <span>按序自动铺入页面</span>
              </button>
            )}

            <button
              onClick={() => store.setStage("format")}
              className="flex items-center gap-1.5 rounded-full px-4.5 py-2.5 text-xs font-semibold transition active:opacity-80 cursor-pointer"
              style={{
                backgroundColor: palette.accentInkPill,
                color: palette.accentInkPillForeground,
              }}
            >
              <span>下一步：开本与装订</span>
              <ArrowRight size={13.5} />
            </button>
          </div>
        </div>

        {/* Tactile Drop Zone */}
        <div
          onClick={store.triggerPhotoPicker}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files?.length) {
              store.importImageFiles(e.dataTransfer.files);
            }
          }}
          className="flex flex-col items-center justify-center rounded-3xl py-12 px-6 text-center transition cursor-pointer"
          style={{
            backgroundColor: palette.cardSurface,
            border: isDragOver
              ? `2px dashed ${palette.accent}`
              : `1px solid ${palette.hairline}`,
          }}
        >
          <div
            className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-full transition"
            style={{
              backgroundColor: isDragOver
                ? "rgba(210, 88, 54, 0.16)"
                : palette.deskSecondary,
              color: isDragOver ? palette.accent : palette.inkPrimary,
            }}
          >
            <ImagePlus size={24} />
          </div>
          <div
            className="text-sm md:text-base font-semibold"
            style={{ color: palette.inkPrimary }}
          >
            {isDragOver
              ? "松开鼠标即可放入看片台"
              : "将照片拖入此处，或点击从本地选择文件"}
          </div>
          <div className="mt-1.5 text-xs" style={{ color: palette.inkSecondary }}>
            纯浏览器端本地离线存储 (IndexedDB)，原片不会上传至任何服务器
          </div>
        </div>

        {/* Contact Sheet Grid */}
        {project.assets.length > 0 && (
          <div className="space-y-3.5">
            <div>
              <div
                className="text-xs font-semibold"
                style={{ color: palette.inkPrimary }}
              >
                胶片底片夹 ({project.assets.length} 张)
              </div>
              <div className="text-[11px]" style={{ color: palette.inkSecondary }}>
                点击任意底片可立即置入当前页，或在「03 创作」步骤自由拖拽成跨页大图
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {project.assets.map((asset, index) => (
                <div
                  key={asset.id}
                  className="group relative rounded-2xl p-2.5 transition-transform duration-200 hover:scale-[1.02]"
                  style={{
                    backgroundColor: palette.cardSurface,
                    border: `1px solid ${palette.hairline}`,
                  }}
                >
                  <div
                    onClick={() => {
                      store.placeAssetOnPage(asset, store.currentPageIndex);
                      store.setStage("design");
                    }}
                    className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl p-2 cursor-pointer"
                    style={{ backgroundColor: palette.deskSecondary }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getAssetDataUrl(asset)}
                      alt={asset.filename}
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      store.mutateProject((draft) => {
                        draft.assets = draft.assets.filter((a) => a.id !== asset.id);
                        return draft;
                      });
                    }}
                    title="移除素材"
                    className="absolute right-4 top-4 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 cursor-pointer"
                  >
                    <X size={13} />
                  </button>

                  <div className="mt-2 flex items-center justify-between gap-1.5 px-0.5 text-[11px]">
                    <span
                      className="font-mono text-[10px] font-bold shrink-0"
                      style={{ color: palette.accent }}
                    >
                      #{String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="truncate font-medium flex-1"
                      style={{ color: palette.inkPrimary }}
                    >
                      {asset.filename}
                    </span>
                    <span
                      className="font-mono text-[10px] shrink-0"
                      style={{ color: palette.inkMuted }}
                    >
                      {asset.pixelWidth}×{asset.pixelHeight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
