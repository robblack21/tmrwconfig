"use client";
// CubePickerModal — the 2D DOM modal that appears when the user clicks
// the "+" hotspot floating above a cube plinth. Mirrors the long-press
// editor's portal pattern: rendered OUTSIDE the canvas tree, positioned
// at screen coordinates emitted by the in-canvas hotspot click. Looks
// + feels like the other editor menus rather than a webgl-scaled
// in-scene widget.
//
// Trigger flow:
//   1. User clicks the "+" hotspot on a cube (rendered via drei <Html>
//      inside the canvas).
//   2. Hotspot calls `useCubePicker.openAt(slot, clientX, clientY)`.
//   3. This modal is mounted in CanvasShell as a sibling of the canvas
//      and the long-press modal. It subscribes to `useCubePicker` and
//      renders into a `position: fixed` div at (clientX, clientY).
//   4. Pre-set selection / upload / clear all dispatch
//      `layout.setCubeAssets` to mutate just that slot and close the
//      picker.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useConfig } from "@/lib/store/configStore";
import { useCubePicker } from "./cubePickerStore";
import { asset } from "@/lib/assetPath";

// Curated preset list — same six objects as before; lives here now so
// the modal owns its data and Scene.tsx stays focused on rendering.
const CUBE_PRESETS: { id: string; label: string; emoji: string; url: string }[] = [
  { id: "vision", label: "Vision Pro", emoji: "🥽", url: asset("/glb/brand-hero/apple/apple_vision_pro.glb") },
  { id: "earth",  label: "Earth",      emoji: "🌍", url: asset("/glb/brand-hero/tmrw/earth__terra_-_downloadable_model.glb") },
  { id: "rolex",  label: "Rolex",      emoji: "⌚️", url: asset("/glb/brand-hero/rolex/rolex_datejust.glb") },
  { id: "dunk",   label: "Sneaker",    emoji: "👟", url: asset("/glb/brand-hero/nike/nike_dunk_low_unlv.glb") },
  { id: "google", label: "Google",     emoji: "🅖",  url: asset("/glb/brand-hero/google/google_logo.glb") },
  { id: "orbit",  label: "Light Orbit",emoji: "✨", url: asset("/glb/props/light_orbit.glb") },
];

