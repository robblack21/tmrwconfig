"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConfig } from "@/lib/store/configStore";
import { LIVE_BOM } from "@/lib/bom/derive";

export function BomSettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-5 h-5 rounded-[4px] hover:bg-[color:var(--color-surface-sub)] grid place-items-center text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)] transition-colors"
        aria-label="BOM settings"
        title="BOM settings"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="1.6" stroke="currentColor" strokeWidth="1" />
          <path d="M6 1.5v1.5M6 9v1.5M10.5 6h-1.5M3 6H1.5M9.18 2.82l-1.06 1.06M3.88 8.12l-1.06 1.06M9.18 9.18l-1.06-1.06M3.88 3.88L2.82 2.82" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
        </svg>
      </button>
      <AnimatePresence>{open && <BomSettingsModal onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}

function BomSettingsModal({ onClose }: { onClose: () => void }) {
  const rateOverrides = useConfig((s) => s.bomRateOverrides);
  const apply = useConfig((s) => s.apply);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="panel-glass rounded-[16px] w-[640px] max-h-[80vh] flex flex-col"
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-[color:var(--color-border-soft)]">
          <span className="t-row" style={{ fontVariationSettings: '"wdth" 100, "wght" 500' }}>BOM unit rates</span>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => apply({ type: "bom.resetRates" })}
              className="h-7 px-3 rounded-[6px] t-row neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-accent)]"
            >
              Reset all
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[6px] grid place-items-center neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 scroll-pretty">
          <table className="w-full t-row">
            <thead>
              <tr className="t-label">
                <th className="text-left pb-1.5">Item</th>
                <th className="text-right pb-1.5 w-12">Unit</th>
                <th className="text-right pb-1.5 w-24">Default</th>
                <th className="text-right pb-1.5 w-28">Override</th>
              </tr>
            </thead>
            <tbody>
              {LIVE_BOM.map((l) => {
                const overridden = rateOverrides[l.id] !== undefined;
                return (
                  <tr key={l.id} className="border-t border-[color:var(--color-border-soft)]">
                    <td className="py-1.5 truncate" title={l.label}>{l.label}</td>
                    <td className="py-1.5 text-right t-label">{l.unit}</td>
                    <td className="py-1.5 text-right t-num text-[color:var(--color-text-soft)]">€{l.rate}</td>
                    <td className="py-1.5 text-right">
                      <input
                        type="number"
                        value={overridden ? rateOverrides[l.id] : ""}
                        placeholder={`€${l.rate}`}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (Number.isFinite(v) && v >= 0) {
                            apply({ type: "bom.setLineRate", lineId: l.id, rate: v });
                          }
                        }}
                        className={
                          "h-6 w-20 px-2 rounded-[4px] text-right t-num " +
                          (overridden
                            ? "neumorph-inset text-[color:var(--color-accent)]"
                            : "neumorph-inset text-[color:var(--color-text)]")
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
