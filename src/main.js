// Entry point: the renderer, the camera and the frame loop, and nothing else.
// Gameplay lives in scenes under src/scenes/.

import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { BootScene } from './scenes/BootScene.js';
import { registerIcons } from './icons.js';

registerIcons(['play', 'rotate-ccw']);

const stage = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});

// Phones report a device pixel ratio of 3, which means rendering nine times the
// pixels for a difference nobody can see and a frame rate everybody can.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Day-light look: filmic tone mapping keeps the bright sky and sunlit facades
// from clipping, and soft shadow maps carry the sun.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

stage.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 900);
camera.position.set(0, 3, 7);
camera.lookAt(0, 0, 0);

// On window so the running game can be inspected from outside the module graph.
window.game = new SceneManager(renderer, camera, stage);
window.game.start(BootScene);
window.game.run();