import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const PART_NAMES = {
  pack: "Plate pack — 용접 전열판 다발",
  column: "Column / girder — 모서리 기둥",
  comb: "Comb / liner — 판 끝 이빨",
  head: "Head — 상·하부 고정 덮개",
  panel: "Panel — 볼트 덮개 (탄소강)",
  gasket: "Panel gasket — 외부 밀봉 4장",
  baffle: "Baffle — 패스 가로막",
  nozzle: "Nozzle flange — panel에 용접",
  bolt: "Panel bolt",
  foot: "Support / foot",
  lug: "Lifting lug (head 전용)",
};

function mat(opts) {
  return new THREE.MeshStandardMaterial({
    color: opts.color,
    map: opts.map ?? null,
    metalness: opts.metalness ?? 0.12,
    roughness: opts.roughness ?? 0.48,
    envMapIntensity: opts.envMapIntensity ?? 0.9,
    side: opts.side ?? THREE.FrontSide,
    polygonOffset: !!opts.polygonOffset,
    polygonOffsetFactor: opts.polygonOffset ? 1 : 0,
  });
}

function chevronMap() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#d5dce2";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#8b959e";
  g.lineWidth = 2.4;
  for (let y = -48; y < 320; y += 22) {
    g.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const yy = y + ((x / 16) % 2 === 0 ? 0 : 11);
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.repeat.set(4, 8);
  return tex;
}

function tag(obj, part) {
  obj.userData.part = part;
  obj.traverse((o) => {
    if (o.isMesh) o.userData.part = part;
  });
  return obj;
}

function box(w, h, d, material, part, r = 0.006) {
  const geom = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w, h, d) * 0.45) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geom, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return tag(m, part);
}

function makeFlange(dn, od, length = 0.145) {
  const g = new THREE.Group();
  const paint = mat({ color: 0x8b949c, metalness: 0.08, roughness: 0.46 });
  const face = mat({ color: 0xc5ccd3, metalness: 0.62, roughness: 0.28 });
  const dark = mat({ color: 0x3a4046, metalness: 0.4, roughness: 0.55 });
  const hubLen = length * 0.7;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(dn / 2 + 0.02, dn / 2 + 0.034, hubLen, 32), paint);
  hub.position.y = hubLen / 2;
  hub.castShadow = true;
  const discT = 0.034;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(od / 2, od / 2, discT, 48), paint);
  disc.position.y = hubLen + discT / 2;
  disc.castShadow = true;
  const rf = new THREE.Mesh(new THREE.CylinderGeometry(dn / 2 + 0.022, dn / 2 + 0.022, 0.005, 40), face);
  rf.position.y = hubLen + discT + 0.002;
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(dn / 2, dn / 2, length + 0.05, 24), dark);
  bore.position.y = length * 0.45;
  g.add(hub, disc, rf, bore);
  const nBolt = od > 0.22 ? 12 : od > 0.14 ? 8 : 4;
  const boltR = od * 0.41;
  const hex = new THREE.CylinderGeometry(0.01, 0.01, 0.018, 6);
  const shank = new THREE.CylinderGeometry(0.006, 0.006, 0.038, 8);
  const boltMat = mat({ color: 0x4e555c, metalness: 0.55, roughness: 0.38 });
  for (let i = 0; i < nBolt; i++) {
    const a = (i / nBolt) * Math.PI * 2 + Math.PI / nBolt;
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(hex, boltMat), new THREE.Mesh(shank, boltMat));
    grp.children[1].position.y = -0.02;
    grp.position.set(Math.cos(a) * boltR, hubLen + discT * 0.15, Math.sin(a) * boltR);
    g.add(grp);
  }
  g.rotation.x = Math.PI / 2;
  return tag(g, "nozzle");
}

function addBoltRing(parent, w, h, inset, material, z) {
  const dummy = new THREE.Object3D();
  const geom = new THREE.CylinderGeometry(0.013, 0.013, 0.012, 6);
  const mesh = new THREE.InstancedMesh(geom, material, 220);
  mesh.castShadow = true;
  mesh.userData.part = "bolt";
  let i = 0;
  const pitch = 0.058;
  const nx = Math.max(5, Math.round((w - 2 * inset) / pitch));
  const ny = Math.max(6, Math.round((h - 2 * inset) / pitch));
  const xs = [];
  const ys = [];
  for (let k = 0; k <= nx; k++) xs.push(-w / 2 + inset + (k * (w - 2 * inset)) / nx);
  for (let k = 0; k <= ny; k++) ys.push(-h / 2 + inset + (k * (h - 2 * inset)) / ny);
  const pts = [];
  xs.forEach((x) => {
    pts.push([x, -h / 2 + inset], [x, h / 2 - inset]);
  });
  ys.forEach((y) => {
    pts.push([-w / 2 + inset, y], [w / 2 - inset, y]);
  });
  pts.forEach(([x, y]) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(Math.PI / 2, 0, Math.PI / 6);
    dummy.updateMatrix();
    mesh.setMatrixAt(i++, dummy.matrix);
  });
  mesh.count = i;
  parent.add(mesh);
}

