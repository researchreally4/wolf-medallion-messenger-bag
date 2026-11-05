import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Leva } from "leva";
import { LiquidMetal } from "@paper-design/shaders-react";
import { initScroll } from "./timeline";
import { rig } from "./store";
import { ChapterSection, Footer, HeroOverlay, Loader, Nav, Purchase, Specs } from "./ui/Overlays";
import poster from "@/assets/bag-poster.svg";
import { assetUrl } from "./assetUrl";

const Scene = lazy(() => import("./three/Scene").then((m) => ({ default: m.Scene })));

function hasWebGL() {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

function Fallback() {
  return (
    <div className="fallback">
      <div className="fallback-metal">
        <LiquidMetal image={assetUrl("wolf-medallion.svg")} colorBack="#00000000" colorTint="#c9ced6" shape="none" repetition={2} softness={0.2} distortion={0.1} speed={0.6} style={{ width: "100%", height: "100%" }} />
      </div>
      <img src={poster} alt="Wolf Medallion Messenger Bag" width={1024} height={1280} />
    </div>
  );
}

export function Experience() {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [env, setEnv] = useState<{ gl: boolean; mobile: boolean; reduced: boolean } | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 768px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    const gl = hasWebGL();
    setEnv({ gl, mobile, reduced });
    if (!gl) setReady(true);
    const t = setTimeout(() => setReady(true), 6000); // never trap users behind the loader
    const onMove = (e: PointerEvent) => {
      if (reduced) return;
      rig.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      rig.mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    const dispose = initScroll(root.current!, reduced);
    return () => { clearTimeout(t); window.removeEventListener("pointermove", onMove); dispose(); };
  }, []);

  return (
    <div className="experience">
      <div className="grain" aria-hidden />
      <div className="stage" aria-hidden data-scene-ready={ready || undefined}>
        {env?.gl ? (
          <Suspense fallback={null}><Scene mobile={env.mobile} onReady={() => setReady(true)} /></Suspense>
        ) : env ? <Fallback /> : null}
      </div>
      <Leva hidden={!import.meta.env.DEV} collapsed />
      <Loader done={ready} />
      <Nav />
      <main ref={root} className="chapters">
        <HeroOverlay />
        <ChapterSection id="flap" index={2} kicker="The Flap" title="Hand-embossed. Medallion-forged." side="left">
          <p className="body">A single hide, pressed under brass dies until the wolf surfaces from the grain.</p>
        </ChapterSection>
        <ChapterSection id="buckles" index={3} kicker="The Buckles" title="Two straps. Zero compromise." side="right">
          <p className="body">Box buckles cast in aged brass. Beneath the flap, a lined pocket for what must not be lost.</p>
        </ChapterSection>
        <ChapterSection id="liquid" index={4} kicker="Transformation" title="Forged in silver, tempered for the Path." side="left" />
        <ChapterSection id="canvas" index={5} kicker="The Canvas" title="Woven to weather the Continent." side="right">
          <Specs />
        </ChapterSection>
        <ChapterSection id="exploded" index={6} kicker="Anatomy" title="Five parts. One oath." side="left">
          <p className="body">Body, flap, buckles, straps, handle — each made to be repaired, never replaced.</p>
        </ChapterSection>
        <ChapterSection id="finale" index={7} kicker="Acquire" title="Wolf Medallion Messenger" side="right">
          <Purchase />
        </ChapterSection>
      </main>
      <Footer />
    </div>
  );
}
