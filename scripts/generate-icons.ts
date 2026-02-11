import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

type RGB = { r: number; g: number; b: number };

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function blend(bg: RGB, fg: RGB, alpha: number): RGB {
  const a = clamp01(alpha);
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  };
}

function drawStarAlpha(x: number, y: number, cx: number, cy: number) {
  // Quick 5-point star SDF-ish approximation using polar modulation.
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.sqrt(dx * dx + dy * dy);
  const a = Math.atan2(dy, dx);
  const spikes = 5;
  const k = Math.cos(spikes * a) * 0.35 + 0.65;
  const boundary = 0.085 * k;
  const aa = 0.008;
  return 1 - smoothstep(boundary - aa, boundary + aa, r);
}

function renderIcon(size: number) {
  const png = new PNG({ width: size, height: size });

  const bgTop: RGB = { r: 11, g: 59, b: 46 };
  const bgBottom: RGB = { r: 2, g: 20, b: 15 };
  const gold: RGB = { r: 247, g: 211, b: 122 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;
      const px = nx * 2 - 1;
      const py = ny * 2 - 1;

      const radial = Math.sqrt(px * px + py * py);
      const grad = clamp01(ny * 0.92 + radial * 0.18);
      let c = lerpRgb(bgTop, bgBottom, grad);

      // Subtle geometric shimmer.
      const shimmer = (Math.sin((px + py) * 10) + Math.sin((px - py) * 14)) * 0.02;
      c = { r: c.r * (1 + shimmer), g: c.g * (1 + shimmer), b: c.b * (1 + shimmer) };

      // Crescent (outer circle minus inner circle).
      const ocx = -0.05;
      const ocy = -0.03;
      const or = 0.62;
      const icx = 0.14;
      const icy = -0.03;
      const ir = 0.56;

      const od = Math.sqrt((px - ocx) ** 2 + (py - ocy) ** 2);
      const id = Math.sqrt((px - icx) ** 2 + (py - icy) ** 2);
      const aa = 0.012;

      const outer = 1 - smoothstep(or - aa, or + aa, od);
      const inner = 1 - smoothstep(ir - aa, ir + aa, id);
      const crescentAlpha = clamp01(outer * (1 - inner)) * 0.95;

      // Star near the crescent.
      const starAlpha = drawStarAlpha(px, py, 0.28, -0.25) * 0.9;

      const fgAlpha = clamp01(crescentAlpha + starAlpha);
      const out = blend(c, gold, fgAlpha);

      const idx = (png.width * y + x) << 2;
      png.data[idx] = Math.round(clamp01(out.r / 255) * 255);
      png.data[idx + 1] = Math.round(clamp01(out.g / 255) * 255);
      png.data[idx + 2] = Math.round(clamp01(out.b / 255) * 255);
      png.data[idx + 3] = 255;
    }
  }

  return PNG.sync.write(png);
}

function main() {
  const outDir = path.join(process.cwd(), "public", "icons");
  mkdirSync(outDir, { recursive: true });

  const icon192 = renderIcon(192);
  const icon512 = renderIcon(512);
  const apple180 = renderIcon(180);

  writeFileSync(path.join(outDir, "icon-192.png"), icon192);
  writeFileSync(path.join(outDir, "icon-512.png"), icon512);
  writeFileSync(path.join(outDir, "maskable-512.png"), icon512);
  writeFileSync(path.join(process.cwd(), "public", "apple-touch-icon.png"), apple180);

  // For Next's default favicon, keep the existing .ico for simplicity.
  // If you want a custom .ico later, generate it from icon-192.png.
  console.log("Generated PWA icons in public/icons/ and public/apple-touch-icon.png");
}

main();
