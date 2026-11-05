import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { rig, useUI, nav } from "./store";

gsap.registerPlugin(ScrollTrigger);

const TAU = Math.PI * 2;
// Key states for chapters 2..7 (chapter 1 = initial rig values)
const KEYS: Partial<typeof rig>[] = [
  { camX: 0, camY: 0.05, camZ: 2.0, lookX: 0, lookY: -0.15, lookZ: 0.3, bagRotY: 0, emblem: 0.25, dof: 1, fog: 0.12 },
  { camX: 1.7, camY: 0.45, camZ: 2.3, lookX: 0, lookY: -0.15, lookZ: 0.2, bagRotY: -0.55, flap: 0.61, emblem: 0, dof: 0, rimX: -3 },
  { camX: 0, camY: 0.15, camZ: 2.7, lookX: 0, lookY: -0.05, lookZ: 0, bagRotY: 0, flap: 0, liquid: 1, blue: 1, ca: 1, emblem: 0.7, rimX: 3 },
  { camX: 0.55, camY: -0.35, camZ: 1.35, lookX: 0.35, lookY: -0.45, lookZ: 0.2, bagRotY: 0.35, liquid: 0.25, blue: 0.25, ca: 0, emblem: 0, dof: 0.8 },
  { camX: 0, camY: 0.9, camZ: 6.2, lookX: 0, lookY: 0.55, lookZ: 0, bagRotY: -0.6, explode: 1, blue: 0, liquid: 0, dof: 0 },
  { camX: 0, camY: 0.3, camZ: 4.6, lookX: 0, lookY: 0.05, lookZ: 0, bagRotY: 0.3 + TAU, explode: 0, warm: 1, emblem: 0.85, rimX: -4, fog: 0.07 },
];

export function initScroll(root: HTMLElement, reduced: boolean) {
  let lenis: Lenis | null = null;
  const tick = (t: number) => lenis?.raf(t * 1000);
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    nav.scrollTo = (id) => lenis!.scrollTo(`#${id}`, { duration: 1.6 });
  } else {
    nav.scrollTo = (id) => document.getElementById(id)?.scrollIntoView();
  }

  // Bag rises from below on load
  const intro = gsap.to(rig, { introY: 0, duration: reduced ? 0 : 2.4, ease: "power3.out", delay: 0.4 });

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut", duration: 1 },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: reduced ? true : 1,
      onUpdate: (s) => useUI.getState().setProgress(s.progress),
    },
  });
  KEYS.forEach((k, i) => tl.to(rig, k, i));
  // spring-like flap: overshoot when opening in chapter 3
  tl.to(rig, { flap: 0.68, duration: 0.25, ease: "back.out(3)" }, 1.55).to(rig, { flap: 0.61, duration: 0.2 }, 1.8);

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    intro.kill();
    gsap.ticker.remove(tick);
    lenis?.destroy();
  };
}