export function CubePickerModal() {
  const { open, slot, screenX, screenY, close } = useCubePicker();
  const apply = useConfig((s) => s.apply);
  const cubeAssets = useConfig((s) => s.cubeAssets);
  const ref = useRef<HTMLDivElement | null>(null);
  // AI 3D generation — slot-local state (declared before the early
  // return so hook order stays stable across renders).
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Click-outside / Esc closes the picker. We listen on document so
  // taps on the canvas (which the modal sits above) also close.
  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    // Defer one tick so the pointer that OPENED us doesn't immediately
    // close it again.
    const t = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDocPointer, true);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", onDocPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open || slot < 0) return null;
  if (typeof document === "undefined") return null;

  const current = cubeAssets?.[slot] ?? null;

  const setSlot = (value: { url: string; kind: "uploaded" | "generated" | "preset"; label?: string } | null) => {
    const next = [null, null, null, null] as typeof cubeAssets;
    const cur = cubeAssets ?? [];
    for (let j = 0; j < 4; j++) next[j] = cur[j] ?? null;
    next[slot] = value;
    apply({ type: "layout.setCubeAssets", assets: next });
  };

  const onUpload = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result !== "string") return;
      setSlot({ url: r.result, kind: "uploaded", label: file.name });
      close();
    };
    // eslint-disable-next-line no-console
    r.onerror = (e) => { console.error("[CubePickerModal] FileReader error", e); };
    r.readAsDataURL(file);
  };

  const onGenerate3D = async () => {
    const p = aiPrompt.trim();
    if (!p) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const { generateModel } = await import("@/lib/services/falTexture");
      const r = await generateModel(`${p}. Single centred object, clean topology, neutral studio backdrop, suitable as a plinth display piece.`);
      if (r.ok) {
        // The returned GLB URL loads via CubeAsset (same path as preset
        // GLBs). Tag kind:"generated" so the serialiser/export knows its
        // provenance.
        setSlot({ url: r.url, kind: "generated", label: p.slice(0, 32) });
        close();
      } else {
        const lower = r.error.toLowerCase();
        if (lower.includes("no user found") || lower.includes("unauthorized") || lower.includes("invalid") || lower.includes("forbidden")) {
          setAiError("fal.ai key rejected. Check .env.local + rebuild.");
        } else if (lower.includes("not found") || lower.includes("404") || lower.includes("no endpoint")) {
          setAiError("3D model not enabled on this fal.ai account. Enable a text-to-3D model or try another.");
        } else {
          setAiError(r.error);
        }
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  };

  // Position the modal so its top-left lands NEAR the click point, but
  // clamped to the viewport so it never spills off-screen.
  const PAD = 12;
  const W = 280;
  const H = 360;
  const left = Math.min(Math.max(screenX + 12, PAD), window.innerWidth  - W - PAD);
  const top  = Math.min(Math.max(screenY + 12, PAD), window.innerHeight - H - PAD);

  return createPortal(
    <div
      ref={ref}
      data-no-long-press
      role="dialog"
      aria-label="Pick a 3D object for this plinth"
      style={{
        position: "fixed",
        left,
        top,
        width: W,
        background: "rgba(15,16,20,0.96)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 14,
        padding: 12,
        boxShadow: "0 18px 48px -12px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)",
        color: "#fff",
        fontFamily: "var(--font-sans, system-ui)",
        fontSize: 12,
        zIndex: 1000,
        // The canvas captures wheel for ctrl-pinch dolly via capture-phase;
        // this modal sits in the page DOM (not the canvas), so the capture
        // handler doesn't apply. Setting touch-action none stops scroll
        // bleed-through on touch laptops.
        touchAction: "none",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.2 }}>
          {current?.label ?? `Cube ${slot + 1}: pick an object`}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close picker"
          style={{
            width: 22, height: 22, borderRadius: 11,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff", cursor: "pointer", fontSize: 14, lineHeight: 1,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >×</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {CUBE_PRESETS.map((p) => {
          const active = current?.url === p.url;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { setSlot({ url: p.url, kind: "preset", label: p.label }); close(); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px",
                background: active ? "var(--color-accent, #3d7eff)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${active ? "var(--color-accent, #3d7eff)" : "rgba(255,255,255,0.10)"}`,
                borderRadius: 10,
                color: "#fff", cursor: "pointer",
                fontSize: 12, textAlign: "left",
              }}
            >
              <span style={{ fontSize: 16 }}>{p.emoji}</span>
              <span style={{ fontWeight: 500 }}>{p.label}</span>
            </button>
          );
        })}
      </div>

      <label
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 10, padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.07)",
          border: "1px dashed rgba(255,255,255,0.3)",
          cursor: "pointer", fontSize: 12, fontWeight: 500,
        }}
      >
        Upload .glb…
        <input
          type="file"
          accept=".glb,model/gltf-binary,application/octet-stream"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.currentTarget.value = "";
          }}
        />
      </label>

      {/* ✨ AI 3D generation — text-to-3D via fal.ai. Returns a GLB URL
          that loads onto the plinth exactly like a preset. */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>✨ Generate 3D · AI</div>
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="A chrome trophy, a potted bonsai…"
          style={{
            width: "100%", padding: "7px 9px", borderRadius: 8, marginBottom: 6,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box",
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && !aiBusy && aiPrompt.trim()) { void onGenerate3D(); } }}
        />
        <button
          type="button"
          disabled={aiBusy || !aiPrompt.trim()}
          onClick={() => void onGenerate3D()}
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 8,
            background: "var(--color-accent, #3d7eff)", color: "#fff",
            border: "none", fontSize: 12, fontWeight: 600,
            cursor: aiBusy || !aiPrompt.trim() ? "not-allowed" : "pointer",
            opacity: aiBusy || !aiPrompt.trim() ? 0.5 : 1,
          }}
        >
          {aiBusy ? "Generating 3D… (~30s)" : "Generate 3D model"}
        </button>
        {aiError && (
          <div style={{ marginTop: 6, padding: "5px 7px", borderRadius: 6, background: "rgba(255,80,80,0.14)", color: "#ff8a8a", fontSize: 11, lineHeight: 1.3 }}>
            {aiError}
          </div>
        )}
      </div>

      {current && (
        <button
          type="button"
          onClick={() => { setSlot(null); close(); }}
          style={{
            width: "100%", marginTop: 8, padding: "8px 10px",
            background: "transparent",
            border: "1px solid rgba(255,90,90,0.4)",
            borderRadius: 10,
            color: "#ff8a8a", cursor: "pointer",
            fontSize: 12, fontWeight: 500,
          }}
        >
          Clear object
        </button>
      )}
    </div>,
    document.body,
  );
}