export async function initBloc3D(host) {
  if (!host || host.dataset.ready === "1") return;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth || 800, host.clientHeight || 520);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.localClippingEnabled = true;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15181e);

  const camera = new THREE.PerspectiveCamera(36, (host.clientWidth || 800) / (host.clientHeight || 520), 0.05, 30);
  camera.position.set(1.72, 1.12, 1.78);
  camera.lookAt(0, 0.58, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.56, 0);
  controls.maxDistance = 6;
  controls.minDistance = 0.8;
  controls.update();

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  const key = new THREE.DirectionalLight(0xfff3e4, 2.35);
  key.position.set(2.6, 3.4, 1.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.camera.left = -2.4;
  key.shadow.camera.right = 2.4;
  key.shadow.camera.top = 2.4;
  key.shadow.camera.bottom = -2.4;
  scene.add(key);
  scene.add(new THREE.DirectionalLight(0x9eb6cc, 0.7).translateX(-2.2).translateY(1.4).translateZ(-1.6));
  scene.add(new THREE.HemisphereLight(0xd5e2ee, 0x2c3036, 0.62));

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 64),
    mat({ color: 0x1c2128, metalness: 0.05, roughness: 0.92 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(3.2, 16, 0x3d4650, 0x262c34);
  grid.position.y = 0.002;
  scene.add(grid);

  const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.02);
  const mats = {
    panel: mat({ color: 0x6e7c89, metalness: 0.06, roughness: 0.52 }),
    frame: mat({ color: 0x4d565e, metalness: 0.08, roughness: 0.5 }),
    ss: mat({ color: 0xcfd6dc, metalness: 0.72, roughness: 0.28 }),
    ssPlate: mat({ color: 0xc8d0d6, metalness: 0.58, roughness: 0.34, map: chevronMap() }),
    gasket: mat({ color: 0x1a1a1a, metalness: 0.04, roughness: 0.78 }),
    comb: mat({ color: 0xb8c3b0, metalness: 0.55, roughness: 0.35 }),
    baffle: mat({ color: 0xa8b3bc, metalness: 0.55, roughness: 0.38 }),
    bolt: mat({ color: 0x3f464d, metalness: 0.45, roughness: 0.4 }),
  };

  const PACK = 0.52;
  const PACK_H = 0.9;
  const COL = 0.1;
  const HEAD_T = 0.082;
  const PANEL_T = 0.056;
  const y0 = HEAD_T;
  const yMid = y0 + PACK_H / 2;
  const outer = PACK + COL * 2;

  const root = new THREE.Group();
  scene.add(root);
  const moving = {};

  const head = box(outer, HEAD_T, outer, mats.frame, "head", 0.01);
  head.position.y = HEAD_T / 2;
  root.add(head);
  const top = box(outer, HEAD_T, outer, mats.frame, "head", 0.01);
  top.position.y = y0 + PACK_H + HEAD_T / 2;
  root.add(top);

  const colPos = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  colPos.forEach(([sx, sz]) => {
    const col = box(COL, PACK_H, COL, mats.frame, "column", 0.008);
    col.position.set(sx * (PACK / 2 + COL / 2), yMid, sz * (PACK / 2 + COL / 2));
    root.add(col);
    const fx = box(COL * 0.92, PACK_H, 0.02, mats.frame, "column", 0.003);
    fx.position.set(sx * (PACK / 2 + 0.01), yMid, sz * (PACK / 2 + COL / 2));
    root.add(fx);
    const fz = box(0.02, PACK_H, COL * 0.92, mats.frame, "column", 0.003);
    fz.position.set(sx * (PACK / 2 + COL / 2), yMid, sz * (PACK / 2 + 0.01));
    root.add(fz);
  });

  const packGroup = new THREE.Group();
  packGroup.position.y = yMid;
  const nPlate = 80;
  const plateT = PACK_H / nPlate;
  const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(PACK, plateT * 0.82, PACK), mats.ssPlate, nPlate);
  plates.castShadow = true;
  plates.userData.part = "pack";
  const dummy = new THREE.Object3D();
  for (let i = 0; i < nPlate; i++) {
    dummy.position.set(0, -PACK_H / 2 + plateT * (i + 0.5), 0);
    dummy.updateMatrix();
    plates.setMatrixAt(i, dummy.matrix);
    plates.setColorAt(i, new THREE.Color(i % 2 ? 0xdbe1e6 : 0xb7c0c8));
  }
  if (plates.instanceColor) plates.instanceColor.needsUpdate = true;
  packGroup.add(plates);
  root.add(packGroup);
  moving.pack = packGroup;

  const toothG = new THREE.BoxGeometry(0.011, 0.011, 0.02);
  const nTooth = 52;
  const combs = new THREE.InstancedMesh(toothG, mats.comb, nTooth * 8);
  combs.userData.part = "comb";
  combs.castShadow = true;
  let ti = 0;
  const combDummy = new THREE.Object3D();
  colPos.forEach(([sx, sz]) => {
    for (const axis of ["x", "z"]) {
      for (let t = 0; t < nTooth; t++) {
        const y = y0 + (t + 0.5) * (PACK_H / nTooth);
        combDummy.rotation.set(0, 0, 0);
        if (axis === "x") {
          combDummy.position.set(sx * (PACK / 2 + 0.007), y, sz * (PACK / 2 - 0.035));
        } else {
          combDummy.rotation.y = Math.PI / 2;
          combDummy.position.set(sx * (PACK / 2 - 0.035), y, sz * (PACK / 2 + 0.007));
        }
        combDummy.updateMatrix();
        combs.setMatrixAt(ti++, combDummy.matrix);
      }
    }
  });
  combs.count = ti;
  root.add(combs);

  function makeBaffles(axis) {
    const g = new THREE.Group();
    const count = 5;
    for (let i = 0; i < count; i++) {
      const b = box(PACK * 0.9, 0.005, 0.1, mats.baffle, "baffle", 0);
      b.position.y = y0 + 0.11 + i * ((PACK_H - 0.22) / (count - 1));
      if (axis === "z") b.position.z = PACK / 2 - 0.018;
      else {
        b.rotation.y = Math.PI / 2;
        b.position.x = PACK / 2 - 0.018;
      }
      g.add(b);
    }
    return g;
  }
  const baffZ = makeBaffles("z");
  const baffZ2 = makeBaffles("z");
  baffZ2.children.forEach((c) => {
    c.position.z *= -1;
  });
  const baffX = makeBaffles("x");
  const baffX2 = makeBaffles("x");
  baffX2.children.forEach((c) => {
    c.position.x *= -1;
  });
  root.add(baffZ, baffZ2, baffX, baffX2);
  moving.baffles = [baffZ, baffZ2, baffX, baffX2];

  function makePanel(normal, nozzles) {
    const g = new THREE.Group();
    const w = PACK + COL * 1.62;
    const h = PACK_H + HEAD_T * 1.15;
    const body = box(w, h, PANEL_T, mats.panel, "panel", 0.005);
    body.position.z = PANEL_T / 2;
    g.add(body);
    const liner = box(PACK * 0.96, PACK_H * 0.96, 0.008, mats.ss, "panel", 0);
    liner.position.z = -0.003;
    g.add(liner);
    const gasket = box(w * 0.9, h * 0.9, 0.005, mats.gasket, "gasket", 0);
    gasket.position.z = 0.002;
    g.add(gasket);
    addBoltRing(g, w, h, 0.032, mats.bolt, PANEL_T + 0.007);
    nozzles.forEach((spec) => {
      const fl = spec.small ? makeFlange(0.036, 0.11, 0.09) : makeFlange(0.154, 0.28, 0.18);
      fl.position.set(spec.x, spec.y, PANEL_T);
      g.add(fl);
    });
    const n = new THREE.Vector3(...normal);
    g.position.set(n.x * (outer / 2), yMid, n.z * (outer / 2));
    if (Math.abs(n.x) > 0.5) g.rotation.y = n.x > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (n.z < -0.5) g.rotation.y = Math.PI;
    g.userData.normal = n.clone();
    g.userData.home = g.position.clone();
    return g;
  }

  const panelZ = makePanel([0, 0, 1], [
    { x: 0, y: 0.26 },
    { x: 0, y: -0.26 },
    { x: 0.2, y: 0.4, small: true },
    { x: -0.2, y: -0.4, small: true },
  ]);
  const panelZn = makePanel([0, 0, -1], [
    { x: 0.15, y: 0.3 },
    { x: -0.15, y: -0.3 },
    { x: 0.2, y: 0.4, small: true },
  ]);
  const panelX = makePanel([1, 0, 0], [
    { x: 0, y: 0.26 },
    { x: 0, y: -0.26 },
    { x: 0.2, y: 0.4, small: true },
    { x: -0.2, y: -0.4, small: true },
  ]);
  const panelXn = makePanel([-1, 0, 0], [
    { x: 0.15, y: 0.3 },
    { x: -0.15, y: -0.3 },
    { x: 0.2, y: 0.4, small: true },
  ]);
  root.add(panelZ, panelZn, panelX, panelXn);
  moving.panels = [panelZ, panelZn, panelX, panelXn];

  const plate = box(0.17, 0.1, 0.004, mats.ss, "panel", 0);
  plate.position.set(0.12, yMid + 0.08, outer / 2 + PANEL_T + 0.003);
  root.add(plate);

  colPos.forEach(([sx, sz]) => {
    const post = box(0.08, 0.055, 0.08, mats.frame, "foot", 0.004);
    post.position.set(sx * (outer / 2 - 0.07), 0.01, sz * (outer / 2 - 0.07));
    const pad = box(0.16, 0.018, 0.16, mats.frame, "foot", 0.004);
    pad.position.set(sx * (outer / 2 - 0.04), -0.01, sz * (outer / 2 - 0.04));
    root.add(post, pad);
    const lug = box(0.036, 0.07, 0.016, mats.frame, "lug", 0.002);
    const ly = y0 + PACK_H + HEAD_T + 0.028;
    lug.position.set(sx * (outer / 2 - 0.09), ly, sz * (outer / 2 - 0.09));
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.005, 8, 18), mats.frame);
    eye.position.set(lug.position.x, ly + 0.038, lug.position.z);
    eye.castShadow = true;
    tag(eye, "lug");
    root.add(lug, eye);
  });

  let explode = 0;
  let cutaway = false;

  function applyPose() {
    const d = explode * 0.48;
    moving.panels.forEach((p) => {
      const n = p.userData.normal;
      p.position.copy(p.userData.home).addScaledVector(n, d);
      p.visible = !(cutaway && n.x > 0.5);
    });
    moving.baffles.forEach((g, i) => {
      const dir = i < 2 ? new THREE.Vector3(0, 0, i === 0 ? 1 : -1) : new THREE.Vector3(i === 2 ? 1 : -1, 0, 0);
      g.position.copy(dir.multiplyScalar(d * 0.38));
    });
    const planes = cutaway ? [clipPlane] : [];
    clipPlane.constant = 0.04;
    Object.values(mats).forEach((m) => {
      m.clippingPlanes = planes;
      m.clipShadows = cutaway;
      m.needsUpdate = true;
    });
  }
  applyPose();

  const partLabel = document.getElementById("bloc-part");
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener("pointerdown", (ev) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
    const hits = ray.intersectObjects(root.children, true);
    if (!hits.length) return;
    let o = hits[0].object;
    while (o && !o.userData.part) o = o.parent;
    const key = o?.userData.part;
    if (partLabel && key) partLabel.textContent = PART_NAMES[key] || key;
  });

  const explodeInput = document.getElementById("bloc-explode");
  explodeInput?.addEventListener("input", () => {
    explode = Number(explodeInput.value) / 100;
    applyPose();
  });
  host.closest(".viewer3d")?.querySelectorAll("[data-bloc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-bloc");
      if (mode === "assembled") {
        explode = 0;
        cutaway = false;
      } else if (mode === "exploded") {
        explode = 1;
        cutaway = false;
      } else if (mode === "cutaway") {
        cutaway = true;
        explode = 0.18;
      }
      if (explodeInput) explodeInput.value = String(Math.round(explode * 100));
      applyPose();
    });
  });

  const onResize = () => {
    if (!host.clientWidth) return;
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
  };
  new ResizeObserver(onResize).observe(host);

  const tick = () => {
    requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  };
  tick();
  host.dataset.ready = "1";
  return { resize: onResize };
}
