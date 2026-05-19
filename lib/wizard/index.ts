// Public surface of the @standalone Wizard module.
//
// Drop this folder into any sibling project and import from
// `@/lib/wizard`. Dependencies: React 18+, framer-motion. The wizard
// expects a few CSS variables to be defined by the host (see README).

export { Wizard } from "./Wizard";
export { extractDominantColours, harmonise } from "./colour";
export type { HarmonyRule } from "./colour";
export type {
  WizardSize,
  WizardDesignLine,
  WizardEnvironment,
  WizardExtendedColours,
  WizardCustomisation,
  WizardResult,
  WizardState,
  WizardCopy,
  WizardProps,
} from "./types";
