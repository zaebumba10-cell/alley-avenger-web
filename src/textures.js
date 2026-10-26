// Every surface the game shows is painted here, into small canvases, and turned
// into THREE textures: building facades, brick, concrete, asphalt, the sky,
// clouds, street signage and the hero's web pattern. All sizes are power-of-two
// so the browser can mipmap them.

import * as THREE from 'three';

function makeTexture(w, h, draw, repeat) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  if (repeat) texture.repeat.set(repeat[0], repeat[1]);
  return texture;
}

function speckle(ctx, w, h, count, alpha) {
  for (let i = 0; i < count; i++) {
    const shade = Math.floor(255 * (0.4 + Math.random() * 0.6));
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
  }
}

/// Glass curtain wall: a 2x2 block of panes with a sky reflection gradient in
/// each, mullion frames and sill shadows. Tile covers 2 windows x 2 floors.
export function glassTexture() {
  return makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6b7480';
    ctx.fillRect(0, 0, w, h);
    for (let cx = 0; cx < 2; cx++) for (let cy = 0; cy < 2; cy++) {
      const x = cx * 128, y = cy * 128;
      const t = 0.75 + Math.random() * 0.25;
      const g = ctx.createLinearGradient(x, y + 128, x + 128, y);
      g.addColorStop(0, `rgba(${Math.round(160 * t)},${Math.round(200 * t)},${Math.round(240 * t)},1)`);
      g.addColorStop(0.5, `rgba(${Math.round(95 * t)},${Math.round(145 * t)},${Math.round(205 * t)},1)`);
      g.addColorStop(1, `rgba(${Math.round(35 * t)},${Math.round(65 * t)},${Math.round(115 * t)},1)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + 7, y + 9, 114, 104);
      // reflected cloud streak
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(x + 18, y + 24 + Math.random() * 30, 86, 11);
      // sill shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 7, y + 113, 114, 6);
    }
  });
}

/// Red brick with one window and a stone ledge per tile. Tile covers ~4m x 3.5m.
export function brickTexture() {
  return makeTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#a05238';
    ctx.fillRect(0, 0, w, h);
    // brick courses with per-brick shade variation and mortar joints
    for (let y = 0; y < h; y += 14) {
      const offset = (y / 14) % 2 ? 17 : 0;
      for (let x = -34; x < w; x += 34) {
        const v = Math.random() * 26 - 13;
        ctx.fillStyle = `rgb(${160 + v},${82 + v},${56 + v})`;
        ctx.fillRect(x + offset, y, 32, 12);
      }
      ctx.fillStyle = 'rgba(185,169,154,0.8)';
      ctx.fillRect(0, y + 12, w, 2);
    }
    // window opening
    ctx.fillStyle = '#ded8ca';
    ctx.fillRect(66, 96, 124, 216);
    const g = ctx.createLinearGradient(70, 308, 186, 100);
    g.addColorStop(0, '#28405e');
    g.addColorStop(1, '#7fa8cc');
    ctx.fillStyle = g;
    ctx.fillRect(74, 104, 108, 200);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(86, 118, 84, 14);
    ctx.fillStyle = '#ded8ca';
    ctx.fillRect(124, 104, 8, 200);
    ctx.fillRect(74, 196, 108, 8);
    // sill
    ctx.fillStyle = '#cfc9bb';
    ctx.fillRect(58, 312, 140, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(58, 326, 140, 6);
    // floor ledge band at the bottom of the tile
    ctx.fillStyle = '#c4beae';
    ctx.fillRect(0, 470, w, 42);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 470, w, 6);
  });
}

/// Concrete office facade: beige panels with dark green window bands.
export function concreteTexture() {
  return makeTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#c3b9a2';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 250, 0.05);
    ctx.fillStyle = 'rgba(150,140,118,0.7)';
    ctx.fillRect(0, 0, 3, h);
    ctx.fillRect(126, 0, 3, h);
    ctx.fillRect(0, 0, w, 3);
    ctx.fillRect(0, 254, w, 3);
    // window band
    ctx.fillStyle = '#8f8875';
    ctx.fillRect(38, 56, 180, 162);
    const g = ctx.createLinearGradient(44, 214, 212, 60);
    g.addColorStop(0, '#1f3a30');
    g.addColorStop(0.45, '#3d6653');
    g.addColorStop(1, '#6fa08a');
    ctx.fillStyle = g;
    ctx.fillRect(44, 62, 168, 150);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(52, 74, 152, 20);
    ctx.fillStyle = '#8f8875';
    ctx.fillRect(124, 62, 8, 150);
    // spandrel vents
    ctx.fillStyle = 'rgba(90,84,68,0.5)';
    for (let i = 0; i < 4; i++) ctx.fillRect(70 + i * 34, 330, 22, 8);
  });
}

/// Plain stone side-wall with a small window, for building sides and bases.
export function stoneTexture() {
  return makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b0a894';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 180, 0.05);
    ctx.strokeStyle = 'rgba(120,112,96,0.6)';
    ctx.lineWidth = 3;
    for (let y = 0; y <= h; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let y = 0; y < h; y += 64) for (let x = (y / 64) % 2 ? 0 : 64; x <= w; x += 128) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 64); ctx.stroke();
    }
    ctx.fillStyle = '#7c766a';
    ctx.fillRect(88, 78, 80, 100);
    ctx.fillStyle = '#3d4c5c';
    ctx.fillRect(92, 82, 72, 92);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(98, 90, 60, 10);
  });
}

/// Low-rise shopfront: stone upper, three big shop windows with red awnings.
export function lowriseTexture() {
  return makeTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b3ab97';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 200, 0.05);
    ctx.strokeStyle = 'rgba(120,112,96,0.55)';
    ctx.lineWidth = 3;
    for (let y = 0; y <= 128; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // upper windows
    for (const x of [60, 240, 420]) {
      ctx.fillStyle = '#7c766a';
      ctx.fillRect(x, 34, 60, 64);
      ctx.fillStyle = '#37475a';
      ctx.fillRect(x + 5, 39, 50, 54);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + 9, 45, 42, 8);
    }
    // pilasters
    ctx.fillStyle = '#9d947f';
    for (const x of [0, 164, 332, 494]) ctx.fillRect(x, 128, 18, 128);
    // shop windows
    for (const x of [20, 184, 352]) {
      ctx.fillStyle = '#d8d2c4';
      ctx.fillRect(x, 142, 140, 106);
      const g = ctx.createLinearGradient(x, 244, x + 140, 146);
      g.addColorStop(0, '#22333f');
      g.addColorStop(1, '#6d8ba0');
      ctx.fillStyle = g;
      ctx.fillRect(x + 6, 148, 128, 94);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x + 14, 156, 108, 14);
    }
    // awnings
    for (const x of [14, 178, 346]) {
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = i % 2 ? '#a93226' : '#c0392b';
        ctx.fillRect(x + i * 20, 118, 20, 22);
      }
    }
    // door
    ctx.fillStyle = '#2e6b46';
    ctx.fillRect(300, 148, 52, 104);
    ctx.fillStyle = '#c8ccd2';
    ctx.beginPath(); ctx.arc(344, 202, 5, 0, Math.PI * 2); ctx.fill();
  });
}

/// Rooftop gravel with seams.
export function roofTexture() {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#6d7076';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 400, 0.12);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, w, 3);
    ctx.fillRect(0, 62, w, 3);
    ctx.fillRect(0, 0, 3, h);
    ctx.fillRect(62, 0, 3, h);
  });
}

/// Asphalt road tile: 512px spans the 18m roadway and 10m along the street,
/// with white edge lines and a dashed double yellow centre line.
export function asphaltTexture() {
  return makeTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#43464c';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 500, 0.07);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 40 + Math.random() * 60, 20 + Math.random() * 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // edge lines
    ctx.fillStyle = 'rgba(232,232,232,0.85)';
    ctx.fillRect(26, 0, 9, h);
    ctx.fillRect(477, 0, 9, h);
    // dashed double yellow centre line
    ctx.fillStyle = '#e0b422';
    for (let y = 0; y < h; y += 110) {
      ctx.fillRect(246, y, 8, 60);
      ctx.fillRect(258, y, 8, 60);
    }
  });
}

/// Sidewalk slabs: light concrete with joint lines every slab width.
export function sidewalkTexture() {
  return makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b4b6ba';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, 300, 0.06);
    ctx.fillStyle = '#9a9ca0';
    for (let y = 0; y <= h; y += 64) ctx.fillRect(0, y, w, 3);
    for (let x = 0; x <= w; x += 64) ctx.fillRect(x, 0, 3, h);
  });
}

/// Equirectangular day sky: deep blue zenith, pale horizon, sun glow, ground
/// haze below the horizon. Doubles as the environment map for glass reflections.
export function skyTexture() {
  return makeTexture(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1d5fae');
    g.addColorStop(0.35, '#4f8fd0');
    g.addColorStop(0.47, '#a8c9e8');
    g.addColorStop(0.5, '#d7e6f4');
    g.addColorStop(0.55, '#b9c6d4');
    g.addColorStop(1, '#7e8ea0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // sun with a wide halo
    const sun = ctx.createRadialGradient(w * 0.72, h * 0.16, 4, w * 0.72, h * 0.16, 150);
    sun.addColorStop(0, 'rgba(255,252,235,0.95)');
    sun.addColorStop(0.12, 'rgba(255,244,200,0.55)');
    sun.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    // faint baked cloud streaks
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * w, y = h * (0.08 + Math.random() * 0.3);
      ctx.beginPath();
      ctx.ellipse(x, y, 60 + Math.random() * 120, 8 + Math.random() * 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/// Soft white cloud blob with alpha falloff, for billboarded cloud sprites.
export function cloudTexture() {
  return makeTexture(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const blob = (x, y, r, a) => {
      const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    blob(128, 150, 105, 0.85);
    blob(80, 130, 70, 0.9);
    blob(180, 128, 66, 0.9);
    blob(120, 100, 55, 0.75);
    blob(160, 170, 60, 0.6);
  });
}

/// Green street sign.
export function signTexture() {
  return makeTexture(256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1f7a3f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ALLEY AVE', w / 2, h / 2 + 2);
  });
}

/// Entrance door.
export function doorTexture() {
  return makeTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#cfc9bb';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#37506e';
    ctx.fillRect(14, 30, 100, 226);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 44, 80, 80);
    ctx.strokeRect(24, 136, 80, 106);
    ctx.fillStyle = '#c8ccd2';
    ctx.beginPath(); ctx.arc(102, 160, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(20, 34, 88, 6);
  });
}

/// Traffic light head: dim red and amber, bright green.
export function trafficTexture() {
  return makeTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#20242a';
    ctx.fillRect(0, 0, w, h);
    const lamp = (y, color, a) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(64, y, 30, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(64, y, 30, 0, Math.PI * 2); ctx.stroke();
    };
    lamp(52, '#e0392b', 0.35);
    lamp(128, '#e8a020', 0.35);
    lamp(204, '#2ea44f', 1);
  });
}

/// Distant skyline windows, tinted per instance and hazed by the fog.
export function skylineTexture() {
  return makeTexture(64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#8fa6bf';
    ctx.fillRect(0, 0, w, h);
    for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 4; gx++) {
      const v = Math.random();
      ctx.fillStyle = v < 0.3 ? '#5c718a' : v < 0.7 ? '#7790aa' : '#a3bacf';
      ctx.fillRect(6 + gx * 14, 8 + gy * 15, 9, 10);
    }
  });
}

/// The hero's web pattern: black radial spokes and rings on suit red.
export function webTexture() {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c8232f';
    ctx.fillRect(0, 0, w, h);
    const cx = 64, cy = 64;
    ctx.strokeStyle = 'rgba(20,20,24,0.9)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90);
      ctx.stroke();
    }
    for (let r = 16; r <= 90; r += 18) {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.quadraticCurveTo(
          cx + Math.cos(a - Math.PI / 8) * r * 1.12,
          cy + Math.sin(a - Math.PI / 8) * r * 1.12,
          x, y
        );
      }
      ctx.stroke();
    }
  });
}