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
export function HomeView({ onChoose }: { onChoose: (kitId: string) => void }) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-[color:var(--color-bg)]" style={{ zIndex: 60 }}>
      <div className="max-w-[1200px] mx-auto px-8 py-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset("/logos/tmrwwhite.jpg")}
          alt="TMRW Foundation"
          className="h-16 w-auto mb-3"
          style={{ mixBlendMode: "multiply" }}
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
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className="aspect-[4/5] rounded-[36px] neumorph-raised relative overflow-hidden group"
      style={{ border: "2px dashed color-mix(in srgb, var(--color-accent) 60%, transparent)" }}
    >
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center px-6">
          <div className="w-14 h-14 mx-auto rounded-full mb-3 grid place-items-center" style={{ background: "var(--color-accent)" }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 4v14M4 11h14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="t-row" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>
            Create new brand
          </div>
          <div className="t-label mt-1">
            From a blank TMRW room
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function BrandTile({ kit, onClick }: { kit: BrandKit; onClick: () => void }) {
  const rasterUrl = kit.logos.primary.rasterUrl;
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

      {/* Logo container — white card so any logo colour reads on the brand tile */}
      <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 flex items-center justify-center">
        {rasterUrl ? (
          <div className="w-full aspect-[3/2] rounded-2xl bg-white grid place-items-center px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rasterUrl}
              alt={kit.name}
              className="max-h-full max-w-full w-auto h-auto object-contain"
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
