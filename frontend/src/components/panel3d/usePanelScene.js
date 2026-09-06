import { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const PANEL_COLOR = 0xc9cfda;
const BG_COLOR = 0xedeef2;

export function buildPanelGeometry(mesh) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions, 3));
  geom.setIndex(mesh.indices);
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
  return geom;
}

export function usePanelScene(
  canvasRef,
  mesh,
  { interactive = false, autoRotate = true, measureRef = null, unitScale = 1, onMeasure = null } = {}
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mesh) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: !interactive });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (interactive) renderer.setClearColor(BG_COLOR);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3d4652, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(0.3, 0.5, 1);
    camera.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-1, -0.4, -0.6);
    scene.add(fill);

    const geom = buildPanelGeometry(mesh);
    const mat = new THREE.MeshLambertMaterial({ color: PANEL_COLOR, side: THREE.DoubleSide });
    const panel = new THREE.Mesh(geom, mat);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 25), new THREE.LineBasicMaterial({ color: 0x111111 }));
    panel.add(edges);
    scene.add(panel);

    const radius = Math.max(geom.boundingSphere.radius, 0.01);
    const dist = (radius / Math.tan((camera.fov * Math.PI) / 360)) * (interactive ? 1.25 : 1.15);
    camera.near = dist / 100;
    camera.far = dist * 20;
    camera.position.set(dist * 0.55, dist * 0.35, dist * 0.75);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    let controls = null;
    let spinning = autoRotate;
    if (interactive) {
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = dist * 0.3;
      controls.maxDistance = dist * 4;
      controls.addEventListener("start", () => {
        spinning = false;
      });
    }

    // ---- Measurement mode (interactive only) ----
    let measureMode = false;
    let points = [];
    const measureGroup = new THREE.Group();
    scene.add(measureGroup);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const crossR = Math.max(radius * 0.016, 0.002);
    const snapR = Math.max(radius * 0.025, 0.004);
    const crosses = [];

    // Camera-facing cross (two thin perpendicular lines) used as a precise marker
    const makeCross = (color, opacity = 1) => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-crossR, 0, 0), new THREE.Vector3(crossR, 0, 0),
        new THREE.Vector3(0, -crossR, 0), new THREE.Vector3(0, crossR, 0),
      ]);
      const m = new THREE.LineSegments(
        g,
        new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthTest: false })
      );
      m.renderOrder = 10;
      return m;
    };

    const cursor = makeCross(0xff3b30, 0.55);
    cursor.visible = false;
    scene.add(cursor);

    const clearMeasure = () => {
      points = [];
      crosses.length = 0;
      while (measureGroup.children.length) {
        const c = measureGroup.children.pop();
        c.geometry?.dispose();
        c.material?.dispose();
        measureGroup.remove(c);
      }
      onMeasure?.(null);
    };

    const addMarker = (pt) => {
      const c = makeCross(0xff3b30);
      c.position.copy(pt);
      measureGroup.add(c);
      crosses.push(c);
    };

    // Raycast the panel; snap to the nearest vertex of the hit face when close enough
    const pickPoint = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(panel, false)[0];
      if (!hit) return null;
      const pt = hit.point.clone();
      if (!hit.face) return pt;
      const pos = geom.attributes.position;
      let best = null;
      let bestD = snapR;
      for (const idx of [hit.face.a, hit.face.b, hit.face.c]) {
        const v = panel.localToWorld(new THREE.Vector3().fromBufferAttribute(pos, idx));
        const d = v.distanceTo(pt);
        if (d < bestD) {
          bestD = d;
          best = v;
        }
      }
      return best || pt;
    };

    const handleMeasureClick = (clientX, clientY) => {
      const pt = pickPoint(clientX, clientY);
      if (!pt) return;
      if (points.length >= 2) clearMeasure();
      points.push(pt);
      addMarker(pt);
      if (points.length === 2) {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: 0xff3b30, depthTest: false })
        );
        line.renderOrder = 9;
        measureGroup.add(line);
        onMeasure?.({ mm: points[0].distanceTo(points[1]) * unitScale });
      } else {
        onMeasure?.({ mm: null, started: true });
      }
    };

    const onPointerDown = (e) => {
      if (!measureMode) return;
      handleMeasureClick(e.clientX, e.clientY);
    };
    const onPointerMove = (e) => {
      if (!measureMode) return;
      const pt = pickPoint(e.clientX, e.clientY);
      cursor.visible = !!pt;
      if (pt) cursor.position.copy(pt);
    };
    const onPointerLeave = () => {
      cursor.visible = false;
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    if (measureRef) {
      measureRef.current = {
        setMode(on) {
          measureMode = on;
          spinning = false;
          if (controls) {
            controls.enableRotate = !on;
            controls.enablePan = !on;
          }
          if (!on) {
            clearMeasure();
            cursor.visible = false;
          }
        },
        clear: clearMeasure,
      };
    }

    const resize = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const tick = () => {
      if (spinning) panel.rotation.y += 0.012;
      controls?.update();
      cursor.quaternion.copy(camera.quaternion);
      for (const c of crosses) c.quaternion.copy(camera.quaternion);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      if (measureRef) measureRef.current = null;
      clearMeasure();
      cursor.geometry.dispose();
      cursor.material.dispose();
      controls?.dispose();
      geom.dispose();
      edges.geometry.dispose();
      edges.material.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, [canvasRef, mesh, interactive, autoRotate, measureRef, unitScale, onMeasure]);
}
