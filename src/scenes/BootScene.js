// The title screen: a quiet street canyon with the hero waiting on the sidewalk.

import * as THREE from 'three';
import { Scene } from '../scene.js';
import { addText, addButton, clearHUD } from '../hud.js';
import * as city from '../city.js';
import { CityScene } from './CityScene.js';
import { createHero, updateHeroPose } from '../hero.js';

export class BootScene extends Scene {
  create() {
    city.resetShared();
    city.buildSky(this.root);
    city.addLights(this.root);
    this.root.add(city.buildGround(this.root));
    this.root.add(city.buildEnvironment(this.root));

    for (let i = 0; i < 4; i++) {
      const chunk = city.makeChunk(Math.random);
      chunk.position.z = 14 - i * city.CHUNK_SPACING;
      this.root.add(chunk);
    }

    this.hero = createHero();
    this.hero.root.position.set(2.6, 0.3, 7);
    this.hero.root.rotation.y = Math.PI - 0.4;
    this.root.add(this.hero.root);

    this.t = 0;

    this.title = addText('ALLEY AVENGER', {
      left: '0', right: '0', top: 'calc(env(safe-area-inset-top) + 40px)',
      textAlign: 'center', fontSize: '34px', fontWeight: '800',
      letterSpacing: '2px', color: '#123a6d', textShadow: '0 2px 0 rgba(255,255,255,0.55)'
    });
    this.sub = addText('Hold to web up · release to swing', {
      left: '0', right: '0', top: 'calc(env(safe-area-inset-top) + 86px)',
      textAlign: 'center', fontSize: '15px', fontWeight: '600', color: '#33567d'
    });
    addButton({
      icon: 'play', label: 'Play',
      onPress: () => this.game.start(CityScene),
      style: {
        position: 'absolute',
        left: '50%', marginLeft: '-36px',
        bottom: 'calc(env(safe-area-inset-bottom) + 64px)',
        width: '72px', height: '72px',
        backgroundColor: 'rgba(18, 58, 109, 0.85)'
      }
    });
  }

  update(dt) {
    this.t += dt;
    this.hero.root.rotation.y = Math.PI - 0.4 + Math.sin(this.t * 0.6) * 0.35;
    this.hero.root.position.y = 0.3 + Math.abs(Math.sin(this.t * 2.2)) * 0.05;
    updateHeroPose(this.hero, 'idle', 1, dt);

    const cam = this.game.camera;
    cam.position.set(6.5 + Math.sin(this.t * 0.3) * 0.6, 2.6, 13.5);
    cam.lookAt(2.6, 1.3, 7);
  }

  resize() {}

  dispose() {
    clearHUD();
  }
}