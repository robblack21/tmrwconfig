"use client";
import dynamic from "next/dynamic";
import { SceneErrorBoundary } from "./ErrorBoundary";

const CanvasShell = dynamic(() => import("./CanvasShell"), { ssr: false });

export function SceneCanvas() {
  return (
    <SceneErrorBoundary>
      <CanvasShell />
    </SceneErrorBoundary>
  );
}
