import type { BrandKit } from "@/lib/schemas";
import { asset } from "@/lib/assetPath";

// ── TMRW Foundation boardroom configurator — seed brand kits ─────────────────
//
// One kit per brand "room". Each kit carries: a recognisable palette, the
// brand logo (real file in /logos/), a Google-font pairing, and the
// brand-approved YouTube video that plays on the room's video wall.
//
// Palettes are auto-generated from each brand's known identity — tune freely.
// Hero GLB assets live in /components/brand-hero/<slug>/ and are wired in
// scene code by kit slug; see lib/scene/KitProps.

type LogoTuple = [number, number, number, number];

// Build the 4-slot logos object from a single asset file. We don't ship
// separate mono / icon variants for these brands, so every slot points at the
// same file; the scene's logoChroma / invertLogo hooks handle on-surface
// contrast where a baked background needs keying out.
function logoSet(file: string, viewBox: LogoTuple): BrandKit["logos"] {
  const base = { svgUrl: file, rasterUrl: file, viewBox, capHeightFraction: 0.7 };
  return {
    primary:   { ...base, isMono: false },
    monoLight: { ...base, isMono: true },
    monoDark:  { ...base, isMono: true },
    icon:      { ...base, isMono: false },
  };
}

// A Google-font display/body pairing.
function fonts(display: string, body: string): BrandKit["typography"] {
  return {
    display: { family: display, weights: [500, 700], italic: false, source: "google", cssName: display },
    body:    { family: body,    weights: [400, 500], italic: false, source: "google", cssName: body },
    fallbackGoogle: { display, body },
  };
}

const RULES = { minLogoHeightMm: 60, safeAreaRatio: 1.0, contrastMin: 4.5, disallowedBgs: [] };

// Standard boardroom intent — the back wall carries the brand mark. Boardrooms
// don't lean on the old exhibition surface-branding system, so one intent is
// enough; users can still recolour every surface from the dock.
const backWallIntent = (role: "primary" | "secondary" | "neutralDark" | "neutralLight" = "primary") =>
  [{ surfaceKind: "backWall" as const, treatment: "printed" as const, paletteRole: role, logoVariant: "primary" as const }];

