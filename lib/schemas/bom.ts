import { z } from "zod";
import { Bilingual } from "./primitives";

export const BomCategory = z.enum([
  "structure",
  "graphics",
  "glass",
  "lighting",
  "av",
  "furniture",
  "labour",
  "services",
  "logistics",
  "curvedCustom",
]);
export type BomCategory = z.infer<typeof BomCategory>;

export const BomGroup = z.enum([
  "stand.construction",
  "graphics",
  "furniture.rental",
  "av",
  "cleaning",
  "install.dismantle.labour",
  "services.utilities",
  "rigging",
  "logistics",
]);
export type BomGroup = z.infer<typeof BomGroup>;

export const BomUnit = z.enum([
  "each",
  "m2",
  "m",
  "kg",
  "day",
  "hour",
  "point",
  "lot",
  "kVA",
  "night",
]);
export type BomUnit = z.infer<typeof BomUnit>;

export const BomLine = z.object({
  id: z.string(),
  category: BomCategory,
  group: BomGroup,
  item: Bilingual,
  qty: z.number(),
  unit: BomUnit,
  unitCostLow: z.number(),
  unitCostHigh: z.number(),
  marginPct: z.number(),
  sellLow: z.number(),
  sellHigh: z.number(),
  reuseEligible: z.boolean(),
  massKg: z.number().nonnegative(),
  embodiedCO2KgLow: z.number().nonnegative(),
  embodiedCO2KgHigh: z.number().nonnegative(),
  source: z.enum(["in-house", "subcontracted"]),
  supplierId: z.string().optional(),
});
export type BomLine = z.infer<typeof BomLine>;

export const MarginPolicy = z.object({
  defaultPct: z.number().default(0.33),
  perCategory: z.record(BomCategory, z.number()).default({}),
  applyToInHouse: z.boolean().default(false),
});
export type MarginPolicy = z.infer<typeof MarginPolicy>;

export const defaultMarginPolicy: MarginPolicy = {
  defaultPct: 0.33,
  perCategory: {
    structure: 0.30,
    graphics: 0.40,
    glass: 0.35,
    lighting: 0.35,
    av: 0.40,
    furniture: 0.30,
    labour: 0.15,
    services: 0.10,
    logistics: 0.15,
    curvedCustom: 0.35,
  },
  applyToInHouse: false,
};

// ── Headline summary derived from a BOM ────────────────────────────────────────

export const BomSummary = z.object({
  totalCostLow: z.number(),
  totalCostHigh: z.number(),
  totalSellLow: z.number(),
  totalSellHigh: z.number(),
  reuseScorePct: z.number(),
  co2eKgLow: z.number(),
  co2eKgHigh: z.number(),
  co2eSavingPct: z.number(),
  labourDays: z.number(),
  printAreaM2: z.number(),
  trussLinearM: z.number(),
  byCategory: z.record(BomCategory, z.object({
    cost: z.tuple([z.number(), z.number()]),
    sell: z.tuple([z.number(), z.number()]),
    lineCount: z.number(),
  })),
});
export type BomSummary = z.infer<typeof BomSummary>;
