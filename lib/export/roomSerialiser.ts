// Room serialiser — maps the live configStore scene into the demobot
// room-JSON format (see /demobot/data/rooms/ai_studio.json for the
// reference shape) and collects the asset references that need to be
// bundled alongside it.
//
// The demobot format is an entity graph:
//   • PREFAB entity + PrefabRenderer component → a GLB at `url`
//   • SURFACE entity + Surface component       → a screen/poster image
//   • NULL entity + CameraComponent/Animations/BroadcastScene → smartcam
//   • scene.environment { url, rotation, exposure, color }
//   • settings / fx / global_settings tail
//
// tmrwconfig builds its room from PROCEDURAL R3F geometry (walls, floor,
// table are not single GLBs), so a 1:1 entity reconstruction isn't
// possible. This serialiser emits demobot entities for the elements that
// DO map cleanly — cube-plinth GLBs, image surfaces (video wall,
// posterboards, picture frames, hero artwork), camera presets, and the
// environment — and ALSO embeds a lossless `tmrwconfig_source` snapshot
// of the full store state so the room can be re-imported without loss.

import { CAMERA_PRESETS } from "@/lib/scene/CameraSync";
import { asset } from "@/lib/assetPath";
import { findKitById } from "@/lib/fixtures/brandKits";

// Loose typing — we read a broad slice of the store. Keeping it `any`-ish
// at the boundary avoids coupling the serialiser to every store field.
type StoreState = Record<string, unknown>;

export type AssetRef = { src: string; zipPath: string };

export type SerialiseResult = {
  room: Record<string, unknown>;
  /** Asset URLs to fetch + bundle. The room JSON already references the
   *  `zipPath` values (rewritten from the original src). */
  assets: AssetRef[];
};

let uidCounter = 0;
function uid(prefix: string): string {
  uidCounter += 1;
  return `@${prefix}-tmrw-${Date.now().toString(36)}-${uidCounter}`;
}

/** Y-axis rotation (radians) → quaternion [x, y, z, w]. */
function quatY(angle: number): [number, number, number, number] {
  return [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];
}

