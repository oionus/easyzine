"use client";

import { SinglePageCanvas } from "@/components/RenderedCanvas";
import { useStudio } from "@/store/studioStore";
import {
  BINDING_CATALOG,
  BindingType,
  getBindingMeta,
   getPaperStockMeta,
  normalizePageCount,
  PAGE_SIZE_PRESETS,
  PageSizePreset,
  ZineProject,
} from "@/types/zine";
import {
  Copy,
  Download,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";

export const ShelfView: React.FC = () => {
  const store = useStudio();
  const { palette } = store;

  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("春日孔版志");
  const [newBinding, setNewBinding] = useState<BindingType>("saddle");
  const [newSize, setNewSize] = useState<PageSizePreset>("A5");
  const [newPages, setNewPages] = useState(16);
  const [openMenuID, setOpenMenuID] = useState<string | null>(null);

  const bindingMeta = getBindingMeta(newBinding);

  return (
    <div
      className="h-full overflow-y-auto px-6 py-8 md:px-12"
      onClick={() => setOpenMenuID(null)}
    >
      <div className="mx-auto max-w-6xl space-y-10 pb-14">
        {/* Editorial Hero Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 pt-2">
          <div className="space-y-2">
            <div
              className="text-[11px] font-semibold tracking-[0.2em] uppercase"
              style={{ color: palette.inkSecondary }}
            >
              EASYZINE · PAPERFOLD WEB ATELIER
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={{
                fontFamily: '"Songti SC", "STSong", "Noto Serif SC", Georgia, serif',
                color: palette.inkPrimary,
              }}
            >
              纸间小志工坊
            </h1>
            <p className="text-sm" style={{ color: palette.inkSecondary }}>
              像翻开速写本一样自然地排版、模拟 48 色 Risograph 孔版叠印与折手拼版。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={store.restoreDemoProjects}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition active:opacity-75 cursor-pointer"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
                color: palette.inkSecondary,
              }}
              title="重新载入内置的 3 本示范小志"
            >
              <RotateCcw size={13} />
              <span>示范小志</span>
            </button>

            <button
              onClick={store.triggerImportJSON}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition active:opacity-75 cursor-pointer"
              style={{
                backgroundColor: palette.cardElevated,
                border: `1px solid ${palette.hairline}`,
                color: palette.inkPrimary,
              }}
            >
              <Download size={13.5} />
              <span>导入工程 (.json)</span>
            </button>

            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 active:opacity-80 cursor-pointer"
              style={{ backgroundColor: palette.accent }}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>新建小志</span>
            </button>
          </div>
        </div>

        {/* Physical Journals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Blank New Journal Card */}
          <button
            onClick={() => setShowNewModal(true)}
            className="group flex flex-col items-start text-left space-y-3.5 cursor-pointer"
          >
            <div
              className="flex h-[288px] w-full flex-col items-center justify-center rounded-2xl p-6 transition-transform duration-300 group-hover:-translate-y-1"
              style={{
                backgroundColor: palette.isDark
                  ? "rgba(47,44,40,0.45)"
                  : "rgba(255,255,255,0.55)",
                border: `1.5px dashed ${palette.inkMuted}`,
              }}
            >
              <div
                className="mb-3 flex h-13 w-13 items-center justify-center rounded-full"
                style={{ backgroundColor: palette.deskSecondary }}
              >
                <Plus size={22} style={{ color: palette.inkPrimary }} />
              </div>
              <div
                className="text-sm font-semibold"
                style={{ color: palette.inkPrimary }}
              >
                装订一本新小志
              </div>
              <div
                className="mt-1 text-center text-[11.5px]"
                style={{ color: palette.inkSecondary }}
              >
                任选 8 种装帧 · 自定义纸张与孔版色
              </div>
            </div>
            <div className="px-1">
              <div
                className="text-sm font-semibold"
                style={{ color: palette.inkPrimary }}
              >
                空白手制本
              </div>
              <div className="text-xs" style={{ color: palette.inkSecondary }}>
                点击挑选开本与页数
              </div>
            </div>
          </button>

          {/* Bound Project Cards */}
          {store.projects.map((zine) => (
            <JournalBookCard
              key={zine.id}
              zine={zine}
              menuOpen={openMenuID === zine.id}
              onToggleMenu={(e) => {
                e.stopPropagation();
                setOpenMenuID(openMenuID === zine.id ? null : zine.id);
              }}
              onOpen={() => store.openProject(zine, "design")}
              onConfigureFormat={() => store.openProject(zine, "format")}
              onDuplicate={() => {
                setOpenMenuID(null);
                store.duplicateProject(zine);
              }}
              onDelete={() => {
                setOpenMenuID(null);
                store.deleteProject(zine);
              }}
            />
          ))}
        </div>
      </div>

      {/* New Zine Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-7 shadow-2xl space-y-5"
            style={{
              backgroundColor: palette.deskSurface,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: palette.accent }} />
              <h2
                className="text-2xl font-bold"
                style={{
                  fontFamily:
                    '"Songti SC", "STSong", "Noto Serif SC", Georgia, serif',
                }}
              >
                装订一本新小志
              </h2>
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-xs font-semibold"
                style={{ color: palette.inkSecondary }}
              >
                书名
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="输入小志标题…"
                className="w-full rounded-xl px-3.5 py-2 text-sm outline-none"
                style={{
                  backgroundColor: palette.cardElevated,
                  border: `1px solid ${palette.hairline}`,
                  color: palette.inkPrimary,
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-xs font-semibold"
                style={{ color: palette.inkSecondary }}
              >
                装订方式
              </label>
              <select
                value={newBinding}
                onChange={(e) => {
                  const b = e.target.value as BindingType;
                  setNewBinding(b);
                  setNewPages((p) => normalizePageCount(b, p));
                }}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  backgroundColor: palette.cardElevated,
                  border: `1px solid ${palette.hairline}`,
                  color: palette.inkPrimary,
                }}
              >
                {BINDING_CATALOG.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameCN} ({b.badgeText})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  className="block text-xs font-semibold"
                  style={{ color: palette.inkSecondary }}
                >
                  开本尺寸
                </label>
                <select
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value as PageSizePreset)}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{
                    backgroundColor: palette.cardElevated,
                    border: `1px solid ${palette.hairline}`,
                    color: palette.inkPrimary,
                  }}
                >
                  {PAGE_SIZE_PRESETS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-xs font-semibold"
                  style={{ color: palette.inkSecondary }}
                >
                  总页数 ({normalizePageCount(newBinding, newPages)}P)
                </label>
                <div
                  className="flex items-center justify-between rounded-xl px-2.5 py-1.5"
                  style={{
                    backgroundColor: palette.cardElevated,
                    border: `1px solid ${palette.hairline}`,
                  }}
                >
                  <button
                    type="button"
                    disabled={newPages <= bindingMeta.minPages}
                    onClick={() =>
                      setNewPages((p) =>
                        normalizePageCount(newBinding, p - bindingMeta.pageStep)
                      )
                    }
                    className="h-6 w-7 rounded-lg text-sm font-bold disabled:opacity-30 cursor-pointer"
                    style={{ backgroundColor: palette.deskSecondary }}
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-semibold">
                    {normalizePageCount(newBinding, newPages)} 页
                  </span>
                  <button
                    type="button"
                    disabled={newPages >= bindingMeta.maxPages}
                    onClick={() =>
                      setNewPages((p) =>
                        normalizePageCount(newBinding, p + bindingMeta.pageStep)
                      )
                    }
                    className="h-6 w-7 rounded-lg text-sm font-bold disabled:opacity-30 cursor-pointer"
                    style={{ backgroundColor: palette.deskSecondary }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-full px-4 py-2 text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: palette.cardSurface,
                  border: `1px solid ${palette.hairline}`,
                  color: palette.inkSecondary,
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  store.createNewProject(
                    newTitle,
                    newBinding,
                    newSize,
                    normalizePageCount(newBinding, newPages)
                  );
                  setShowNewModal(false);
                }}
                className="rounded-full px-5 py-2 text-xs font-semibold text-white cursor-pointer"
                style={{ backgroundColor: palette.accent }}
              >
                创建并挑选纸张 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const JournalBookCard: React.FC<{
  zine: ZineProject;
  menuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onConfigureFormat: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({
  zine,
  menuOpen,
  onToggleMenu,
  onOpen,
  onConfigureFormat,
  onDuplicate,
  onDelete,
}) => {
  const { palette } = useStudio();
  const bindingMeta = getBindingMeta(zine.format.binding);
  const stockMeta = getPaperStockMeta(zine.format.paperStock);

  return (
    <div className="group relative flex flex-col space-y-3.5">
      {/* Tactile 3D Book Mockup */}
      <div
        onClick={onOpen}
        className="relative flex h-[288px] w-full items-center justify-center cursor-pointer transition-transform duration-300 group-hover:-translate-y-1.5"
      >
        <div className="relative h-[278px] w-[202px]">
          {/* Paper Stack Right Edge */}
          <div
            className="absolute inset-0 translate-x-[5px] translate-y-[4px] rounded-r-[10px] rounded-l-[3px]"
            style={{
              backgroundColor: "#E4DECFE8",
              boxShadow: palette.isDark
                ? "3px 8px 20px rgba(0,0,0,0.45)"
                : "2px 6px 16px rgba(0,0,0,0.10)",
            }}
          />
          <div
            className="absolute inset-0 translate-x-[2.5px] translate-y-[2px] rounded-r-[10px] rounded-l-[3px]"
            style={{
              backgroundColor: "#F2EDE2",
              borderRight: "1px solid rgba(0,0,0,0.08)",
            }}
          />

          {/* Bound Cover Canvas */}
          <div className="relative h-full w-full overflow-hidden rounded-l-[3px] rounded-r-[10px] shadow-sm">
            <SinglePageCanvas
              project={zine}
              pageIndex={0}
              pixelHeight={480}
              className="h-full w-full object-cover"
            />
            {/* Spine Crease Highlight */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-4"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0.24) 0%, rgba(255,255,255,0.2) 38%, rgba(0,0,0,0.08) 70%, transparent 100%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Metadata & Action Menu */}
      <div className="relative flex items-start justify-between px-2">
        <div className="min-w-0 pr-2 cursor-pointer" onClick={onOpen}>
          <div
            className="truncate text-sm font-semibold"
            style={{ color: palette.inkPrimary }}
          >
            {zine.title}
          </div>
          <div
            className="truncate text-[11.5px] mt-0.5"
            style={{ color: palette.inkSecondary }}
          >
            {zine.format.sizePreset} · {zine.format.pageCount}P ·{" "}
            {bindingMeta.nameCN} ·{" "}
            {zine.printSettings.mode === "Risograph" ? "Riso" : stockMeta.nameCN}
          </div>
        </div>

        <button
          onClick={onToggleMenu}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:opacity-100 cursor-pointer"
          style={{
            backgroundColor: menuOpen ? palette.cardElevated : "transparent",
            color: palette.inkSecondary,
          }}
        >
          <MoreHorizontal size={15} />
        </button>

        {menuOpen && (
          <div
            className="absolute right-1 top-8 z-30 w-44 rounded-xl p-1.5 shadow-xl text-xs"
            style={{
              backgroundColor: palette.cardElevated,
              border: `1px solid ${palette.hairline}`,
              color: palette.inkPrimary,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onOpen}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:opacity-80 cursor-pointer"
            >
              <Sparkles size={13} style={{ color: palette.accent }} />
              <span>进入画布创作</span>
            </button>
            <button
              onClick={onConfigureFormat}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:opacity-80 cursor-pointer"
            >
              <Settings2 size={13} />
              <span>调整开本与装订</span>
            </button>
            <div
              className="my-1 h-px"
              style={{ backgroundColor: palette.hairline }}
            />
            <button
              onClick={onDuplicate}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:opacity-80 cursor-pointer"
            >
              <Copy size={13} />
              <span>复制一本副本</span>
            </button>
            <button
              onClick={onDelete}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-red-500 hover:opacity-80 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>删除此小志</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
