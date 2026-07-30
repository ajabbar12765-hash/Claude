import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { DESTINATIONS } from '../lib/catalog.js'

// A rotating globe showing where the deals actually are.
//
// It is decoration with a job: every marker is a destination the app watches,
// and the ones lit brightest are the ones with a room inside the budget right
// now. Spinning it is the fastest way to see that the cheap rooms tonight are
// in Karachi and not in Como.
//
// The sphere is drawn from points rather than a photograph of Earth. A texture
// would mean shipping a megabyte of map or fetching one from a CDN that the
// page's own network rules forbid; a Fibonacci lattice of dots costs a few
// kilobytes of arithmetic and reads as a globe immediately. Land is picked out
// by testing each dot against a coarse landmass table, so continents are
// recognisable without any image at all.

// Rough land bounding boxes in degrees: [west, east, south, north]. Deliberately
// coarse — this only has to make the dots read as continents at 400 pixels
// wide, not survive a cartographer.
const LAND = [
  [-168, -52, 25, 72], [-125, -75, 25, 50], [-118, -86, 14, 33], // N America
  [-82, -34, -56, 13], [-70, -35, -34, 5], // S America
  [-18, 52, -35, 37], [-17, 30, 5, 37], [10, 52, -35, 5], // Africa
  [-10, 40, 36, 71], [4, 30, 43, 60], // Europe
  [26, 60, 12, 45], [35, 75, 12, 42], // Middle East
  [60, 100, 6, 38], [70, 90, 8, 30], // South Asia
  [95, 145, 18, 54], [100, 122, 18, 42], // East Asia
  [95, 122, -11, 22], [112, 155, -11, 0], // SE Asia
  [113, 154, -39, -11], [166, 179, -47, -34], // Oceania
  [60, 180, 45, 78], [-180, -160, 60, 72], // Siberia
]

function isLand(lat, lng) {
  for (const [w, e, s, n] of LAND) {
    if (lng >= w && lng <= e && lat >= s && lat <= n) return true
  }
  return false
}

/** Latitude/longitude to a point on a sphere of the given radius. */
function toVector(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

const RADIUS = 1
const DOTS = 7000

function buildDots() {
  // Fibonacci lattice: the cheapest way to scatter points evenly over a sphere
  // without the crowding at the poles that a lat/lng grid produces.
  const golden = Math.PI * (3 - Math.sqrt(5))
  const land = []
  const sea = []

  for (let i = 0; i < DOTS; i++) {
    const y = 1 - (i / (DOTS - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r

    const lat = Math.asin(y) * (180 / Math.PI)
    const lng = Math.atan2(z, x) * (180 / Math.PI)
    ;(isLand(lat, lng) ? land : sea).push(x * RADIUS, y * RADIUS, z * RADIUS)
  }
  return { land, sea }
}

function pointCloud(coords, color, size, opacity) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3))
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color, size, transparent: true, opacity, sizeAttenuation: true })
  )
}

