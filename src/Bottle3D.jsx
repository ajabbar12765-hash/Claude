import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

// Citrus Fresh label: lemon-yellow band with a white panel, matching the
// real product photography.
function makeLabelTexture() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1024;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, '#f7d95e');
  bg.addColorStop(0.5, '#fbe98c');
  bg.addColorStop(1, '#f4cf4e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);

  // abstract lemons + leaves scattered over the band
  for (let i = 0; i < 42; i++) {
    const x = (i * 197) % c.width;
    const y = (i * 271) % c.height;
    const r = 46 + (i % 4) * 14;
    ctx.fillStyle = i % 3 === 0 ? '#f3c22e' : '#f9e06a';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.78, (i % 6) * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.55, r * 0.42, (i % 6) * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7da85c';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.8, y - r * 0.6, r * 0.34, r * 0.14, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // white panel, centred on the face the camera sees
  const pw = 640;
  const ph = 780;
  const px = (c.width - pw) / 2;
  const py = (c.height - ph) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 18);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = c.width / 2;
  ctx.fillStyle = '#1f3d2b';
  ctx.font = '600 92px Cormorant Garamond, Georgia, serif';
  ctx.fillText('freshleaf', cx, py + 130);
  ctx.strokeStyle = 'rgba(31, 61, 43, 0.25)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 200, py + 195);
  ctx.lineTo(cx + 200, py + 195);
  ctx.stroke();
  ctx.fillStyle = '#c47c2b';
  ctx.font = '700 110px Inter, sans-serif';
  ctx.fillText('CITRUS', cx, py + 330);
  ctx.fillText('FRESH', cx, py + 450);
  ctx.fillStyle = '#55655c';
  ctx.font = '400 40px Inter, sans-serif';
  ctx.fillText('R O O M   A N D   L I N E N   S P R A Y', cx, py + 560);
  ctx.font = '300 38px Inter, sans-serif';
  ctx.fillText('2 5 0 M L', cx, py + 690);

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

// Subtle micro-imperfections (smudges, fingerprints, dust) so the gloss
// isn't a perfect mirror — this is what sells "real plastic" vs "CGI".
function makeSmudgeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d2d2d2';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 46 + 5;
    const a = Math.random() * 0.13;
    const light = Math.random() > 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, light ? `rgba(255,255,255,${a})` : `rgba(40,40,40,${a})`);
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  return tex;
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
    renderer.toneMappingExposure = 1.12;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.8, 9.4);
    camera.lookAt(0, 0.55, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;

    const key = new THREE.DirectionalLight(0xfff8ec, 1.35);
    key.position.set(4, 6, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xcfe8d6, 1.1);
    rim.position.set(-5, 3, -4);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.28));

    // Soft rectangular studio light — casts the long, gentle vertical
    // highlight you see on real glossy product bottles.
    RectAreaLightUniformsLib.init();
    const softbox = new THREE.RectAreaLight(0xffffff, 2.6, 3.2, 6.5);
    softbox.position.set(-2.6, 2.4, 4.2);
    softbox.lookAt(0, 0.4, 0);
    scene.add(softbox);
    const softbox2 = new THREE.RectAreaLight(0xdff0e4, 1.4, 2.4, 5);
    softbox2.position.set(3.4, 1.6, 2.2);
    softbox2.lookAt(0, 0.5, 0);
    scene.add(softbox2);

    const group = new THREE.Group();
    scene.add(group);

    const dispose = [];
    const track = (obj) => { dispose.push(obj); return obj; };

    // glossy black PET bottle + matte black sprayer, like the real product
    const smudge = track(makeSmudgeTexture());
    const bottleMat = track(new THREE.MeshPhysicalMaterial({
      color: 0x0a0c0a,
      metalness: 0.0,
      roughness: 0.3,
      roughnessMap: smudge,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      clearcoatRoughnessMap: smudge,
      ior: 1.5,
      reflectivity: 0.55,
    }));
    bottleMat.envMapIntensity = 1.1;
    const sprayerMat = track(new THREE.MeshPhysicalMaterial({
      color: 0x0d0d0d,
      metalness: 0.0,
      roughness: 0.6,
      roughnessMap: smudge,
      clearcoat: 0.45,
      clearcoatRoughness: 0.35,
    }));
    sprayerMat.envMapIntensity = 0.85;
    const labelMat = track(new THREE.MeshPhysicalMaterial({
      map: track(makeLabelTexture()),
      roughness: 0.42,
      clearcoat: 0.4,
      clearcoatRoughness: 0.28,
    }));
    labelMat.envMapIntensity = 0.9;

    const add = (geo, mat, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(track(geo), mat);
      m.position.set(x, y, z);
      group.add(m);
      return m;
    };

    // slim tall bottle body
    add(new THREE.CylinderGeometry(0.55, 0.58, 3.1, 64), bottleMat, 0, -0.3);
    const shoulder = add(new THREE.SphereGeometry(0.55, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), bottleMat, 0, 1.25);
    shoulder.scale.set(1, 0.5, 1);
    add(new THREE.CylinderGeometry(0.2, 0.24, 0.35, 32), bottleMat, 0, 1.55);

    // trigger sprayer: collar, pump body, head arm, nozzle, trigger blade
    // (rounded boxes so the moulded plastic parts don't look like hard cubes)
    add(new THREE.CylinderGeometry(0.26, 0.27, 0.32, 48), sprayerMat, 0, 1.83);
    add(new RoundedBoxGeometry(0.3, 0.55, 0.38, 5, 0.07), sprayerMat, 0, 2.2);
    const headArm = add(new RoundedBoxGeometry(0.3, 0.3, 1.15, 5, 0.08), sprayerMat, 0, 2.55, 0.18);
    headArm.rotation.x = -0.06;
    const nozzle = add(new THREE.CylinderGeometry(0.075, 0.09, 0.16, 32), sprayerMat, 0, 2.52, 0.78);
    nozzle.rotation.x = Math.PI / 2;
    const tail = add(new RoundedBoxGeometry(0.26, 0.42, 0.3, 5, 0.07), sprayerMat, 0, 2.4, -0.42);
    tail.rotation.x = 0.35;
    const trigger = add(new RoundedBoxGeometry(0.12, 0.75, 0.14, 4, 0.045), sprayerMat, 0, 2.05, 0.52);
    trigger.rotation.x = -0.35;

    // citrus label band (rotated so the panel faces the camera)
    const label = add(new THREE.CylinderGeometry(0.565, 0.585, 1.9, 64, 1, true), labelMat, 0, -0.45);
    label.rotation.y = Math.PI;

    // soft contact shadow
    const shadow = new THREE.Mesh(
      track(new THREE.CircleGeometry(1.5, 48)),
      track(new THREE.MeshBasicMaterial({ map: track(makeShadowTexture()), transparent: true, depthWrite: false }))
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.95;
    scene.add(shadow);

    // gentle mist particles
    const COUNT = 46;
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4.4;
      positions[i * 3 + 1] = Math.random() * 4.6 - 1.9;
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
        if (y > 2.9) y = -1.9;
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

  return <div className="bottle-stage" ref={mountRef} aria-label="3D FreshLeaf Citrus Fresh spray bottle — drag to rotate" />;
}
