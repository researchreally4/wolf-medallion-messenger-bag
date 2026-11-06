import * as THREE from "three";

type TextureDraw = (context: CanvasRenderingContext2D, size: number) => void;

function canvasTex(size: number, draw: TextureDraw, repeat: number, color = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

type NoiseField = { cells: number; values: Float32Array };

function makeNoiseFields(random: () => number, cellCounts: number[]): NoiseField[] {
  return cellCounts.map((cells) => ({
    cells,
    values: Float32Array.from({ length: cells * cells }, random),
  }));
}

function noiseSample(field: NoiseField, u: number, v: number) {
  const x = u * field.cells;
  const y = v * field.cells;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx0 = x - x0;
  const ty0 = y - y0;
  const tx = tx0 * tx0 * (3 - 2 * tx0);
  const ty = ty0 * ty0 * (3 - 2 * ty0);
  const wrap = (n: number) => ((n % field.cells) + field.cells) % field.cells;
  const at = (ix: number, iy: number) => field.values[wrap(iy) * field.cells + wrap(ix)]!;
  const top = THREE.MathUtils.lerp(at(x0, y0), at(x0 + 1, y0), tx);
  const bottom = THREE.MathUtils.lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), tx);
  return THREE.MathUtils.lerp(top, bottom, ty);
}

function drawWrappedEllipse(
  context: CanvasRenderingContext2D,
  size: number,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rotation: number,
  color: string,
) {
  const xs = x - rx < 0 ? [x, x + size] : x + rx > size ? [x, x - size] : [x];
  const ys = y - ry < 0 ? [y, y + size] : y + ry > size ? [y, y - size] : [y];
  context.fillStyle = color;
  for (const px of xs) {
    for (const py of ys) {
      context.beginPath();
      context.ellipse(px, py, rx, ry, rotation, 0, Math.PI * 2);
      context.fill();
    }
  }
}

type WeaveMode = "height" | "color" | "roughness";

/** One deterministic weave layout is used for color, relief and roughness. */
function drawWeave(context: CanvasRenderingContext2D, size: number, mode: WeaveMode) {
  const random = seededRandom(0x574f4f4c);
  const count = 72;
  const cell = size / count;
  const thread = cell * 0.56;
  const offset = (cell - thread) / 2;

  if (mode === "color") context.fillStyle = "#e5e6e4";
  else if (mode === "roughness") context.fillStyle = "#eeeeee";
  else context.fillStyle = "#737373";
  context.fillRect(0, 0, size, size);

  const drawThread = (x: number, y: number, vertical: boolean, lifted: boolean) => {
    const left = x * cell + (vertical ? offset : 0);
    const top = y * cell + (vertical ? 0 : offset);
    const width = vertical ? thread : cell;
    const height = vertical ? cell : thread;
    const axisStart = vertical ? left : top;
    const axisEnd = axisStart + (vertical ? width : height);
    const gradient = vertical
      ? context.createLinearGradient(axisStart, 0, axisEnd, 0)
      : context.createLinearGradient(0, axisStart, 0, axisEnd);

    if (mode === "color") {
      const lift = lifted ? 7 : 0;
      gradient.addColorStop(0, `rgb(${202 + lift},${205 + lift},${205 + lift})`);
      gradient.addColorStop(0.22, `rgb(${236 + lift},${238 + lift},${236 + lift})`);
      gradient.addColorStop(0.5, `rgb(${220 + lift},${223 + lift},${222 + lift})`);
      gradient.addColorStop(0.82, `rgb(${231 + lift},${233 + lift},${231 + lift})`);
      gradient.addColorStop(1, `rgb(${198 + lift},${201 + lift},${202 + lift})`);
    } else if (mode === "roughness") {
      const shade = lifted ? 218 : 235;
      gradient.addColorStop(0, `rgb(${shade - 12},${shade - 12},${shade - 12})`);
      gradient.addColorStop(0.45, `rgb(${shade},${shade},${shade})`);
      gradient.addColorStop(1, `rgb(${shade - 8},${shade - 8},${shade - 8})`);
    } else {
      const shade = lifted ? 151 : 116;
      gradient.addColorStop(0, `rgb(${shade - 32},${shade - 32},${shade - 32})`);
      gradient.addColorStop(0.24, `rgb(${shade + 6},${shade + 6},${shade + 6})`);
      gradient.addColorStop(0.52, `rgb(${shade + 20},${shade + 20},${shade + 20})`);
      gradient.addColorStop(0.82, `rgb(${shade + 4},${shade + 4},${shade + 4})`);
      gradient.addColorStop(1, `rgb(${shade - 28},${shade - 28},${shade - 28})`);
    }

    context.fillStyle = gradient;
    context.fillRect(left, top, width, height);

    // A few fine filaments catch light along each yarn without turning the weave into noise.
    const strandCount = mode === "color" ? 2 : 1;
    for (let strand = 0; strand < strandCount; strand++) {
      const jitter = (random() - 0.5) * cell * 0.24;
      context.globalAlpha = mode === "height" ? 0.22 : 0.18;
      context.strokeStyle = mode === "color"
        ? (strand % 2 ? "#f5f2e9" : "#b7babc")
        : mode === "roughness" ? "#ffffff" : (strand % 2 ? "#555555" : "#a9a9a9");
      context.lineWidth = Math.max(0.6, cell * 0.035);
      context.beginPath();
      if (vertical) {
        const sx = left + width * (0.32 + strand * 0.3) + jitter;
        context.moveTo(sx, top + 1);
        context.lineTo(sx + (random() - 0.5) * 1.4, top + height - 1);
      } else {
        const sy = top + height * (0.32 + strand * 0.3) + jitter;
        context.moveTo(left + 1, sy);
        context.lineTo(left + width - 1, sy + (random() - 0.5) * 1.4);
      }
      context.stroke();
    }
    context.globalAlpha = 1;
  };

  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      const verticalOver = (x + y) % 2 === 0;
      if (verticalOver) {
        drawThread(x, y, false, false);
        drawThread(x, y, true, true);
      } else {
        drawThread(x, y, true, false);
        drawThread(x, y, false, true);
      }
      if (mode === "color" && random() > 0.94) {
        context.fillStyle = random() > 0.5 ? "#f0ece2" : "#cacdce";
        context.globalAlpha = 0.45;
        context.fillRect(x * cell + random() * cell, y * cell + random() * cell, cell * 0.3, 1);
        context.globalAlpha = 1;
      }
    }
  }
}

