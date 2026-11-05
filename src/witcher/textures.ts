import * as THREE from "three";

function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, repeat: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

/** Woven canvas bump: alternating over/under threads. */
export const makeWeave = () =>
  canvasTex(256, (g, s) => {
    g.fillStyle = "#777";
    g.fillRect(0, 0, s, s);
    const n = 16, w = s / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const over = (x + y) % 2 === 0;
        const grd = over ? g.createLinearGradient(x * w, 0, x * w + w, 0) : g.createLinearGradient(0, y * w, 0, y * w + w);
        grd.addColorStop(0, "#333");
        grd.addColorStop(0.5, "#eee");
        grd.addColorStop(1, "#333");
        g.fillStyle = grd;
        g.fillRect(x * w + 1, y * w + 1, w - 2, w - 2);
      }
  }, 10);

/** Leather grain bump: soft random pores. */
export const makeGrain = () =>
  canvasTex(256, (g, s) => {
    g.fillStyle = "#888";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const v = Math.floor(90 + Math.random() * 100);
      g.fillStyle = `rgba(${v},${v},${v},0.5)`;
      g.beginPath();
      g.arc(Math.random() * s, Math.random() * s, Math.random() * 2.2, 0, Math.PI * 2);
      g.fill();
    }
  }, 3);
