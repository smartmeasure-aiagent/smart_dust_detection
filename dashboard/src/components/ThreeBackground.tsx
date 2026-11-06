"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Ambient "connectivity mesh" — a slow field of drifting nodes linked by faint
 * lines, evoking the connected bin fleet. It sits fixed behind all content
 * (pointer-events: none) and never shifts the layout. Theme-aware and paused
 * when the tab is hidden or the user prefers reduced motion.
 */
function cssColor(name: string, fallback: string) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

export default function ThreeBackground({ themeKey }: { themeKey: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  // keep live handles so the theme effect can recolor without rebuilding
  const colorsRef = useRef<{ node: THREE.Color; line: THREE.Color }>({ node: new THREE.Color(), line: new THREE.Color() });
  const applyColorsRef = useRef<() => void>(() => {});
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return; // WebGL unavailable — the CSS background remains
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.z = 26;

    // ---- nodes ---- (kept sparse so the mesh reads as a few light strings)
    const COUNT = window.innerWidth < 768 ? 28 : 48;
    const SPREAD_X = 44;
    const SPREAD_Y = 28;
    const SPREAD_Z = 14;
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD_X;
      positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD_Z;
      velocities[i * 3] = (Math.random() - 0.5) * 0.06;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.06;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.045;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const sprite = makeGlowSprite();
    const pointsMat = new THREE.PointsMaterial({
      size: 1.6,
      map: sprite,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: colorsRef.current.node,
    });
    const points = new THREE.Points(pointsGeo, pointsMat);
    scene.add(points);

    // ---- links (rebuilt each frame within a distance threshold) ----
    const LINK_DIST = 8;
    const MAX_LINKS = COUNT * 6;
    const linePos = new Float32Array(MAX_LINKS * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5, color: colorsRef.current.line });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    applyColors();

    function applyColors() {
      colorsRef.current.node.set(cssColor("--brand", "#10b981"));
      colorsRef.current.line.set(cssColor("--brand-2", "#06b6d4"));
      pointsMat.color.copy(colorsRef.current.node);
      lineMat.color.copy(colorsRef.current.line);
      const dark = document.documentElement.dataset.theme === "dark" || (document.documentElement.dataset.theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      pointsMat.opacity = dark ? 0.9 : 0.75;
      lineMat.opacity = dark ? 0.24 : 0.16;
    }
    applyColorsRef.current = applyColors;

    function onResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    window.addEventListener("resize", onResize);

    let raf = 0;
    let running = true;
    const onVis = () => {
      running = !document.hidden;
      if (running) tick();
    };
    document.addEventListener("visibilitychange", onVis);

    function tick() {
      if (!running) return;
      raf = requestAnimationFrame(tick);

      if (!reduce) {
        for (let i = 0; i < COUNT; i++) {
          for (let a = 0; a < 3; a++) {
            const k = i * 3 + a;
            positions[k] += velocities[k];
            const bound = a === 0 ? SPREAD_X / 2 : a === 1 ? SPREAD_Y / 2 : SPREAD_Z / 2;
            if (positions[k] > bound || positions[k] < -bound) velocities[k] *= -1;
          }
        }
        pointsGeo.attributes.position.needsUpdate = true;

        // links
        let n = 0;
        for (let i = 0; i < COUNT && n < MAX_LINKS; i++) {
          for (let j = i + 1; j < COUNT && n < MAX_LINKS; j++) {
            const dx = positions[i * 3] - positions[j * 3];
            const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
            const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
            if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
              linePos.set([positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]], n * 6);
              linePos.set([positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]], n * 6 + 3);
              n++;
            }
          }
        }
        lineGeo.setDrawRange(0, n * 2);
        lineGeo.attributes.position.needsUpdate = true;

        scene.rotation.y += 0.0014;
        scene.rotation.x = Math.sin(Date.now() * 0.0001) * 0.1;
      }
      renderer.render(scene, camera);
    }
    tick();

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      pointsGeo.dispose();
      lineGeo.dispose();
      pointsMat.dispose();
      lineMat.dispose();
      sprite.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };

    return () => cleanupRef.current();
  }, []);

  // recolor on theme change without rebuilding the scene
  useEffect(() => {
    applyColorsRef.current();
  }, [themeKey]);

  return <div ref={mountRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-90" />;
}

// a soft radial dot used as the point sprite
function makeGlowSprite() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.75)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
