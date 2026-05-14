import type { BrandKit } from "@/lib/schemas";
import { asset } from "@/lib/assetPath";

// Seed kits — anchor values pending official-source confirmation (see memory:
// reference_brand_links.md). Logo asset URLs are placeholders until SVGs are
// dropped into /public/brand/<kit>/.

const tdk: BrandKit = {
  id: "brand.tdk",
  name: "TDK",
  palette: {
    primary: "#0073C5",
    secondary: "#FFFFFF",
    accent: "#5BC2E7",
    neutralLight: "#F2F4F8",
    neutralDark: "#0B1730",
  },
  derivation: "splitComplementary",
  logos: {
    primary: { svgUrl: "/brand/tdk/logo-primary.svg", rasterUrl: "/logos/TDK_logo.png", viewBox: [0, 0, 3840, 806], capHeightFraction: 0.68, isMono: false },
    monoLight: { svgUrl: "/brand/tdk/logo-mono-light.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.68, isMono: true },
    monoDark: { svgUrl: "/brand/tdk/logo-mono-dark.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.68, isMono: true },
    icon: { svgUrl: "/brand/tdk/icon-diamond.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Barlow", weights: [500, 700], italic: false, source: "google", cssName: "Barlow" },
    body: { family: "Barlow", weights: [400, 500], italic: false, source: "google", cssName: "Barlow" },
    fallbackGoogle: { display: "Barlow", body: "Barlow" },
  },
  motifs: [{ kind: "chevron", angleDeg: 30, density: 0.4, scale: 1.0 }],
  phrases: [
    { de: "In allem besser.", en: "In Everything, Better." },
    { de: "Technologie, die verbindet.", en: "Technology that connects." },
    { de: "Hochleistung von Anfang an.", en: "Engineered for performance." },
  ],
  rules: { minLogoHeightMm: 60, safeAreaRatio: 1.0, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "fascia", treatment: "printed", paletteRole: "primary", logoVariant: "primary", motifRef: { kind: "chevron", angleDeg: 30, density: 0.4, scale: 1.0 } },
    { surfaceKind: "backWall", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "flankWall", treatment: "printed", paletteRole: "neutralDark", logoVariant: "monoLight" },
    { surfaceKind: "counterFront", treatment: "vinyl", paletteRole: "neutralLight", logoVariant: "icon" },
    { surfaceKind: "soffit", treatment: "printed", paletteRole: "primary", logoVariant: "icon" },
    { surfaceKind: "vitrineEtch", treatment: "etched", paletteRole: "neutralLight", logoVariant: "icon" },
    { surfaceKind: "ledWall", treatment: "led", paletteRole: "primary", logoVariant: "primary" },
    { surfaceKind: "pendantOuter", treatment: "led", paletteRole: "primary", logoVariant: "primary" },
  ],
  pendant: {
    preferredShape: "rectangle",
    alternates: ["squircle", "ring"],
    outerFaceTreatment: "led",
    innerFaceTreatment: "downlight",
  },
};

const tagheuer: BrandKit = {
  id: "brand.tagheuer",
  name: "TAG Heuer",
  palette: {
    primary: "#000000",
    secondary: "#FFFFFF",
    accent: "#D40029",
    neutralLight: "#F4F4F4",
    neutralDark: "#1A1A1A",
  },
  derivation: "complementary",
  logos: {
    primary: { svgUrl: "/brand/tagheuer/logo-primary.svg", rasterUrl: "/logos/TAG_Heuer_Logo.png", viewBox: [0, 0, 3840, 3322], capHeightFraction: 0.7, isMono: false },
    monoLight: { svgUrl: "/brand/tagheuer/logo-mono-light.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: true },
    monoDark: { svgUrl: "/brand/tagheuer/logo-mono-dark.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: true },
    icon: { svgUrl: "/brand/tagheuer/icon-shield.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Cormorant Garamond", weights: [500, 600], italic: false, source: "google", cssName: "Cormorant Garamond" },
    body: { family: "Inter", weights: [400, 500], italic: false, source: "google", cssName: "Inter" },
    fallbackGoogle: { display: "Cormorant Garamond", body: "Inter" },
  },
  motifs: [
    { kind: "lineGrid", spacing: 0.05, angleDeg: 0, weight: 0.5 },
    { kind: "chevron", angleDeg: 60, density: 0.2, scale: 0.6 },
  ],
  phrases: [
    { de: "Don't Crack Under Pressure.", en: "Don't Crack Under Pressure." },
    { de: "Avantgarde seit 1860.", en: "Avant-Garde Since 1860." },
    { de: "Schweizer Präzision.", en: "Swiss Precision." },
  ],
  rules: { minLogoHeightMm: 50, safeAreaRatio: 1.2, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "backWall", treatment: "etched", paletteRole: "neutralDark", logoVariant: "primary" },
    { surfaceKind: "vitrineEtch", treatment: "etched", paletteRole: "neutralLight", logoVariant: "icon" },
    { surfaceKind: "counterFront", treatment: "vinyl", paletteRole: "neutralDark", logoVariant: "icon" },
    { surfaceKind: "ledWall", treatment: "led", paletteRole: "neutralDark", logoVariant: "primary" },
  ],
  pendant: {
    preferredShape: "none",      // pendant disabled by default for Tag Heuer
    alternates: ["squircle"],
    outerFaceTreatment: "etched",
    innerFaceTreatment: "matte",
  },
};

const cargill: BrandKit = {
  id: "brand.cargill",
  name: "Cargill",
  palette: {
    primary: "#1B4332",
    secondary: "#F5EFE0",
    accent: "#E57A2A",
    neutralLight: "#FFFFFF",
    neutralDark: "#0C2A1F",
  },
  derivation: "triadic",
  logos: {
    primary: { svgUrl: "/brand/cargill/logo-primary.svg", rasterUrl: "/logos/Cargill_logo.png", viewBox: [0, 0, 3840, 1717], capHeightFraction: 0.65, isMono: false },
    monoLight: { svgUrl: "/brand/cargill/logo-mono-light.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.65, isMono: true },
    monoDark: { svgUrl: "/brand/cargill/logo-mono-dark.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.65, isMono: true },
    icon: { svgUrl: "/brand/cargill/icon-leaf.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "DM Sans", weights: [500, 700], italic: false, source: "google", cssName: "DM Sans" },
    body: { family: "DM Sans", weights: [400, 500], italic: false, source: "google", cssName: "DM Sans" },
    fallbackGoogle: { display: "DM Sans", body: "DM Sans" },
  },
  motifs: [
    { kind: "pillCluster", pillCount: 14, sizes: [0.4, 0.6, 0.8, 1.2], spacing: 0.3 },
    { kind: "honeycomb", hexSizeM: 0.06, fillAlpha: 0.0, edgeWeight: 0.4 },
    { kind: "arch", cornerRadius: 0.6, legHeightFrac: 0.6 },
  ],
  phrases: [
    { de: "Nahrung. Verantwortung. Zukunft.", en: "Nourishing. Responsible. Future." },
    { de: "Globale Präsenz. Lokaler Einfluss.", en: "Global presence. Local impact." },
    { de: "Auf das nächste Level.", en: "Next Level. Realized." },
  ],
  rules: { minLogoHeightMm: 70, safeAreaRatio: 1.0, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "backWall", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight", motifRef: { kind: "pillCluster", pillCount: 14, sizes: [0.4, 0.6, 0.8, 1.2], spacing: 0.3 } },
    { surfaceKind: "flankWall", treatment: "printed", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "counterFront", treatment: "vinyl", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "carpetInsert", treatment: "vinyl", paletteRole: "primary", logoVariant: "skip" },
    { surfaceKind: "pendantOuter", treatment: "led", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "archEntry", treatment: "printed", paletteRole: "primary", logoVariant: "skip", motifRef: { kind: "honeycomb", hexSizeM: 0.06, fillAlpha: 0, edgeWeight: 0.4 } },
    { surfaceKind: "drumTier", treatment: "printed", paletteRole: "primary", logoVariant: "skip", motifRef: { kind: "pillCluster", pillCount: 14, sizes: [0.4, 0.6, 0.8, 1.2], spacing: 0.3 } },
  ],
  pendant: {
    preferredShape: "ring",
    alternates: ["rectangle", "squircle", "ring"],
    outerFaceTreatment: "led",
    innerFaceTreatment: "downlight",
  },
};

const still: BrandKit = {
  id: "brand.still",
  name: "STILL",
  palette: {
    primary: "#FF6600",            // STILL orange (anchor — confirm from official spec)
    secondary: "#FFFFFF",
    accent: "#222222",
    neutralLight: "#F4F4F4",
    neutralDark: "#0E0E0E",
  },
  derivation: "splitComplementary",
  logos: {
    primary: { svgUrl: "/brand/still/logo-primary.svg", rasterUrl: "/logos/Still-Logo.png", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: false },
    monoLight: { svgUrl: "/brand/still/logo-mono-light.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: true },
    monoDark: { svgUrl: "/brand/still/logo-mono-dark.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: true },
    icon: { svgUrl: "/brand/still/icon.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Barlow Condensed", weights: [600, 700, 900], italic: false, source: "google", cssName: "Barlow Condensed" },
    body: { family: "Barlow", weights: [400, 500], italic: false, source: "google", cssName: "Barlow" },
    fallbackGoogle: { display: "Barlow Condensed", body: "Barlow" },
  },
  motifs: [
    { kind: "chevron", angleDeg: 60, density: 0.6, scale: 1.4 },   // STILL's ACT ORANGE diagonal chevrons
    { kind: "lineGrid", spacing: 0.08, angleDeg: 60, weight: 0.8 },
  ],
  phrases: [
    { de: "Erst denken. Dann handeln.", en: "Think smart. Act orange." },
    { de: "Logistik in Bewegung.", en: "Logistics in motion." },
    { de: "ACT ORANGE.", en: "ACT ORANGE." },
  ],
  rules: { minLogoHeightMm: 60, safeAreaRatio: 1.0, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "fascia", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight", motifRef: { kind: "chevron", angleDeg: 60, density: 0.6, scale: 1.4 } },
    { surfaceKind: "backWall", treatment: "printed", paletteRole: "neutralLight", logoVariant: "primary", motifRef: { kind: "chevron", angleDeg: 60, density: 0.6, scale: 1.4 } },
    { surfaceKind: "flankWall", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "counterFront", treatment: "vinyl", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "soffit", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "ledWall", treatment: "led", paletteRole: "primary", logoVariant: "primary" },
    { surfaceKind: "pendantOuter", treatment: "led", paletteRole: "primary", logoVariant: "monoLight" },
  ],
  pendant: {
    preferredShape: "squircle",       // soft industrial — picks up the LogiMAT 2026-93 hanging cubes vibe
    alternates: ["rectangle", "squircle"],
    outerFaceTreatment: "printed",
    innerFaceTreatment: "downlight",
  },
};

const zeiss: BrandKit = {
  id: "brand.zeiss",
  name: "ZEISS",
  palette: {
    primary: "#0072CE",       // Zeiss Blue (anchor — confirm from brand guidelines)
    secondary: "#FFFFFF",
    accent: "#FFCB05",        // Zeiss yellow accent
    neutralLight: "#F4F4F4",
    neutralDark: "#000000",
  },
  derivation: "complementary",
  logos: {
    primary: { svgUrl: "/brand/zeiss/logo-primary.svg", rasterUrl: "/logos/Zeiss_logo.png", viewBox: [0, 0, 1280, 1280], capHeightFraction: 0.7, isMono: false },
    monoLight: { svgUrl: "/brand/zeiss/logo-mono-light.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: true },
    monoDark: { svgUrl: "/brand/zeiss/logo-mono-dark.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: true },
    icon: { svgUrl: "/brand/zeiss/icon.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Plus Jakarta Sans", weights: [500, 700], italic: false, source: "google", cssName: "Plus Jakarta Sans" },
    body: { family: "Inter", weights: [400, 500], italic: false, source: "google", cssName: "Inter" },
    fallbackGoogle: { display: "Plus Jakarta Sans", body: "Inter" },
  },
  motifs: [
    { kind: "lineGrid", spacing: 0.04, angleDeg: 0, weight: 0.4 },
  ],
  phrases: [
    { de: "Seeing beyond.", en: "Seeing beyond." },
    { de: "Optische Präzision.", en: "Optical precision." },
    { de: "Engineering, gesehen.", en: "Engineering, visualised." },
  ],
  rules: { minLogoHeightMm: 55, safeAreaRatio: 1.1, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "fascia", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "backWall", treatment: "printed", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "flankWall", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "counterFront", treatment: "vinyl", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "vitrineEtch", treatment: "etched", paletteRole: "neutralLight", logoVariant: "icon" },
    { surfaceKind: "ledWall", treatment: "led", paletteRole: "primary", logoVariant: "primary" },
    { surfaceKind: "pendantOuter", treatment: "led", paletteRole: "primary", logoVariant: "monoLight" },
  ],
  pendant: {
    preferredShape: "squircle",     // optical / scientific feel — soft modernist
    alternates: ["rectangle", "squircle", "ring"],
    outerFaceTreatment: "led",
    innerFaceTreatment: "downlight",
  },
};

const exacom: BrandKit = {
  id: "brand.exacom",
  name: "EXACOM",
  palette: {
    primary: "#4DAA3F",        // green chevron (anchor — confirm)
    secondary: "#3C4046",      // charcoal grey
    accent: "#A4D65E",          // brighter lime accent
    neutralLight: "#FFFFFF",
    neutralDark: "#1F2227",
  },
  derivation: "analogous",
  logos: {
    primary: { svgUrl: "/brand/exacom/logo-primary.svg", rasterUrl: "/logos/exacom-logo.png", viewBox: [0, 0, 4434, 1216], capHeightFraction: 0.65, isMono: false },
    monoLight: { svgUrl: "/brand/exacom/logo-mono-light.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.65, isMono: true },
    monoDark: { svgUrl: "/brand/exacom/logo-mono-dark.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.65, isMono: true },
    icon: { svgUrl: "/brand/exacom/icon-x.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Source Sans 3", weights: [500, 700], italic: false, source: "google", cssName: "Source Sans 3" },
    body: { family: "Source Sans 3", weights: [400, 500], italic: false, source: "google", cssName: "Source Sans 3" },
    fallbackGoogle: { display: "Source Sans 3", body: "Source Sans 3" },
  },
  motifs: [
    { kind: "chevron", angleDeg: 0, density: 0.5, scale: 1.2 },   // their X / arrow chevron
    { kind: "arrowSweep", curvature: 0.1, count: 6 },
  ],
  phrases: [
    { de: "Datengetriebene Fertigung.", en: "Data-driven manufacturing." },
    { de: "Präzision durch Analyse.", en: "Precision through analysis." },
    { de: "Industrial intelligence.", en: "Industrial intelligence." },
  ],
  rules: { minLogoHeightMm: 50, safeAreaRatio: 1.0, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "fascia", treatment: "printed", paletteRole: "secondary", logoVariant: "primary", motifRef: { kind: "chevron", angleDeg: 0, density: 0.5, scale: 1.2 } },
    { surfaceKind: "backWall", treatment: "printed", paletteRole: "secondary", logoVariant: "monoLight", motifRef: { kind: "arrowSweep", curvature: 0.1, count: 6 } },
    { surfaceKind: "flankWall", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "counterFront", treatment: "vinyl", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "ledWall", treatment: "led", paletteRole: "primary", logoVariant: "primary" },
    { surfaceKind: "pendantOuter", treatment: "led", paletteRole: "primary", logoVariant: "monoLight" },
  ],
  pendant: {
    preferredShape: "rectangle",     // industrial, no-nonsense
    alternates: ["rectangle", "squircle"],
    outerFaceTreatment: "led",
    innerFaceTreatment: "downlight",
  },
};

const lecole: BrandKit = {
  id: "brand.lecole",
  name: "L'École",
  palette: {
    primary: "#3B2F26",            // dark warm brown — heritage / craft
    secondary: "#F4ECD8",          // cream
    accent: "#C8A45C",              // brushed gold
    neutralLight: "#FFFBF1",
    neutralDark: "#1A1410",
  },
  derivation: "analogous",
  logos: {
    primary: { svgUrl: "/brand/lecole/logo-primary.svg", rasterUrl: "/logos/lécole-school-of-jewelry-arts-supported-by-van-cleef-arpels-opens-a-new-campus-in-the-middle-east-1.jpg", viewBox: [0, 0, 800, 400], capHeightFraction: 0.7, isMono: false },
    monoLight: { svgUrl: "/brand/lecole/logo-mono-light.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: true },
    monoDark: { svgUrl: "/brand/lecole/logo-mono-dark.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: true },
    icon: { svgUrl: "/brand/lecole/icon.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Cormorant Garamond", weights: [400, 500, 600], italic: true, source: "google", cssName: "Cormorant Garamond" },
    body: { family: "Cormorant Garamond", weights: [400, 500], italic: false, source: "google", cssName: "Cormorant Garamond" },
    fallbackGoogle: { display: "Cormorant Garamond", body: "Cormorant Garamond" },
  },
  motifs: [
    { kind: "lineGrid", spacing: 0.06, angleDeg: 45, weight: 0.3 },
  ],
  phrases: [
    { de: "L'art du bijou.", en: "The art of jewelry." },
    { de: "Patrimoine vivant.", en: "Living heritage." },
    { de: "Savoir-faire.", en: "Craftsmanship." },
  ],
  rules: { minLogoHeightMm: 80, safeAreaRatio: 1.5, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "backWall", treatment: "etched", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "flankWall", treatment: "printed", paletteRole: "secondary", logoVariant: "monoDark" },
    { surfaceKind: "counterFront", treatment: "etched", paletteRole: "primary", logoVariant: "icon" },
    { surfaceKind: "vitrineEtch", treatment: "etched", paletteRole: "accent", logoVariant: "icon" },
    { surfaceKind: "pendantOuter", treatment: "etched", paletteRole: "secondary", logoVariant: "primary" },
  ],
  pendant: {
    preferredShape: "squircle",     // soft, refined, atelier
    alternates: ["squircle", "ring"],
    outerFaceTreatment: "etched",
    innerFaceTreatment: "downlight",
  },
  scene: {
    wallColor: "#1F1B17",            // dark anthracite — atelier feel
    floorColor: "#2A2520",
    giMultiplier: 0.45,              // toned-down global illumination
    keyMultiplier: 0.75,
    youtubeId: "aqz-KE-bpKQ",        // placeholder: Big Buck Bunny CC. Replace with brand video.
  },
};

const swisskrono: BrandKit = {
  id: "brand.swisskrono",
  name: "Swiss Krono",
  palette: {
    primary: "#005B92",            // anchor blue (confirm from official)
    secondary: "#FFFFFF",
    accent: "#E30613",              // red
    neutralLight: "#F4F4F4",
    neutralDark: "#0B1F2A",
  },
  derivation: "complementary",
  logos: {
    primary: { svgUrl: "/brand/swisskrono/logo-primary.svg", rasterUrl: "/logos/swiss-krono-logo-png_seeklogo-393486.png", viewBox: [0, 0, 800, 240], capHeightFraction: 0.7, isMono: false },
    monoLight: { svgUrl: "/brand/swisskrono/logo-mono-light.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: true },
    monoDark: { svgUrl: "/brand/swisskrono/logo-mono-dark.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.7, isMono: true },
    icon: { svgUrl: "/brand/swisskrono/icon.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Barlow", weights: [500, 700], italic: false, source: "google", cssName: "Barlow" },
    body: { family: "Barlow", weights: [400, 500], italic: false, source: "google", cssName: "Barlow" },
    fallbackGoogle: { display: "Barlow", body: "Barlow" },
  },
  motifs: [
    { kind: "lineGrid", spacing: 0.1, angleDeg: 0, weight: 0.6 },
  ],
  phrases: [
    { de: "Holz, das verbindet.", en: "Wood that connects." },
    { de: "Schweizer Präzision.", en: "Swiss precision." },
    { de: "Nachhaltig gefertigt.", en: "Sustainably crafted." },
  ],
  rules: { minLogoHeightMm: 60, safeAreaRatio: 1.0, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "fascia", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "backWall", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "flankWall", treatment: "printed", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "counterFront", treatment: "vinyl", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "pendantOuter", treatment: "led", paletteRole: "primary", logoVariant: "monoLight" },
  ],
  pendant: {
    preferredShape: "rectangle",
    alternates: ["rectangle", "squircle"],
    outerFaceTreatment: "led",
    innerFaceTreatment: "downlight",
  },
  scene: {
    wallColor: "#1a1a1a",            // dark backdrop for the wood-sample wall (per Swiss Krono showroom ref)
    floorColor: "#dcd5c4",
    // Swiss Krono needs floor space for the moss wall + sample plinths.
    defaultTier: "L",
    defaultWidthM: 16,
    defaultDepthM: 12,
    props: [
      // Sample-shelf row on the back wall side
      { kind: "whiteShelfRow", position: [0, 0, -2.0], rotationY: 0, tintHex: "#0e0e0e", cubeTint: "#005B92", cubeCount: 7, cubeSize: 0.4 },
      // Moss wall — flush against the LEFT side wall, facing inward.
      // x = -widthM/2 + small inset; rotation puts the wall's face into +X.
      { kind: "plantWall", position: [-7.8, 0, 0], rotationY: -Math.PI / 2, heightM: 3.4 },
      // Worktable centre-front — sits ON the platform now (visible-mesh bbox
      // ground-pins it correctly; previous y=0.15 was a workaround).
      { kind: "worktable", position: [1.4, 0, 1.0], rotationY: 0, heightM: 1.05 },
      // Two LED towers flanking the front entrance
      { kind: "ledTower", position: [-3, 1.4, 3.0], heightM: 2.8, widthM: 0.4 },
      { kind: "ledTower", position: [ 3, 1.4, 3.0], heightM: 2.8, widthM: 0.4 },
    ],
  },
};

const schott: BrandKit = {
  id: "brand.schott",
  name: "SCHOTT",
  palette: {
    primary: "#1E68B7",          // SCHOTT corporate blue (anchor — confirm)
    secondary: "#FFFFFF",
    accent: "#9CD0F0",            // pale glass blue
    neutralLight: "#F4F7FA",
    neutralDark: "#08243E",
  },
  derivation: "monochrome",
  logos: {
    primary: { svgUrl: "/brand/schott/logo-primary.svg", rasterUrl: "/logos/Schott_AG_Logo_2022.svg.png", viewBox: [0, 0, 1280, 626], capHeightFraction: 0.65, isMono: false },
    monoLight: { svgUrl: "/brand/schott/logo-mono-light.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.65, isMono: true },
    monoDark: { svgUrl: "/brand/schott/logo-mono-dark.svg", viewBox: [0, 0, 200, 60], capHeightFraction: 0.65, isMono: true },
    icon: { svgUrl: "/brand/schott/icon.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Inter", weights: [500, 600, 700], italic: false, source: "google", cssName: "Inter" },
    body: { family: "Inter", weights: [400, 500], italic: false, source: "google", cssName: "Inter" },
    fallbackGoogle: { display: "Inter", body: "Inter" },
  },
  motifs: [
    { kind: "lineGrid", spacing: 0.04, angleDeg: 0, weight: 0.3 },
  ],
  phrases: [
    { de: "Glas, das Zukunft trägt.", en: "Glass, carrying the future." },
    { de: "Optische Brillanz.", en: "Optical brilliance." },
    { de: "Material für Leben.", en: "Material for life." },
  ],
  rules: { minLogoHeightMm: 60, safeAreaRatio: 1.0, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "fascia", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "backWall", treatment: "etched", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "flankWall", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "vitrineEtch", treatment: "etched", paletteRole: "accent", logoVariant: "icon" },
    { surfaceKind: "ledWall", treatment: "led", paletteRole: "primary", logoVariant: "primary" },
    { surfaceKind: "pendantOuter", treatment: "led", paletteRole: "primary", logoVariant: "monoLight" },
  ],
  pendant: {
    preferredShape: "squircle",     // glass / optical cues — soft modernist
    alternates: ["squircle", "ring"],
    outerFaceTreatment: "led",
    innerFaceTreatment: "downlight",
  },
};

// ET Global "blank" template — used as the starting point when the user picks
// "Create new brand" on the homepage. Neutral grey palette, ET orange accent.
export const etglobalBlank: BrandKit = {
  id: "brand.new",
  name: "ET Global",
  palette: {
    primary: "#22252B",         // graphite — readable backdrop
    secondary: "#FFFFFF",
    accent: "#EE7F1A",           // ET Global orange
    neutralLight: "#F5F5F5",
    neutralDark: "#0F1115",
  },
  derivation: "complementary",
  logos: {
    primary: { svgUrl: "/brand/etglobal/logo-primary.svg", rasterUrl: "/logos/etgloballogotrans.webp", viewBox: [0, 0, 600, 200], capHeightFraction: 0.6, isMono: false },
    monoLight: { svgUrl: "/brand/etglobal/logo-mono-light.svg", rasterUrl: "/logos/etgloballogotrans.webp", viewBox: [0, 0, 600, 200], capHeightFraction: 0.6, isMono: true },
    monoDark:  { svgUrl: "/brand/etglobal/logo-mono-dark.svg",  rasterUrl: "/logos/etgloballogotrans.webp", viewBox: [0, 0, 600, 200], capHeightFraction: 0.6, isMono: true },
    icon: { svgUrl: "/brand/etglobal/icon.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Inter", weights: [500, 600, 700], italic: false, source: "google", cssName: "Inter" },
    body:    { family: "Inter", weights: [400, 500],      italic: false, source: "google", cssName: "Inter" },
    fallbackGoogle: { display: "Inter", body: "Inter" },
  },
  motifs: [],
  phrases: [
    { de: "Brand Spaces.", en: "Brand Spaces." },
    { de: "Designed to deliver.", en: "Designed to deliver." },
  ],
  rules: { minLogoHeightMm: 60, safeAreaRatio: 1.0, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "fascia",   treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "backWall", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "counterFront", treatment: "vinyl", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "pendantOuter", treatment: "led", paletteRole: "accent", logoVariant: "monoLight" },
  ],
  pendant: {
    preferredShape: "rectangle",
    alternates: ["rectangle", "squircle", "ring"],
    outerFaceTreatment: "led",
    innerFaceTreatment: "downlight",
  },
};

// Brand-approved video for each kit's video wall. Used as the iframe ID
// on the LED panel (the helper appends &autoplay=1&mute=1&loop=1&playlist=…).
const KIT_YOUTUBE: Record<string, string> = {
  "brand.tdk":        "u8knkGp_Uaw",
  "brand.tagheuer":   "9WNmVTU31ik",
  "brand.cargill":    "oIa5mYAr9Ko",
  "brand.still":      "4Bq2N-HQXKg",
  "brand.zeiss":      "BWDL58Ybycg",
  "brand.exacom":     "zZrpOcWy2f0",
  "brand.lecole":     "nBFq1GVq5qI",
  "brand.swisskrono": "u4ofcsBZ_6I",
  "brand.schott":     "U8s7x6nqlPQ",
  "brand.nissan":     "n8n6dWs9pos",
  "brand.neura":      "kydEYc0rk9Q",
  "brand.lufthansa":  "P83ARC8SLlM",
  "brand.nrwa":       "P6lgjODZkdU",
  "brand.etglobal":   "dzZiIF91c1A",
  "brand.new":        "dzZiIF91c1A",
};

// Wall graphics and procedural motifs — first pass
schott.scene = { ...schott.scene, wallGraphic: "/glb/brand-hero/schott/schottwallpaper.png" };
exacom.scene = { ...exacom.scene, wallGraphic: "/glb/brand-hero/exacom/reduces-reject-rates-3-2048x1035.png" };
cargill.scene = { ...cargill.scene, wallMotif: "dots" };
still.scene   = { ...still.scene,   wallMotif: "stripes.diagonal" };
tdk.scene     = { ...tdk.scene,     wallMotif: "hex" };

const nissan: BrandKit = {
  id: "brand.nissan",
  name: "Nissan",
  palette: {
    primary: "#C3002F",          // Nissan red
    secondary: "#FFFFFF",
    accent: "#1A1A1A",
    neutralLight: "#F4F4F4",
    neutralDark: "#0A0A0A",
  },
  derivation: "complementary",
  logos: {
    primary: { svgUrl: "/brand/nissan/logo-primary.svg", rasterUrl: "/logos/nissanlogo.jpg", viewBox: [0, 0, 1000, 600], capHeightFraction: 0.7, isMono: false },
    monoLight: { svgUrl: "/brand/nissan/logo-mono-light.svg", rasterUrl: "/logos/nissanlogo.jpg", viewBox: [0, 0, 1000, 600], capHeightFraction: 0.7, isMono: true },
    monoDark: { svgUrl: "/brand/nissan/logo-mono-dark.svg", rasterUrl: "/logos/nissanlogo.jpg", viewBox: [0, 0, 1000, 600], capHeightFraction: 0.7, isMono: true },
    icon: { svgUrl: "/brand/nissan/icon.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Inter", weights: [500, 700], italic: false, source: "google", cssName: "Inter" },
    body: { family: "Inter", weights: [400, 500], italic: false, source: "google", cssName: "Inter" },
  },
  motifs: [],
  phrases: [
    { de: "Dare to do.", en: "Dare to do." },
    { de: "Innovation that excites.", en: "Innovation that excites." },
  ],
  rules: { minLogoHeightMm: 60, safeAreaRatio: 1, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "backWall", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "pendantOuter", treatment: "led", paletteRole: "primary", logoVariant: "monoLight" },
  ],
  pendant: { preferredShape: "ring", alternates: ["ring", "rectangle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: {
    // Nissan ships the Patrol GLB as a hero — needs room.
    defaultTier: "L",
    defaultWidthM: 18,
    defaultDepthM: 12,
  },
};

const neura: BrandKit = {
  id: "brand.neura",
  name: "NEURA",
  palette: {
    primary: "#0E1014",          // near-black
    secondary: "#FFFFFF",
    accent: "#00C2FF",            // electric blue
    neutralLight: "#F4F4F4",
    neutralDark: "#000000",
  },
  derivation: "complementary",
  logos: {
    primary: { svgUrl: "/brand/neura/logo-primary.svg", rasterUrl: "/logos/neura.svg", viewBox: [0, 0, 400, 200], capHeightFraction: 0.7, isMono: false },
    monoLight: { svgUrl: "/brand/neura/logo-mono-light.svg", rasterUrl: "/logos/neura.svg", viewBox: [0, 0, 400, 200], capHeightFraction: 0.7, isMono: true },
    monoDark: { svgUrl: "/brand/neura/logo-mono-dark.svg", rasterUrl: "/logos/neura.svg", viewBox: [0, 0, 400, 200], capHeightFraction: 0.7, isMono: true },
    icon: { svgUrl: "/brand/neura/icon.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Inter", weights: [600, 700], italic: false, source: "google", cssName: "Inter" },
    body: { family: "Inter", weights: [400, 500], italic: false, source: "google", cssName: "Inter" },
  },
  motifs: [],
  phrases: [
    { de: "Robotics, redefined.", en: "Robotics, redefined." },
    { de: "Cognitive automation.", en: "Cognitive automation." },
  ],
  rules: { minLogoHeightMm: 50, safeAreaRatio: 1, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "backWall", treatment: "printed", paletteRole: "primary", logoVariant: "monoLight" },
    { surfaceKind: "pendantOuter", treatment: "led", paletteRole: "primary", logoVariant: "monoLight" },
  ],
  pendant: { preferredShape: "wedge", alternates: ["wedge", "rectangle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
};

// ET Global as an actual selectable kit (in addition to the etglobalBlank template).
const etglobal: BrandKit = { ...etglobalBlank, id: "brand.etglobal", name: "ET Global" };

// Lufthansa Group — deep blue corporate, hero arc ribbon over an ultrawide cinema screen.
const lufthansa: BrandKit = {
  id: "brand.lufthansa",
  name: "Lufthansa Group",
  palette: {
    primary: "#05164D",          // Lufthansa navy
    secondary: "#FFFFFF",
    accent: "#F6A500",            // crane-yellow accent
    neutralLight: "#F4F6FA",
    neutralDark: "#020A24",
  },
  derivation: "monochrome",
  logos: {
    primary:   { svgUrl: "/brand/lufthansa/logo-primary.svg",  rasterUrl: "/logos/lufthansagroup-01.png", viewBox: [0, 0, 800, 200], capHeightFraction: 0.7, isMono: false },
    monoLight: { svgUrl: "/brand/lufthansa/logo-mono-light.svg", rasterUrl: "/logos/lufthansagroup-01.png", viewBox: [0, 0, 800, 200], capHeightFraction: 0.7, isMono: true },
    monoDark:  { svgUrl: "/brand/lufthansa/logo-mono-dark.svg",  rasterUrl: "/logos/lufthansagroup-01.png", viewBox: [0, 0, 800, 200], capHeightFraction: 0.7, isMono: true },
    icon:      { svgUrl: "/brand/lufthansa/icon.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Inter", weights: [500, 700], italic: false, source: "google", cssName: "Inter" },
    body:    { family: "Inter", weights: [400, 500], italic: false, source: "google", cssName: "Inter" },
  },
  motifs: [],
  phrases: [
    { de: "Nonstop you.", en: "Nonstop you." },
    { de: "World of premium.", en: "Explore the premium experience." },
  ],
  rules: { minLogoHeightMm: 60, safeAreaRatio: 1, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "fascia",        treatment: "printed", paletteRole: "primary",     logoVariant: "monoLight" },
    { surfaceKind: "backWall",      treatment: "printed", paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "pendantOuter",  treatment: "led",     paletteRole: "primary",     logoVariant: "monoLight" },
  ],
  pendant: { preferredShape: "rectangle", alternates: ["rectangle", "ring"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: {
    noDefaultDressing: true,        // open lounge — no generic counter / vitrines / sofas
    props: [
      { kind: "spiralRibbon", color: "#05164D", bandM: 0.9 },
      { kind: "cinemaScreen", widthFrac: 0.95, heightFrac: 0.55, yFrac: 0.55 },
      { kind: "curvedBack", color: "#05164D", arcDeg: 120 },
    ],
  },
};

// National Waste & Recycling Association — campsite-style green tent with
// wood posts, hero airstream caravan and campfire seating.
const nrwa: BrandKit = {
  id: "brand.nrwa",
  name: "NWRA",
  palette: {
    primary: "#1aa86d",          // tent-canvas green
    secondary: "#FFFFFF",
    accent: "#d33b2d",            // red campaign panel
    neutralLight: "#f1ecdd",
    neutralDark: "#1c2a20",
  },
  derivation: "analogous",
  logos: {
    primary:   { svgUrl: "/brand/nrwa/logo-primary.svg", rasterUrl: "/logos/national-waste-and-recycling-association-vector-logo.png", viewBox: [0, 0, 1000, 600], capHeightFraction: 0.7, isMono: false },
    monoLight: { svgUrl: "/brand/nrwa/logo-mono-light.svg", rasterUrl: "/logos/national-waste-and-recycling-association-vector-logo.png", viewBox: [0, 0, 1000, 600], capHeightFraction: 0.7, isMono: true },
    monoDark:  { svgUrl: "/brand/nrwa/logo-mono-dark.svg",  rasterUrl: "/logos/national-waste-and-recycling-association-vector-logo.png", viewBox: [0, 0, 1000, 600], capHeightFraction: 0.7, isMono: true },
    icon:      { svgUrl: "/brand/nrwa/icon.svg", viewBox: [0, 0, 60, 60], capHeightFraction: 1, isMono: false },
  },
  typography: {
    display: { family: "Inter", weights: [600, 800], italic: false, source: "google", cssName: "Inter" },
    body:    { family: "Inter", weights: [400, 500], italic: false, source: "google", cssName: "Inter" },
  },
  motifs: [],
  phrases: [
    { de: "Skip the bin.", en: "Skip the bin — turn your batteries in." },
    { de: "Recycle right.",  en: "Recycle right." },
  ],
  rules: { minLogoHeightMm: 60, safeAreaRatio: 1.1, contrastMin: 4.5, disallowedBgs: [] },
  intents: [
    { surfaceKind: "fascia",       treatment: "printed", paletteRole: "primary",      logoVariant: "monoLight" },
    { surfaceKind: "backWall",     treatment: "fabric",  paletteRole: "neutralLight", logoVariant: "primary" },
    { surfaceKind: "counterFront", treatment: "vinyl",   paletteRole: "accent",       logoVariant: "primary" },
  ],
  pendant: { preferredShape: "none", alternates: [], outerFaceTreatment: "fabric", innerFaceTreatment: "matte" },
  scene: {
    floorColor: "#3a7a47",         // astroturf carpet visible in the reference shot
    noDefaultDressing: true,        // campsite is bespoke — no generic counter / vitrines / sofas / plants
    awningDecal: "/glb/brand-hero/nrwa/Skip-The-Bin_Shadow.webp",
    props: [
      { kind: "tentRoof", color: "#1aa86d", eaveAmp: 0.55, cycles: 6, liftM: 0.8 },
      // Hero airstream — pushed left so it doesn't overlap the noticeboard.
      { kind: "airstream",    position: [-2.6, 0, -1.6], rotationY: 0,         heightM: 2.4 },
      // Campfire ring + log bench in front of the caravan, with chairs around
      // it. Cluster shifted right of the caravan so it sits in the open
      // floor between the airstream and the noticeboard.
      { kind: "campfire",     position: [ 1.2, 0,  0.9], rotationY: 0,         heightM: 0.55 },
      { kind: "logBench",     position: [ 1.2, 0,  1.8], rotationY: 0,         heightM: 0.45 },
      { kind: "campingChair", position: [ 0.2, 0,  0.9], rotationY: Math.PI/2, heightM: 0.85 },
      { kind: "campingChair", position: [ 2.2, 0,  0.9], rotationY: -Math.PI/2, heightM: 0.85 },
      { kind: "campingChair", position: [ 1.2, 0,  0.0], rotationY: Math.PI,    heightM: 0.85 },
      // Tree stumps as side tables
      { kind: "treeStump",    position: [-0.6, 0,  0.2], rotationY: 0,         heightM: 0.45 },
      { kind: "treeStump",    position: [ 2.8, 0,  1.6], rotationY: 0.5,       heightM: 0.45 },
      // Cork noticeboard with flyers — back-right corner, off the caravan
      { kind: "noticeboard",  position: [ 3.0, 0, -1.4], rotationY: -Math.PI/5, heightM: 1.7 },
    ],
  },
};

export const seedBrandKits = { etglobalBlank, tdk, tagheuer, cargill, still, zeiss, exacom, lecole, swisskrono, schott, nissan, neura, etglobal, lufthansa, nrwa };
export const seedBrandKitList: BrandKit[] = [etglobal, tdk, tagheuer, cargill, still, zeiss, exacom, lecole, swisskrono, schott, nissan, neura, lufthansa, nrwa];

// Lookup that includes the blank ET Global template (used by the homepage's
// "Create new" tile). Not part of `seedBrandKitList` so it doesn't clutter the
// in-app brand picker grid.
export function findKitById(id: string): BrandKit | undefined {
  if (id === etglobalBlank.id) return etglobalBlank;
  return seedBrandKitList.find((k) => k.id === id);
}

// Seed brand-approved YouTube IDs on every kit (overwriting inline placeholders).
for (const k of seedBrandKitList) {
  const id = KIT_YOUTUBE[k.id];
  if (!id) continue;
  if (!k.scene) k.scene = { youtubeId: id };
  else k.scene.youtubeId = id;
}
if (etglobalBlank.scene) etglobalBlank.scene.youtubeId = KIT_YOUTUBE["brand.new"];
else etglobalBlank.scene = { youtubeId: KIT_YOUTUBE["brand.new"] };

// ET Global pendant defaults to off-white instead of the graphite primary.
const OFF_WHITE = "#f3efe7";
if (etglobalBlank.scene) etglobalBlank.scene.defaultPendantColor = OFF_WHITE;
if (etglobal.scene) etglobal.scene.defaultPendantColor = OFF_WHITE;
else etglobal.scene = { defaultPendantColor: OFF_WHITE };

// Neura canonical logo is dark; invert it so it reads on the dark wall.
if (neura.scene) neura.scene.invertLogo = true;

// Nissan logo ships as a JPG with a white background — strip it at decode time
// so the chrome/red mark sits on the brand-coloured backing box.
if (nissan.scene) nissan.scene.logoChroma = "white";

// NWRA logo ships as a vector PNG against a white bed — chroma-key it out so
// the mark reads on the green canvas backing.
if (nrwa.scene) nrwa.scene.logoChroma = "white";

// ── Asset URL prefixing for gh-pages basePath ────────────────────────────
// All rasterUrl / svgUrl / wallGraphic / awningDecal / cinema imageUrl
// strings in this file are written as absolute public-asset paths
// (e.g. "/logos/foo.png"). In production we deploy under
// /etglobal/, so those need to become "/etglobal/logos/foo.png".
// One-pass sweep so each kit definition stays readable.
for (const k of [tdk, tagheuer, cargill, still, zeiss, exacom, lecole, swisskrono, schott, nissan, neura, etglobalBlank, etglobal, lufthansa, nrwa]) {
  for (const slot of ["primary", "monoLight", "monoDark", "icon"] as const) {
    const logo = k.logos?.[slot];
    if (logo) {
      if (logo.svgUrl) logo.svgUrl = asset(logo.svgUrl);
      if (logo.rasterUrl) logo.rasterUrl = asset(logo.rasterUrl);
    }
  }
  if (k.scene?.wallGraphic) k.scene.wallGraphic = asset(k.scene.wallGraphic);
  if (k.scene?.awningDecal) k.scene.awningDecal = asset(k.scene.awningDecal);
  if (Array.isArray(k.scene?.props)) {
    for (const p of k.scene.props as Array<{ imageUrl?: string }>) {
      if (p.imageUrl) p.imageUrl = asset(p.imageUrl);
    }
  }
}
