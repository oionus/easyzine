"use client";

import { PhysicalSheetSide } from "@/lib/imposition";
import {
  drawPrepressGuides,
  drawSheetSide,
  drawSinglePage,
  getPagePointSize,
  getSheetCanvasPointSize,
  PT_PER_MM,
  RenderOptions,
} from "@/lib/pageRenderer";
import { subscribeImageDecode } from "@/lib/risoEngine";
import { ZineProject } from "@/types/zine";
import React, { useEffect, useRef, useState } from "react";

interface SinglePageCanvasProps {
  project: ZineProject;
  pageIndex: number;
  pairedLeftPageIndex?: number | null;
  pixelHeight?: number;
  includeGuides?: boolean;
  maxPhotoDimension?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const SinglePageCanvas: React.FC<SinglePageCanvasProps> = React.memo(
  ({
    project,
    pageIndex,
    pairedLeftPageIndex = null,
    pixelHeight = 760,
    includeGuides = false,
    maxPhotoDimension = 680,
    className,
    style,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [decodeTick, setDecodeTick] = useState(0);

    useEffect(() => {
      return subscribeImageDecode(() => setDecodeTick((t) => t + 1));
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const basePt = getPagePointSize(project.format);
      const g = project.bleedGuides;
      const hasMargin =
        includeGuides && (g.bleed3mm || g.cropMarks || g.rulerMM);
      const marginPt = hasMargin ? 10.0 * PT_PER_MM : 0;
      const totalPtW = basePt.width + marginPt * 2;
      const totalPtH = basePt.height + marginPt * 2;
      const scale = Math.max(0.45, pixelHeight / Math.max(totalPtH, 1));

      const pxW = Math.max(16, Math.round(totalPtW * scale));
      const pxH = Math.max(16, Math.round(totalPtH * scale));
      if (canvas.width !== pxW) canvas.width = pxW;
      if (canvas.height !== pxH) canvas.height = pxH;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.clearRect(0, 0, pxW, pxH);
      ctx.scale(scale, scale);

      const pageRect = {
        x: marginPt,
        y: marginPt,
        width: basePt.width,
        height: basePt.height,
      };
      drawSinglePage(ctx, project, pageIndex, pageRect, pairedLeftPageIndex, {
        includeGuides,
        maxPhotoDimension,
      });

      if (includeGuides) {
        drawPrepressGuides(ctx, pageRect, project.bleedGuides);
      }
      ctx.restore();
    }, [
      project,
      pageIndex,
      pairedLeftPageIndex,
      pixelHeight,
      includeGuides,
      maxPhotoDimension,
      decodeTick,
    ]);

    return <canvas ref={canvasRef} className={className} style={style} />;
  }
);
SinglePageCanvas.displayName = "SinglePageCanvas";

interface SheetSideCanvasProps {
  project: ZineProject;
  sheetSide: PhysicalSheetSide;
  pixelMaxDimension?: number;
  applyExportFraming?: boolean;
  options?: RenderOptions;
  className?: string;
  style?: React.CSSProperties;
}

export const SheetSideCanvas: React.FC<SheetSideCanvasProps> = React.memo(
  ({
    project,
    sheetSide,
    pixelMaxDimension = 980,
    applyExportFraming = false,
    options = {},
    className,
    style,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [decodeTick, setDecodeTick] = useState(0);

    useEffect(() => {
      return subscribeImageDecode(() => setDecodeTick((t) => t + 1));
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasSize = getSheetCanvasPointSize(
        project,
        sheetSide,
        applyExportFraming
      );
      const scale = Math.max(
        0.35,
        pixelMaxDimension / Math.max(canvasSize.width, canvasSize.height, 1)
      );
      const pxW = Math.max(24, Math.round(canvasSize.width * scale));
      const pxH = Math.max(24, Math.round(canvasSize.height * scale));
      if (canvas.width !== pxW) canvas.width = pxW;
      if (canvas.height !== pxH) canvas.height = pxH;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.clearRect(0, 0, pxW, pxH);
      ctx.scale(scale, scale);
      drawSheetSide(
        ctx,
        project,
        sheetSide,
        { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
        applyExportFraming,
        options
      );
      ctx.restore();
    }, [
      project,
      sheetSide,
      pixelMaxDimension,
      applyExportFraming,
      options,
      decodeTick,
    ]);

    return <canvas ref={canvasRef} className={className} style={style} />;
  }
);
SheetSideCanvas.displayName = "SheetSideCanvas";
