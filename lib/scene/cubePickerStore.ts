// Transient UI store for the cube-plinth picker overlay. The "+" hotspot
// lives in 3D (drei `<Html>` marker) but the picker MENU itself is a
// flat DOM modal portaled to `document.body` — same shape as the
// long-press editor. This keeps the menu chrome consistent with the
// rest of the configurator instead of looking like a webgl-scaled
// in-canvas widget.
//
// Why a separate store (not configStore)? configStore is the scene-state
// source of truth + serialisable; this is purely transient UI (the open
// flag + screen coords). Kept on its own so the wider store doesn't
// churn every time the user opens / closes the picker.

import { create } from "zustand";

type CubePickerState = {
  open: boolean;
  slot: number;        // -1 when closed
  screenX: number;     // viewport px — used to position the DOM modal
  screenY: number;
  openAt: (slot: number, screenX: number, screenY: number) => void;
  close: () => void;
};

export const useCubePicker = create<CubePickerState>((set) => ({
  open: false,
  slot: -1,
  screenX: 0,
  screenY: 0,
  openAt: (slot, screenX, screenY) => set({ open: true, slot, screenX, screenY }),
  close: () => set({ open: false, slot: -1 }),
}));
