// The city: detailed skyscrapers with real facades, ledges, rooftops and street
// furniture, all built from primitives and small canvas textures. Shared
// geometries and materials are cached per scene — call resetShared() at the top
// of a scene's create(), because leaving a scene disposes everything it drew
// with, and a stale cache would hand back dead GPU resources.

import * as THREE from 'three';
import {
  glassTexture, brickTexture, concreteTexture, stoneTexture, lowriseTexture,
  roofTexture, asphaltTexture, sidewalkTexture, skyTexture, cloudTexture,
  signTexture, doorTexture, trafficTexture, skylineTexture
} from './textures.js';

export const CHUNK_SPACING = 48;
export const CHUNK_COUNT = 7;
export const AVENUE_FACE = 15;

let S = null;

export function resetShared() { S = null; }

function shared() {
  if (S) return S;

  const asphaltTex = asphaltTexture();
  asphaltTex.repeat.set(1, 240);
  const walkTopTex = sidewalkTexture();
  walkTopTex.repeat.set(1, 480);
  const roofTex = roofTexture();
  roofTex.repeat.set(3, 3);
  const skylineTex = skylineTexture();

  const std = (opts) => new THREE.MeshStandardMaterial(opts);

  S = {
    geo: {
      box: new THREE.BoxGeometry(1, 1, 1),
      cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
      sphere: new THREE.SphereGeometry(0.5, 12, 10),
      cone: new THREE.ConeGeometry(0.5, 1, 10),
      road: new THREE.PlaneGeometry(18, 2400),
      walk: new THREE.BoxGeometry(5.6, 0.3, 2400),
      base: new THREE.PlaneGeometry(420, 2400),
      sign: new THREE.PlaneGeometry(1.8, 0.6)
    },
    tex: { asphalt: asphaltTex, walkTop: walkTopTex },
    mat: {
      roof: std({ map: roofTex, roughness: 0.95 }),
      ledge: std({ color: 0xb8b2a4, roughness: 0.9 }),
      metalDark: std({ color: 0x3a4048, roughness: 0.6, metalness: 0.5 }),
      metalLight: std({ color: 0x9aa2ab, roughness: 0.35, metalness: 0.7 }),
      pole: std({ color: 0x4a525c, roughness: 0.5, metalness: 0.6 }),
      lamp: std({ color: 0xd8dde2, roughness: 0.5 }),
      carGlass: std({ color: 0x1c2a38, roughness: 0.15, metalness: 0.8, envMapIntensity: 1.2 }),
      tyre: std({ color: 0x22252a, roughness: 0.9 }),
      carPaints: [0xb3282d, 0x2b4f9e, 0xc7ccd1, 0xe8e8e4].map((c) =>
        std({ color: c, roughness: 0.35, metalness: 0.35, envMapIntensity: 0.8 })
      ).concat([std({ color: 0xf2b705, roughness: 0.4, metalness: 0.2 })]),
      wood: std({ color: 0x8a5a34, roughness: 0.9 }),
      leaf: std({ color: 0x3f7d3a, roughness: 0.95 }),
      base: std({ color: 0x84898f, roughness: 0.95 }),
      asphalt: std({ map: asphaltTex, roughness: 0.95 }),
      walkTop: std({ map: walkTopTex, roughness: 0.9 }),
      walkSide: std({ color: 0xa8abb0, roughness: 0.9 }),
      door: std({ map: doorTexture(), roughness: 0.7 }),
      sign: std({ map: signTexture(), roughness: 0.6, side: THREE.DoubleSide }),
      trafficHead: std({ map: trafficTexture(), roughness: 0.5 }),
      skyline: new THREE.MeshBasicMaterial({ map: skylineTex }),
      cloud: new THREE.SpriteMaterial({
        map: cloudTexture(), transparent: true, opacity: 0.85,
        depthWrite: false, fog: false
      })
    }
  };
  return S;
}

/// Clones a facade texture with its own tiling repeat and wraps it in a material.
function facade(tex, rx, ry, opts) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(Math.max(0.5, rx), Math.max(0.5, ry));
  return new THREE.MeshStandardMaterial(opts);
}

