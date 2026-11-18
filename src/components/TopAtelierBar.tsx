"use client";

import { useStudio } from "@/store/studioStore";
import { DESIGN_VIEW_MODES, STUDIO_STAGES } from "@/types/zine";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Moon,
  PanelLeft,
  Redo2,
  Sun,
  Undo2,
  X,
} from "lucide-react";
import React from "react";

export const TopAtelierBar: React.FC = () => {
  const store = useStudio();
  const { palette, stage } = store;
  const workflowStages = STUDIO_STAGES.filter((s) => s.id !== "shelf");

  return (
    <>
      <header
        className="relative flex h-[52px] shrink-0 items-center justify-between px-4 select-none"
        style={{
          backgroundColor: palette.deskSurface,
          borderBottom: `1px solid ${palette.hairline}`,
          color: palette.inkPrimary,
        }}
      >
        {/* Left Cluster */}
        <div className="flex items-center gap-2.5 z-10">
          <button
            onClick={() => store.setStage("shelf")}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:opacity-75 cursor-pointer"
            style={{
              backgroundColor: palette.cardSurface,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
          >
            <BookOpen
              size={13.5}
              style={{
                color: stage === "shelf" ? palette.accent : palette.inkPrimary,
              }}
            />
            <span>书架</span>
          </button>

          {stage === "design" &&
            (store.viewMode === "Single" || store.viewMode === "Spread") && (
              <button
                onClick={() => store.setShowLibraryDrawer((v) => !v)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition active:opacity-75 cursor-pointer"
                style={{
                  backgroundColor: store.showLibraryDrawer
                    ? palette.accentInkPill
                    : palette.cardSurface,
                  color: store.showLibraryDrawer
                    ? palette.accentInkPillForeground
                    : palette.inkPrimary,
                  border: store.showLibraryDrawer
                    ? "1px solid transparent"
                    : `1px solid ${palette.hairline}`,
                }}
              >
                <PanelLeft size={13} />
                <span>底片栏</span>
              </button>
            )}

          {stage !== "shelf" && stage !== "design" && (
            <span
              className="hidden sm:inline-block max-w-[180px] truncate text-xs font-medium ml-1"
              style={{ color: palette.inkSecondary }}
            >
              {store.project.title}
            </span>
          )}
        </div>

        {/* Exact Mathematical Center: 4-Stage Workflow Switcher */}
        {stage !== "shelf" && (
          <nav
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full p-1"
            style={{
              backgroundColor: palette.cardSurface,
              border: `1px solid ${palette.hairline}`,
            }}
          >
            {workflowStages.map((item) => {
              const active = stage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => store.setStage(item.id)}
                  className="flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs transition active:opacity-75 cursor-pointer"
                  style={{
                    backgroundColor: active ? palette.accentInkPill : "transparent",
                    color: active
                      ? palette.accentInkPillForeground
                      : palette.inkPrimary,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span
                    className="font-mono text-[10px] font-bold"
                    style={{ opacity: active ? 0.9 : 0.5 }}
                  >
                    {item.stepNumber}
                  </span>
                  <span>{item.title}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Cluster */}
        <div className="flex items-center gap-2 z-10">
          {stage === "design" && (
            <div
              className="hidden md:flex items-center gap-0.5 rounded-full p-0.5"
              style={{
                backgroundColor: palette.cardSurface,
                border: `1px solid ${palette.hairline}`,
              }}
            >
              {DESIGN_VIEW_MODES.map((m) => {
                const selected = store.viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => store.setViewMode(m.id)}
                    className="rounded-full px-2.5 py-1 text-[11.5px] transition active:opacity-75 cursor-pointer"
                    style={{
                      backgroundColor: selected
                        ? palette.accentInkPill
                        : "transparent",
                      color: selected
                        ? palette.accentInkPillForeground
                        : palette.inkPrimary,
                      fontWeight: selected ? 600 : 500,
                    }}
                  >
                    {m.shortLabel}
                  </button>
                );
              })}
            </div>
          )}

          {stage !== "shelf" && (
            <div className="flex items-center gap-1">
              <button
                onClick={store.undo}
                disabled={!store.canUndo}
                title="撤销 (⌘Z / Ctrl+Z)"
                className="flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-30 cursor-pointer disabled:cursor-default"
                style={{ color: palette.inkPrimary }}
              >
                <Undo2 size={14} />
              </button>
              <button
                onClick={store.redo}
                disabled={!store.canRedo}
                title="重做 (⌘⇧Z / Ctrl+Shift+Z)"
                className="flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-30 cursor-pointer disabled:cursor-default"
                style={{ color: palette.inkPrimary }}
              >
                <Redo2 size={14} />
              </button>
            </div>
          )}

          <button
            onClick={store.toggleDarkStudio}
            title="切换日间暖亚麻纸 / 夜间胡桃木画室"
            className="flex h-7 w-7 items-center justify-center rounded-full transition active:opacity-75 cursor-pointer"
            style={{
              backgroundColor: palette.cardSurface,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
          >
            {store.isDarkStudio ? <Sun size={13.5} /> : <Moon size={13.5} />}
          </button>

          <button
            onClick={() => store.setShowShortcutsModal(true)}
            title="快捷键与手势指南"
            className="flex h-7 w-7 items-center justify-center rounded-full transition active:opacity-75 cursor-pointer"
            style={{
              backgroundColor: palette.cardSurface,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {(store.toastMessage || store.isExporting) && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium shadow-md pointer-events-none"
          style={{
            backgroundColor: palette.cardElevated,
            border: `1px solid ${palette.hairline}`,
            color: palette.inkPrimary,
          }}
        >
          {store.isExporting ? (
            <>
              <Loader2 size={14} className="animate-spin" style={{ color: palette.accent }} />
              <span>正在高精度渲染印面并打包文件…</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={14} style={{ color: palette.accent }} />
              <span>{store.toastMessage}</span>
            </>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Sheet */}
      {store.showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={() => store.setShowShortcutsModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{
              backgroundColor: palette.deskSurface,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold">快捷键与手势指南</h2>
              <button
                onClick={() => store.setShowShortcutsModal(false)}
                className="rounded-full p-1.5 transition hover:opacity-75 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                ["⌘/Ctrl + Z · ⇧Z", "撤销 / 重做上一步操作"],
                ["⌘/Ctrl + C · V", "复制 / 粘贴当前选中对象"],
                ["⌘/Ctrl + D", "原位快速复制当前图层"],
                ["Delete / Backspace", "删除选中的照片、文字或笔触"],
                ["⌘/Ctrl + + / - / 0", "放大 / 缩小 / 还原画布缩放"],
                ["⌘/Ctrl + [ / ]", "翻到上一页(跨页) / 下一页(跨页)"],
                ["⌘/Ctrl + T", "在当前页快速插入文字段落"],
                ["⌘/Ctrl + E", "进入印前拼版与导出 PDF / 分色稿"],
                ["Option/Alt + 单击", "在重叠图层间向下循环点选"],
                ["双击文字 / 照片", "内联编辑文字 / 开启框内裁切平移"],
              ].map(([k, desc]) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: `1px solid ${palette.hairline}` }}
                >
                  <span
                    className="font-mono font-semibold"
                    style={{ color: palette.accent }}
                  >
                    {k}
                  </span>
                  <span style={{ color: palette.inkPrimary }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
