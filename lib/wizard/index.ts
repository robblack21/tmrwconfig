// Public surface of the @standalone Wizard module.
//
// Drop this folder into any sibling project and import from
// `@/lib/wizard`. Dependencies: React 18+, framer-motion. The wizard
// expects a few CSS variables to be defined by the host (see README).

export { Wizard } from "./Wizard";
export { extractDominantColours } from "./colour";
export type {
  WizardSize,
  WizardDesignLine,
  WizardResult,
  WizardCopy,
  WizardProps,
} from "./types";