/** Woven waxed-canvas relief: alternating raised warp and weft yarns. */
export const makeWeave = () => canvasTex(512, (ctx, size) => drawWeave(ctx, size, "height"), 4);
export const makeWeaveColor = () => canvasTex(512, (ctx, size) => drawWeave(ctx, size, "color"), 4, true);
export const makeWeaveRoughness = () => canvasTex(512, (ctx, size) => drawWeave(ctx, size, "roughness"), 4);

/** Fine full-grain pores, softened scars and long shallow tannery creases. */
export const makeGrain = () =>
  canvasTex(512, (ctx, size) => {
    const random = seededRandom(0x4c454154);
    const fields = makeNoiseFields(random, [5, 11, 23, 47, 95]);
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        const cloud = noiseSample(fields[0]!, u, v) * 0.48
          + noiseSample(fields[1]!, u, v) * 0.27
          + noiseSample(fields[2]!, u, v) * 0.16
          + noiseSample(fields[3]!, u, v) * 0.09;
        const pore = noiseSample(fields[4]!, u, v);
        const value = THREE.MathUtils.clamp(Math.round(128 + (cloud - 0.5) * 18 + (pore - 0.5) * 9), 105, 151);
        const index = (y * size + x) * 4;
        image.data[index] = image.data[index + 1] = image.data[index + 2] = value;
        image.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    // Dense, soft pin pores add hide grain without the regular, raised look of pebble embossing.
    for (let i = 0; i < 14500; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 0.28 + random() * 0.8;
      const dark = random() > 0.5;
      const alpha = 0.08 + random() * 0.13;
      drawWrappedEllipse(
        ctx, size, x, y, radius * (0.8 + random() * 0.7), radius * (0.4 + random() * 0.34),
        (random() - 0.5) * 0.7,
        dark ? `rgba(27,27,27,${alpha})` : `rgba(242,242,242,${alpha * 0.7})`,
      );
    }

    // Short, shallow wrinkles sit below the color mottling and follow the hide's natural stretch.
    for (let i = 0; i < 54; i++) {
      const x = 32 + random() * (size - 132);
      const y = 32 + random() * (size - 64);
      const length = 18 + random() * 82;
      ctx.lineWidth = 0.45 + random() * 0.75;
      ctx.strokeStyle = random() > 0.5 ? "rgba(220,220,220,0.11)" : "rgba(38,38,38,0.13)";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + length * 0.18, y - 2, x + length * 0.68, y + 2, x + length, y + (random() - 0.5) * 4);
      ctx.stroke();
    }
  }, 3);

