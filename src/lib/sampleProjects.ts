import {
  BindingType,
  hexWithAlpha,
  makeDefaultElement,
  normalizePageCount,
  PageSizePreset,
  PhotoAsset,
  syncProjectPageCount,
  ZineProject,
} from "@/types/zine";

function makeBaseProject(partial: Partial<ZineProject> & { title: string }): ZineProject {
  const proj: ZineProject = {
    id: crypto.randomUUID(),
    title: partial.title,
    author: partial.author ?? "Studio Creator",
    summary: partial.summary ?? "一本独立手工排版小志",
    updatedAt: new Date().toISOString(),
    coverAccentHex: partial.coverAccentHex ?? "#D95D39",
    format: partial.format ?? {
      binding: "saddle",
      pageCount: 16,
      sizePreset: "A5",
      customWidthMM: 148,
      customHeightMM: 210,
      orientation: "portrait",
      paperStock: "Cotton",
      paperColorName: "Ivory",
      backgroundIndependentPhotos: false,
    },
    printSettings: partial.printSettings ?? {
      mode: "Risograph",
      solidFillHex: null,
      solidFillRisoInk: null,
      solidFillDensity: 0.12,
      halftone: "Halftone",
      separationMode: "Lum",
      primaryRisoInk: "Blue",
      secondaryRisoInk: "Fluorescent Pink",
      dotScale: 1.0,
      registrationJitterMM: 0.35,
    },
    bleedGuides: partial.bleedGuides ?? {
      bleed3mm: false,
      trimLine: false,
      cropMarks: false,
      centerMarks: false,
      centerLineV: false,
      centerLineH: false,
      rulerMM: false,
      includeInPDF: false,
      lineColorHex: "#FF3B30",
    },
    pageNumbers: partial.pageNumbers ?? {
      enabled: true,
      skipCovers: true,
      position: "Bottom outer",
      offsetXMM: 10,
      offsetYMM: 10,
      fontName: "Baskerville",
      fontSizePt: 9.5,
      startAt: 1,
      colorHex: "#3A352F",
    },
    exportSettings: partial.exportSettings ?? {
      layout: "Spread",
      sheetBackground: "Warm Linen",
      portraitFrame: "Off",
      separationUnitSpread: false,
      separationPlateStyle: "Grayscale",
      separationFormat: "PDF",
      separationCropMarks: true,
    },
    assets: partial.assets ?? [],
    pages: partial.pages ?? [],
  };
  return syncProjectPageCount(proj);
}

