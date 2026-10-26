// The hero: a red-and-blue spider suit built from primitives, with a painted
// web pattern and big white lenses, plus a small pose system — fall, swing and
// idle — blended toward target joint angles every frame.

import * as THREE from 'three';
import { webTexture } from './textures.js';

function capsule(r, l, mat) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), mat);
}

// Joint angle targets, radians. Arm groups hang downward at rest, so rotating
// z toward ±PI raises a hand overhead; x pitches limbs forward and back.
const POSES = {
  idle: {
    armL: { x: 0.05, z: 0.14 }, armR: { x: 0.05, z: -0.14 },
    elbL: { x: 0.2 }, elbR: { x: 0.2 },
    legL: { x: 0, z: 0.06 }, legR: { x: 0, z: -0.06 },
    kneeL: { x: 0.08 }, kneeR: { x: 0.08 },
    spine: { x: 0.04 }
  },
  fall: {
    armL: { x: -0.5, z: 1.75 }, armR: { x: -0.5, z: -1.75 },
    elbL: { x: 0.6 }, elbR: { x: 0.6 },
    legL: { x: -0.35, z: 0.22 }, legR: { x: -0.35, z: -0.22 },
    kneeL: { x: 0.75 }, kneeR: { x: 0.75 },
    spine: { x: -0.18 }
  },
  swingL: { // left hand holding the web
    armL: { x: 0, z: 2.95 }, armR: { x: 0.4, z: -1.05 },
    elbL: { x: 0.1 }, elbR: { x: 0.9 },
    legL: { x: 0.75, z: 0.1 }, legR: { x: 0.95, z: -0.14 },
    kneeL: { x: 1.2 }, kneeR: { x: 1.35 },
    spine: { x: 0.12 }
  },
  swingR: { // right hand holding the web
    armR: { x: 0, z: -2.95 }, armL: { x: 0.4, z: 1.05 },
    elbR: { x: 0.1 }, elbL: { x: 0.9 },
    legR: { x: 0.75, z: -0.1 }, legL: { x: 0.95, z: 0.14 },
    kneeR: { x: 1.2 }, kneeL: { x: 1.35 },
    spine: { x: 0.12 }
  }
};

export function createHero() {
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';

  const red = new THREE.MeshStandardMaterial({ map: webTexture(), roughness: 0.5, metalness: 0.05 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x1e4bb8, roughness: 0.55 });
  const lens = new THREE.MeshStandardMaterial({
    color: 0xf4f8ff, roughness: 0.2, metalness: 0.2,
    emissive: 0x445566, emissiveIntensity: 0.35
  });

  const spine = new THREE.Group();
  spine.position.y = 1.02;
  root.add(spine);

  const torso = capsule(0.17, 0.32, red);
  torso.position.y = 0.28;
  torso.scale.z = 0.8;
  spine.add(torso);

  const hips = capsule(0.125, 0.08, blue);
  hips.scale.z = 0.85;
  spine.add(hips);

  const headG = new THREE.Group();
  headG.position.y = 0.6;
  spine.add(headG);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), red);
  head.scale.set(1, 1.1, 0.95);
  head.position.y = 0.1;
  headG.add(head);

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lens);
    eye.scale.set(1.2, 0.75, 0.4);
    eye.position.set(s * 0.06, 0.12, -0.11);
    eye.rotation.y = s * 0.4;
    headG.add(eye);
  }

  function arm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.21, 0.48, 0);
    spine.add(shoulder);
    const upper = capsule(0.055, 0.22, blue);
    upper.position.y = -0.15;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.31;
    shoulder.add(elbow);
    const fore = capsule(0.05, 0.2, red);
    fore.position.y = -0.13;
    elbow.add(fore);
    const hand = new THREE.Object3D();
    hand.position.y = -0.29;
    elbow.add(hand);
    return { shoulder, elbow, hand };
  }

  function leg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.095, 0.9, 0);
    root.add(hip);
    const thigh = capsule(0.07, 0.28, blue);
    thigh.position.y = -0.19;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.4;
    hip.add(knee);
    const shin = capsule(0.06, 0.26, red);
    shin.position.y = -0.17;
    knee.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.22), red);
    foot.position.set(0, -0.35, -0.05);
    knee.add(foot);
    return { hip, knee };
  }

  const L = arm(1), R = arm(-1), LL = leg(1), RR = leg(-1);
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  return {
    root, spine, headG,
    armL: L.shoulder, armR: R.shoulder, elbL: L.elbow, elbR: R.elbow,
    handL: L.hand, handR: R.hand,
    legL: LL.hip, legR: RR.hip, kneeL: LL.knee, kneeR: RR.knee
  };
}

export function updateHeroPose(hero, state, webSide, dt) {
  const key = state === 'swing' ? (webSide < 0 ? 'swingR' : 'swingL') : state;
  const pose = POSES[key] || POSES.idle;
  const k = 1 - Math.exp(-9 * dt);
  for (const [name, target] of Object.entries(pose)) {
    const joint = hero[name];
    if (!joint) continue;
    if (target.x !== undefined) joint.rotation.x += (target.x - joint.rotation.x) * k;
    if (target.z !== undefined) joint.rotation.z += (target.z - joint.rotation.z) * k;
  }
}