export const makeLeatherColor = () =>
  canvasTex(1024, (ctx, size) => {
    const random = seededRandom(0x48494445);
    const fields = makeNoiseFields(random, [3, 7, 15, 31, 63, 127]);
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        const hide = noiseSample(fields[0]!, u, v) * 0.4
          + noiseSample(fields[1]!, u, v) * 0.25
          + noiseSample(fields[2]!, u, v) * 0.17
          + noiseSample(fields[3]!, u, v) * 0.1
          + noiseSample(fields[4]!, u, v) * 0.06
          + noiseSample(fields[5]!, u, v) * 0.02;
        // A pale, nearly neutral map preserves the tint picker while carrying subtle hide-to-hide variation.
        const value = THREE.MathUtils.clamp(Math.round(232 + (hide - 0.5) * 34), 207, 250);
        const index = (y * size + x) * 4;
        image.data[index] = Math.min(255, value + 2);
        image.data[index + 1] = value;
        image.data[index + 2] = Math.max(0, value - 4);
        image.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    // Natural pores and fine elongated marks make the mottling read as leather, not painted noise.
    for (let i = 0; i < 21000; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 0.3 + random() * 1.05;
      const dark = random() > 0.31;
      const alpha = dark ? 0.055 + random() * 0.09 : 0.035 + random() * 0.055;
      drawWrappedEllipse(
        ctx, size, x, y, radius * (1.2 + random() * 1.5), radius * (0.38 + random() * 0.55),
        (random() - 0.5) * 0.9,
        dark ? `rgba(67,53,42,${alpha})` : `rgba(255,249,237,${alpha})`,
      );
    }

    // Restrained, wandering grain lines resemble compressed and burnished areas in a worn hide.
    for (let i = 0; i < 135; i++) {
      const x = 120 + random() * (size - 270);
      const y = 50 + random() * (size - 100);
      const length = 18 + random() * 120;
      ctx.lineWidth = 0.4 + random() * 1.0;
      ctx.strokeStyle = random() > 0.55 ? "rgba(82,60,44,0.055)" : "rgba(255,248,235,0.06)";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + length * 0.24, y - 2, x + length * 0.7, y + 2, x + length, y + (random() - 0.5) * 5);
      ctx.stroke();
    }
  }, 3, true);

export const makeLeatherRoughness = () =>
  canvasTex(512, (ctx, size) => {
    const random = seededRandom(0x524f5547);
    const fields = makeNoiseFields(random, [4, 9, 19, 39, 79]);
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size;
        const v = y / size;
        const rough = noiseSample(fields[0]!, u, v) * 0.42
          + noiseSample(fields[1]!, u, v) * 0.28
          + noiseSample(fields[2]!, u, v) * 0.18
          + noiseSample(fields[3]!, u, v) * 0.12;
        const fine = noiseSample(fields[4]!, u, v);
        const value = THREE.MathUtils.clamp(Math.round(194 + (rough - 0.5) * 42 + (fine - 0.5) * 16), 164, 222);
        const index = (y * size + x) * 4;
        image.data[index] = image.data[index + 1] = image.data[index + 2] = value;
        image.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    // Pores and rub marks vary the sheen so the leather catches the rim light unevenly.
    for (let i = 0; i < 5200; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 0.35 + random() * 1.65;
      const worn = random() > 0.53;
      const value = worn ? 154 + Math.round(random() * 18) : 220 + Math.round(random() * 17);
      drawWrappedEllipse(ctx, size, x, y, radius * (1.1 + random()), radius * (0.5 + random() * 0.6),
        (random() - 0.5) * 0.9, `rgba(${value},${value},${value},${0.07 + random() * 0.08})`);
    }
  }, 3);

/** Subtle linear brush marks for aged brass, used as relief and roughness detail. */
export const makeMetalBrush = () =>
  canvasTex(256, (ctx, size) => {
    const random = seededRandom(0x42524153);
    ctx.fillStyle = "#858585";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 460; i++) {
      const y = random() * size;
      ctx.strokeStyle = random() > 0.5 ? "rgba(220,220,220,0.22)" : "rgba(46,46,46,0.18)";
      ctx.lineWidth = 0.35 + random() * 0.8;
      ctx.beginPath();
      ctx.moveTo(random() * size, y);
      ctx.lineTo(random() * size, y + (random() - 0.5) * 1.6);
      ctx.stroke();
    }
  }, 1);
