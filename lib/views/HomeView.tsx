"use client";
import { motion } from "framer-motion";
import { seedBrandKitList } from "@/lib/fixtures/brandKits";
import type { BrandKit } from "@/lib/schemas";
import { asset } from "@/lib/assetPath";

/**
 * Brand homepage — a grid of squircle tiles. The first tile is "Create new"
 * (starts from a blank TMRW template); the rest are the seeded brand kits.
 * Picking one fires `onChoose(kitId)`.
 */
export function HomeView({ onChoose, chromeTheme = "day", onToggleChrome }: {
  onChoose: (kitId: string) => void;
  chromeTheme?: "day" | "night";
  onToggleChrome?: () => void;
}) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-[color:var(--color-bg)]" style={{ zIndex: 60 }}>
      {/* Day/night toggle — same affordance as the 3D editor's top toolbar
          button so the home → configurator transition feels continuous. */}
      {onToggleChrome && (
        <button
          onClick={onToggleChrome}
          title={chromeTheme === "day" ? "Switch to night" : "Switch to day"}
          className="absolute top-6 right-6 h-9 px-3 rounded-[8px] neumorph-raised flex items-center gap-2 text-[0.7rem] uppercase tracking-wider"
          style={{ color: "var(--color-text)" }}
        >
          {chromeTheme === "day" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M11.5 8.2A5 5 0 0 1 5.8 2.5a5 5 0 1 0 5.7 5.7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <line key={deg} x1="7" y1="1" x2="7" y2="2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" transform={`rotate(${deg} 7 7)`} />
              ))}
            </svg>
          )}
          <span style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{chromeTheme === "day" ? "Night" : "Day"}</span>
        </button>
      )}
      <div className="max-w-[1200px] mx-auto px-8 py-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset(chromeTheme === "day" ? "/logos/tmrwwhite.png" : "/logos/tmrwblack.png")}
          alt="TMRW Foundation"
          className="h-40 w-auto -ml-2 mb-2"
          /* Backgrounds were stripped at the asset stage — PNGs ship
             with transparency, so the mixBlendMode trick used to hide
             the baked-white JPG ground is no longer needed. */
        />
        <h1 className="text-[2.2rem] tracking-tight mb-1" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>
          Boardroom configurator
        </h1>
        <p className="t-label mb-10 max-w-xl">
          Pick a brand to load its boardroom, or start fresh from a blank TMRW room.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {/* Create new */}
          <CreateNewTile onClick={() => onChoose("brand.new")} />
          {seedBrandKitList.map((k) => (
            <BrandTile key={k.id} kit={k} onClick={() => onChoose(k.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateNewTile({ onClick }: { onClick: () => void }) {
  // Primary CTA — visually distinct from the brand tiles. Accent-coloured
  // fill, white text, pulsing glow ring + a "Start" pill in the corner
  // so the eye lands here first on the home view.
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className="aspect-[4/5] rounded-[36px] relative overflow-hidden group"
      style={{
        background: "linear-gradient(135deg, var(--color-accent) 0%, color-mix(in srgb, var(--color-accent) 78%, #000) 100%)",
        color: "#fff",
        // Persistent outer glow as a soft halo + an inner brand-edge.
        boxShadow:
          "0 22px 60px -22px color-mix(in srgb, var(--color-accent) 70%, transparent), " +
          "0 6px 22px -10px color-mix(in srgb, var(--color-accent) 55%, transparent), " +
          "inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      {/* Animated pulsing glow ring — sits behind the tile content but
          radiates outward. Pure transform/opacity so it can't tank perf. */}
      <motion.div
        aria-hidden
        className="absolute -inset-1 rounded-[40px] pointer-events-none"
        animate={{ opacity: [0.45, 0.85, 0.45], scale: [1, 1.03, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-accent) 40%, transparent) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />
      {/* "Start" pill — anchored top-right, reads as a clear CTA badge. */}
      <div
        className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[0.6rem] uppercase tracking-wider"
        style={{
          background: "rgba(255,255,255,0.18)",
          color: "#fff",
          backdropFilter: "blur(6px)",
          fontVariationSettings: '"wdth" 100, "wght" 600',
        }}
      >
        Start
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center px-6">
          <motion.div
            className="w-16 h-16 mx-auto rounded-full mb-4 grid place-items-center"
            style={{
              background: "rgba(255,255,255,0.16)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px -6px rgba(0,0,0,0.3)",
              backdropFilter: "blur(4px)",
            }}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v16M4 12h16" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </motion.div>
          <div className="text-[1.05rem] mb-1" style={{ fontVariationSettings: '"wdth" 100, "wght" 700' }}>
            Create new brand
          </div>
          <div className="text-[0.7rem] opacity-85">
            From a blank TMRW room
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function BrandTile({ kit, onClick }: { kit: BrandKit; onClick: () => void }) {
  const rasterUrl = kit.logos.primary.rasterUrl;
  // JPG logos (TMRW, Rolex) ship with a baked white plate; kill it with a
  // multiply blend so the brand-coloured tile shows through. SVGs are
  // assumed clean — used as-is.
  const isJpg = rasterUrl?.toLowerCase().endsWith(".jpg") || rasterUrl?.toLowerCase().endsWith(".jpeg");
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className="aspect-[4/5] rounded-[36px] relative overflow-hidden group cursor-pointer"
      style={{ background: kit.palette.primary }}
    >
      {/* Top — accent strip */}
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: kit.palette.accent }} />

      {/* Subtle brand-cream backdrop — softer than the hard white card we
          used to have. JPG logos still get the multiply chroma-key so the
          baked white plate disappears against the brand tint. */}
      <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 flex items-center justify-center">
        {rasterUrl ? (
          <div
            className="w-full aspect-[3/2] rounded-2xl grid place-items-center px-4 py-3"
            style={{
              background: `color-mix(in srgb, ${kit.palette.neutralLight} 90%, transparent)`,
              boxShadow: "0 4px 18px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rasterUrl}
              alt={kit.name}
              className="max-h-full max-w-full w-auto h-auto object-contain"
              style={isJpg ? { mixBlendMode: "multiply" } : undefined}
            />
          </div>
        ) : (
          <span className="text-2xl" style={{ color: kit.palette.neutralLight }}>{kit.name}</span>
        )}
      </div>

      {/* Bottom — name + accent */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[0.78rem] uppercase tracking-wider" style={{ color: kit.palette.neutralLight, fontVariationSettings: '"wdth" 100, "wght" 600' }}>
            {kit.name}
          </span>
          <span className="w-2 h-2 rounded-full" style={{ background: kit.palette.accent }} />
        </div>
      </div>
    </motion.button>
  );
}
