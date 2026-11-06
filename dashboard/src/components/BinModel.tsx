"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// bin is treated as "full → collect" at this fill %
const FULL_AT = 90;

/**
 * Lightweight 3D dustbin whose inner fill rises to the live fill %. Built from
 * primitives (no external asset), gently auto-rotates, and eases toward the
 * target value so real data changes read as smooth motion — not fake motion.
 *
 * When the bin reaches 100% a garbage-collection sequence plays: a truck drives
 * in, waste particles lift out of the bin into it, and it drives away.
 */
export default function BinModel({ fill, color, online, size = 220 }: { fill: number; color: string; online: boolean; size?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(online ? fill : 0);
  const colorRef = useRef(color);
  const onlineRef = useRef(online);

  useEffect(() => {
    targetRef.current = online ? Math.max(0, Math.min(100, fill)) : 0;
    onlineRef.current = online;
  }, [fill, online]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // image-based lighting → rich reflections instead of a flat grey look
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.8, 7.4);
    camera.lookAt(0, 0.4, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(3, 6, 5);
    scene.add(key);
    const teal = new THREE.PointLight(0x22d3ee, 0.8, 30);
    teal.position.set(-4, 3, 2);
    scene.add(teal);
    const warm = new THREE.PointLight(0xffd9a0, 0.5, 30);
    warm.position.set(4, 1, -2);
    scene.add(warm);

    // bin + waste live in a slowly-rotating group; the truck does NOT rotate
    const group = new THREE.Group();
    scene.add(group);

    const BODY_H = 3.2;
    const R_TOP = 1.5;
    const R_BOT = 1.2;

    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(R_TOP, R_BOT, BODY_H, 48, 1, true),
      new THREE.MeshPhysicalMaterial({ color: 0x2fb088, metalness: 0.0, roughness: 0.12, transmission: 0.7, transparent: true, opacity: 0.5, side: THREE.DoubleSide, clearcoat: 1.0, clearcoatRoughness: 0.1, ior: 1.3, thickness: 0.6 }),
    );
    shell.position.y = BODY_H / 2;
    group.add(shell);

    const ribMat = new THREE.MeshStandardMaterial({ color: 0x5fe0b0, metalness: 0.5, roughness: 0.3, emissive: 0x126b4e, emissiveIntensity: 0.3 });
    for (let i = 0; i < 3; i++) {
      const y = 0.6 + i * 1.0;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R_BOT + (R_TOP - R_BOT) * (y / BODY_H) + 0.02, 0.035, 10, 48), ribMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      group.add(ring);
    }

    const base = new THREE.Mesh(new THREE.CylinderGeometry(R_BOT, R_BOT - 0.08, 0.2, 48), new THREE.MeshStandardMaterial({ color: 0x0f6b4c, metalness: 0.6, roughness: 0.35 }));
    base.position.y = 0.1;
    group.add(base);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(R_TOP + 0.12, R_TOP + 0.05, 0.24, 48), new THREE.MeshStandardMaterial({ color: 0x11936a, metalness: 0.7, roughness: 0.25 }));
    lid.position.set(0, BODY_H + 0.12, -0.15);
    lid.rotation.x = -0.28;
    group.add(lid);

    // "smart" sensor module on the lid (brand-cyan accent that glows)
    const sensor = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.3 }),
    );
    sensor.position.set(0, BODY_H + 0.26, 0.25);
    sensor.rotation.x = -0.28;
    group.add(sensor);

    const fillMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorRef.current), emissive: new THREE.Color(colorRef.current), emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.0 });
    const fillMesh = new THREE.Mesh(new THREE.CylinderGeometry(R_TOP - 0.08, R_BOT - 0.05, 1, 48), fillMat);
    group.add(fillMesh);

    const pingMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorRef.current), transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ping = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.16, 32), pingMat);
    ping.rotation.x = -Math.PI / 2;
    group.add(ping);

    // ---- garbage truck (does not rotate with the bin) ----
    const truck = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2f7d5b, metalness: 0.3, roughness: 0.5 });
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x3fae7e, metalness: 0.3, roughness: 0.45 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1b1f24, metalness: 0.2, roughness: 0.8 });
    const container = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.4, 1.5), bodyMat);
    container.position.set(-0.3, 1.0, 0);
    truck.add(container);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.05, 1.4), cabMat);
    cab.position.set(1.25, 0.82, 0);
    truck.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 1.2), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, metalness: 0.4, roughness: 0.2, transparent: true, opacity: 0.7 }));
    glass.position.set(1.74, 1.0, 0);
    truck.add(glass);
    for (const [wx, wz] of [[1.0, 0.8], [1.0, -0.8], [-0.9, 0.8], [-0.9, -0.8]] as const) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 20), wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, 0.34, wz);
      truck.add(w);
    }
    const TRUCK_SCALE = 0.56;
    const TRUCK_Z = 1.9; // in front of the bin, close to camera so it's clearly visible
    truck.scale.setScalar(TRUCK_SCALE);
    truck.visible = false;
    const TRUCK_PARK_X = 1.0; // stops just right of the bin, fully in frame
    const TRUCK_IN_X = 5.5; // enters from off right
    const TRUCK_OUT_X = -6.5; // drives off to the left
    truck.position.set(TRUCK_IN_X, 0, TRUCK_Z);
    scene.add(truck);

    // ---- collection particles (waste lifted into the truck) ----
    const PCOUNT = 16;
    const pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x8a6d4b, roughness: 0.9, transparent: true, opacity: 0 });
    const particles: THREE.Mesh[] = [];
    const pOffset: number[] = [];
    for (let i = 0; i < PCOUNT; i++) {
      const m = new THREE.Mesh(pGeo, pMat.clone());
      m.visible = false;
      scene.add(m);
      particles.push(m);
      pOffset.push(Math.random());
    }

    // collection state machine
    const DUR = { in: 1.2, collect: 1.8, out: 1.5 };
    const TOTAL = DUR.in + DUR.collect + DUR.out;
    let collecting = false;
    let cElapsed = 0;
    let cooldown = 0;
    let prevFull = false;

    let raf = 0;
    let shown = 0;
    let running = true;
    let last = performance.now();
    const onVis = () => {
      running = !document.hidden;
      if (running) {
        last = performance.now();
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    function setFillGeometry(pct: number) {
      const h = Math.max(0.001, (pct / 100) * (BODY_H - 0.25));
      fillMesh.geometry.dispose();
      const rTop = R_BOT + (R_TOP - R_BOT) * ((0.12 + h) / BODY_H);
      fillMesh.geometry = new THREE.CylinderGeometry(rTop - 0.08, R_BOT - 0.05, h, 48);
      fillMesh.position.y = 0.12 + h / 2;
      const col = new THREE.Color(colorRef.current);
      fillMat.color.copy(col);
      fillMat.emissive.copy(col);
      pingMat.color.copy(col);
    }

    function startCollection() {
      collecting = true;
      cElapsed = 0;
      truck.visible = true;
    }

    function updateCollection(dt: number) {
      cElapsed += dt;
      const e = cElapsed;
      let truckX = TRUCK_IN_X;
      let collectAmt = 0; // 0..1 how strongly particles are flowing
      if (e < DUR.in) {
        const t = ease(e / DUR.in);
        truckX = THREE.MathUtils.lerp(TRUCK_IN_X, TRUCK_PARK_X, t);
      } else if (e < DUR.in + DUR.collect) {
        truckX = TRUCK_PARK_X;
        collectAmt = 1;
      } else if (e < TOTAL) {
        const t = ease((e - DUR.in - DUR.collect) / DUR.out);
        truckX = THREE.MathUtils.lerp(TRUCK_PARK_X, TRUCK_OUT_X, t);
      } else {
        collecting = false;
        truck.visible = false;
        for (const m of particles) m.visible = false;
        cooldown = 2.5;
        return;
      }
      truck.position.x = truckX;
      // tiny suspension bob
      truck.position.y = reduce ? 0 : Math.sin(e * 14) * 0.015;

      // particles arc from bin top toward the truck container
      const binTop = new THREE.Vector3(0, BODY_H - 0.3, 0);
      const dest = new THREE.Vector3(truckX - 0.3 * TRUCK_SCALE, 1.05, TRUCK_Z);
      for (let i = 0; i < PCOUNT; i++) {
        const m = particles[i];
        if (collectAmt <= 0) {
          m.visible = false;
          continue;
        }
        const phase = ((e - DUR.in) * 0.9 + pOffset[i]) % 1;
        m.visible = true;
        const p = m.material as THREE.MeshStandardMaterial;
        m.position.lerpVectors(binTop, dest, phase);
        m.position.y += Math.sin(phase * Math.PI) * 1.2; // arc up
        m.position.x += (pOffset[i] - 0.5) * 0.5 * (1 - phase);
        m.rotation.x += 0.2;
        m.rotation.y += 0.15;
        p.opacity = Math.sin(phase * Math.PI) * 0.95;
        const s = 0.6 + (1 - phase) * 0.8;
        m.scale.setScalar(s);
      }
    }

    function tick() {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      const nowT = performance.now();
      const dt = Math.min(0.05, (nowT - last) / 1000);
      last = nowT;

      shown += (targetRef.current - shown) * 0.08;
      if (Math.abs(shown - targetRef.current) < 0.1) shown = targetRef.current;
      setFillGeometry(shown);

      // trigger collection on reaching 100%
      const isFull = onlineRef.current && targetRef.current >= FULL_AT;
      if (cooldown > 0) cooldown -= dt;
      if (isFull && !prevFull && !collecting && cooldown <= 0) startCollection();
      prevFull = isFull;
      if (collecting) updateCollection(dt);

      const h = (shown / 100) * (BODY_H - 0.25);
      const bob = reduce ? 0 : Math.sin(nowT * 0.003) * 0.06;
      ping.position.y = Math.max(0.12 + h + 0.25 + bob, 0.4);
      const ps = reduce ? 1 : 1 + (Math.sin(nowT * 0.003) + 1) * 0.6;
      ping.scale.set(ps, ps, ps);
      pingMat.opacity = onlineRef.current ? 0.55 - (ps - 1) * 0.3 : 0;

      if (!reduce) group.rotation.y += 0.006;
      renderer.render(scene, camera);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
      });
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [size]);

  const collectingNow = online && Math.round(fill) >= FULL_AT;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div ref={mountRef} />
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center gap-1">
        <span className="font-display text-3xl font-extrabold tabular-nums leading-none" style={{ color }}>
          {online ? Math.round(fill) : "--"}
          <span className="text-lg text-ink-2">%</span>
        </span>
        {collectingNow && (
          <span className="rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white" style={{ background: "var(--critical)" }}>
            Collecting…
          </span>
        )}
      </div>
    </div>
  );
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