export function serialiseRoom(state: StoreState): SerialiseResult {
  uidCounter = 0;
  const num = (k: string, d = 0): number => (typeof state[k] === "number" ? (state[k] as number) : d);
  const str = (k: string, d = ""): string => (typeof state[k] === "string" ? (state[k] as string) : d);
  const arr = <T,>(k: string): T[] => (Array.isArray(state[k]) ? (state[k] as T[]) : []);

  const widthM = num("widthM", 7.5);
  const depthM = num("depthM", 7.5);
  const wallHeightM = num("wallHeightM", 4.5);
  const platformHeightM = num("platformHeightM", 0.2);
  const kit = findKitById(str("brandKitId")) ?? null;

  // Dedupe asset references — the same GLB / image used twice bundles once.
  const assets: AssetRef[] = [];
  const seen = new Map<string, string>();
  let imgN = 0, glbN = 0;
  const bundle = (src: string | null | undefined, kind: "image" | "model"): string | null => {
    if (!src) return null;
    if (seen.has(src)) return seen.get(src)!;
    let ext = kind === "model" ? "glb" : "png";
    if (src.startsWith("data:")) {
      const m = /^data:([^;,]+)/.exec(src);
      const mime = m?.[1] ?? "";
      if (mime.includes("jpeg")) ext = "jpg";
      else if (mime.includes("webp")) ext = "webp";
      else if (mime.includes("svg")) ext = "svg";
      else if (mime.includes("gltf-binary") || mime.includes("octet-stream")) ext = "glb";
    } else {
      const clean = src.split("?")[0]!.split("#")[0]!;
      const dot = clean.lastIndexOf(".");
      if (dot >= 0) ext = clean.slice(dot + 1).toLowerCase();
    }
    const dir = kind === "model" ? "models" : "images";
    const n = kind === "model" ? ++glbN : ++imgN;
    const zipPath = `assets/${dir}/${kind === "model" ? "model" : "image"}_${n}.${ext}`;
    seen.set(src, zipPath);
    assets.push({ src, zipPath });
    return zipPath;
  };

  const entities: Record<string, unknown>[] = [];
  let index = 0;
  const nextIndex = () => ++index;

  // ── PREFAB entity helper ──
  const prefab = (name: string, glbZip: string, pos: [number, number, number], rotY = 0, scale: [number, number, number] = [1, 1, 1]) => {
    entities.push({
      uid: uid("ENT"),
      class_type: "entity",
      name,
      index: nextIndex(),
      type: "PREFAB",
      layers: 1,
      light_channels: 1,
      collection: null,
      position: pos,
      rotation: quatY(rotY),
      scale,
      custom: {},
      flags: { interactive: false },
      entities: [],
      components: [[
        "PrefabRenderer",
        {
          uid: uid("COMP"),
          url: `/${glbZip}`,
          urlMesh: "",
          draco: false,
          animation: "",
          anim_mode: 1,
          edited_materials: {},
          lods_num: 1,
          cast_shadows: true,
          receive_shadows: true,
          object_class: "PrefabRenderer",
        },
      ]],
    });
  };

  // ── SURFACE entity helper (screen / poster / artwork) ──
  const surface = (name: string, imageZip: string | null, pos: [number, number, number], rotY: number, scale: [number, number, number]) => {
    entities.push({
      uid: uid("ENT"),
      class_type: "entity",
      name,
      index: nextIndex(),
      type: "SURFACE",
      layers: 1,
      light_channels: 1,
      collection: null,
      position: pos,
      rotation: quatY(rotY),
      scale,
      custom: {},
      flags: { interactive: false },
      entities: [],
      components: [[
        "Surface",
        {
          uid: uid("COMP"),
          enabled: true,
          app_name: null,
          proxy_node: "",
          proxy_material_name: "",
          brightness: 1,
          seat: "",
          block_gl_texture: false,
          background_image: imageZip ? `/${imageZip}` : "",
          interactive: false,
          skip_screenshare: true,
          allow_progressive_resolution: false,
          alpha_mode: "OPAQUE",
          apps_settings: {},
          resolution_factor: 1,
          no_focus: false,
          object_class: "Surface",
        },
      ]],
    });
  };

  // ── 1. Cube plinth assets → PREFAB entities. ──
  // Mirrors the CubePlinths placement: 4-corner pattern, size 0.6.
  const cubeAssets = arr<{ url: string; kind: string; label?: string } | null>("cubeAssets");
  const cubeCount = num("cubeCount");
  const cubeSize = 0.6;
  const cubeHalfW = widthM / 2 - 1.4;
  const cubeHalfD = depthM / 2 - 1.4;
  for (let i = 0; i < Math.min(cubeCount, 4); i++) {
    const a = cubeAssets[i];
    if (!a?.url) continue;
    const sx = i % 2 === 0 ? -1 : 1;
    const sz = i < 2 ? -1 : 1;
    const zip = bundle(a.url, "model");
    if (zip) prefab(`cube_${i + 1}_${a.label ?? a.kind}`, zip, [sx * cubeHalfW, platformHeightM + cubeSize, sz * cubeHalfD]);
  }

  // ── 2. Video wall → SURFACE on the back wall. ──
  // Active-first sizing (same formula as LedWall): active height = 90%
  // wallH, 16:9, container = active + 5% wallH bezel, shrunk to fit.
  if (state["ledWallEnabled"] !== false) {
    const bezelM = wallHeightM * 0.05;
    let activeH = wallHeightM * 0.9;
    let activeW = activeH * (16 / 9);
    let containerW = activeW + 2 * bezelM;
    if (containerW > widthM - 0.4) {
      containerW = Math.max(1.6, widthM - 0.4);
      activeW = containerW - 2 * bezelM;
      activeH = activeW * (9 / 16);
    }
    // Background image — first hero artwork, else the kit youtube thumb
    // (cannot embed a live stream into a static surface), else blank.
    const heroUrls = arr<string | null>("heroArtworkUrls");
    const firstHero = heroUrls.find((u): u is string => !!u) ?? null;
    const ytId = kit?.scene?.youtubeId;
    const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null;
    const imgZip = bundle(firstHero ?? ytThumb, "image");
    surface("video_wall", imgZip, [0, platformHeightM + (activeH + 2 * bezelM) / 2, -depthM / 2 + 0.1], 0, [activeW, activeH, 1]);
  }

  // ── 3. Posterboards → SURFACE entities (door wall + greeters). ──
  // We don't recompute the full placement permutation here; we emit one
  // surface per filled poster slot at the door wall with best-effort
  // transforms. The lossless snapshot carries exact placement intent.
  const posterUrls = arr<string | null>("posterboardUrls");
  const posterCount = num("posterboardCount");
  for (let i = 0; i < Math.min(posterCount, posterUrls.length, 6); i++) {
    const url = posterUrls[i];
    if (!url) continue;
    const zip = bundle(url, "image");
    const side = i % 2 === 0 ? -1 : 1;
    surface(`poster_${i + 1}`, zip, [side * (widthM / 2 - 1.2), platformHeightM + 1.6, depthM / 2 - 0.15], Math.PI, [1.4, 2.1, 1]);
  }

  // ── 4. Picture frames → SURFACE entities (side walls near door). ──
  const frameUrls = arr<string | null>("pictureFrameUrls");
  const frameSize = Math.min(1.0, wallHeightM * 0.22);
  const frameCy = platformHeightM + wallHeightM * 0.58;
  const zNear = depthM / 2 - 1.0;
  const zMid = depthM / 2 - 1.0 - frameSize - 0.6;
  const framePlacement: { pos: [number, number, number]; rotY: number }[] = [
    { pos: [-widthM / 2 + 0.1, frameCy, zNear], rotY: Math.PI / 2 },
    { pos: [-widthM / 2 + 0.1, frameCy, zMid], rotY: Math.PI / 2 },
    { pos: [widthM / 2 - 0.1, frameCy, zNear], rotY: -Math.PI / 2 },
    { pos: [widthM / 2 - 0.1, frameCy, zMid], rotY: -Math.PI / 2 },
  ];
  for (let i = 0; i < 4; i++) {
    const url = frameUrls[i];
    if (!url) continue;
    const zip = bundle(url, "image");
    const p = framePlacement[i]!;
    surface(`picture_frame_${i + 1}`, zip, p.pos, p.rotY, [frameSize, frameSize, 1]);
  }

  // ── 5. Hero artwork (slots 2-4) → SURFACE entities on the back wall. ──
  const heroUrls = arr<string | null>("heroArtworkUrls");
  for (let i = 1; i < heroUrls.length; i++) {
    const url = heroUrls[i];
    if (!url) continue;
    const zip = bundle(url, "image");
    const side = i % 2 === 0 ? 1 : -1;
    surface(`hero_artwork_${i + 1}`, zip, [side * (widthM / 2 - 0.8), platformHeightM + wallHeightM * 0.55, -depthM / 2 + 0.12], 0, [1.2, 1.6, 1]);
  }

  // ── 6. Camera presets → smartcam NULL entities. ──
  for (const [name, p] of Object.entries(CAMERA_PRESETS)) {
    entities.push({
      uid: uid("ENT"),
      class_type: "entity",
      name: `cam_${name}`,
      index: nextIndex(),
      type: "NULL",
      layers: 1,
      light_channels: 1,
      collection: "smartcam",
      position: p.pos,
      rotation: [0, 0, 0, 1],
      custom: {},
      flags: { interactive: false },
      entities: [],
      components: [
        ["CameraComponent", {
          uid: uid("COMP"),
          enabled: true,
          camera: { type: 1, position: p.pos, target: p.target, up: [0, 1, 0], fov: p.fov, near: 0.1, far: 50, aspect: 1.7777777777777777, shift: [0, 0] },
          render_to_texture: false,
          size: [0, 0],
          controllable: false,
          fx: "",
          enableDOF: false,
          object_class: "CameraComponent",
        }],
        ["BroadcastScene", {
          uid: uid("COMP"),
          moveFreely: false,
          isHandyCamActive: false,
          handyCamIntensity: 0,
          previewImageURL: "",
          name,
          numberAssigned: String(nextIndex()),
          loop: 0,
          fadingTransition: false,
          enableZoom: false,
          isBoard: false,
          object_class: "BroadcastScene",
        }],
      ],
    });
  }

  // ── Environment ──
  // Prefer the AI skydome (LDR image) when set; else the selected HDRI
  // (bundled by reference path — .hdr files are large, so we point at the
  // public path rather than embedding). The skydome image IS bundled.
  const customEnv = str("customEnvironmentUrl") || null;
  const hdriId = str("hdriId");
  let envUrl = "";
  if (customEnv) {
    envUrl = `/${bundle(customEnv, "image")}`;
  } else if (hdriId) {
    envUrl = asset(`/hdri/${hdriId}.hdr`);
  }
  const environment = {
    url: envUrl,
    rotation: num("hdrRotationDeg", 0),
    exposure: num("exposure", 1) + 1, // store exposure is -1..+1; demobot wants ~1
    color: [0.5, 0.5, 0.5],
  };

  // ── Camera (default framing = hero preset). ──
  const hero = CAMERA_PRESETS["hero"]!;
  const camera = {
    position: hero.pos,
    target: hero.target,
    up: [0, 1, 0],
    fov: hero.fov,
    min_height: 0.01,
    max_height: 3,
    max_distance: Math.hypot(widthM, depthM),
  };

  // ── Lossless source snapshot ──
  // Strip functions so the snapshot is pure JSON.
  const snapshot: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    if (typeof v === "function") continue;
    snapshot[k] = v;
  }

  const room: Record<string, unknown> = {
    uid: uid("SCN"),
    last_index: index,
    name: kit?.name ?? "TMRW room",
    status: "public",
    tags: { mobileReady: false, comingSoon: false, isFeatured: false },
    categories: { dev: true },
    variation: "",
    description: "Exported from the TMRW configurator.",
    preview_url: "",
    preview_featured_url: "",
    info: { name: kit?.name ?? "TMRW room", author: "TMRW configurator", user_id: -1 },
    version: [1, 56, 1],
    scene: { environment, camera, entities },
    timestamp: new Date().toISOString(),
    settings: { render_skybox: true, allow_walking: true, hide_nametags: false, tablets_texture: null, allow_apps_on_tablets: true },
    fx: { exposure: 1, illumination: 5, brightness: 1, contrast: 1 },
    materialsCache: [],
    global_settings: {},
    // Lossless re-import payload — everything the configurator needs to
    // rebuild this exact room. Ignored by the demobot engine.
    tmrwconfig_source: snapshot,
  };

  return { room, assets };
}
