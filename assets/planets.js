/* ------------------------------------------------------------------
   Texturas dos planetas e do Sol, geradas num canvas.
   O ruído é calculado em 3D, sobre a superfície da esfera, e não sobre o
   retângulo da textura: assim não há emenda na longitude nem "redemoinho"
   nos polos, e bolinhas e crateras ficam redondas em qualquer latitude.
   Cada trabalho tem um estilo e uma paleta tirados da sua logo.
   Sementes fixas: o desenho é sempre o mesmo.
------------------------------------------------------------------- */
(function () {
  const W = 384, H = 192;

  const STYLES = {
    // Logo azul em degradê: planeta gasoso com faixas
    flipdesk: { style: "bands", seed: 11, palette: ["#05265c", "#084898", "#1565d0", "#1088e8", "#58b4ff", "#c4e4ff"] },
    // Logo laranja queimado: planeta rochoso com crateras
    garfo: { style: "rocky", seed: 23, palette: ["#4a1606", "#8a3010", "#c04010", "#d8602c", "#eea080"] },
    // Logo verde-menta: planeta manchado com nuvens
    grana: { style: "mottled", seed: 37, palette: ["#03402c", "#067a52", "#08c888", "#08f098", "#8ff8cf"] },
    // Logo de bolinhas rosa e magenta: planeta coberto de células
    siehp: { style: "cells", seed: 41, palette: ["#5c1434", "#8a2050", "#b03068", "#d84880", "#e080a8", "#f6c4d8"] },
    // O Sol, no centro
    sun: { style: "sun", seed: 5, palette: ["#b8430a", "#e06c0c", "#f4a024", "#ffc94a", "#ffe7a0"] },
  };

  // Hash inteiro -> [0, 1)
  function hash(i, j, k, s) {
    let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(s, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // Ruído de valor 3D e fbm
  function noise3(x, y, z, s) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t;
    const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz, s);
    return l(
      l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
      l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
      w
    );
  }
  function fbm(x, y, z, s, freq, octaves = 5) {
    let sum = 0, amp = 0.5, norm = 0, f = freq;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise3(x * f, y * f, z * f, s + o * 101);
      norm += amp; amp *= 0.5; f *= 2;
    }
    return sum / norm;
  }

  // Pontos espalhados em 3D (um por célula de uma grade); devolve o ponto
  // mais "dominante" que cobre (x, y, z): { d: distância / raio, r1, r2 }
  function spots(x, y, z, s, scale, chance, minR, maxR) {
    const px = x * scale, py = y * scale, pz = z * scale;
    const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
    let best = null;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const cx = ix + dx, cy = iy + dy, cz = iz + dz;
      if (hash(cx, cy, cz, s) > chance) continue;
      const fx = cx + hash(cx, cy, cz, s + 1), fy = cy + hash(cx, cy, cz, s + 2), fz = cz + hash(cx, cy, cz, s + 3);
      const rad = minR + (maxR - minR) * Math.pow(hash(cx, cy, cz, s + 4), 2);
      const d = Math.hypot(px - fx, py - fy, pz - fz) / rad;
      if (d < 1 && (!best || d < best.d)) best = { d, r1: hash(cx, cy, cz, s + 5), r2: hash(cx, cy, cz, s + 6) };
    }
    return best;
  }

  const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function paletteAt(stops, t) {
    t = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
    const i = Math.floor(t), f = t - i;
    const a = stops[i], b = stops[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // Estica o contraste do ruído (que se concentra perto de 0,5)
  const spread = (n, k = 2.2) => 0.5 + (n - 0.5) * k;
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // Cor de cada ponto da esfera (x, y, z), com y apontando para o polo norte
  const shaders = {
    bands(x, y, z, s, pal) {
      const warp = fbm(x, y, z, s, 1.4, 4);
      const t = 0.5 + 0.5 * Math.sin(y * 11 + warp * 7 + fbm(x, y * 3, z, s + 7, 2.5, 3) * 2);
      return paletteAt(pal, t * 0.85 + spread(fbm(x, y, z, s + 13, 5, 3)) * 0.15);
    },
    rocky(x, y, z, s, pal) {
      let c = paletteAt(pal, spread(fbm(x, y, z, s, 2.2, 6), 2.6));
      const cr = spots(x, y, z, s + 50, 5, 0.22, 0.18, 0.5);
      if (cr) {
        if (cr.d < 0.78) c = mix(c, [40, 10, 2], 0.34 * (1 - cr.d * 0.5));      // fundo da cratera
        else c = mix(c, pal[pal.length - 1], 0.22 * smooth(0.78, 0.9, cr.d) * (1 - smooth(0.92, 1, cr.d))); // borda
      }
      return c;
    },
    mottled(x, y, z, s, pal) {
      const w = fbm(x, y, z, s + 3, 1.2, 3) * 0.6;
      const land = spread(fbm(x + w, y, z - w, s, 1.6, 6), 2.4);
      const base = paletteAt(pal, land);
      // Nuvens alongadas na direção da rotação (y comprimido)
      const cloud = Math.max(0, spread(fbm(x, y * 3, z, s + 9, 2, 5), 2) - 0.72) * 1.6;
      return mix(base, [240, 250, 246], Math.min(cloud, 0.45));
    },
    cells(x, y, z, s, pal) {
      let c = paletteAt(pal.slice(0, 3), spread(fbm(x, y, z, s, 1.8, 5), 2));
      const light = pal.slice(2);
      for (const [scale, chance, maxR] of [[3.5, 0.9, 0.5], [7, 0.8, 0.46], [14, 0.6, 0.42]]) {
        const d = spots(x, y, z, s + Math.round(scale * 10), scale, chance, 0.22, maxR);
        if (d) {
          const col = light[Math.floor(d.r1 * light.length)];
          c = mix(c, col, (0.55 + 0.45 * d.r2) * (1 - smooth(0.82, 1, d.d)));
        }
      }
      return c;
    },
    sun(x, y, z, s, pal) {
      const gran = fbm(x, y, z, s, 6, 4);           // granulação fina
      const big = fbm(x, y, z, s + 21, 1.6, 4);     // manchas grandes
      const cell = spots(x, y, z, s + 40, 14, 0.9, 0.35, 0.6);
      let t = 0.35 + (gran - 0.5) * 1.1 + (big - 0.5) * 0.9;
      if (cell) t += 0.12 * (1 - cell.d);
      return paletteAt(pal, t);
    },
  };

  function render(cfg) {
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(W, H);
    const pal = cfg.palette.map(hexToRgb);
    const shade = shaders[cfg.style];
    for (let py = 0; py < H; py++) {
      const lat = (0.5 - (py + 0.5) / H) * Math.PI;
      const cy = Math.sin(lat), cl = Math.cos(lat);
      for (let px = 0; px < W; px++) {
        const lon = ((px + 0.5) / W) * Math.PI * 2;
        const [r, g, b] = shade(cl * Math.cos(lon), cy, cl * Math.sin(lon), cfg.seed, pal);
        const i = (py * W + px) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  const cache = new Map();

  // Canvas com a textura do trabalho. Para ids sem estilo próprio, usa a cor dada.
  window.planetTexture = function (id, fallbackColor = "#a9b1c2") {
    if (cache.has(id)) return cache.get(id);
    const cfg = STYLES[id] || { style: "mottled", seed: 97, palette: ["#000000", fallbackColor, "#ffffff"] };
    const canvas = render(cfg);
    cache.set(id, canvas);
    return canvas;
  };

  // Mesma coisa, mas sem travar a página: gera uma textura por vez, entre frames
  let queue = Promise.resolve();
  window.planetTextureAsync = function (id, fallbackColor) {
    queue = queue.then(() => new Promise((resolve) =>
      setTimeout(() => resolve(window.planetTexture(id, fallbackColor)), 0)));
    return queue;
  };
})();