function makeProceduralArtAsset(
  filename: string,
  palette: [string, string, string],
  motif: number
): PhotoAsset {
  const w = 640;
  const h = 800;
  let dataUrl = "";

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const [c1, c2, c3] = palette;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, c3);
      grad.addColorStop(1, "#FFFFFF");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (motif === 0) {
        // Botanical sun + leaves (top-left canvas coordinates matching macOS flipped look)
        ctx.fillStyle = hexWithAlpha(c2, 0.88);
        ctx.beginPath();
        ctx.ellipse(320, 310, 150, 150, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = hexWithAlpha(c1, 0.92);
        for (let i = 0; i < 7; i++) {
          const y = h - (120 + i * 72);
          const leafW = 190 - Math.abs(i - 3) * 26;
          const side = i % 2 === 0 ? 1 : -1;
          ctx.save();
          ctx.translate(w * 0.5, y);
          ctx.rotate(-side * 0.48);
          ctx.beginPath();
          ctx.ellipse(
            side > 0 ? leafW * 0.5 : -leafW * 0.5,
            0,
            leafW * 0.5,
            26,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
        }

        ctx.strokeStyle = c1;
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h - 60);
        ctx.quadraticCurveTo(w * 0.5 - 28, h - 380, w * 0.5 + 12, h - 690);
        ctx.stroke();
      } else if (motif === 1) {
        // Architectural arches & afternoon shadows
        ctx.fillStyle = hexWithAlpha(c1, 0.9);
        ctx.fillRect(50, h - 610, 240, 520);

        ctx.fillStyle = c3;
        ctx.beginPath();
        ctx.ellipse(170, h - 470, 80, 80, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(90, h - 470, 160, 380);

        ctx.fillStyle = hexWithAlpha(c2, 0.85);
        ctx.beginPath();
        ctx.ellipse(445, h - 525, 105, 105, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = hexWithAlpha(c1, 0.75);
        ctx.beginPath();
        ctx.moveTo(290, h - 90);
        ctx.lineTo(610, h - 90);
        ctx.lineTo(610, h - 340);
        ctx.closePath();
        ctx.fill();
      } else {
        // Layered misty mountains & botanical moon
        ctx.fillStyle = hexWithAlpha(c2, 0.82);
        ctx.beginPath();
        ctx.ellipse(450, h - 590, 70, 70, 0, 0, Math.PI * 2);
        ctx.fill();

        for (let layer = 0; layer < 3; layer++) {
          const alpha = 0.42 + layer * 0.25;
          ctx.fillStyle = hexWithAlpha(c1, alpha);
          const baseY = h - (390 - layer * 105);
          ctx.beginPath();
          ctx.moveTo(0, h);
          ctx.lineTo(0, baseY);
          ctx.bezierCurveTo(
            w * 0.32,
            baseY - (130 - layer * 20),
            w * 0.68,
            baseY + 80,
            w,
            baseY + 40
          );
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fill();
        }
      }

      dataUrl = canvas.toDataURL("image/png");
    }
  }

  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return {
    id: crypto.randomUUID(),
    filename,
    imageData: base64,
    mimeType: "image/png",
    pixelWidth: w,
    pixelHeight: h,
    createdAt: new Date().toISOString(),
  };
}

export function makeBlankProject(
  title = "无题小志 · Untitled Zine",
  binding: BindingType = "saddle",
  sizePreset: PageSizePreset = "A5",
  pageCount = 16
): ZineProject {
  const validPages = normalizePageCount(binding, pageCount);
  const project = makeBaseProject({
    title,
    format: {
      binding,
      pageCount: validPages,
      sizePreset,
      customWidthMM: 148,
      customHeightMM: 210,
      orientation: "portrait",
      paperStock: "Cotton",
      paperColorName: "Ivory",
      backgroundIndependentPhotos: false,
    },
  });

  if (project.pages.length > 0) {
    project.pages[0].elements.push(
      makeDefaultElement({
        kind: "text",
        name: "封面标题",
        x: 0.12,
        y: 0.22,
        width: 0.76,
        height: 0.22,
        useRisoInk: true,
        risoInkName: "Blue",
        inkDensity: 0.95,
        text: title,
        fontFamily: "Baskerville",
        fontSizePt: 26,
        fontWeight: "Bold",
        lineHeightMultiple: 1.25,
      })
    );
  }
  return project;
}