// ── Apple ────────────────────────────────────────────────────────────────────
const apple: BrandKit = {
  id: "brand.apple",
  name: "Apple",
  // `secondary` tints the boardroom chairs; Apple gets a soft anodised silver
  // rather than pure white so the chairs read warm against the F5 walls.
  palette: { primary: "#1D1D1F", secondary: "#D9D9DC", accent: "#0071E3", neutralLight: "#F5F5F7", neutralDark: "#000000" },
  derivation: "monochrome",
  logos: logoSet("/logos/Apple_logo.svg", [0, 0, 814, 1000]),
  typography: fonts("Inter", "Inter"),
  motifs: [],
  phrases: [
    { de: "Think different.", en: "Think different." },
    { de: "Designed in California.", en: "Designed in California." },
  ],
  rules: RULES,
  intents: backWallIntent("neutralLight"),
  pendant: { preferredShape: "squircle", alternates: ["squircle", "rectangle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "u3SIKAmPXY4", wallColor: "#F5F5F7", floorColor: "#E8E8EA", wallMotif: "grid", cupColor: "#F2F2F4" },
};

// ── BMW ──────────────────────────────────────────────────────────────────────
const bmw: BrandKit = {
  id: "brand.bmw",
  name: "BMW",
  // BMW M-stripe livery — secondary picks up the deeper BMW blue for chairs.
  palette: { primary: "#0066B1", secondary: "#1C5598", accent: "#E22718", neutralLight: "#E6EEF5", neutralDark: "#0A0E14" },
  derivation: "monochrome",
  logos: logoSet("/logos/BMW_logo.svg", [0, 0, 1015, 1015]),
  typography: fonts("Inter", "Inter"),
  motifs: [],
  phrases: [
    { de: "Freude am Fahren.", en: "Sheer driving pleasure." },
    { de: "Der ultimative Antrieb.", en: "The ultimate driving machine." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "rectangle", alternates: ["rectangle", "squircle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "YUOPoGO2gRI", defaultTier: "L", floorColor: "#9DB2C6", wallMotif: "stripes.vertical", cupColor: "#0066B1" },
};

// ── Disney ───────────────────────────────────────────────────────────────────
const disney: BrandKit = {
  id: "brand.disney",
  name: "Disney",
  // Disney magic-blue chairs to match the wall mark.
  palette: { primary: "#113CCF", secondary: "#3A5BD9", accent: "#F0C808", neutralLight: "#EAF0FF", neutralDark: "#0A1A4A" },
  derivation: "complementary",
  logos: logoSet("/logos/Disney_logo.svg", [0, 0, 700, 294]),
  typography: fonts("Poppins", "Inter"),
  motifs: [],
  phrases: [
    { de: "Wo Träume wahr werden.", en: "Where dreams come true." },
    { de: "Das Glücklichste auf Erden.", en: "The happiest place on earth." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "ring", alternates: ["ring", "squircle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "b-DUYQg_-AQ", floorColor: "#9FA8D4", wallMotif: "stars", cupColor: "#F0C808" },
};

// ── Ferrari ──────────────────────────────────────────────────────────────────
const ferrari: BrandKit = {
  id: "brand.ferrari",
  name: "Ferrari",
  // Ferrari racing yellow chairs (Modena shield colour) for a hit of livery.
  palette: { primary: "#D40000", secondary: "#FFE600", accent: "#1A1A1A", neutralLight: "#F4F4F4", neutralDark: "#0A0A0A" },
  derivation: "triadic",
  logos: logoSet("/logos/Ferrari-Logo.svg", [0, 0, 344, 550]),
  typography: fonts("Oswald", "Inter"),
  motifs: [],
  phrases: [
    { de: "Wir sind die Konkurrenz.", en: "We are the competition." },
    { de: "Corse dal 1947.", en: "Racing since 1947." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "wedge", alternates: ["wedge", "rectangle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "quKzXz2XW5Q", defaultTier: "L", floorColor: "#C4B0AA", wallMotif: "stripes.diagonal", cupColor: "#D40000" },
};

// ── Google ───────────────────────────────────────────────────────────────────
const google: BrandKit = {
  id: "brand.google",
  name: "Google",
  // Google rainbow — chairs in Google green so the room mixes blue walls,
  // yellow accent, and green seating across the brand's four-colour set.
  palette: { primary: "#4285F4", secondary: "#34A853", accent: "#FBBC05", neutralLight: "#F1F3F4", neutralDark: "#202124" },
  derivation: "triadic",
  logos: logoSet("/logos/Google_logo.svg", [0, 0, 272, 92]),
  typography: fonts("Poppins", "Inter"),
  motifs: [],
  phrases: [
    { de: "Tu das Richtige.", en: "Do the right thing." },
    { de: "Organisiere die Welt.", en: "Organise the world's information." },
  ],
  rules: RULES,
  intents: backWallIntent("neutralLight"),
  pendant: { preferredShape: "squircle", alternates: ["squircle", "ring"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  // Google goes full Material Design — saturated red walls, yellow floor
  // wash, green chairs, and a blue accent. Maximum brand playfulness, not
  // a conservative office. The cup carries the wordmark gold.
  scene: {
    youtubeId: "4JVtVgl8oEs",
    wallColor: "#EA4335",
    floorColor: "#FDEBBA",
    wallMotif: "dots",
    cupColor: "#FBBC05",
    tableColor: "#202124",
    windowTrimColor: "#4285F4",
  },
};

// ── Louis Vuitton ────────────────────────────────────────────────────────────
const louisvuitton: BrandKit = {
  id: "brand.louisvuitton",
  name: "Louis Vuitton",
  palette: { primary: "#3D2B1F", secondary: "#E8D9B8", accent: "#C8A45C", neutralLight: "#F5EFE0", neutralDark: "#1A120B" },
  derivation: "analogous",
  logos: logoSet("/logos/Louis_Vuitton_logo.svg", [0, 0, 815, 980]),
  typography: fonts("Cormorant Garamond", "Cormorant Garamond"),
  motifs: [],
  phrases: [
    { de: "Die Kunst des Reisens.", en: "The art of travel." },
    { de: "Savoir-faire seit 1854.", en: "Savoir-faire since 1854." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "squircle", alternates: ["squircle", "ring"], outerFaceTreatment: "etched", innerFaceTreatment: "downlight" },
  // Louis Vuitton — light maple-wood table (#7B5D40) against the dark
  // walls + cream chairs for the boutique-atelier feel.
  scene: { youtubeId: "zCLDyNVBjRE", wallColor: "#2A1D14", floorColor: "#3D2B1F", wallMotif: "monogram", cupColor: "#E8D9B8", tableColor: "#7B5D40" },
};

// ── Mercedes-Benz ────────────────────────────────────────────────────────────
const mercedes: BrandKit = {
  id: "brand.mercedes",
  name: "Mercedes-Benz",
  // Mercedes silver — chairs in the brand's signature aluminium-silver.
  palette: { primary: "#1A1A1A", secondary: "#A8AEB4", accent: "#00ADEF", neutralLight: "#ECECEC", neutralDark: "#000000" },
  derivation: "monochrome",
  logos: logoSet("/logos/Mercedes-Logo.svg", [0, 0, 567, 567]),
  typography: fonts("Inter", "Inter"),
  motifs: [],
  phrases: [
    { de: "Das Beste oder nichts.", en: "The best or nothing." },
    { de: "Erfinder des Automobils.", en: "Inventor of the automobile." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "ring", alternates: ["ring", "rectangle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "HLy2IXCrpYw", defaultTier: "L", floorColor: "#C2C7CC", wallMotif: "stars", cupColor: "#1A1A1A" },
};

// ── Samsung ──────────────────────────────────────────────────────────────────
// NOTE: youtubeId is a placeholder — Samsung needs its own brand video. The
// brand-hero/samsung/ folder is currently empty so the room renders no hero
// props yet.
const samsung: BrandKit = {
  id: "brand.samsung",
  name: "Samsung",
  // Samsung navy-blue chairs to match the wordmark on the back wall.
  palette: { primary: "#1428A0", secondary: "#3B4DB8", accent: "#1428A0", neutralLight: "#EAF0FF", neutralDark: "#0A1633" },
  derivation: "monochrome",
  logos: logoSet("/logos/Samsung_logo.svg", [0, 0, 7051, 1080]),
  typography: fonts("Inter", "Inter"),
  motifs: [],
  phrases: [
    { de: "Do what you can't.", en: "Do what you can't." },
    { de: "Inspire the world, create the future.", en: "Inspire the world, create the future." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "rectangle", alternates: ["rectangle", "squircle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "2gYqEi8-am4", floorColor: "#A4ACCB", wallMotif: "hex", cupColor: "#1428A0" },
};

// ── Netflix ──────────────────────────────────────────────────────────────────
const netflix: BrandKit = {
  id: "brand.netflix",
  name: "Netflix",
  // Netflix red chairs — the signature mark. Pure red is too much for backs
  // and seats, so we use the deeper red (B20710) for restraint.
  palette: { primary: "#E50914", secondary: "#B20710", accent: "#B20710", neutralLight: "#F5F5F5", neutralDark: "#141414" },
  derivation: "monochrome",
  logos: logoSet("/logos/Netflix_logo.svg", [0, 0, 1024, 277]),
  typography: fonts("Oswald", "Inter"),
  motifs: [],
  phrases: [
    { de: "Sehen, was als Nächstes kommt.", en: "See what's next." },
    { de: "Geschichten, grenzenlos.", en: "Stories, without limits." },
  ],
  rules: RULES,
  intents: backWallIntent("neutralDark"),
  pendant: { preferredShape: "rectangle", alternates: ["rectangle", "wedge"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "PssKpzB0Ah0", wallColor: "#141414", floorColor: "#1C1C1C", wallMotif: "stripes.vertical", cupColor: "#E50914" },
};

// ── Nike ─────────────────────────────────────────────────────────────────────
const nike: BrandKit = {
  id: "brand.nike",
  name: "Nike",
  // Nike orange chairs — the iconic swoosh colour applied to seating against
  // the near-black walls.
  palette: { primary: "#111111", secondary: "#FA5400", accent: "#FA5400", neutralLight: "#F5F5F5", neutralDark: "#000000" },
  derivation: "monochrome",
  logos: logoSet("/logos/Nike_logo.svg", [0, 0, 1000, 356]),
  typography: fonts("Oswald", "Inter"),
  motifs: [],
  phrases: [
    { de: "Just Do It.", en: "Just Do It." },
    { de: "Bewege die Welt.", en: "Move the world forward." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "wedge", alternates: ["wedge", "rectangle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "_ZxqcqMB0ew", wallColor: "#161616", floorColor: "#1F1F1F", wallMotif: "swoosh", cupColor: "#FA5400" },
};

// ── Nvidia ───────────────────────────────────────────────────────────────────
const nvidia: BrandKit = {
  id: "brand.nvidia",
  name: "NVIDIA",
  // NVIDIA green chairs — the bright primary applied directly to seating
  // so the room reads as a saturated green-on-near-black volume.
  palette: { primary: "#76B900", secondary: "#5C9100", accent: "#1A1A1A", neutralLight: "#F0F4E8", neutralDark: "#0B0F0A" },
  derivation: "complementary",
  logos: logoSet("/logos/Nvidia_logo.svg", [0, 0, 351, 259]),
  typography: fonts("Inter", "Inter"),
  motifs: [],
  phrases: [
    { de: "Der Motor der KI.", en: "The engine of AI." },
    { de: "Beschleunigtes Rechnen.", en: "Accelerated computing." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "hexagon", alternates: ["hexagon", "rectangle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "z978rGwiW6E", wallColor: "#10140C", windowTrimColor: "#76B900", floorColor: "#B4C29C", wallMotif: "circuit", cupColor: "#76B900" },
};

// ── Rolex ────────────────────────────────────────────────────────────────────
const rolex: BrandKit = {
  id: "brand.rolex",
  name: "Rolex",
  // Rolex gold chairs — match the crown gilt against the deep-green walls.
  // neutralDark stays nearly black so the table reads as a dark anchor.
  palette: { primary: "#006039", secondary: "#C8A45C", accent: "#C8A45C", neutralLight: "#F0EDE3", neutralDark: "#08130D" },
  derivation: "analogous",
  // TODO(asset-team): Rolex SVG ships with a baked white plate. For table-top
  // and chair-back decals we want a clean transparent-PNG of just the crown +
  // wordmark so the chroma-key fallback isn't needed at small scale.
  logos: logoSet("/logos/Rolex_logo.svg", [0, 0, 105, 60]),
  typography: fonts("Cormorant Garamond", "Inter"),
  motifs: [],
  phrases: [
    { de: "Eine Krone für jede Leistung.", en: "A crown for every achievement." },
    { de: "Beständigkeit.", en: "Perpetual." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "ring", alternates: ["ring", "squircle"], outerFaceTreatment: "etched", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "WjXITcko2No", wallColor: "#0E3A26", floorColor: "#A6BCAD", wallMotif: "crown", cupColor: "#C8A45C" },
};

// ── Tesla ────────────────────────────────────────────────────────────────────
const tesla: BrandKit = {
  id: "brand.tesla",
  name: "Tesla",
  // Tesla space-grey chairs (model-3 trim colour) against the light walls.
  palette: { primary: "#E31937", secondary: "#3F4248", accent: "#171A20", neutralLight: "#F4F4F4", neutralDark: "#171A20" },
  derivation: "monochrome",
  logos: logoSet("/logos/Tesla_logo.svg", [0, 0, 279, 360]),
  typography: fonts("Inter", "Inter"),
  motifs: [],
  phrases: [
    { de: "Beschleunige die Zukunft.", en: "Accelerating the future." },
    { de: "Elektrisch, ohne Kompromisse.", en: "Electric, without compromise." },
  ],
  rules: RULES,
  intents: backWallIntent("neutralLight"),
  pendant: { preferredShape: "rectangle", alternates: ["rectangle", "wedge"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "Txt3Wodav1o", wallColor: "#F4F4F4", floorColor: "#E4E4E4", defaultTier: "L", wallMotif: "stripes.horizontal", cupColor: "#E31937" },
};

// ── The TMRW Foundation ──────────────────────────────────────────────────────
// The house brand. The logo ships as a JPG (dark mark on white) — logoChroma
// keys the white bed out and invertLogo flips the mark to white so it reads
// on the dark room wall. On the light homepage tile it shows as-is.
const tmrw: BrandKit = {
  id: "brand.tmrw",
  name: "TMRW Foundation",
  // TMRW house chairs — soft neutral cream so the room reads warm even
  // with the near-black walls and the saturated brand-blue accent.
  palette: { primary: "#0A0A0A", secondary: "#D7D2C6", accent: "#3D7EFF", neutralLight: "#F4F2ED", neutralDark: "#000000" },
  derivation: "monochrome",
  // TODO(asset-team): tmrwwhite.jpg is a JPG with baked-white background.
  // Replace with a transparent PNG (or SVG) of the TMRW mark so the chair-
  // back / table-top decals don't need a chroma-key (which leaves soft
  // halos at small sizes).
  logos: logoSet("/logos/tmrwwhite.jpg", [0, 0, 660, 360]),
  typography: fonts("Inter", "Inter"),
  motifs: [],
  phrases: [
    { de: "Baue das Morgen.", en: "Build tomorrow." },
    { de: "Räume für das, was kommt.", en: "Spaces for what's next." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "hexagon", alternates: ["hexagon", "ring", "rectangle"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "8yKBpthWRI4", wallColor: "#141414", floorColor: "#1C1C1C", logoChroma: "white", invertLogo: true, wallMotif: "triangles", cupColor: "#3D7EFF" },
};

// ── Blank template ───────────────────────────────────────────────────────────
// Loaded when the user picks "Create new" on the homepage or the "+ New" cell
// in the dock. Neutral graphite room, TMRW mark, TMRW house video.
export const tmrwBlank: BrandKit = {
  id: "brand.new",
  name: "New room",
  palette: { primary: "#22252B", secondary: "#FFFFFF", accent: "#3D7EFF", neutralLight: "#F5F5F5", neutralDark: "#0F1115" },
  derivation: "complementary",
  logos: logoSet("/logos/tmrwwhite.jpg", [0, 0, 660, 360]),
  typography: fonts("Inter", "Inter"),
  motifs: [],
  phrases: [
    { de: "Ein leerer Raum.", en: "A blank room." },
    { de: "Gestalte ihn.", en: "Make it yours." },
  ],
  rules: RULES,
  intents: backWallIntent("primary"),
  pendant: { preferredShape: "rectangle", alternates: ["rectangle", "squircle", "ring"], outerFaceTreatment: "led", innerFaceTreatment: "downlight" },
  scene: { youtubeId: "8yKBpthWRI4", logoChroma: "white", invertLogo: true, floorColor: "#C9C7C0" },
};

// In-app brand picker grid — order is the homepage / dock order.
export const seedBrandKitList: BrandKit[] = [
  apple, bmw, disney, ferrari, google, louisvuitton, mercedes,
  samsung, netflix, nike, nvidia, rolex, tesla, tmrw,
];

// Convenience map (blank template included).
export const seedBrandKits = {
  tmrwBlank, apple, bmw, disney, ferrari, google, louisvuitton, mercedes,
  samsung, netflix, nike, nvidia, rolex, tesla, tmrw,
};

// Lookup including the blank template (not part of the picker grid).
export function findKitById(id: string): BrandKit | undefined {
  if (id === tmrwBlank.id) return tmrwBlank;
  return seedBrandKitList.find((k) => k.id === id);
}

// ── Asset URL prefixing for the gh-pages basePath ────────────────────────────
// rasterUrl / svgUrl / wallGraphic strings are written as absolute public-asset
// paths (e.g. "/logos/foo.svg"). In production the bundle deploys under
// /tmrwconfig/, so they need to become "/tmrwconfig/logos/foo.svg". One-pass
// sweep keeps each kit definition readable above.
for (const k of [...seedBrandKitList, tmrwBlank]) {
  for (const slot of ["primary", "monoLight", "monoDark", "icon"] as const) {
    const logo = k.logos?.[slot];
    if (logo) {
      if (logo.svgUrl) logo.svgUrl = asset(logo.svgUrl);
      if (logo.rasterUrl) logo.rasterUrl = asset(logo.rasterUrl);
    }
  }
  if (k.scene?.wallGraphic) k.scene.wallGraphic = asset(k.scene.wallGraphic);
}

// ── Brand-hero assets ────────────────────────────────────────────────────────
// The GLBs in /components/brand-hero/<slug>/, laid out per room: small items
// (devices, watches, shoes, logos) sit on plinths along the back-left wall;
// large items (cars, structures) stand on the floor down the left side. These
// are display dressing — positions are tuned for a mid-size room and can be
// art-directed per brand later. louisvuitton / meta / tmrw have no hero GLBs
// on disk yet, so they simply render none.
type HeroSpec = {
  file: string;
  heightM: number;
  plinth?: boolean;
  /** Override the default floor position; useful when a single prop needs
   *  to live somewhere other than the back-left hero strip. */
  pos?: [number, number, number];
  /** Y offset above the floor — positive values float the prop. */
  floatYM?: number;
  /** Regex pattern; meshes matching this name are pruned from the GLB
   *  before render (used for the TMRW earth's atmosphere shell). */
  meshFilter?: string;
  rotationY?: number;
  /** Extra rotation around X / Z so a flat-modelled prop can be tipped
   *  onto its side (Rolex Invicta wall-clock orientation). */
  rotationX?: number;
  rotationZ?: number;
};
const HERO_ASSETS: Record<string, HeroSpec[]> = {
  "brand.apple": [
    // Sized to real-product dimensions (heightM is approximately the
    // tallest in-room visual extent). Earlier defaults were 2x life-size.
    { file: "apple_mac_studio.glb",        heightM: 0.21, plinth: true },
    { file: "apple_vision_pro.glb",        heightM: 0.20, plinth: true },
    { file: "apple_ipad_pro.glb",          heightM: 0.30, plinth: true },
    // iPhone has a centred bind-pose Y-range (-0.5..+0.5 in model space)
    // so the GLB's "bottom" pin lines up after normalize; the perceived
    // embedding in the plinth was actually the body being twice life-size.
    { file: "apple_iphone_13_pro_max.glb", heightM: 0.18, plinth: true },
  ],
  "brand.bmw": [{ file: "bmw_m5_g90_2024__www.vecarz.com.glb", heightM: 1.45 }],
  "brand.disney": [
    { file: "disney_buzz.glb",                              heightM: 0.65, plinth: true },
    { file: "disney_color_and_play_-_mickey.glb",           heightM: 0.65, plinth: true },
    { file: "disney_infinity_woody.glb",                    heightM: 0.65, plinth: true },
    { file: "lightning_mcqueen_forza_horizon_version.glb",  heightM: 1.05 },
  ],
  "brand.ferrari": [{ file: "2021_ferrari_sf90_spider.glb", heightM: 1.30 }],
  "brand.google": [
    { file: "google_logo.glb", heightM: 0.60, plinth: true },
    { file: "google_bike.glb", heightM: 1.10 },
  ],
  "brand.mercedes": [{ file: "maybach.glb", heightM: 1.55 }],
  "brand.netflix": [
    { file: "netflix_symbol.glb", heightM: 0.75, plinth: true },
    { file: "castle_byers.glb",   heightM: 1.60 },
  ],
  "brand.nike": [
    { file: "miles_morales_shoes.glb",     heightM: 0.32, plinth: true },
    { file: "nike_dunk_low_unlv.glb",      heightM: 0.32, plinth: true },
    { file: "travis_scott_nike_shoes.glb", heightM: 0.32, plinth: true },
  ],
  "brand.nvidia": [
    { file: "nvidia_logo.free_high_polly.glb",                       heightM: 0.55, plinth: true },
    { file: "nvidia_rtx_5090_founders_edition_-_free_download.glb",   heightM: 0.42, plinth: true },
  ],
  "brand.rolex": [
    { file: "rolex_datejust.glb", heightM: 0.34, plinth: true },
    // Invicta GLB was reading as a giant novelty clock at 0.34m. User
    // asked for 21x smaller — life-sized at ~16mm rather than 0.34m.
    { file: "invicta_watch.glb", heightM: 0.016, plinth: true },
  ],
  "brand.tesla": [{ file: "tesla_2018_model_3.glb", heightM: 1.40 }],
  "brand.louisvuitton": [
    { file: "louis_vuitton_gold_logo.glb",               heightM: 0.55, plinth: true },
    { file: "luxury_monogram_leather_messenger_bag.glb", heightM: 0.45, plinth: true },
    { file: "glasses-mesh_louis_vuitton.glb",            heightM: 0.16, plinth: true },
    { file: "louis_vuitton_contrast_trim.glb",           heightM: 0.50, plinth: true },
  ],
  "brand.tmrw": [{
    file: "earth__terra_-_downloadable_model.glb",
    heightM: 1.60,
    // Float the earth as a centrepiece of the room — sits left of the table,
    // hovering at conference-table eye line rather than embedded in the floor.
    pos: [-3.6, 0, -0.6],
    floatYM: 1.4,
    // The GLB ships with an atmospheric inner shell (ATM*) that reads as a
    // second, monochrome globe near the origin once placed in the scene.
    // Filter it out so only the EARTH mesh renders.
    meshFilter: "ATM",
    rotationY: -Math.PI / 8,
  }],
};

function buildHeroProps(slug: string, specs: HeroSpec[]) {
  const props: Array<Record<string, unknown>> = [];
  const plinthItems = specs.filter((s) => s.plinth);
  const floorItems = specs.filter((s) => !s.plinth);
  const applyFloat = (basePos: [number, number, number], s: HeroSpec): [number, number, number] => {
    const base = s.pos ?? basePos;
    return [base[0], base[1] + (s.floatYM ?? 0), base[2]];
  };
  plinthItems.forEach((s, i) => {
    const defaultPos: [number, number, number] = [-3.6 + i * 1.0, 0, -2.6];
    props.push({
      kind: "heroAsset",
      url: asset(`/glb/brand-hero/${slug}/${s.file}`),
      position: applyFloat(defaultPos, s),
      rotationY: s.rotationY ?? 0.35,
      heightM: s.heightM,
      plinthHeightM: 1.0,
      ...(s.meshFilter ? { meshFilter: s.meshFilter } : {}),
      ...(s.rotationX != null ? { rotationX: s.rotationX } : {}),
      ...(s.rotationZ != null ? { rotationZ: s.rotationZ } : {}),
    });
  });
  floorItems.forEach((s, i) => {
    // Back-LEFT corner of the room, pushed well clear of the central
    // table + chairs. Previously z=-1.0 placed cars alongside the table's
    // mid-length; now z=-3.2 puts them in the back of the room next to
    // the rear wall. auditHeroVsWalls (in renderProp) clamps in if the
    // room is too small.
    const defaultPos: [number, number, number] = [-3.6, 0, -3.2 - i * 0.6];
    props.push({
      kind: "heroAsset",
      url: asset(`/glb/brand-hero/${slug}/${s.file}`),
      position: applyFloat(defaultPos, s),
      rotationY: s.rotationY ?? -Math.PI / 5,
      heightM: s.heightM,
      ...(s.meshFilter ? { meshFilter: s.meshFilter } : {}),
      ...(s.rotationX != null ? { rotationX: s.rotationX } : {}),
      ...(s.rotationZ != null ? { rotationZ: s.rotationZ } : {}),
    });
  });
  return props;
}

for (const k of seedBrandKitList) {
  const specs = HERO_ASSETS[k.id];
  if (!specs) continue;
  if (!k.scene) k.scene = {};
  k.scene.props = buildHeroProps(k.id.replace("brand.", ""), specs);
}
