"use client";
import { create } from "zustand";

/**
 * High-frequency / transient values surfaced from inside the Canvas
 * (camera position, target). Kept separate from the config store so
 * 60Hz updates don't trigger BOM / control-panel re-renders.
 */
type LiveState = {
  camPos: [number, number, number];
  camTarget: [number, number, number];
};

export const useLive = create<LiveState>(() => ({
  camPos: [10.5, 4.2, 13.5],
  camTarget: [0, 1.8, 0],
}));