export function makeBotanicaRisoZine(): ZineProject {
  const sunAsset = makeProceduralArtAsset("botanical-sun.png", ["#1F4E8C", "#FF5C8A", "#F8D464"], 0);
  const archAsset = makeProceduralArtAsset("tokyo-alley.png", ["#1B3B6F", "#E85D4A", "#F4EAE0"], 1);
  const leafAsset = makeProceduralArtAsset("pressed-fern.png", ["#1D6A58", "#FF6B6B", "#FCECC9"], 2);

  const project = makeBaseProject({
    title: "纸间漫游 · Riso Field Notes",
    author: "Atelier Paperfold",
    summary: "双色孔版印刷植物与街角光影采集手记 · 16页骑马订示范册",
    coverAccentHex: "#D95D39",
    assets: [sunAsset, archAsset, leafAsset],
  });

  // Page 1: Cover
  project.pages[0].elements = [
    makeDefaultElement({
      kind: "shape",
      name: "封面底框",
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.8,
      overlap: "Mix (overprint)",
      useRisoInk: true,
      risoInkName: "Yellow",
      inkDensity: 0.22,
      cornerRadiusPt: 6,
      shapeKind: "Rectangle",
    }),
    makeDefaultElement({
      kind: "photo",
      name: "封面主图",
      x: 0.16,
      y: 0.28,
      width: 0.68,
      height: 0.46,
      overlap: "Mix (overprint)",
      cornerRadiusPt: 4,
      assetID: sunAsset.id,
    }),
    makeDefaultElement({
      kind: "text",
      name: "刊号",
      x: 0.16,
      y: 0.14,
      width: 0.68,
      height: 0.06,
      useRisoInk: true,
      risoInkName: "Fluorescent Pink",
      inkDensity: 0.9,
      text: "ISSUE NO. 01 · AUTUMN RISOGRAPH EDITION",
      fontFamily: "Futura",
      fontSizePt: 8.5,
      fontWeight: "Med",
      trackingPx: 1.4,
    }),
    makeDefaultElement({
      kind: "text",
      name: "主标题",
      x: 0.16,
      y: 0.19,
      width: 0.72,
      height: 0.12,
      useRisoInk: true,
      risoInkName: "Blue",
      inkDensity: 0.96,
      text: "纸间漫游",
      fontFamily: "Songti SC",
      fontSizePt: 28,
      fontWeight: "Bold",
    }),
    makeDefaultElement({
      kind: "text",
      name: "副标题",
      x: 0.16,
      y: 0.77,
      width: 0.68,
      height: 0.1,
      useRisoInk: true,
      risoInkName: "Blue",
      inkDensity: 0.85,
      text: "A Tactile Herbarium & Light Study\nPrinted in Soy Ink on Cotton Rag",
      fontFamily: "Baskerville",
      fontSizePt: 10.5,
      isItalic: true,
      lineHeightMultiple: 1.35,
    }),
    makeDefaultElement({
      kind: "shape",
      name: "孔版徽章",
      x: 0.72,
      y: 0.22,
      width: 0.15,
      height: 0.11,
      rotationDegrees: 14,
      overlap: "Mix (overprint)",
      useRisoInk: true,
      risoInkName: "Fluorescent Pink",
      inkDensity: 0.88,
      shapeKind: "Star",
    }),
  ];

  // Spread P2–P3: Panoramic cross-gutter photo + essay
  project.pages[1].elements = [
    makeDefaultElement({
      kind: "photo",
      name: "跨页街景",
      x: 0.12,
      y: 0.14,
      width: 1.32,
      height: 0.56,
      overlap: "Mix (overprint)",
      assetID: archAsset.id,
      spansSpread: true,
    }),
    makeDefaultElement({
      kind: "text",
      name: "左页图注",
      x: 0.12,
      y: 0.74,
      width: 0.72,
      height: 0.16,
      useRisoInk: true,
      risoInkName: "Blue",
      inkDensity: 0.9,
      text: "01 / 晨光穿过旧书店木格窗，大豆油墨在棉浆纸纤维间自然晕染出微小的错位美感。",
      fontFamily: "Songti SC",
      fontSizePt: 10.5,
      lineHeightMultiple: 1.55,
    }),
  ];

  project.pages[2].elements = [
    makeDefaultElement({
      kind: "text",
      name: "右页随笔",
      x: 0.5,
      y: 0.2,
      width: 0.38,
      height: 0.45,
      useRisoInk: true,
      risoInkName: "Blue",
      inkDensity: 0.92,
      text: "On Making Zines\n\n做一本小志不需要昂贵的工业流水线。几张温润的纸、两支专色油墨，在折叠与装订的瞬间，图像便拥有了可触摸的呼吸。",
      fontFamily: "Baskerville",
      fontSizePt: 11.5,
      lineHeightMultiple: 1.5,
    }),
    makeDefaultElement({
      kind: "stroke",
      name: "手绘批注线",
      x: 0.5,
      y: 0.23,
      width: 0.32,
      height: 0.04,
      overlap: "Mix (overprint)",
      useRisoInk: true,
      risoInkName: "Fluorescent Pink",
      inkDensity: 0.82,
      brushKind: "Marker",
      strokePoints: [
        { x: 0.5, y: 0.245 },
        { x: 0.68, y: 0.242 },
        { x: 0.82, y: 0.247 },
      ],
      brushWidthPt: 9.0,
    }),
  ];

  // Spread P4–P5
  project.pages[3].elements = [
    makeDefaultElement({
      kind: "shape",
      name: "圆环叠印",
      x: 0.18,
      y: 0.18,
      width: 0.64,
      height: 0.46,
      overlap: "Mix (overprint)",
      useRisoInk: true,
      risoInkName: "Teal",
      inkDensity: 0.28,
      shapeKind: "Ellipse",
    }),
    makeDefaultElement({
      kind: "text",
      name: "标本编号",
      x: 0.18,
      y: 0.7,
      width: 0.64,
      height: 0.14,
      useRisoInk: true,
      risoInkName: "Teal",
      inkDensity: 0.95,
      text: "SPECIMEN II — PRESSED FERN\n采自雨后山径 · 双色网点分色测试",
      fontFamily: "Songti SC",
      fontSizePt: 11,
      textAlignment: "center",
      lineHeightMultiple: 1.5,
    }),
  ];

  project.pages[4].elements = [
    makeDefaultElement({
      kind: "photo",
      name: "蕨类标本",
      x: 0.14,
      y: 0.14,
      width: 0.72,
      height: 0.7,
      overlap: "Mix (overprint)",
      cornerRadiusPt: 6,
      assetID: leafAsset.id,
    }),
  ];

  // Back Cover P16
  project.pages[15].elements = [
    makeDefaultElement({
      kind: "text",
      name: "版权页",
      x: 0.18,
      y: 0.72,
      width: 0.64,
      height: 0.16,
      useRisoInk: true,
      risoInkName: "Blue",
      inkDensity: 0.82,
      text: "EASYZINE · PAPERFOLD WEB ATELIER\n16P · A5 · SADDLE STITCH · COTTON 160G\nPRINTED WITH RISO BLUE & FLUORESCENT PINK",
      fontFamily: "Menlo",
      fontSizePt: 7.5,
      textAlignment: "center",
      lineHeightMultiple: 1.6,
      trackingPx: 0.8,
    }),
  ];

  return project;
}

