"use client";

import { renderSinglePageCanvas } from "@/lib/pageRenderer";
import { subscribeImageDecode } from "@/lib/risoEngine";
import { useStudio } from "@/store/studioStore";
import { getFormatAspectRatio } from "@/types/zine";
import { BookCopy, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export const Book3DPreview: React.FC = () => {
  const store = useStudio();
  const { palette, project, isDarkStudio } = store;

  const totalLeaves = Math.max(1, Math.floor(project.pages.length / 2));
  const [turnedLeaves, setTurnedLeaves] = useState(1);
  const [decodeTick, setDecodeTick] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hingesRef = useRef<THREE.Group[]>([]);
  const targetAnglesRef = useRef<number[]>([]);
  const targetZRef = useRef<number[]>([]);

  useEffect(() => {
    return subscribeImageDecode(() => setDecodeTick((t) => t + 1));
  }, []);

  useEffect(() => {
    if (turnedLeaves > totalLeaves) {
      setTurnedLeaves(totalLeaves);
    }
  }, [totalLeaves, turnedLeaves]);

  // Build Three.js Scene & Rebuild Leaf Textures when Project Changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkStudio ? "#191816" : "#EFECE4");

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Warm Atelier Lighting
    const ambient = new THREE.AmbientLight(
      0xfffaf0,
      isDarkStudio ? 1.15 : 1.55
    );
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff6e8, 1.35);
    keyLight.position.set(2.4, 3.2, 4.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Studio Desk Plane
    const deskGeo = new THREE.PlaneGeometry(16, 12);
    const deskMat = new THREE.MeshStandardMaterial({
      color: isDarkStudio ? "#201E1B" : "#E8E3D9",
      roughness: 0.94,
    });
    const deskMesh = new THREE.Mesh(deskGeo, deskMat);
    deskMesh.position.set(0, 0, -0.16);
    deskMesh.receiveShadow = true;
    scene.add(deskMesh);

    // Book Root
    const bookRoot = new THREE.Group();
    bookRoot.rotation.x = -0.22;
    scene.add(bookRoot);

    const aspect = getFormatAspectRatio(project.format);
    const pageH = 2.1;
    const pageW = pageH * aspect;
    const leavesCount = Math.max(1, Math.floor(project.pages.length / 2));

    const hinges: THREE.Group[] = [];
    const createdTextures: THREE.CanvasTexture[] = [];
    const createdGeos: THREE.BufferGeometry[] = [];
    const createdMats: THREE.Material[] = [];

    for (let leaf = 0; leaf < leavesCount; leaf++) {
      const rectoIdx = leaf * 2;
      const versoIdx = leaf * 2 + 1;

      const rectoCanvas = renderSinglePageCanvas(project, rectoIdx, 560);
      const versoCanvas =
        versoIdx < project.pages.length
          ? renderSinglePageCanvas(project, versoIdx, 560)
          : renderSinglePageCanvas(project, 0, 120);

      const rectoTex = new THREE.CanvasTexture(rectoCanvas);
      rectoTex.colorSpace = THREE.SRGBColorSpace;
      const versoTex = new THREE.CanvasTexture(versoCanvas);
      versoTex.colorSpace = THREE.SRGBColorSpace;
      createdTextures.push(rectoTex, versoTex);

      const hinge = new THREE.Group();
      bookRoot.add(hinge);

      const frontGeo = new THREE.PlaneGeometry(pageW, pageH);
      const frontMat = new THREE.MeshStandardMaterial({
        map: rectoTex,
        roughness: 0.85,
      });
      const frontMesh = new THREE.Mesh(frontGeo, frontMat);
      frontMesh.position.set(pageW * 0.5, 0, 0.0014);
      frontMesh.castShadow = true;
      frontMesh.receiveShadow = true;
      hinge.add(frontMesh);

      const backGeo = new THREE.PlaneGeometry(pageW, pageH);
      const backMat = new THREE.MeshStandardMaterial({
        map: versoTex,
        roughness: 0.85,
      });
      const backMesh = new THREE.Mesh(backGeo, backMat);
      backMesh.position.set(pageW * 0.5, 0, -0.0014);
      backMesh.rotation.y = Math.PI;
      backMesh.castShadow = true;
      backMesh.receiveShadow = true;
      hinge.add(backMesh);

      createdGeos.push(frontGeo, backGeo);
      createdMats.push(frontMat, backMat);
      hinges.push(hinge);
    }

    hingesRef.current = hinges;

    // Interactive Orbit & Zoom State
    let orbitYaw = 0;
    let orbitPitch = 0.14;
    let distance = 4.35;
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const updateCamera = () => {
      camera.position.x = distance * Math.sin(orbitYaw) * Math.cos(orbitPitch);
      camera.position.y = -distance * Math.sin(orbitPitch);
      camera.position.z = distance * Math.cos(orbitYaw) * Math.cos(orbitPitch);
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    const dom = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      orbitYaw = Math.max(-1.1, Math.min(1.1, orbitYaw - dx * 0.006));
      orbitPitch = Math.max(-0.65, Math.min(0.85, orbitPitch + dy * 0.006));
      updateCamera();
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      distance = Math.max(2.2, Math.min(7.5, distance + e.deltaY * 0.003));
      updateCamera();
    };

    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 800;
      const nh = container.clientHeight || 600;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    // Smooth Leaf Animation Loop
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const list = hingesRef.current;
      for (let i = 0; i < list.length; i++) {
        const targetRot = targetAnglesRef.current[i] ?? 0;
        const targetZ = targetZRef.current[i] ?? 0;
        list[i].rotation.y += (targetRot - list[i].rotation.y) * 0.14;
        list[i].position.z += (targetZ - list[i].position.z) * 0.14;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      createdTextures.forEach((t) => t.dispose());
      createdGeos.forEach((g) => g.dispose());
      createdMats.forEach((m) => m.dispose());
      deskGeo.dispose();
      deskMat.dispose();
      renderer.dispose();
    };
  }, [project, isDarkStudio, decodeTick]);

  // Update Target Leaf Angles Whenever turnedLeaves Changes
  useEffect(() => {
    const total = Math.max(1, Math.floor(project.pages.length / 2));
    const angles: number[] = [];
    const zs: number[] = [];
    for (let idx = 0; idx < total; idx++) {
      if (idx < turnedLeaves) {
        angles.push(-Math.PI + (total - idx) * 0.008);
        zs.push(idx * 0.005);
      } else {
        angles.push(-idx * 0.008);
        zs.push((total - idx) * 0.005);
      }
    }
    targetAnglesRef.current = angles;
    targetZRef.current = zs;
  }, [turnedLeaves, project.pages.length]);

  const statusLabel =
    turnedLeaves === 0
      ? "封面 P1"
      : turnedLeaves >= totalLeaves
      ? `封底 P${project.pages.length}`
      : `跨页 P${turnedLeaves * 2} – P${turnedLeaves * 2 + 1}`;

  return (
    <div className="relative h-full w-full p-5 select-none">
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden rounded-3xl cursor-grab active:cursor-grabbing"
        style={{
          border: `1px solid ${palette.hairline}`,
        }}
      />

      {/* Floating 3D Controls */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full px-4 py-2 shadow-md"
        style={{
          backgroundColor: palette.cardSurface,
          border: `1px solid ${palette.hairline}`,
          color: palette.inkPrimary,
        }}
      >
        <button
          onClick={() => setTurnedLeaves(0)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer"
          style={{
            backgroundColor:
              turnedLeaves === 0 ? palette.accentInkPill : palette.cardElevated,
            color:
              turnedLeaves === 0
                ? palette.accentInkPillForeground
                : palette.inkPrimary,
          }}
        >
          <BookCopy size={12.5} />
          <span>合上封面</span>
        </button>

        <button
          disabled={turnedLeaves <= 0}
          onClick={() => setTurnedLeaves((n) => Math.max(0, n - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-30 cursor-pointer"
          style={{ backgroundColor: palette.cardElevated }}
        >
          <ChevronLeft size={14} />
        </button>

        <span className="min-w-[105px] text-center font-mono text-xs font-semibold">
          {statusLabel}
        </span>

        <button
          disabled={turnedLeaves >= totalLeaves}
          onClick={() => setTurnedLeaves((n) => Math.min(totalLeaves, n + 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-30 cursor-pointer"
          style={{ backgroundColor: palette.cardElevated }}
        >
          <ChevronRight size={14} />
        </button>

        <span
          className="hidden sm:inline text-[11px]"
          style={{ color: palette.inkSecondary }}
        >
          拖拽旋转视角 · 滚轮缩放
        </span>
      </div>
    </div>
  );
};
