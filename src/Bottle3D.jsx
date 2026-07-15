import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Draws the bottle's label as a texture so the 3D model carries the brand.
function makeLabelTexture() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#faf7f0';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(46, 92, 64, 0.35)';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, c.width - 48, c.height - 48);
  ctx.fillStyle = '#1f3d2b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 150px Cormorant Garamond, Georgia, serif';
  ctx.fillText('FreshLeaf', c.width / 2, c.height / 2 - 40);
  ctx.font = '300 52px Inter, sans-serif';
  ctx.fillStyle = '#55655c';
  const sub = 'R O O M   S P R A Y';
  ctx.fillText(sub, c.width / 2, c.height / 2 + 110);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, 'rgba(31, 61, 43, 0.45)');
  g.addColorStop(1, 'rgba(31, 61, 43, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export default function Bottle3D() {
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      if (!renderer.getContext()) throw new Error('no webgl');
    } catch {
      setFailed(true);
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const smallScreen = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.55, 8.2);
    camera.lookAt(0, 0.15, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const key = new THREE.DirectionalLight(0xfff8ec, 1.4);
    key.position.set(4, 6, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xcfe8d6, 1.1);
    rim.position.set(-5, 3, -4);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const group = new THREE.Group();
    scene.add(group);

    const dispose = [];
    const track = (obj) => { dispose.push(obj); return obj; };

    const glass = track(new THREE.MeshPhysicalMaterial({
      color: 0x5d8f70,
      metalness: 0,
      roughness: 0.22,
      transmission: 0.35,
      thickness: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }));
    const capMat = track(new THREE.MeshStandardMaterial({ color: 0x152b1e, metalness: 0.35, roughness: 0.42 }));
    const labelMat = track(new THREE.MeshStandardMaterial({ map: track(makeLabelTexture()), roughness: 0.55 }));

    const add = (geo, mat, y = 0, sx = 1, sy = 1, sz = 1) => {
      const m = new THREE.Mesh(track(geo), mat);
      m.position.y = y;
      m.scale.set(sx, sy, sz);
      group.add(m);
      return m;
    };

    // bottle body + shoulder + neck
    add(new THREE.CylinderGeometry(0.74, 0.8, 2.35, 64), glass, -0.05);
    add(new THREE.SphereGeometry(0.74, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), glass, 1.12, 1, 0.62, 1);
    add(new THREE.CylinderGeometry(0.23, 0.23, 0.34, 32), glass, 1.62);

    // cap + nozzle
    add(new THREE.CylinderGeometry(0.31, 0.33, 0.6, 48), capMat, 2.02);
    add(new THREE.SphereGeometry(0.31, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), capMat, 2.3, 1, 0.5, 1);
    const nozzle = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.14, 0.2)), capMat);
    nozzle.position.set(0, 2.22, 0.26);
    group.add(nozzle);

    // label band (rotated so the brand faces the camera)
    const label = add(new THREE.CylinderGeometry(0.765, 0.795, 1.15, 64, 1, true), labelMat, -0.18);
    label.rotation.y = Math.PI;

    // soft contact shadow
    const shadow = new THREE.Mesh(
      track(new THREE.CircleGeometry(1.6, 48)),
      track(new THREE.MeshBasicMaterial({ map: track(makeShadowTexture()), transparent: true, depthWrite: false }))
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.42;
    scene.add(shadow);

    // gentle mist particles
    const COUNT = 46;
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4.4;
      positions[i * 3 + 1] = Math.random() * 4 - 1.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
      speeds[i] = 0.0025 + Math.random() * 0.005;
    }
    const pGeo = track(new THREE.BufferGeometry());
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      pGeo,
      track(new THREE.PointsMaterial({ color: 0xdce8df, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false }))
    );
    scene.add(points);

    // interaction: drag to spin, gentle idle rotation otherwise
    let targetVel = 0;
    let dragging = false;
    let lastX = 0;
    const el = renderer.domElement;
    el.style.touchAction = 'pan-y';
    el.style.cursor = 'grab';

    const onDown = (e) => { dragging = true; lastX = e.clientX; el.style.cursor = 'grabbing'; };
    const onMove = (e) => {
      if (!dragging) return;
      targetVel = (e.clientX - lastX) * 0.006;
      lastX = e.clientX;
      if (reduced) render();
    };
    const onUp = () => { dragging = false; el.style.cursor = 'grab'; };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    function resize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(() => { resize(); if (reduced) render(); });
    ro.observe(mount);
    resize();

    let raf = 0;
    let running = true;
    const clock = new THREE.Clock();

    function render() {
      renderer.render(scene, camera);
    }

    function tick() {
      if (!running) return;
      const t = clock.getElapsedTime();
      // ease drag velocity back to idle spin
      targetVel *= 0.94;
      group.rotation.y += 0.0035 + targetVel;
      group.position.y = Math.sin(t * 1.1) * 0.07;
      group.rotation.z = Math.sin(t * 0.6) * 0.02;
      const pos = pGeo.attributes.position;
      for (let i = 0; i < COUNT; i++) {
        let y = pos.getY(i) + speeds[i];
        if (y > 2.8) y = -1.4;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.6 + i) * 0.0006);
      }
      pos.needsUpdate = true;
      render();
      raf = requestAnimationFrame(tick);
    }

    // pause offscreen / reduced motion renders a single elegant frame
    const io = new IntersectionObserver(([entry]) => {
      if (reduced) return;
      if (entry.isIntersecting && !running) {
        running = true;
        clock.start();
        tick();
      } else if (!entry.isIntersecting) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(mount);

    if (reduced) {
      group.rotation.y = -0.4;
      render();
      running = false;
    } else {
      tick();
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dispose.forEach((d) => d.dispose && d.dispose());
      pmrem.dispose();
      renderer.dispose();
      if (el.parentNode === mount) mount.removeChild(el);
    };
  }, []);

  if (failed) {
    return (
      <div className="bottle-stage bottle-fallback" aria-hidden="true">
        <svg viewBox="0 0 32 32" className="leaf-mark">
          <path
            d="M26 4C14 4 5 12 5 24c0 1.7.3 3.1.7 4C7 21 12 14 21 10c-7 5-11.5 12-13 17.5 1.2.4 2.6.5 4 .5C24 28 28 15 26 4z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  return <div className="bottle-stage" ref={mountRef} aria-label="3D FreshLeaf room spray bottle — drag to rotate" />;
}
