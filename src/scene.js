// The unit of structure, and the scene manager that runs one at a time.
//
// Three.js has no scene lifecycle of its own — it gives you a scene graph and
// a render call, and nothing that says when to build, update or tear down. This
// is that missing piece, kept deliberately small.

import * as THREE from 'three';

/// One screen of the game: a menu, a level, a game-over card.
///
/// Subclass it in src/scenes/ and override what you need. `this.root` is a
/// THREE.Scene — add your objects to it and the manager renders it for you.
export class Scene {
  constructor(game) {
    this.game = game;
    this.root = new THREE.Scene();
  }

  /// Build the world. Called once, before the first frame.
  create() {}

  /// Advance the game. `dt` is seconds since the last frame, already capped.
  update(dt) {}

  /// The panel changed size. The camera has already been updated.
  resize(width, height) {}

  /// Release anything create() allocated outside the scene graph — timers,
  /// listeners, HUD elements. Geometries, materials and textures inside
  /// `this.root` are disposed for you.
  dispose() {}
}

/// Owns the renderer, the camera and the frame loop, and runs one Scene.
export class SceneManager {
  constructor(renderer, camera, stage) {
    this.renderer = renderer;
    this.camera = camera;
    this.stage = stage;
    this.clock = new THREE.Clock();
    this.scene = null;

    // The panel is a phone-shaped viewport whose size is not fixed and can
    // change while the game runs, so the canvas follows the element rather
    // than the window.
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(stage);
  }

  /// Replaces the running scene. Pass the class, not an instance.
  start(SceneClass, ...args) {
    if (this.scene) {
      this.scene.dispose();
      disposeSceneGraph(this.scene.root);
    }
    this.scene = new SceneClass(this, ...args);
    this.scene.create();
    this.resize();
    return this.scene;
  }

  resize() {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    if (width === 0 || height === 0) return;

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Without this the new aspect never reaches the projection matrix and the
    // picture stays stretched.
    this.camera.updateProjectionMatrix();
    if (this.scene) this.scene.resize(width, height);
  }

  run() {
    // setAnimationLoop rather than requestAnimationFrame: it pauses when the
    // page is hidden, which rAF does not reliably do in a web view.
    this.renderer.setAnimationLoop(() => {
      // Capped because a backgrounded tab returns one enormous delta, and
      // anything integrating against it teleports through the world.
      const dt = Math.min(this.clock.getDelta(), 0.1);
      if (this.scene) {
        this.scene.update(dt);
        this.renderer.render(this.scene.root, this.camera);
      }
    });
  }
}

/// Frees the GPU memory behind a scene graph.
///
/// Removing a mesh from a scene does not release its geometry or its material —
/// those live on until disposed, and a game that restarts a few times without
/// this will run the device out of memory.
export function disposeSceneGraph(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();

    const materials = Array.isArray(object.material)
      ? object.material
      : object.material ? [object.material] : [];

    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value && value.isTexture) value.dispose();
      }
      material.dispose();
    }
  });
  root.clear();
}
