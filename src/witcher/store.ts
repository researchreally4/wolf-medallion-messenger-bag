import { create } from "zustand";

export type Tint = "Dark Brown" | "Black" | "Tan";
export const TINTS: Record<Tint, string> = {
  "Dark Brown": "#3b2416",
  Black: "#121011",
  Tan: "#8a5a32",
};

/** Mutable scene rig: tweened by the master GSAP timeline, read every frame by the Canvas. Never triggers React renders. */
export const rig = {
  camX: 0, camY: 0.3, camZ: 5.2,
  lookX: 0, lookY: 0.1, lookZ: 0,
  bagX: 0, bagY: 0, bagRotY: 0.3, bagRotX: 0, bagScale: 1,
  introY: -3,
  flap: 0, explode: 0, liquid: 0, blue: 0, warm: 0,
  emblem: 1, dof: 0, ca: 0, fog: 0.09, rimX: 3,
  mouseX: 0, mouseY: 0,
};

export const CHAPTERS = [
  { id: "hero", label: "Wolf School" },
  { id: "flap", label: "The Flap" },
  { id: "buckles", label: "The Buckles" },
  { id: "liquid", label: "Transformation" },
  { id: "canvas", label: "The Canvas" },
  { id: "exploded", label: "Anatomy" },
  { id: "finale", label: "Acquire" },
] as const;

interface UIState {
  progress: number;
  chapter: number;
  tint: Tint;
  cart: number;
  setProgress: (p: number) => void;
  setTint: (t: Tint) => void;
  addToCart: () => void;
}

export const useUI = create<UIState>((set) => ({
  progress: 0,
  chapter: 0,
  tint: "Dark Brown",
  cart: 0,
  setProgress: (p) =>
    set({ progress: p, chapter: Math.max(0, Math.min(6, Math.round(p * 6))) }),
  setTint: (tint) => set({ tint }),
  addToCart: () => set((s) => ({ cart: s.cart + 1 })),
}));

export const nav = { scrollTo: (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }) };