function boxMesh(s, mat, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(s.geo.box, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

function cylMesh(s, mat, r, hgt, x, y, z) {
  const m = new THREE.Mesh(s.geo.cyl, mat);
  m.scale.set(r, hgt, r);
  m.position.set(x, y, z);
  return m;
}

/// Sky background + environment reflections + atmospheric fog.
export function buildSky(root) {
  const sky = skyTexture();
  sky.mapping = THREE.EquirectangularReflectionMapping;
  root.background = sky;
  root.environment = sky;
  root.environmentIntensity = 0.55;
  root.fog = new THREE.Fog(0xcfe3f5, 120, 380);
}

/// One ambient fill + one shadow-casting sun. Position the sun each frame
/// against the player (it follows the hero in CityScene).
export function addLights(root) {
  root.add(new THREE.AmbientLight(0xdfeaff, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -55;
  sun.shadow.camera.right = 55;
  sun.shadow.camera.top = 55;
  sun.shadow.camera.bottom = -55;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 300;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.05;
  sun.shadow.camera.updateProjectionMatrix();
  root.add(sun, sun.target);
  return sun;
}

/// The street: asphalt with baked lane markings, sidewalks, and the ground
/// under the building plots. Follows the player along z with texture offsets
/// compensating, so the lane dashes stay fixed to the world.
export function buildGround(root) {
  const s = shared();
  const g = new THREE.Group();

  const road = new THREE.Mesh(s.geo.road, s.mat.asphalt);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  g.add(road);

  const walkMats = [s.mat.walkSide, s.mat.walkSide, s.mat.walkTop, s.mat.walkSide, s.mat.walkSide, s.mat.walkSide];
  for (const x of [-11.8, 11.8]) {
    const walk = new THREE.Mesh(s.geo.walk, walkMats);
    walk.position.set(x, 0.15, 0);
    walk.receiveShadow = true;
    g.add(walk);
  }

  const base = new THREE.Mesh(s.geo.base, s.mat.base);
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.02;
  base.receiveShadow = true;
  g.add(base);

  g.userData.texAsphalt = s.tex.asphalt;
  g.userData.texWalk = s.tex.walkTop;
  root.add(g);
  return g;
}

export function updateGround(g, heroZ) {
  g.position.z = heroZ;
  g.userData.texAsphalt.offset.y = -((heroZ / 10) % 1);
  g.userData.texWalk.offset.y = -((heroZ / 5) % 1);
}

/// Distant skyline ring (one InstancedMesh) and billboarded clouds, grouped so
/// the whole backdrop can follow the player along the avenue.
export function buildEnvironment(root) {
  const s = shared();
  const env = new THREE.Group();

  const skyline = new THREE.InstancedMesh(s.geo.box, s.mat.skyline, 90);
  skyline.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const col = new THREE.Color();
  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 240 + Math.random() * 100;
    const h = 45 + Math.random() * 110;
    pos.set(Math.cos(angle) * r, h / 2 - 4, Math.sin(angle) * r);
    scl.set(18 + Math.random() * 30, h, 18 + Math.random() * 30);
    m.compose(pos, q, scl);
    skyline.setMatrixAt(i, m);
    col.setHSL(0.58, 0.12, 0.5 + Math.random() * 0.25);
    skyline.setColorAt(i, col);
  }
  skyline.instanceColor.needsUpdate = true;
  env.add(skyline);

  const clouds = [];
  for (let i = 0; i < 12; i++) {
    const sprite = new THREE.Sprite(s.mat.cloud);
    const w = 80 + Math.random() * 80;
    sprite.scale.set(w, w * 0.4, 1);
    sprite.position.set(
      (Math.random() * 2 - 1) * 300,
      100 + Math.random() * 90,
      (Math.random() * 2 - 1) * 400
    );
    env.add(sprite);
    clouds.push({ sprite, drift: 0.5 + Math.random() });
  }
  env.userData.update = (dt) => {
    for (const c of clouds) {
      c.sprite.position.x += c.drift * dt * 2;
      if (c.sprite.position.x > 340) c.sprite.position.x = -340;
    }
  };

  root.add(env);
  return env;
}

/// One building of a rolled kind. Returns info used by the web-targeting.
function addBuilding(parent, rng, side) {
  const s = shared();
  const r = rng();
  const kind = r < 0.3 ? 'glass' : r < 0.6 ? 'brick' : r < 0.85 ? 'office' : 'lowrise';
  const w = kind === 'lowrise' ? 12 + rng() * 4 : 14 + rng() * 6;
  const d = 16 + rng() * 8;
  const h = kind === 'glass' ? 55 + rng() * 40
    : kind === 'brick' ? 34 + rng() * 36
    : kind === 'office' ? 40 + rng() * 40
    : 11 + rng() * 7;

  const g = new THREE.Group();
  g.position.set(side * (AVENUE_FACE + w / 2), 0, 0);

  // Facade materials: the ±x faces look at the avenue, so they carry the
  // "front" texture; the ±z faces get plain stone on brick/low-rise.
  let matX, matZ;
  if (kind === 'glass') {
    const tex = glassTexture();
    matX = facade(tex, Math.round(d / 3) / 2, Math.round(h / 3.2) / 2,
      { roughness: 0.18, metalness: 0.75, envMapIntensity: 1.15 });
    matZ = facade(tex, Math.round(w / 3) / 2, Math.round(h / 3.2) / 2,
      { roughness: 0.18, metalness: 0.75, envMapIntensity: 1.15 });
  } else if (kind === 'brick') {
    const tex = brickTexture();
    matX = facade(tex, Math.round(d / 4), Math.round(h / 3.5), { roughness: 0.9 });
    matZ = facade(tex, Math.round(w / 4), Math.round(h / 3.5), { roughness: 0.9 });
  } else if (kind === 'office') {
    const tex = concreteTexture();
    matX = facade(tex, Math.round(d / 4.2), Math.round(h / 3.6),
      { roughness: 0.5, metalness: 0.1, envMapIntensity: 0.5 });
    matZ = facade(tex, Math.round(w / 4.2), Math.round(h / 3.6),
      { roughness: 0.5, metalness: 0.1, envMapIntensity: 0.5 });
  } else {
    matX = facade(lowriseTexture(), Math.max(1, Math.round(d / 12)), 1, { roughness: 0.8 });
    matZ = facade(stoneTexture(), Math.round(w / 3), Math.round(h / 3), { roughness: 0.9 });
  }

  const body = new THREE.Mesh(s.geo.box, [matX, matX, s.mat.roof, s.mat.roof, matZ, matZ]);
  body.scale.set(w, h, d);
  body.position.y = h / 2;
  g.add(body);

  // ledges: a heavy base course and a cornice at the roofline
  g.add(boxMesh(s, s.mat.ledge, w + 1.2, 0.9, d + 1.2, 0, 0.45, 0));
  g.add(boxMesh(s, s.mat.ledge, w + 0.8, 0.5, d + 0.8, 0, h - 0.25, 0));

  // ground-floor entrance door facing the avenue
  const door = boxMesh(s, s.mat.door, 0.3, 3.2, 2.4, -side * (w / 2 + 0.16), 1.6, 3);
  door.rotation.y = Math.PI / 2;
  g.add(door);

  if (kind === 'glass') {
    g.add(boxMesh(s, s.mat.ledge, 4, 2.6, 5, (rng() - 0.5) * (w - 8), h + 1.3, (rng() - 0.5) * (d - 8)));
    g.add(cylMesh(s, s.mat.metalLight, 0.12, 7, w * 0.2, h + 3.5, d * 0.2));
  } else if (kind === 'office') {
    g.add(boxMesh(s, s.mat.metalLight, 2.2, 1.1, 2.2, -w * 0.2, h + 0.55, -d * 0.2));
    g.add(boxMesh(s, s.mat.metalLight, 2.2, 1.1, 2.2, w * 0.25, h + 0.55, d * 0.2));
    const dish = cylMesh(s, s.mat.metalLight, 2.0, 0.22, 0, h + 0.9, 0);
    dish.rotation.x = -0.5;
    g.add(dish);
    // protruding balcony bands with railings
    for (const fy of [0.35, 0.5, 0.65]) {
      const y = h * fy;
      g.add(boxMesh(s, s.mat.ledge, 0.8, 0.25, w * 0.55, -side * (w / 2 + 0.4), y, 0));
      g.add(boxMesh(s, s.mat.metalDark, 0.06, 0.7, w * 0.55, -side * (w / 2 + 0.78), y + 0.45, 0));
    }
  } else if (kind === 'brick') {
    // rooftop water tower
    g.add(boxMesh(s, s.mat.metalDark, 2.6, 1.2, 2.6, 0, h + 0.6, 0));
    g.add(cylMesh(s, s.mat.wood, 2.4, 2.4, 0, h + 2.4, 0));
    const roof = new THREE.Mesh(s.geo.cone, s.mat.roof);
    roof.scale.set(2.6, 1.3, 2.6);
    roof.position.set(0, h + 4.1, 0);
    g.add(roof);
    g.add(boxMesh(s, s.mat.metalLight, 1.6, 0.9, 1.6, w * 0.3, h + 0.45, -d * 0.25));
    // zigzag fire escape on the avenue face
    for (let i = 0; i < 4; i++) {
      const y = h * (0.3 + i * 0.15);
      g.add(boxMesh(s, s.mat.metalDark, 0.7, 0.1, 4.5, -side * (w / 2 + 0.35), y, i % 2 ? 2.2 : -2.2));
    }
  } else {
    // low-rise: roof-top AC boxes and shop awnings over the storefront
    g.add(boxMesh(s, s.mat.metalLight, 1.8, 0.9, 1.8, -w * 0.2, h + 0.45, -d * 0.2));
    g.add(boxMesh(s, s.mat.metalLight, 1.4, 0.8, 1.4, w * 0.25, h + 0.4, d * 0.25));
    for (const z of [-4, 3]) {
      g.add(boxMesh(s, s.mat.ledge, 0.9, 0.16, 2.8, -side * (w / 2 + 0.5), 3.35, z));
    }
  }

  g.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  parent.add(g);

  return { h, zHalf: d / 2 };
}

function makeStreetlight(s, side) {
  const g = new THREE.Group();
  g.add(cylMesh(s, s.mat.pole, 0.16, 7.2, 0, 3.6, 0));
  g.add(boxMesh(s, s.mat.pole, 1.7, 0.14, 0.14, 0.75, 7.0, 0));
  g.add(boxMesh(s, s.mat.lamp, 0.7, 0.16, 0.32, 1.5, 6.9, 0));
  // arm reaches toward the avenue
  g.rotation.y = side < 0 ? 0 : Math.PI;
  return g;
}

function makeTree(s, rng) {
  const g = new THREE.Group();
  g.add(cylMesh(s, s.mat.wood, 0.22, 1.6, 0, 0.8, 0));
  const canopy = new THREE.Mesh(s.geo.sphere, s.mat.leaf);
  canopy.scale.set(2.2, 2.6, 2.2);
  canopy.position.y = 2.6;
  g.add(canopy);
  const k = 0.85 + rng() * 0.5;
  g.scale.set(k, k, k);
  g.rotation.y = rng() * Math.PI * 2;
  return g;
}

function makeCar(s, rng) {
  const g = new THREE.Group();
  const taxi = rng() < 0.2;
  const paint = taxi ? s.mat.carPaints[4] : s.mat.carPaints[Math.floor(rng() * 4)];

  g.add(boxMesh(s, paint, 1.85, 0.62, 4.3, 0, 0.6, 0));
  g.add(boxMesh(s, s.mat.carGlass, 1.65, 0.55, 2.2, 0, 1.18, -0.25));
  for (const wx of [-0.83, 0.83]) for (const wz of [-1.45, 1.45]) {
    const wheel = new THREE.Mesh(s.geo.cyl, s.mat.tyre);
    wheel.scale.set(0.55, 0.28, 0.55);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.3, wz);
    g.add(wheel);
  }
  if (taxi) g.add(boxMesh(s, s.mat.lamp, 0.55, 0.22, 0.95, 0, 1.56, -0.25));
  return g;
}

function makeTrafficLight(s, side) {
  const g = new THREE.Group();
  g.add(cylMesh(s, s.mat.pole, 0.18, 5, 0, 2.5, 0));
  g.add(boxMesh(s, s.mat.pole, 1.4, 0.14, 0.14, 0.6, 4.9, 0));
  g.add(boxMesh(s, s.mat.trafficHead, 0.36, 1.1, 0.42, 1.25, 4.75, 0));
  // arm reaches toward the avenue
  g.rotation.y = side < 0 ? 0 : Math.PI;
  return g;
}

function makeSign(s, rng) {
  const g = new THREE.Group();
  g.add(cylMesh(s, s.mat.pole, 0.08, 2.8, 0, 1.4, 0));
  const board = new THREE.Mesh(s.geo.sign, s.mat.sign);
  board.position.y = 2.6;
  g.add(board);
  g.rotation.y = rng() * Math.PI;
  return g;
}

/// One stretch of the avenue: a building on each side plus street furniture.
/// The scene recycles chunks by sliding them forward when they fall behind.
export function makeChunk(rng) {
  const s = shared();
  const chunk = new THREE.Group();
  chunk.userData.left = addBuilding(chunk, rng, -1);
  chunk.userData.right = addBuilding(chunk, rng, 1);

  const lights = new THREE.Group();
  const l1 = makeStreetlight(s, -1); l1.position.set(-10.6, 0, -8);
  const l2 = makeStreetlight(s, 1); l2.position.set(10.6, 0, 8);
  lights.add(l1, l2);

  const trees = new THREE.Group();
  for (const side of rng() < 0.5 ? [-1, 1] : [1, -1]) {
    const tree = makeTree(s, rng);
    tree.position.set(side * 13.2, 0.28, (rng() * 2 - 1) * 16);
    trees.add(tree);
  }

  const cars = new THREE.Group();
  const carCount = 1 + (rng() < 0.5 ? 1 : 0);
  for (let i = 0; i < carCount; i++) {
    const car = makeCar(s, rng);
    car.position.set((rng() < 0.5 ? -7.6 : 7.6), 0, (rng() * 2 - 1) * 16);
    car.rotation.y = rng() < 0.5 ? 0 : Math.PI;
    cars.add(car);
  }

  chunk.add(lights, trees, cars);
  if (rng() < 0.5) {
    const tl = makeTrafficLight(s, rng() < 0.5 ? -1 : 1);
    tl.position.set((tl.rotation.y === 0 ? -1 : 1) * 11.2, 0, 14);
    chunk.add(tl);
  }
  if (rng() < 0.6) {
    const sign = makeSign(s, rng);
    sign.position.set((rng() < 0.5 ? -1 : 1) * 12.5, 0.28, (rng() * 2 - 1) * 14);
    chunk.add(sign);
  }

  chunk.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return chunk;
}