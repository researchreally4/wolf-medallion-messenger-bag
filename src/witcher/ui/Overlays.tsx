import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { CHAPTERS, nav, useUI, TINTS, type Tint } from "../store";
import { assetUrl } from "../assetUrl";

export function Loader({ done }: { done: boolean }) {
  return (
    <AnimatePresence>
      {!done && (
        <motion.div className="loader" exit={{ opacity: 0, transition: { duration: 1 } }}>
          <img src={assetUrl("wolf-medallion.svg")} alt="" className="loader-emblem" />
          <span className="label">Forging the medallion</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Nav() {
  const chapter = useUI((s) => s.chapter);
  const progress = useUI((s) => s.progress);
  const cart = useUI((s) => s.cart);
  return (
    <>
      <header className="nav">
        <button className="nav-brand" onClick={() => nav.scrollTo("hero")}>
          <img src={assetUrl("wolf-medallion.svg")} alt="" width={22} height={22} />
          <span>CD PROJEKT RED <em>Gear</em></span>
        </button>
        <nav className="nav-links" aria-label="Chapters">
          {CHAPTERS.slice(1).map((c, i) => (
            <button key={c.id} onClick={() => nav.scrollTo(c.id)} data-active={chapter === i + 1}>{c.label}</button>
          ))}
        </nav>
        <button className="nav-cart" onClick={() => nav.scrollTo("finale")}>
          Satchel <motion.span key={cart} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="nav-count">{cart}</motion.span>
        </button>
      </header>
      <aside className="rail" aria-hidden>
        <span className="label">{String(chapter + 1).padStart(2, "0")} / 07</span>
        <div className="rail-track"><div className="rail-fill" style={{ transform: `scaleY(${progress})` }} /></div>
        <ul>
          {CHAPTERS.map((c, i) => <li key={c.id} data-active={chapter === i} />)}
        </ul>
      </aside>
    </>
  );
}

const reveal = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.2, 0.7, 0.2, 1] as const } } };

export function HeroOverlay() {
  const word = "WOLF SCHOOL";
  return (
    <section id="hero" className="chapter chapter-hero">
      <div className="hero-meta label"><span>Ch. 01</span><span>The Witcher × CD PROJEKT RED Gear</span><span>Collector’s Edition</span></div>
      <h1 className="hero-title" aria-label={word}>
        {word.split("").map((ch, i) => (
          <motion.span key={i} initial={{ opacity: 0, y: "40%", filter: "blur(12px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 1.2 + i * 0.09, duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}>
            {ch === " " ? "\u00a0" : ch}
          </motion.span>
        ))}
      </h1>
      <motion.p className="hero-sub" initial="hidden" animate="show" variants={reveal} transition={{ delay: 2.4 }}>
        Wolf Medallion Messenger Bag
      </motion.p>
      <div className="scroll-cue label"><span className="cue-line" />Scroll to unsheathe</div>
    </section>
  );
}

export function ChapterSection({ id, index, kicker, title, children, side = "left" }: { id: string; index: number; kicker: string; title: string; children?: ReactNode; side?: "left" | "right" | "center" }) {
  return (
    <section id={id} className="chapter" data-side={side}>
      <motion.div className="chapter-card" initial="hidden" whileInView="show" viewport={{ amount: 0.5 }} transition={{ staggerChildren: 0.12 }}>
        <motion.span variants={reveal} className="label chapter-kicker">Ch. {String(index).padStart(2, "0")} — {kicker}</motion.span>
        <motion.span variants={reveal} className="rule" />
        <motion.h2 variants={reveal} className="chapter-title">{title}</motion.h2>
        {children && <motion.div variants={reveal}>{children}</motion.div>}
      </motion.div>
    </section>
  );
}

export function Specs() {
  const rows = [["Body", "Waxed cotton canvas, 18 oz"], ["Flap", "Full-grain vegetable-tanned leather"], ["Hardware", "Solid aged brass, hand-finished"], ["Thread", "Waxed linen, 8 spi"]];
  return (
    <dl className="specs">
      {rows.map(([k, v]) => (<div key={k}><dt className="label">{k}</dt><dd>{v}</dd></div>))}
    </dl>
  );
}

export function Purchase() {
  const tint = useUI((s) => s.tint);
  const setTint = useUI((s) => s.setTint);
  const addToCart = useUI((s) => s.addToCart);
  const [added, setAdded] = useState(false);
  useEffect(() => { if (!added) return; const t = setTimeout(() => setAdded(false), 2600); return () => clearTimeout(t); }, [added]);
  return (
    <div className="purchase">
      <div className="price-row">
        <span className="price">€249</span>
        <span className="label price-note">Campaign product UI · placeholder price</span>
      </div>
      <div className="tints" role="radiogroup" aria-label="Leather tint">
        <span className="label">Leather — {tint}</span>
        <div className="tint-row">
          {(Object.keys(TINTS) as Tint[]).map((t) => (
            <button key={t} role="radio" aria-checked={tint === t} aria-label={t} className="tint" data-tint={t.replace(" ", "-").toLowerCase()} onClick={() => setTint(t)} />
          ))}
        </div>
      </div>
      <button className="btn-forge" onClick={() => { addToCart(); setAdded(true); }}>
        <span>{added ? "Added to Satchel" : "Add to Satchel"}</span>
      </button>
      <AnimatePresence>
        {added && (
          <motion.p className="label cart-toast" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            ✦ One messenger, {tint.toLowerCase()} leather, reserved in your satchel
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div><img src={assetUrl("wolf-medallion.svg")} alt="" width={36} height={36} /><p className="footer-brand">Wolf Medallion Messenger</p></div>
        <div className="label">Shipping worldwide<br />Lifetime hardware warranty</div>
        <div className="label">Concept campaign page.<br />The Witcher® is a trademark of CD PROJEKT S.A.</div>
      </div>
      <span className="rule" />
      <p className="label footer-small">© 2026 · Toss a coin</p>
    </footer>
  );
}