export default function Globe3D({ deals = [], resolved, onPickCity }) {
  const hostRef = useRef(null)
  const stateRef = useRef(null)
  const [ready, setReady] = useState(false)

  // Which destinations have a deal, and which have one inside budget. Recomputed
  // on every render but only read inside the animation loop, so it is held in a
  // ref rather than driving React updates sixty times a second.
  const markerDataRef = useRef({ withDeal: new Set(), inBudget: new Set() })
  const withDeal = new Set()
  const inBudget = new Set()
  for (const d of deals) {
    const id = d.hotel?.destinationId
    if (!id) continue
    withDeal.add(id)
    if (d.withinBudget) inBudget.add(id)
  }
  markerDataRef.current = { withDeal, inBudget }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return // No WebGL — the caller renders nothing and the app is unaffected.
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.z = 3.1

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    host.appendChild(renderer.domElement)

    const globe = new THREE.Group()
    scene.add(globe)

    const { land, sea } = buildDots()
    globe.add(pointCloud(sea, 0x1d4ed8, 0.011, 0.28))
    globe.add(pointCloud(land, 0x60a5fa, 0.017, 0.95))

    // A faintly larger, back-side sphere reads as atmosphere and stops the
    // globe looking like a flat spray of dots.
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.14, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.07,
        side: THREE.BackSide,
      })
    )
    globe.add(halo)

    // One marker per destination, kept in place so the loop can recolour them
    // as deals come and go rather than rebuilding the scene.
    const markerGeometry = new THREE.SphereGeometry(0.018, 12, 12)
    const markers = DESTINATIONS.map((dest) => {
      const material = new THREE.MeshBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.75 })
      const mesh = new THREE.Mesh(markerGeometry, material)
      mesh.position.copy(toVector(dest.lat, dest.lng, RADIUS * 1.01))
      mesh.userData.destinationId = dest.id
      globe.add(mesh)
      return mesh
    })

    // Drag to spin. Pointer events cover mouse and touch in one path, and the
    // globe keeps whatever spin it was given rather than snapping back.
    let dragging = false
    let lastX = 0
    let lastY = 0
    let velocity = reduced ? 0 : 0.0016
    let tiltTarget = 0.28

    const onDown = (e) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      host.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      globe.rotation.y += dx * 0.005
      tiltTarget = Math.max(-0.8, Math.min(0.8, tiltTarget + dy * 0.004))
      velocity = dx * 0.0008
    }
    const onUp = (e) => {
      dragging = false
      host.releasePointerCapture?.(e.pointerId)
    }

    host.addEventListener('pointerdown', onDown)
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerup', onUp)
    host.addEventListener('pointercancel', onUp)

    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    let frame
    const startedAt = performance.now() // THREE.Clock is deprecated, and this is all it did

    const render = () => {
      frame = requestAnimationFrame(render)
      const t = (performance.now() - startedAt) / 1000

      if (!dragging) {
        globe.rotation.y += velocity
        // Ease a flung globe back to a slow idle drift rather than stopping dead.
        velocity += ((reduced ? 0 : 0.0016) - velocity) * 0.02
      }
      globe.rotation.x += (tiltTarget - globe.rotation.x) * 0.08

      const { withDeal: hasDeal, inBudget: cheap } = markerDataRef.current
      for (const marker of markers) {
        const id = marker.userData.destinationId
        if (cheap.has(id)) {
          // Pulsing, so a room that just came inside budget catches the eye.
          const pulse = 0.75 + Math.sin(t * 3 + marker.position.x * 4) * 0.25
          marker.material.color.setHex(0xfacc15)
          marker.material.opacity = pulse
          marker.scale.setScalar(1.5 + pulse * 0.5)
        } else if (hasDeal.has(id)) {
          marker.material.color.setHex(0x38bdf8)
          marker.material.opacity = 0.9
          marker.scale.setScalar(1.15)
        } else {
          marker.material.color.setHex(0x475569)
          marker.material.opacity = 0.6
          marker.scale.setScalar(1)
        }
      }

      renderer.render(scene, camera)
    }
    render()
    setReady(true)

    stateRef.current = { markers, camera, globe }

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerup', onUp)
      host.removeEventListener('pointercancel', onUp)
      // Three.js holds GPU memory that garbage collection cannot reach, so
      // every geometry, material and the context itself are released by hand.
      scene.traverse((object) => {
        object.geometry?.dispose?.()
        if (Array.isArray(object.material)) object.material.forEach((m) => m.dispose())
        else object.material?.dispose?.()
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  // Tapping a lit marker filters to that city — the globe is a control, not a
  // picture. Raycasting happens on click only; doing it per frame would cost
  // more than the whole render.
  const handleClick = (e) => {
    const state = stateRef.current
    if (!state || !onPickCity) return
    const host = hostRef.current
    const rect = host.getBoundingClientRect()
    const pointer = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points.threshold = 0.02
    raycaster.setFromCamera(pointer, state.camera)
    const hit = raycaster.intersectObjects(state.markers)[0]
    if (hit) onPickCity(hit.object.userData.destinationId)
  }

  const lit = markerDataRef.current.inBudget.size

  return (
    <div className="globe">
      <div
        className="globe__canvas"
        ref={hostRef}
        onClick={handleClick}
        role="img"
        aria-label={
          lit
            ? `Globe showing ${lit} destination${lit === 1 ? '' : 's'} with a room inside your budget.`
            : 'Globe showing the destinations being watched for deals.'
        }
      />
      {ready && (
        <div className="globe__legend">
          <span><i className="globe__dot globe__dot--budget" /> In budget</span>
          <span><i className="globe__dot globe__dot--deal" /> Has deals</span>
          <span className="globe__hint">Drag to spin · tap a marker</span>
        </div>
      )}
    </div>
  )
}