export function makeJapanesePoetryZine(): ZineProject {
  const inkAsset = makeProceduralArtAsset("mountain-mist.png", ["#2C3639", "#A24936", "#EAE0CC"], 2);

  const project = makeBaseProject({
    title: "山居四时 · 四目古线装",
    author: "林间书房",
    summary: "本色牛皮纸配朱砂红麻线四目缀装帧 · 12页诗画集",
    coverAccentHex: "#8F3D2E",
    format: {
      binding: "japanese",
      pageCount: 12,
      sizePreset: "B5",
      customWidthMM: 182,
      customHeightMM: 257,
      orientation: "portrait",
      paperStock: "Kraft",
      paperColorName: "Cream",
      backgroundIndependentPhotos: false,
    },
    printSettings: {
      mode: "Offset",
      solidFillHex: null,
      solidFillRisoInk: null,
      solidFillDensity: 0.12,
      halftone: "Halftone",
      separationMode: "Lum",
      primaryRisoInk: "Black",
      secondaryRisoInk: "Crimson",
      dotScale: 1.0,
      registrationJitterMM: 0.25,
    },
    assets: [inkAsset],
  });

  project.pages[0].elements = [
    makeDefaultElement({
      kind: "shape",
      name: "书名签条白底",
      x: 0.64,
      y: 0.14,
      width: 0.18,
      height: 0.52,
      overlap: "On top",
      fillHex: "#FAF6EE",
      strokeHex: "#8F3D2E",
      strokeWidthPt: 1.2,
      shapeKind: "Rectangle",
    }),
    makeDefaultElement({
      kind: "text",
      name: "题签",
      x: 0.66,
      y: 0.18,
      width: 0.14,
      height: 0.44,
      overlap: "On top",
      fillHex: "#24201D",
      text: "山\n居\n四\n时",
      fontFamily: "Songti SC",
      fontSizePt: 22,
      fontWeight: "Bold",
      textAlignment: "center",
      lineHeightMultiple: 1.38,
    }),
    makeDefaultElement({
      kind: "shape",
      name: "朱文印章",
      x: 0.68,
      y: 0.58,
      width: 0.1,
      height: 0.06,
      overlap: "On top",
      fillHex: "#B63B2A",
      cornerRadiusPt: 2,
      shapeKind: "Rectangle",
    }),
  ];

  project.pages[2].elements = [
    makeDefaultElement({
      kind: "photo",
      name: "远山图",
      x: 0.16,
      y: 0.18,
      width: 0.68,
      height: 0.46,
      assetID: inkAsset.id,
    }),
    makeDefaultElement({
      kind: "text",
      name: "短句",
      x: 0.16,
      y: 0.7,
      width: 0.68,
      height: 0.14,
      fillHex: "#2E2925",
      text: "松风吹解带，山月照弹琴。",
      fontFamily: "Kaiti SC",
      fontSizePt: 14,
      textAlignment: "center",
    }),
  ];

  return project;
}

