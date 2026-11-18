"use client";

import {
  exportProjectJPEGs,
  exportProjectJSON,
  exportProjectPDF,
  exportRisoSeparations,
  parseProjectJSONFile,
} from "@/lib/exportService";
import {
  readerSpreads,
  ReaderSpreadItem,
  spreadIndexForPage,
} from "@/lib/imposition";
import { makeBlankProject, makeDefaultShelf } from "@/lib/sampleProjects";
import { getStudioPalette, StudioPalette } from "@/lib/theme";
import {
  BindingType,
  BrushKind,
  CanvasElement,
  DesignViewMode,
  getFormatAspectRatio,
  makeDefaultElement,
  NormalizedPoint,
  PageSizePreset,
  PhotoAsset,
  ShapeKind,
  StudioStage,
  StudioTool,
  syncProjectPageCount,
  ZineProject,
} from "@/types/zine";
import { get as idbGet, set as idbSet } from "idb-keyval";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type InspectorTab = "element" | "text" | "paper" | "print" | "binding";

export interface SelectedElementRef {
  pageIndex: number;
  elementID: string;
}

const IDB_SHELF_KEY = "easyzine_shelf_projects_v1";
const IDB_THEME_KEY = "easyzine_dark_studio_v1";

async function decodeFileToPhotoAsset(file: File): Promise<PhotoAsset | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1800;
      const scale = Math.min(
        1.0,
        maxDim / Math.max(img.naturalWidth, img.naturalHeight, 1)
      );
      const w = Math.max(16, Math.round(img.naturalWidth * scale));
      const h = Math.max(16, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);

      const keepAlpha =
        file.type === "image/png" ||
        file.type === "image/webp" ||
        file.type === "image/gif";
      const mimeType = keepAlpha ? "image/png" : "image/jpeg";
      const dataUrl = keepAlpha
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", 0.9);
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

      resolve({
        id: crypto.randomUUID(),
        filename: file.name,
        imageData: base64,
        mimeType,
        pixelWidth: w,
        pixelHeight: h,
        createdAt: new Date().toISOString(),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export interface StudioStoreContextValue {
  hydrated: boolean;
  stage: StudioStage;
  setStage: (s: StudioStage) => void;
  isDarkStudio: boolean;
  toggleDarkStudio: () => void;
  palette: StudioPalette;
  showShortcutsModal: boolean;
  setShowShortcutsModal: (v: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  isExporting: boolean;

  viewMode: DesignViewMode;
  setViewMode: (m: DesignViewMode) => void;
  canvasZoom: number;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
  showLibraryDrawer: boolean;
  setShowLibraryDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  activeInspector: InspectorTab | null;
  setActiveInspector: React.Dispatch<React.SetStateAction<InspectorTab | null>>;

  activeTool: StudioTool;
  setActiveTool: (t: StudioTool) => void;
  activeUseRisoInk: boolean;
  setActiveUseRisoInk: (v: boolean) => void;
  activeRisoInkName: string;
  setActiveRisoInkName: (name: string) => void;
  activeHexColor: string;
  setActiveHexColor: (hex: string) => void;
  activeInkDensity: number;
  setActiveInkDensity: (d: number) => void;
  activeBrushWidth: number;
  setActiveBrushWidth: (w: number) => void;
  isCroppingPhoto: boolean;
  setIsCroppingPhoto: React.Dispatch<React.SetStateAction<boolean>>;
  isEditingPolygonPoints: boolean;
  setIsEditingPolygonPoints: React.Dispatch<React.SetStateAction<boolean>>;

  currentPageIndex: number;
  setCurrentPageIndex: (idx: number) => void;
  selectedRef: SelectedElementRef | null;
  setSelectedRef: (ref: SelectedElementRef | null) => void;
  selectedElement: CanvasElement | null;
  updateSelectedElement: (updated: CanvasElement, recordUndo?: boolean) => void;
  updateSelectedElementLive: (updated: CanvasElement) => void;

  projects: ZineProject[];
  project: ZineProject;
  canUndo: boolean;
  canRedo: boolean;
  recordUndoCheckpoint: () => void;
  mutateProject: (
    mutator: (draft: ZineProject) => ZineProject,
    recordUndo?: boolean
  ) => void;
  undo: () => void;
  redo: () => void;
  commitLiveChanges: () => void;

  openProject: (proj: ZineProject, targetStage?: StudioStage) => void;
  createNewProject: (
    title: string,
    binding: BindingType,
    sizePreset: PageSizePreset,
    pageCount: number
  ) => void;
  duplicateProject: (proj: ZineProject) => void;
  deleteProject: (proj: ZineProject) => void;
  restoreDemoProjects: () => void;

  spreads: ReaderSpreadItem[];
  currentSpreadIndex: number;
  currentSpread: ReaderSpreadItem;
  stepPage: (delta: number) => void;
  movePage: (fromIndex: number, toIndex: number) => void;

  triggerPhotoPicker: () => void;
  importImageFiles: (files: FileList | File[]) => Promise<void>;
  placeAssetOnPage: (
    asset: PhotoAsset,
    pageIndex: number,
    normalizedCenter?: { x: number; y: number },
    spanSpread?: boolean
  ) => void;
  autoFillPagesFromLibrary: () => void;

  addTextElement: (pageIndex: number, point?: { x: number; y: number }) => void;
  addShapeElement: (
    kind: ShapeKind,
    pageIndex: number,
    rect?: { x: number; y: number; width: number; height: number }
  ) => void;
  appendBrushStroke: (
    brush: BrushKind,
    points: NormalizedPoint[],
    pageIndex: number
  ) => void;

  deleteSelected: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  duplicateSelected: () => void;
  alignSelectedHorizontal: (align: "left" | "center" | "right") => void;
  alignSelectedVertical: (align: "top" | "middle" | "bottom") => void;
  matchSelectedToFullBleed: () => void;
  resetPhotoAspectRatio: () => void;
  moveLayer: (delta: number) => void;

  triggerImportJSON: () => void;
  handleExportJSON: () => void;
  handleExportPDF: () => Promise<void>;
  handleExportJPGs: (onlyIndex?: number) => Promise<void>;
  handleExportSeparations: (selectedInks: string[]) => Promise<void>;
}

const StudioContext = createContext<StudioStoreContextValue | null>(null);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [stage, setStage] = useState<StudioStage>("shelf");
  const [isDarkStudio, setIsDarkStudio] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [viewMode, setViewMode] = useState<DesignViewMode>("Spread");
  const [canvasZoom, setCanvasZoom] = useState(1.0);
  const [showLibraryDrawer, setShowLibraryDrawer] = useState(true);
  const [activeInspector, setActiveInspector] = useState<InspectorTab | null>("print");

  const [activeTool, setActiveTool] = useState<StudioTool>({ type: "pointer" });
  const [activeUseRisoInk, setActiveUseRisoInk] = useState(true);
  const [activeRisoInkName, setActiveRisoInkName] = useState("Blue");
  const [activeHexColor, setActiveHexColor] = useState("#23201D");
  const [activeInkDensity, setActiveInkDensity] = useState(0.9);
  const [activeBrushWidth, setActiveBrushWidth] = useState(5.0);
  const [isCroppingPhoto, setIsCroppingPhoto] = useState(false);
  const [isEditingPolygonPoints, setIsEditingPolygonPoints] = useState(false);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedRef, setSelectedRef] = useState<SelectedElementRef | null>(null);

  const [projects, setProjects] = useState<ZineProject[]>([]);
  const [activeProjectID, setActiveProjectID] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<ZineProject[]>([]);
  const [redoStack, setRedoStack] = useState<ZineProject[]>([]);

  const clipboardRef = useRef<CanvasElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((text: string) => {
    setToastMessage(text);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage((prev) => (prev === text ? null : prev));
    }, 2600);
  }, []);

  const scheduleSaveShelf = useCallback((nextProjects: ZineProject[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      idbSet(IDB_SHELF_KEY, nextProjects).catch(() => {});
    }, 280);
  }, []);

  // Hydrate from IndexedDB or create procedural default shelf
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedProjects, savedDark] = await Promise.all([
          idbGet<ZineProject[]>(IDB_SHELF_KEY),
          idbGet<boolean>(IDB_THEME_KEY),
        ]);
        if (!mounted) return;
        if (typeof savedDark === "boolean") {
          setIsDarkStudio(savedDark);
        }
        if (Array.isArray(savedProjects) && savedProjects.length > 0) {
          setProjects(savedProjects);
          setActiveProjectID(savedProjects[0].id);
        } else {
          const defaults = makeDefaultShelf();
          setProjects(defaults);
          setActiveProjectID(defaults[0]?.id ?? null);
          idbSet(IDB_SHELF_KEY, defaults).catch(() => {});
        }
      } catch {
        if (!mounted) return;
        const defaults = makeDefaultShelf();
        setProjects(defaults);
        setActiveProjectID(defaults[0]?.id ?? null);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleDarkStudio = useCallback(() => {
    setIsDarkStudio((prev) => {
      const next = !prev;
      idbSet(IDB_THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const palette = useMemo(() => getStudioPalette(isDarkStudio), [isDarkStudio]);

  const activeIndex = useMemo(() => {
    if (projects.length === 0) return -1;
    if (!activeProjectID) return 0;
    const found = projects.findIndex((p) => p.id === activeProjectID);
    return found >= 0 ? found : 0;
  }, [projects, activeProjectID]);

  const fallbackBlank = useMemo(() => makeBlankProject(), []);
  const project = activeIndex >= 0 ? projects[activeIndex] : fallbackBlank;

  const recordUndoCheckpoint = useCallback(() => {
    setUndoStack((prev) => {
      const next = [...prev, project];
      return next.length > 40 ? next.slice(next.length - 40) : next;
    });
    setRedoStack([]);
  }, [project]);

  const mutateProject = useCallback(
    (mutator: (draft: ZineProject) => ZineProject, recordUndo = true) => {
      if (recordUndo) {
        recordUndoCheckpoint();
      }
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === project.id);
        if (idx < 0) return prev;
        const cloned: ZineProject = structuredClone(prev[idx]);
        const updated = syncProjectPageCount(mutator(cloned));
        updated.updatedAt = new Date().toISOString();
        const nextList = [...prev];
        nextList[idx] = updated;
        scheduleSaveShelf(nextList);
        if (currentPageIndex >= updated.pages.length) {
          setCurrentPageIndex(Math.max(0, updated.pages.length - 1));
        }
        return nextList;
      });
    },
    [project.id, recordUndoCheckpoint, scheduleSaveShelf, currentPageIndex]
  );

  const selectedElement = useMemo(() => {
    if (!selectedRef) return null;
    const page = project.pages[selectedRef.pageIndex];
    if (!page) return null;
    return page.elements.find((e) => e.id === selectedRef.elementID) ?? null;
  }, [project.pages, selectedRef]);

  const updateSelectedElement = useCallback(
    (updated: CanvasElement, recordUndo = false) => {
      if (!selectedRef) return;
      if (recordUndo) recordUndoCheckpoint();
      setProjects((prev) => {
        const pIdx = prev.findIndex((p) => p.id === project.id);
        if (pIdx < 0) return prev;
        const targetProj = prev[pIdx];
        const page = targetProj.pages[selectedRef.pageIndex];
        if (!page) return prev;
        const eIdx = page.elements.findIndex((e) => e.id === selectedRef.elementID);
        if (eIdx < 0) return prev;

        const nextPages = [...targetProj.pages];
        const nextElements = [...page.elements];
        nextElements[eIdx] = updated;
        nextPages[selectedRef.pageIndex] = { ...page, elements: nextElements };

        const nextProj: ZineProject = {
          ...targetProj,
          updatedAt: new Date().toISOString(),
          pages: nextPages,
        };
        const nextList = [...prev];
        nextList[pIdx] = nextProj;
        scheduleSaveShelf(nextList);
        return nextList;
      });
    },
    [project.id, recordUndoCheckpoint, scheduleSaveShelf, selectedRef]
  );

  const updateSelectedElementLive = useCallback(
    (updated: CanvasElement) => {
      if (!selectedRef) return;
      setProjects((prev) => {
        const pIdx = prev.findIndex((p) => p.id === project.id);
        if (pIdx < 0) return prev;
        const targetProj = prev[pIdx];
        const page = targetProj.pages[selectedRef.pageIndex];
        if (!page) return prev;
        const eIdx = page.elements.findIndex((e) => e.id === selectedRef.elementID);
        if (eIdx < 0) return prev;

        const nextPages = [...targetProj.pages];
        const nextElements = [...page.elements];
        nextElements[eIdx] = updated;
        nextPages[selectedRef.pageIndex] = { ...page, elements: nextElements };

        const nextList = [...prev];
        nextList[pIdx] = { ...targetProj, pages: nextPages };
        return nextList;
      });
    },
    [project.id, selectedRef]
  );

  const commitLiveChanges = useCallback(() => {
    scheduleSaveShelf(projects);
  }, [projects, scheduleSaveShelf]);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      setRedoStack((r) => [...r, project]);
      setProjects((list) => {
        const idx = list.findIndex((p) => p.id === project.id);
        if (idx < 0) return list;
        const next = [...list];
        next[idx] = restored;
        scheduleSaveShelf(next);
        return next;
      });
      setSelectedRef(null);
      return prev.slice(0, -1);
    });
  }, [project, scheduleSaveShelf]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      setUndoStack((u) => [...u, project]);
      setProjects((list) => {
        const idx = list.findIndex((p) => p.id === project.id);
        if (idx < 0) return list;
        const next = [...list];
        next[idx] = restored;
        scheduleSaveShelf(next);
        return next;
      });
      return prev.slice(0, -1);
    });
  }, [project, scheduleSaveShelf]);

  // Bookshelf operations
  const openProject = useCallback(
    (proj: ZineProject, targetStage: StudioStage = "design") => {
      setActiveProjectID(proj.id);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedRef(null);
      setCurrentPageIndex(0);
      setStage(targetStage);
    },
    []
  );

  const createNewProject = useCallback(
    (
      title: string,
      binding: BindingType,
      sizePreset: PageSizePreset,
      pageCount: number
    ) => {
      const cleanTitle = title.trim() || "新小志 · New Zine";
      const fresh = makeBlankProject(cleanTitle, binding, sizePreset, pageCount);
      setProjects((prev) => {
        const next = [fresh, ...prev];
        scheduleSaveShelf(next);
        return next;
      });
      setActiveProjectID(fresh.id);
      setUndoStack([]);
      setRedoStack([]);
      setSelectedRef(null);
      setCurrentPageIndex(0);
      setStage("format");
    },
    [scheduleSaveShelf]
  );

  const duplicateProject = useCallback(
    (proj: ZineProject) => {
      const copy: ZineProject = {
        ...structuredClone(proj),
        id: crypto.randomUUID(),
        title: `${proj.title} 副本`,
        updatedAt: new Date().toISOString(),
      };
      setProjects((prev) => {
        const next = [copy, ...prev];
        scheduleSaveShelf(next);
        return next;
      });
      showToast(`已复制《${proj.title}》`);
    },
    [scheduleSaveShelf, showToast]
  );

  const deleteProject = useCallback(
    (proj: ZineProject) => {
      setProjects((prev) => {
        let next = prev.filter((p) => p.id !== proj.id);
        if (next.length === 0) {
          next = [makeBlankProject()];
        }
        if (activeProjectID === proj.id) {
          setActiveProjectID(next[0].id);
        }
        scheduleSaveShelf(next);
        return next;
      });
      showToast(`已移除《${proj.title}》`);
    },
    [activeProjectID, scheduleSaveShelf, showToast]
  );

  const restoreDemoProjects = useCallback(() => {
    const demos = makeDefaultShelf();
    setProjects((prev) => {
      const next = [...demos, ...prev];
      scheduleSaveShelf(next);
      return next;
    });
    showToast("已恢复 3 本内置示范小志");
  }, [scheduleSaveShelf, showToast]);

  // Spreads & Page Navigation
  const spreads = useMemo(
    () => readerSpreads(project.pages.length),
    [project.pages.length]
  );
  const currentSpreadIndex = useMemo(
    () => spreadIndexForPage(currentPageIndex),
    [currentPageIndex]
  );
  const currentSpread = useMemo(() => {
    const idx = Math.min(
      Math.max(0, currentSpreadIndex),
      Math.max(0, spreads.length - 1)
    );
    return (
      spreads[idx] ?? {
        index: 0,
        leftPageIndex: null,
        rightPageIndex: 0,
        title: "封面 · P1",
      }
    );
  }, [spreads, currentSpreadIndex]);

  const stepPage = useCallback(
    (delta: number) => {
      if (viewMode === "Spread") {
        const nextSpread = Math.min(
          Math.max(0, currentSpreadIndex + delta),
          Math.max(0, spreads.length - 1)
        );
        const sp = spreads[nextSpread];
        if (sp) {
          setCurrentPageIndex(sp.leftPageIndex ?? sp.rightPageIndex ?? 0);
        }
      } else {
        setCurrentPageIndex((p) =>
          Math.min(Math.max(0, p + delta), Math.max(0, project.pages.length - 1))
        );
      }
      setSelectedRef(null);
      setIsCroppingPhoto(false);
    },
    [viewMode, currentSpreadIndex, spreads, project.pages.length]
  );

  const movePage = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= project.pages.length ||
        toIndex >= project.pages.length
      ) {
        return;
      }
      mutateProject((draft) => {
        const [moved] = draft.pages.splice(fromIndex, 1);
        draft.pages.splice(toIndex, 0, moved);
        return draft;
      });
      setCurrentPageIndex(toIndex);
      showToast(`已将 P${fromIndex + 1} 移动至 P${toIndex + 1}`);
    },
    [mutateProject, project.pages.length, showToast]
  );

  // Media Import
  const importImageFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|svg|avif)$/i.test(f.name));
      if (arr.length === 0) return;

      const decoded = await Promise.all(arr.map(decodeFileToPhotoAsset));
      const valid = decoded.filter((a): a is PhotoAsset => a !== null);
      if (valid.length === 0) {
        showToast("无法解码所选图片格式");
        return;
      }

      mutateProject((draft) => {
        draft.assets.push(...valid);
        return draft;
      });
      showToast(`已导入 ${valid.length} 张图像素材`);
    },
    [mutateProject, showToast]
  );

  const triggerPhotoPicker = useCallback(() => {
    photoInputRef.current?.click();
  }, []);

  const placeAssetOnPage = useCallback(
    (
      asset: PhotoAsset,
      pageIndex: number,
      normalizedCenter?: { x: number; y: number },
      spanSpread = false
    ) => {
      if (pageIndex < 0 || pageIndex >= project.pages.length) return;
      const pageAspect = getFormatAspectRatio(project.format);
      const imgAspect =
        Math.max(asset.pixelWidth, 1) / Math.max(asset.pixelHeight, 1);
      let w = spanSpread ? 1.36 : 0.72;
      let h = (w * pageAspect) / Math.max(imgAspect, 0.1);
      if (h > 0.78) {
        h = 0.78;
        w = (h * imgAspect) / Math.max(pageAspect, 0.1);
      }
      const cx = normalizedCenter ? normalizedCenter.x : spanSpread ? 0.8 : 0.5;
      const cy = normalizedCenter ? normalizedCenter.y : 0.5;

      const el = makeDefaultElement({
        kind: "photo",
        name: asset.filename,
        x: Math.max(-0.2, Math.min(0.92, cx - w * 0.5)),
        y: Math.max(0.04, Math.min(0.92 - h, cy - h * 0.5)),
        width: w,
        height: h,
        overlap:
          project.printSettings.mode === "Risograph"
            ? "Mix (overprint)"
            : "On top",
        assetID: asset.id,
        spansSpread: spanSpread,
      });

      mutateProject((draft) => {
        draft.pages[pageIndex].elements.push(el);
        return draft;
      });
      setSelectedRef({ pageIndex, elementID: el.id });
    },
    [mutateProject, project.format, project.pages.length, project.printSettings.mode]
  );

  const autoFillPagesFromLibrary = useCallback(() => {
    if (project.assets.length === 0) {
      showToast("请先添加图片素材");
      return;
    }
    mutateProject((draft) => {
      const pageAspect = getFormatAspectRatio(draft.format);
      draft.assets.forEach((asset, i) => {
        if (i >= draft.pages.length) return;
        const imgAspect =
          Math.max(asset.pixelWidth, 1) / Math.max(asset.pixelHeight, 1);
        let w = 0.76;
        let h = (w * pageAspect) / Math.max(imgAspect, 0.1);
        if (h > 0.76) {
          h = 0.76;
          w = (h * imgAspect) / Math.max(pageAspect, 0.1);
        }
        draft.pages[i].elements.push(
          makeDefaultElement({
            kind: "photo",
            name: asset.filename,
            x: (1.0 - w) * 0.5,
            y: (1.0 - h) * 0.5,
            width: w,
            height: h,
            overlap:
              draft.printSettings.mode === "Risograph"
                ? "Mix (overprint)"
                : "On top",
            assetID: asset.id,
          })
        );
      });
      return draft;
    });
    showToast("已将素材按序自动排入页面");
  }, [mutateProject, project.assets.length, showToast]);

  // Element Creation
  const addTextElement = useCallback(
    (pageIndex: number, point = { x: 0.22, y: 0.36 }) => {
      if (pageIndex < 0 || pageIndex >= project.pages.length) return;
      const el = makeDefaultElement({
        kind: "text",
        name: "文本段落",
        x: Math.max(0.06, Math.min(0.75, point.x)),
        y: Math.max(0.06, Math.min(0.84, point.y)),
        width: 0.56,
        height: 0.16,
        overlap: activeUseRisoInk ? "Mix (overprint)" : "On top",
        useRisoInk: activeUseRisoInk,
        risoInkName: activeRisoInkName,
        inkDensity: activeInkDensity,
        fillHex: activeHexColor,
        text: "双击或在此输入文字…",
        fontFamily: "Songti SC",
        fontSizePt: 16,
      });
      mutateProject((draft) => {
        draft.pages[pageIndex].elements.push(el);
        return draft;
      });
      setSelectedRef({ pageIndex, elementID: el.id });
      setActiveInspector("text");
      setActiveTool({ type: "pointer" });
    },
    [
      activeHexColor,
      activeInkDensity,
      activeRisoInkName,
      activeUseRisoInk,
      mutateProject,
      project.pages.length,
    ]
  );

  const addShapeElement = useCallback(
    (
      kind: ShapeKind,
      pageIndex: number,
      rect = { x: 0.28, y: 0.32, width: 0.44, height: 0.28 }
    ) => {
      if (pageIndex < 0 || pageIndex >= project.pages.length) return;
      const isLine = kind === "Line" || kind === "Arrow";
      const el = makeDefaultElement({
        kind: "shape",
        name: kind,
        x: rect.x,
        y: rect.y,
        width: Math.max(0.04, rect.width),
        height: Math.max(0.04, rect.height),
        overlap: activeUseRisoInk ? "Mix (overprint)" : "On top",
        useRisoInk: activeUseRisoInk,
        risoInkName: activeRisoInkName,
        inkDensity: activeInkDensity,
        fillHex: isLine ? null : activeHexColor,
        strokeHex: activeHexColor,
        strokeWidthPt: isLine ? 2.8 : 0.0,
        cornerRadiusPt: kind === "Rectangle" ? 4 : 0,
        shapeKind: kind,
      });
      mutateProject((draft) => {
        draft.pages[pageIndex].elements.push(el);
        return draft;
      });
      setSelectedRef({ pageIndex, elementID: el.id });
      setActiveTool({ type: "pointer" });
    },
    [
      activeHexColor,
      activeInkDensity,
      activeRisoInkName,
      activeUseRisoInk,
      mutateProject,
      project.pages.length,
    ]
  );

  const appendBrushStroke = useCallback(
    (brush: BrushKind, points: NormalizedPoint[], pageIndex: number) => {
      if (points.length < 2 || pageIndex < 0 || pageIndex >= project.pages.length) {
        return;
      }
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const el = makeDefaultElement({
        kind: "stroke",
        name: brush,
        x: minX,
        y: minY,
        width: Math.max(0.02, maxX - minX),
        height: Math.max(0.02, maxY - minY),
        overlap: brush === "Eraser" ? "On top" : "Mix (overprint)",
        useRisoInk: activeUseRisoInk,
        risoInkName: activeRisoInkName,
        inkDensity: activeInkDensity,
        fillHex: activeHexColor,
        brushKind: brush,
        strokePoints: points,
        brushWidthPt: activeBrushWidth,
      });
      mutateProject((draft) => {
        draft.pages[pageIndex].elements.push(el);
        return draft;
      });
    },
    [
      activeBrushWidth,
      activeHexColor,
      activeInkDensity,
      activeRisoInkName,
      activeUseRisoInk,
      mutateProject,
      project.pages.length,
    ]
  );

  // Selection actions
  const deleteSelected = useCallback(() => {
    if (!selectedRef) return;
    mutateProject((draft) => {
      const page = draft.pages[selectedRef.pageIndex];
      if (page) {
        page.elements = page.elements.filter((e) => e.id !== selectedRef.elementID);
      }
      return draft;
    });
    setSelectedRef(null);
  }, [mutateProject, selectedRef]);

  const copySelected = useCallback(() => {
    if (!selectedElement) return;
    clipboardRef.current = structuredClone(selectedElement);
    showToast("已复制对象");
  }, [selectedElement, showToast]);

  const pasteClipboard = useCallback(() => {
    if (!clipboardRef.current) return;
    const copy: CanvasElement = {
      ...structuredClone(clipboardRef.current),
      id: crypto.randomUUID(),
      x: Math.min(0.85, clipboardRef.current.x + 0.04),
      y: Math.min(0.85, clipboardRef.current.y + 0.04),
    };
    const targetPage = selectedRef?.pageIndex ?? currentPageIndex;
    mutateProject((draft) => {
      if (draft.pages[targetPage]) {
        draft.pages[targetPage].elements.push(copy);
      }
      return draft;
    });
    setSelectedRef({ pageIndex: targetPage, elementID: copy.id });
  }, [currentPageIndex, mutateProject, selectedRef]);

  const duplicateSelected = useCallback(() => {
    if (!selectedElement) return;
    clipboardRef.current = structuredClone(selectedElement);
    pasteClipboard();
  }, [pasteClipboard, selectedElement]);

  const alignSelectedHorizontal = useCallback(
    (align: "left" | "center" | "right") => {
      if (!selectedElement) return;
      const next = { ...selectedElement };
      if (align === "left") next.x = 0.06;
      else if (align === "center") next.x = (1.0 - next.width) * 0.5;
      else next.x = 0.94 - next.width;
      updateSelectedElement(next, true);
    },
    [selectedElement, updateSelectedElement]
  );

  const alignSelectedVertical = useCallback(
    (align: "top" | "middle" | "bottom") => {
      if (!selectedElement) return;
      const next = { ...selectedElement };
      if (align === "top") next.y = 0.06;
      else if (align === "middle") next.y = (1.0 - next.height) * 0.5;
      else next.y = 0.94 - next.height;
      updateSelectedElement(next, true);
    },
    [selectedElement, updateSelectedElement]
  );

  const matchSelectedToFullBleed = useCallback(() => {
    if (!selectedElement) return;
    const next = {
      ...selectedElement,
      x: 0,
      y: 0,
      width: selectedElement.spansSpread ? 2.0 : 1.0,
      height: 1.0,
    };
    updateSelectedElement(next, true);
  }, [selectedElement, updateSelectedElement]);

  const resetPhotoAspectRatio = useCallback(() => {
    if (!selectedElement || selectedElement.kind !== "photo" || !selectedElement.assetID) {
      return;
    }
    const asset = project.assets.find((a) => a.id === selectedElement.assetID);
    if (!asset) return;
    const pageAspect = getFormatAspectRatio(project.format);
    const imgAspect =
      Math.max(asset.pixelWidth, 1) / Math.max(asset.pixelHeight, 1);
    const next: CanvasElement = {
      ...selectedElement,
      height: Math.min(0.95, (selectedElement.width * pageAspect) / Math.max(imgAspect, 0.05)),
      cropZoom: 1.0,
      cropOffsetX: 0,
      cropOffsetY: 0,
    };
    updateSelectedElement(next, true);
  }, [project.assets, project.format, selectedElement, updateSelectedElement]);

  const moveLayer = useCallback(
    (delta: number) => {
      if (!selectedRef) return;
      const page = project.pages[selectedRef.pageIndex];
      if (!page) return;
      const idx = page.elements.findIndex((e) => e.id === selectedRef.elementID);
      if (idx < 0) return;
      const newIdx = Math.min(Math.max(0, idx + delta), page.elements.length - 1);
      if (newIdx === idx) return;
      mutateProject((draft) => {
        const elems = draft.pages[selectedRef.pageIndex].elements;
        const [item] = elems.splice(idx, 1);
        elems.splice(newIdx, 0, item);
        return draft;
      });
    },
    [mutateProject, project.pages, selectedRef]
  );

  // Export & JSON handlers
  const triggerImportJSON = useCallback(() => {
    jsonInputRef.current?.click();
  }, []);

  const handleExportJSON = useCallback(() => {
    exportProjectJSON(project);
    showToast("已导出 .json 独立工程包");
  }, [project, showToast]);

  const handleExportPDF = useCallback(async () => {
    try {
      setIsExporting(true);
      const count = await exportProjectPDF(project);
      showToast(`已生成并下载印刷级 PDF（共 ${count} 张印面）`);
    } catch (e) {
      showToast(`导出 PDF 失败: ${(e as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  }, [project, showToast]);

  const handleExportJPGs = useCallback(
    async (onlyIndex?: number) => {
      try {
        setIsExporting(true);
        const count = await exportProjectJPEGs(project, onlyIndex);
        showToast(
          onlyIndex !== undefined
            ? "已导出高清 JPG"
            : `已打包导出全部 ${count} 张高清 JPG (.zip)`
        );
      } catch (e) {
        showToast(`导出 JPG 失败: ${(e as Error).message}`);
      } finally {
        setIsExporting(false);
      }
    },
    [project, showToast]
  );

  const handleExportSeparations = useCallback(
    async (selectedInks: string[]) => {
      try {
        setIsExporting(true);
        const count = await exportRisoSeparations(project, selectedInks);
        showToast(
          `已生成 ${selectedInks.length} 色 Risograph 分色制版文件（共 ${count} 份）`
        );
      } catch (e) {
        showToast(`分色导出失败: ${(e as Error).message}`);
      } finally {
        setIsExporting(false);
      }
    },
    [project, showToast]
  );

  // Global Studio Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditingInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isEditingInput) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === "c") {
        if (selectedElement) {
          e.preventDefault();
          copySelected();
        }
      } else if (mod && key === "v") {
        if (clipboardRef.current) {
          e.preventDefault();
          pasteClipboard();
        }
      } else if (mod && key === "d") {
        if (selectedElement) {
          e.preventDefault();
          duplicateSelected();
        }
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedElement) {
          e.preventDefault();
          deleteSelected();
        }
      } else if (mod && e.key === "[") {
        e.preventDefault();
        stepPage(-1);
      } else if (mod && e.key === "]") {
        e.preventDefault();
        stepPage(1);
      } else if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setCanvasZoom((z) => Math.min(2.4, +(z + 0.15).toFixed(2)));
      } else if (mod && e.key === "-") {
        e.preventDefault();
        setCanvasZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)));
      } else if (mod && e.key === "0") {
        e.preventDefault();
        if (e.shiftKey) setStage("shelf");
        else setCanvasZoom(1.0);
      } else if (mod && key === "t") {
        e.preventDefault();
        setStage("design");
        addTextElement(currentPageIndex);
      } else if (mod && key === "e") {
        e.preventDefault();
        setStage("export");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    addTextElement,
    copySelected,
    currentPageIndex,
    deleteSelected,
    duplicateSelected,
    pasteClipboard,
    redo,
    selectedElement,
    stepPage,
    undo,
  ]);

  const value: StudioStoreContextValue = {
    hydrated,
    stage,
    setStage,
    isDarkStudio,
    toggleDarkStudio,
    palette,
    showShortcutsModal,
    setShowShortcutsModal,
    toastMessage,
    showToast,
    isExporting,

    viewMode,
    setViewMode,
    canvasZoom,
    setCanvasZoom,
    showLibraryDrawer,
    setShowLibraryDrawer,
    activeInspector,
    setActiveInspector,

    activeTool,
    setActiveTool,
    activeUseRisoInk,
    setActiveUseRisoInk,
    activeRisoInkName,
    setActiveRisoInkName,
    activeHexColor,
    setActiveHexColor,
    activeInkDensity,
    setActiveInkDensity,
    activeBrushWidth,
    setActiveBrushWidth,
    isCroppingPhoto,
    setIsCroppingPhoto,
    isEditingPolygonPoints,
    setIsEditingPolygonPoints,

    currentPageIndex,
    setCurrentPageIndex,
    selectedRef,
    setSelectedRef,
    selectedElement,
    updateSelectedElement,
    updateSelectedElementLive,

    projects,
    project,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    recordUndoCheckpoint,
    mutateProject,
    undo,
    redo,
    commitLiveChanges,

    openProject,
    createNewProject,
    duplicateProject,
    deleteProject,
    restoreDemoProjects,

    spreads,
    currentSpreadIndex,
    currentSpread,
    stepPage,
    movePage,

    triggerPhotoPicker,
    importImageFiles,
    placeAssetOnPage,
    autoFillPagesFromLibrary,

    addTextElement,
    addShapeElement,
    appendBrushStroke,

    deleteSelected,
    copySelected,
    pasteClipboard,
    duplicateSelected,
    alignSelectedHorizontal,
    alignSelectedVertical,
    matchSelectedToFullBleed,
    resetPhotoAspectRatio,
    moveLayer,

    triggerImportJSON,
    handleExportJSON,
    handleExportPDF,
    handleExportJPGs,
    handleExportSeparations,
  };

  return (
    <StudioContext.Provider value={value}>
      {children}
      {/* Hidden Global File Pickers */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            importImageFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const imported = await parseProjectJSONFile(file);
            setProjects((prev) => {
              const next = [imported, ...prev];
              scheduleSaveShelf(next);
              return next;
            });
            setActiveProjectID(imported.id);
            setSelectedRef(null);
            setCurrentPageIndex(0);
            setStage("design");
            showToast(`已导入《${imported.title}》`);
          } catch {
            showToast("无法解析工程 JSON 文件");
          }
        }}
      />
    </StudioContext.Provider>
  );
}

export function useStudio(): StudioStoreContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error("useStudio must be used inside StudioProvider");
  }
  return ctx;
}
