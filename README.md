# EasyZine (纸间小志工坊 · Web Studio)

**EasyZine** 是由原生 macOS 应用 `Paperfold (makezine)` 完整移植升级而成的 **纯前端网页版独立小志（Zine）排版、Risograph 孔版印刷模拟、3D 翻书预览与印前折手拼版工坊**。  
基于 **Next.js (App Router 静态导出 `output: 'export'`) + TypeScript + Tailwind CSS v4 + HTML5 Canvas 2D + Three.js + IndexedDB** 构建，零后端依赖，原生适配 **GitHub Pages** 部署，所有原片与工程均离线保存在浏览器本地。

在线预览地址（GitHub Pages）：`https://oionus.github.io/easyzine/`

---

## 技术栈选型

- **框架与构建**：`Next.js 15` (`output: 'export'` 纯静态导出，自动适配 GitHub Pages `/easyzine` 子路径与 `.nojekyll`) + `React 19` + `TypeScript`
- **视觉与主题**：`Tailwind CSS v4` + `Lucide Icons`，致敬 **Paper (by FiftyThree)** 的温润触感极简美学，支持日间暖亚麻纸与夜间胡桃木暗房双主题切换
- **排版与孔版渲染引擎**：原生 `HTML5 Canvas 2D` 像素级移植，完整复刻 12 款特种纸纹理生成、48 色 Risograph 大豆油墨正片叠底、角度挂网 (`Halftone`) 与 Floyd–Steinberg 误差扩散噪点 (`Error Diffusion`)
- **三维立体翻书**：`Three.js` 实时 WebGL 场景，支持书页双面 (`Recto / Verso`) 铰链翻折动画、画室方向光阴影、拖拽旋转视角与滚轮缩放
- **印前导出与本地持久化**：`jsPDF`（精确毫米/磅值多页印刷级 PDF 导出）+ `JSZip`（批量 JPG 图集与多色孔版分色制版母片打包）+ `idb-keyval`（IndexedDB 大容量离线持久化，并支持与 macOS 版互通 `.json` 工程文件）

---

## 核心功能一览

1. **触感书架与离线工程 (`00 书架`)**
   - 内置 3 本示范小志（《纸间漫游 · Riso Field Notes》16P 骑马订双色孔版、《山居四时 · 四目古线装》12P 牛皮纸诗集、《一纸八页 · 口袋折页指南》8P 免钉裁折志）。
   - IndexedDB 自动离线保存，支持随时导入 / 导出 `.json` 独立工程包。
2. **看片台与图像素材 (`01 素材`)**
   - 支持批量拖拽导入本地图片，一键按序自动排入页面，或在画布中横跨书脊铺设**对开跨页大图**。
3. **全规格开本、特种纸与折手印张预览 (`02 开本`)**
   - **8 种装订方式**：骑马订、平订侧钉、无线胶装、锁线胶装、中缝线装、日式四目缀、双线圈装、**一纸八页免钉裁折页 (`1-Sheet 8P Zine`)**。
   - **12 款特种纸肌理 + 24 款原浆纸色**：含支持真实背页镜像透影的**硫酸描图纸**、亚麻布纹纸、纯棉版画纸、本色牛皮纸等。
   - **物理印张折手正反面预览**：直观查看每张纸正反面的落版页码、180° 倒置排布与红虚线中缝半裁线。
4. **Paper 风格画布、拟物画笔与 48 色孔版叠印 (`03 创作`)**
   - **四种视图**：`单页`、`跨页`、`台本总览`（支持拖拽单页缩略图自由调换整书页序）、`3D 翻阅`。
   - **拟物笔具坞**：指针、活字排印、9 种几何与可编辑折点多边形、**8 款肌理笔具**（钢笔、马克笔、秀丽毛笔、石墨铅笔、粗纹蜡笔、油画棒、颗粒喷漆、软橡皮）。
   - **48 色 Risograph 专色引擎**：明度双色 / 四色 CMYK / 负片分色，可调网点粒径与滚筒套准微偏 (`mm`)。
   - **印前参考线与自动页码**：3mm 出血框、裁切框、四角角线、十字套准标、中轴线、毫米标尺，以及奇偶外侧自动页码。
5. **印前拼版、社媒画框与孔版分色母版导出 (`04 印前`)**
   - **6 种拼版输出**：单页、跨页、装订折手印张 (`Imposition`)、4-up、8-up、全书一图总览海报。
   - **展示衬底与社媒竖幅框**：亚麻画案、暗房深黑、白/绿切割垫网格，支持 `4:5`、`3:4`、`9:16`、`1:1` 竖幅画框。
   - **Risograph 分色制版导出**：自动汇总全书所用专色通道，支持左侧实时检视单色母版，一键导出带四角套准十字线的灰度制版稿或预挂网点稿（`PDF` 或 `PNG` 压缩包）。

---

## 本地开发与构建

```bash
npm install
npm run dev
```

生成 GitHub Pages 纯静态产物（输出至 `./out`）：

```bash
npm run build
```

## GitHub Pages 一键部署说明

已内置一键发布脚本 [`scripts/deploy-gh-pages.mjs`](scripts/deploy-gh-pages.mjs)（自动携带 `NEXT_PUBLIC_BASE_PATH=/easyzine` 与 `.nojekyll` 静态导出并推送到远端 `gh-pages` 分支）：

```bash
npm run deploy
```

推送完成后，在 GitHub 仓库 **Settings → Pages → Build and deployment** 中确认：
- **Source**: `Deploy from a branch`
- **Branch**: `gh-pages` / `/ (root)`

即可直接访问：`https://oionus.github.io/easyzine/`
（如需改用 GitHub Actions 自动构建，也可参考 [`scripts/github-actions-deploy.yml`](scripts/github-actions-deploy.yml) 放入 `.github/workflows/deploy.yml`。）
