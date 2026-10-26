// The starting screen. Replace it, or add scenes alongside it and switch with
// this.game.start(OtherScene).

import * as THREE from 'three';
import { Scene } from '../scene.js';
import { addText } from '../hud.js';
import { themeColor } from '../theme.js';

export class BootScene extends Scene {
  create() {
    // A MeshStandardMaterial with nothing lighting it renders pure black, so
    // every scene needs at least one light. Ambient fills the shadows, the
    // directional gives the shape somewhere to catch.
    this.root.add(new THREE.AmbientLight(0xffffff, 1.2));

    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(3, 6, 4);
    this.root.add(key);

    this.cube = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({
        color: themeColor('--fg'),
        roughness: 0.35,
        metalness: 0.1
      })
    );
    this.root.add(this.cube);

    this.label = addText('Ready to build.', {
      top: 'calc(env(safe-area-inset-top) + 24px)',
      left: '0',
      right: '0',
      textAlign: 'center'
    });
  }

  update(dt) {
    // Multiplied by dt, never by a per-frame constant: the same code has to
    // turn at the same speed on a 60Hz and a 120Hz screen.
    this.cube.rotation.y += dt * 0.8;
    this.cube.rotation.x += dt * 0.3;
  }

  resize(width, height) {
    // Pull the camera back on a narrow panel so the subject still fits.
    this.game.camera.position.z = width < height ? 8 : 6;
  }

  dispose() {
    this.label.remove();
  }
}
