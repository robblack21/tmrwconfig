import type { PendantShape } from "@/lib/schemas";

/** A single BOM row that derives its quantity from the live stand config. */
export type LiveBomLine = {
  id: string;                                     // stable id (used for rate overrides)
  category: "materials" | "labour" | "services" | "logistics";
  label: string;
  unit: string;
  rate: number;                                   // EUR per unit (default; user can override)
  quantity: (cfg: BomCfg) => number;
};

export type BomCfg = {
  widthM: number;
  depthM: number;
  wallHeightM: number;
  trussTopM: number;
  platformHeightM: number;
  pendantEnabled: boolean;
  pendantShape: PendantShape;
  pendantWidthM: number;
  pendantDepthM: number;
  ledWallEnabled: boolean;
  ledWallWidthM: number;
  ledWallHeightM: number;
  plantCount: number;
  sofaCount: number;
  /** When true the kit has its own bespoke dressing (NWRA campsite,
   *  Lufthansa lounge) and the generic counter / vitrines / TVs / sofas
   *  shouldn't be charged. */
  noDefaultDressing: boolean;
};

const perimeter = (cfg: BomCfg) => 2 * (cfg.widthM + cfg.depthM);
const wallAreaM2 = (cfg: BomCfg) => {
  // Approximate the rectangle template's back + 2 half-flanks
  const backArea = cfg.widthM * cfg.wallHeightM;
  const flankArea = 2 * (cfg.depthM / 2) * (cfg.wallHeightM * 0.75);
  return backArea + flankArea;
};
const bayCount = (cfg: BomCfg) => Math.max(3, Math.ceil(cfg.widthM / 1.5));
const platformAreaM2 = (cfg: BomCfg) => cfg.widthM * cfg.depthM;