export function makePocketMiniFoldZine(): ZineProject {
  const project = makeBaseProject({
    title: "一纸八页 · 口袋折页指南",
    author: "Zine Workshop",
    summary: "单张 A4 纸打印后正中剪开一刀即可折成 8 页免装订口袋小志",
    coverAccentHex: "#2F6F5E",
    format: {
      binding: "miniFold8",
      pageCount: 8,
      sizePreset: "A6",
      customWidthMM: 105,
      customHeightMM: 148,
      orientation: "portrait",
      paperStock: "Recycled",
      paperColorName: "Mint",
      backgroundIndependentPhotos: false,
    },
    printSettings: {
      mode: "Risograph",
      solidFillHex: null,
      solidFillRisoInk: null,
      solidFillDensity: 0.12,
      halftone: "Halftone",
      separationMode: "Lum",
      primaryRisoInk: "Black",
      secondaryRisoInk: "Orange",
      dotScale: 1.0,
      registrationJitterMM: 0.3,
    },
  });

  const titles = [
    "P1 · 口袋折页志\n无需订书机，一刀折成书",
    "P2 · 第一步\n将印张沿长边对折再展开",
    "P3 · 第二步\n沿短边四等分折出折痕",
    "P4 · 第三步\n沿正中红虚线剪开中间两格",
    "P5 · 第四步\n捏住两端向中心推拢成十字",
    "P6 · 第五步\n顺势旋转收拢压平书脊",
    "P7 · 自由涂鸦页\n试试底部的蜡笔与喷漆工具！",
    "P8 · 封底 Colophon\nMade with EasyZine Web Studio",
  ];

  for (let i = 0; i < 8; i++) {
    project.pages[i].elements = [
      makeDefaultElement({
        kind: "text",
        name: "步骤说明",
        x: 0.14,
        y: 0.28,
        width: 0.72,
        height: 0.44,
        useRisoInk: true,
        risoInkName: i === 0 ? "Orange" : "Black",
        inkDensity: 0.92,
        text: titles[i],
        fontFamily: "PingFang SC",
        fontSizePt: i === 0 ? 18 : 14,
        fontWeight: i === 0 ? "Bold" : "Med",
        textAlignment: "center",
        lineHeightMultiple: 1.55,
      }),
    ];
  }

  return project;
}

export function makeDefaultShelf(): ZineProject[] {
  return [
    makeBotanicaRisoZine(),
    makeJapanesePoetryZine(),
    makePocketMiniFoldZine(),
  ];
}
