// The game itself: web-swinging down an endless avenue of skyscrapers.
//
// Hold anywhere on the canvas to shoot a web at the nearest building on that
// side of the street; the rope reels in and swings you. Release to fly on
// momentum. Touch the street and the run is over.

import * as THREE from 'three';
import { Scene } from '../scene.js';
import { addText, addButton, clearHUD } from '../hud.js';
import { haptic } from '../haptics.js';
import * as city from '../city.js';
import { createHero, updateHeroPose } from '../hero.js';

const GRAVITY = 30;
const REEL = 6;          // rope reel-in, m/s
const MIN_ROPE = 8;
const SPEED_MAX = 58;
const WALL_X = 13;       // the avenue's soft walls — the building faces

const UP = new THREE.Vector3(0, 1, 0);
const _to = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _hand = new THREE.Vector3();

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class CityScene extends Scene {
  create() {
    city.resetShared();
    const rng = this.rng = mulberry32((Date.now() * 2654435761) >>> 0);

    city.buildSky(this.root);
    this.sun = city.addLights(this.root);
    this.ground = city.buildGround(this.root);
    this.env = city.buildEnvironment(this.root);

    // avenue chunks, recycled as the hero flies down the street
    this.chunks = [];
    for (let i = 0; i < city.CHUNK_COUNT; i++) {
      const chunk = city.makeChunk(rng);
      chunk.position.z = 40 - i * city.CHUNK_SPACING;
      this.root.add(chunk);
      this.chunks.push(chunk);
    }

    // score orbs strung out ahead along the avenue
    this.orbGeo = new THREE.SphereGeometry(0.9, 14, 12);
    this.orbMat = new THREE.MeshStandardMaterial({
      color: 0xffc23d, metalness: 0.8, roughness: 0.25,
      envMapIntensity: 1.2, emissive: 0x7a5200, emissiveIntensity: 0.5
    });
    this.orbFront = -50;
    this.orbCount = 0;
    this.lastOrb = -1;
    this.orbs = [];
    for (let i = 0; i < 14; i++) {
      const orb = new THREE.Mesh(this.orbGeo, this.orbMat);
      this.placeOrb(orb);
      this.root.add(orb);
      this.orbs.push(orb);
    }

    // hero, mid-air over the avenue
    this.hero = createHero();
    this.hero.root.position.set(0, 34, 0);
    this.hero.root.rotation.y = Math.PI;
    this.root.add(this.hero.root);
    this.vel = new THREE.Vector3(0, -2, -14);
    this.webSide = 1;

    // the web line
    this.webbed = false;
    this.anchor = new THREE.Vector3();
    this.ropeLen = 0;
    this.web = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.web.visible = false;
    this.root.add(this.web);

    this.distance = 0;
    this.score = 0;

    // HUD
    this.scoreEl = addText('0', {
      left: '0', right: '0', top: 'calc(env(safe-area-inset-top) + 12px)',
      textAlign: 'center', fontSize: '30px', fontWeight: '800',
      color: '#123a6d', textShadow: '0 1px 0 rgba(255,255,255,0.6)'
    });
    this.orbEl = addText('0 ORBS', {
      left: '0', right: '0', top: 'calc(env(safe-area-inset-top) + 48px)',
      textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#3c5a80'
    });
    this.hintEl = addText('HOLD TO SHOOT A WEB', {
      left: '0', right: '0', bottom: 'calc(env(safe-area-inset-bottom) + 90px)',
      textAlign: 'center', fontSize: '15px', fontWeight: '700',
      color: '#123a6d', textShadow: '0 1px 0 rgba(255,255,255,0.6)'
    });
    this.hintEl.style.transition = 'opacity 0.6s';

    // input: hold anywhere on the canvas to web up, release to fly
    this.pointers = new Set();
    this.onDown = (e) => {
      this.pointers.add(e.pointerId);
      if (this.state !== 'play') return;
      this.shootWeb(e.clientX < window.innerWidth / 2 ? -1 : 1);
      this.hintEl.style.opacity = '0';
    };
    this.onUp = (e) => {
      this.pointers.delete(e.pointerId);
      if (!this.pointers.size) this.releaseWeb();
    };
    this.canvas = this.game.renderer.domElement;
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);

    this.state = 'play';
    this.t = 0;
    this.game.camera.position.set(0, 37, 12);
    _lookAt.set(0, 34, -5);
  }

  placeOrb(orb) {
    this.orbFront -= 22 + this.rng() * 18;
    orb.position.set((this.rng() * 2 - 1) * 8, 9 + this.rng() * 17, this.orbFront);
  }

  shootWeb(side) {
    if (this.webbed) return;
    const p = this.hero.root.position;
    const targetZ = p.z - 26;
    let best = null, bestZ = 0, bestD = Infinity;
    for (const c of this.chunks) {
      const info = side < 0 ? c.userData.left : c.userData.right;
      if (!info || info.h < 20) continue;
      const dz = Math.abs(c.position.z - targetZ);
      if (dz < bestD && c.position.z < p.z + 5) {
        bestD = dz; best = info; bestZ = c.position.z;
      }
    }
    if (!best) return;
    this.anchor.set(
      side * (city.AVENUE_FACE + 0.1),
      Math.min(Math.max(p.y + 11, 10), best.h - 4),
      Math.max(bestZ - best.zHalf + 2, Math.min(targetZ, bestZ + best.zHalf - 2))
    );
    this.ropeLen = Math.max(MIN_ROPE, p.distanceTo(this.anchor) * 0.92);
    this.webbed = true;
    this.webSide = side;
    this.web.visible = true;
    haptic('web-shot');
  }

  releaseWeb() {
    if (!this.webbed) return;
    this.webbed = false;
    this.web.visible = false;
    this.vel.z -= 2.5;
    this.vel.y += 1.5;
    haptic('web-release');
  }

  gameOver() {
    this.state = 'over';
    this.webbed = false;
    this.web.visible = false;
    haptic('crash');

    const card = document.createElement('div');
    Object.assign(card.style, {
      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
      background: 'rgba(10, 25, 50, 0.88)', color: '#fff', borderRadius: '20px',
      padding: '28px 34px', textAlign: 'center',
      boxShadow: '0 12px 40px rgba(0,0,0,0.35)'
    });
    card.innerHTML =
      `<div style="font-size:26px;font-weight:800">WRECKED!</div>` +
      `<div style="margin-top:10px;font-size:15px;opacity:.85">` +
      `Score ${this.score} · ${Math.floor(this.distance)} m · ${this.orbCount} orbs</div>`;
    document.getElementById('hud').appendChild(card);

    const btn = addButton({
      icon: 'rotate-ccw', label: 'Restart',
      onPress: () => this.game.start(CityScene)
    });
    btn.style.marginTop = '18px';
    card.appendChild(btn);
  }

  update(dt) {
    this.t += dt;
    const p = this.hero.root.position;

    if (this.state === 'play') {
      // physics: gravity, drag, rope constraint while webbed
      this.vel.y -= GRAVITY * dt;
      this.vel.multiplyScalar(Math.max(0, 1 - (this.webbed ? 0.06 : 0.02) * dt));
      if (!this.webbed && this.vel.z > -13) this.vel.z -= 5 * dt;
      p.addScaledVector(this.vel, dt);
      if (this.webbed) {
        _to.subVectors(p, this.anchor);
        const len = _to.length();
        if (len > this.ropeLen) {
          _dir.copy(_to).divideScalar(len);
          p.copy(this.anchor).addScaledVector(_dir, this.ropeLen);
          const radial = this.vel.dot(_dir);
          if (radial > 0) this.vel.addScaledVector(_dir, -radial);
        }
        this.ropeLen = Math.max(MIN_ROPE, this.ropeLen - REEL * dt);
      }
      const sp = this.vel.length();
      if (sp > SPEED_MAX) this.vel.multiplyScalar(SPEED_MAX / sp);
      if (Math.abs(p.x) > WALL_X) {
        p.x = WALL_X * Math.sign(p.x);
        this.vel.x *= -0.4;
      }
      if (p.y > 150) { p.y = 150; this.vel.y = Math.min(this.vel.y, 0); }
      if (p.y <= 0.9) this.gameOver();

      this.distance = Math.max(this.distance, Math.floor(-p.z));

      // orbs: spin, collect, recycle ahead
      for (const orb of this.orbs) {
        orb.rotation.y += dt * 2;
        if (this.state === 'play' && orb.position.distanceToSquared(p) < 7) {
          this.orbCount++;
          haptic('orb-collect');
          this.placeOrb(orb);
        } else if (orb.position.z > p.z + 14) {
          this.placeOrb(orb);
        }
      }

      // recycle avenue chunks once they fall behind
      for (const c of this.chunks) {
        if (c.position.z > p.z + 90) c.position.z -= city.CHUNK_COUNT * city.CHUNK_SPACING;
      }
    }

    // pose and orientation
    const pose = this.state !== 'play' ? 'fall' : (this.webbed ? 'swing' : 'fall');
    updateHeroPose(this.hero, pose, this.webSide, dt);
    if (this.state === 'play') {
      this.hero.root.rotation.y = Math.atan2(-this.vel.x, -this.vel.z);
      this.hero.root.rotation.z = THREE.MathUtils.clamp(-this.vel.x * 0.02, -0.5, 0.5);
      this.hero.root.rotation.x = THREE.MathUtils.clamp(-this.vel.y * 0.012, -0.5, 0.5);
    }

    // web line from the holding hand to the anchor
    if (this.webbed) {
      (this.webSide < 0 ? this.hero.handL : this.hero.handR).getWorldPosition(_hand);
      _to.subVectors(this.anchor, _hand);
      const len = Math.max(_to.length(), 0.01);
      _dir.copy(_to).divideScalar(len);
      this.web.position.copy(_hand).addScaledVector(_dir, len / 2);
      this.web.quaternion.setFromUnitVectors(UP, _dir);
      this.web.scale.set(1, len, 1);
    }

    // chase camera, easing with speed
    const speed = this.vel.length();
    _desired.set(p.x * 0.55, Math.max(p.y + 3.4, 2), p.z + 9 + Math.min(speed, 40) * 0.06);
    this.game.camera.position.lerp(_desired, 1 - Math.exp(-4 * dt));
    _lookAt.lerp(_desired.set(p.x, p.y + 1.6, p.z - 5), 1 - Math.exp(-6 * dt));
    this.game.camera.lookAt(_lookAt);

    // the street and the backdrop follow the run down the avenue
    city.updateGround(this.ground, p.z);
    this.env.position.z = p.z;
    this.env.userData.update(dt);
    this.sun.position.set(p.x + 45, 95, p.z + 35);
    this.sun.target.position.copy(p);

    // HUD
    if (this.state === 'play') {
      if (this.orbCount !== this.lastOrb) {
        this.lastOrb = this.orbCount;
        this.orbEl.textContent = `${this.orbCount} ORBS`;
      }
      const score = this.distance + this.orbCount * 5;
      if (score !== this.score) {
        this.score = score;
        this.scoreEl.textContent = String(score);
      }
    }
  }

  resize(width, height) {
    const cam = this.game.camera;
    const aspect = width / height;
    cam.fov = aspect < 0.75 ? 78 : aspect < 1.2 ? 70 : 62;
    cam.updateProjectionMatrix();
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    clearHUD();
  }
}