export const LIVE_BOM: LiveBomLine[] = [
  // ── Materials ──────────────────────────────────────────────────────────────
  { id: "mat.wallBay",  category: "materials", label: "Modular wall bay 3m",          unit: "ea", rate: 280, quantity: (c) => bayCount(c) },
  { id: "mat.corner90", category: "materials", label: "Corner connector 90°",         unit: "ea", rate: 48,  quantity: () => 4 },
  { id: "mat.truss",    category: "materials", label: "Decotruss 290 box",            unit: "lm", rate: 110, quantity: (c) => Math.ceil(perimeter(c)) },
  { id: "mat.trussLeg", category: "materials", label: "Truss vertical leg 4m",        unit: "ea", rate: 460, quantity: () => 4 },
  { id: "mat.platform", category: "materials", label: "Raised platform 1×1m",         unit: "ea", rate: 110, quantity: (c) => Math.ceil(platformAreaM2(c)) },
  { id: "mat.seg",      category: "materials", label: "SEG fabric print",             unit: "m²", rate: 38,  quantity: (c) => Math.round(wallAreaM2(c) * 0.5) },
  { id: "mat.vinyl",    category: "materials", label: "Vinyl applied graphics",       unit: "m²", rate: 28,  quantity: () => 8 },
  // Vitrine + TV counts follow the same booth-width thresholds used by Scene.tsx
  // (`tvCountFor` / `vitrineCountFor`) so the BOM zeroes them out when the
  // booth shrinks past the point where the geometry would clip.
  { id: "mat.glass",    category: "materials", label: "Tempered glass vitrine",       unit: "ea", rate: 680, quantity: (c) => c.noDefaultDressing ? 0 : (c.widthM >= 9 ? 4 : c.widthM >= 5 ? 2 : 0) },
  { id: "mat.tv",       category: "materials", label: "55\" 4K display rental",       unit: "ea", rate: 380, quantity: (c) => c.noDefaultDressing ? 0 : (c.widthM >= 8 ? 2 : c.widthM >= 5.5 ? 1 : 0) },
  { id: "mat.led",      category: "materials", label: "LED tile 0.5×0.5 (2.5mm)",     unit: "ea", rate: 270, quantity: (c) => (c.ledWallEnabled ? Math.ceil((c.ledWallWidthM / 0.5) * (c.ledWallHeightM / 0.5)) : 0) },
  { id: "mat.spot",     category: "materials", label: "Track spotlight 25W",          unit: "ea", rate: 62,  quantity: (c) => Math.max(4, Math.round(c.widthM)) },
  { id: "mat.blade",    category: "materials", label: "Hanging blade luminaire",      unit: "ea", rate: 240, quantity: () => 4 },
  { id: "mat.counter",  category: "materials", label: "Reception counter",            unit: "ea", rate: 480, quantity: (c) => c.noDefaultDressing ? 0 : 1 },
  { id: "mat.stool",    category: "materials", label: "Bar stool",                    unit: "ea", rate: 95,  quantity: (c) => c.noDefaultDressing ? 0 : 4 },
  { id: "mat.sofa",     category: "materials", label: "Lounge sofa",                  unit: "ea", rate: 320, quantity: (c) => c.noDefaultDressing ? 0 : Math.min(c.sofaCount, 2) },
  { id: "mat.plant",    category: "materials", label: "Plant (assorted)",             unit: "ea", rate: 65,  quantity: (c) => c.plantCount },
  { id: "mat.pendant",  category: "materials", label: "Pendant sign",                 unit: "ea", rate: 0,   quantity: (c) => (c.pendantEnabled ? 1 : 0) },
  // ── Labour ────────────────────────────────────────────────────────────────
  { id: "lab.fitter",   category: "labour", label: "Fitter",                          unit: "day", rate: 520, quantity: (c) => Math.ceil(platformAreaM2(c) / 15) },
  { id: "lab.elec",     category: "labour", label: "Electrician",                     unit: "day", rate: 720, quantity: () => 1.5 },
  { id: "lab.graphics", category: "labour", label: "Graphics installer",              unit: "day", rate: 480, quantity: () => 2 },
  { id: "lab.super",    category: "labour", label: "Site supervisor",                 unit: "day", rate: 880, quantity: () => 1 },
  { id: "lab.dismantle",category: "labour", label: "Dismantle",                       unit: "day", rate: 420, quantity: () => 1.5 },
  // ── Services ──────────────────────────────────────────────────────────────
  { id: "svc.wifi",     category: "services", label: "Wifi event 250Mbps",            unit: "day", rate: 460, quantity: () => 4 },
  { id: "svc.power",    category: "services", label: "Power hookup 32A",              unit: "day", rate: 280, quantity: () => 4 },
  { id: "svc.clean",    category: "services", label: "Cleaning daily",                unit: "day", rate: 110, quantity: () => 4 },
  { id: "svc.storage",  category: "services", label: "Storage crate",                 unit: "day", rate: 18,  quantity: () => 8 },
  { id: "svc.sec",      category: "services", label: "Overnight security",            unit: "nt",  rate: 300, quantity: () => 3 },
  // ── Logistics ─────────────────────────────────────────────────────────────
  { id: "log.truck",    category: "logistics", label: "Truck 7.5t (short haul)",      unit: "ea", rate: 460, quantity: () => 2 },
  { id: "log.crates",   category: "logistics", label: "Crates (returnable)",          unit: "ea", rate: 35,  quantity: () => 10 },
];

export type ResolvedLine = LiveBomLine & { qty: number; rateResolved: number; total: number };

/** Resolve quantities + applied rate overrides; returns rows + category subtotals + grand total. */
export function deriveBom(cfg: BomCfg, rateOverrides: Record<string, number>) {
  const lines: ResolvedLine[] = LIVE_BOM.map((l) => {
    const qty = l.quantity(cfg);
    const rateResolved = rateOverrides[l.id] ?? l.rate;
    const total = Math.round(qty * rateResolved);
    return { ...l, qty, rateResolved, total };
  });
  const byCategory = {
    materials: 0,
    labour: 0,
    services: 0,
    logistics: 0,
  } as Record<LiveBomLine["category"], number>;
  for (const l of lines) byCategory[l.category] += l.total;
  const grandLow = Math.round(Object.values(byCategory).reduce((a, b) => a + b, 0));
  const grandHigh = Math.round(grandLow * 1.32);
  return { lines, byCategory, grandLow, grandHigh };
}
