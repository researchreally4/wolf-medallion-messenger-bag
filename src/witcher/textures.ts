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

type WeaveMode = "height" | "color" | "roughness";

/** One deterministic weave layout is used for color, relief and roughness. */
function drawWeave(context: CanvasRenderingContext2D, size: number, mode: WeaveMode) {
  const random = seededRandom(0x574f4f4c);
  const count = 32;
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
    ctx.fillStyle = "#858585";
    ctx.fillRect(0, 0, size, size);

    // Low-contrast pores keep the relief visible only when the key light grazes the hide.
    for (let i = 0; i < 9500; i++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 0.35 + random() * 1.35;
      const value = Math.round(104 + random() * 82);
      ctx.fillStyle = `rgba(${value},${value},${value},${0.12 + random() * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(x, y, radius * (1.2 + random() * 1.1), radius * 0.55, (random() - 0.5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 46; i++) {
      const x = random() * size;
      const y = random() * size;
      const length = 18 + random() * 86;
      ctx.lineWidth = 0.5 + random() * 1.1;
      ctx.strokeStyle = random() > 0.5 ? "rgba(205,205,205,0.15)" : "rgba(58,58,58,0.13)";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + length * 0.2, y - 3, x + length * 0.7, y + 2, x + length, y + (random() - 0.5) * 5);
      ctx.stroke();
    }
  }, 3);

export const makeLeatherColor = () =>
  canvasTex(512, (ctx, size) => {
    const random = seededRandom(0x48494445);
    ctx.fillStyle = "#eeeeec";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 260; i++) {
      const v = 220 + Math.floor(random() * 28);
      ctx.fillStyle = `rgba(${v},${v - 3},${v - 7},${0.08 + random() * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(random() * size, random() * size, 2 + random() * 12, 1 + random() * 5, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 3, true);

export const makeLeatherRoughness = () =>
  canvasTex(512, (ctx, size) => {
    const random = seededRandom(0x524f5547);
    ctx.fillStyle = "#c5c5c5";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2400; i++) {
      const v = Math.round(160 + random() * 80);
      ctx.fillStyle = `rgba(${v},${v},${v},0.18)`;
      ctx.beginPath();
      ctx.ellipse(random() * size, random() * size, 1 + random() * 4, 0.6 + random() * 1.6, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
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
