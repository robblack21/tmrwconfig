"use client";
import { Suspense, useMemo, useEffect, useRef } from "react";
import { Environment, OrbitControls, ContactShadows, RoundedBox, Html } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useConfig, useBrandKit, type VideoCell } from "@/lib/store/configStore";
import type { PendantShape, FootprintShape } from "@/lib/schemas";
import { Sofa, CoffeeTable, Plant } from "./Props";
import { useFloorTextures, useWallTextures, useQuadratedWallTextures, useParquetTextures, useLogoTexture } from "./Textures";
import { useWallGraphic, useMotifTexture, type MotifKind } from "./WallGraphics";
import { LightShafts, LightboxLogo, RadiatingRig, GlassBalcony, CircularScreen, WraparoundScreen } from "./HeroElements";
import { TimedReveal } from "./SceneReveal";
import { CameraSync } from "./CameraSync";
import { HallContext } from "./HallContext";
import { KitProps } from "./KitProps";
import { ExtrudedSvgLogo, canExtrude } from "./SvgLogo";
import { BoardroomTable, ChairsAroundTable, BrandedCupsOnTable, TableTopBrandDecals } from "./Boardroom";
import { PROP_RADIUS_M, safeInsetForKind, placeOnFloor, type RoomShape } from "./placementAudit";
import { Flycam } from "./Flycam";
import { PerfMonitor } from "./PerfMonitor";
import { asset } from "@/lib/assetPath";
import type { BrandKit } from "@/lib/schemas";

/** Mix two hex colours in sRGB space. `t=0` returns `a`, `t=1` returns `b`.
 *  Used by the brand-kit resolver to keep table/chair/floor tints reading
 *  as upholstery / wood / stone instead of saturated brand swatches. */
function mixHex(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, t).getStyle();
}

// Six exterior HDRIs — each ~25 MB at 4K. Picked to give the room a sense
// of "where is this building?" so the Environment-mode skybox actually
// reads as somewhere specific.
export const HDRI_OPTIONS = [
  { id: "canary_wharf_4k", label: "Canary Wharf" },
  { id: "docklands_02_4k", label: "Docklands" },
  { id: "lake_pier_4k", label: "Lake pier" },
  { id: "schadowplatz_4k", label: "Schadowplatz" },
  { id: "limpopo_golf_course_4k", label: "Limpopo golf" },
  { id: "little_paris_eiffel_tower_4k", label: "Paris (Eiffel)" },
] as const;

// hallMode now picks which HDRI is shown when no explicit `hdriId` is set.
// "warehouse.dark" → Canary Wharf (the city-glass-tower default);
// "gallery.light" → Docklands (a lighter exterior).
const HDRI_BY_MODE: Record<"gallery.light" | "warehouse.dark", string> = {
  "gallery.light": "docklands_02_4k",
  "warehouse.dark": "canary_wharf_4k",
};

/** How many wall-mounted TVs fit at the given booth width. Re-exported via
 *  `lib/scene/clipping.ts` so the BOM can pick up the same number. */
export function tvCountFor(widthM: number): number {
  if (widthM >= 8) return 2;
  if (widthM >= 5.5) return 1;
  return 0;
}

/** How many back-wall vitrines fit. 4 (full), 2 (compact) or 0 (too narrow). */
export function vitrineCountFor(widthM: number): number {
  if (widthM >= 9) return 4;
  if (widthM >= 5) return 2;
  return 0;
}

export function Scene() {
  const widthM = useConfig((s) => s.widthM);
  const depthM = useConfig((s) => s.depthM);
  const wallHeightM = useConfig((s) => s.wallHeightM);
  const trussTopM = useConfig((s) => s.trussTopM);
  const hallMode = useConfig((s) => s.hallMode);
  const hdriIdOverride = useConfig((s) => s.hdriId);
  const hallVisible = useConfig((s) => s.hallVisible);
  const hdrIntensity = useConfig((s) => s.hdrIntensity);
  const hdrBgIntensity = useConfig((s) => s.hdrBgIntensity);
  const hdrRotationDeg = useConfig((s) => s.hdrRotationDeg);
  const hdrBlur = useConfig((s) => s.hdrBlur);
  const hallDarkness = useConfig((s) => s.hallDarkness);
  const floorStyle = useConfig((s) => s.floorStyle);
  const renderMode = useConfig((s) => s.renderMode);
  const editMode = renderMode === "edit";
  const pendantEnabled = useConfig((s) => s.pendantEnabled);
  const pendantShape = useConfig((s) => s.pendantShape);
  const pendantWidthM = useConfig((s) => s.pendantWidthM);
  const pendantDepthM = useConfig((s) => s.pendantDepthM);
  const pendantHeightM = useConfig((s) => s.pendantHeightM);
  const pendantYOffsetM = useConfig((s) => s.pendantYOffsetM);
  const pendantRotationDeg = useConfig((s) => s.pendantRotationDeg);
  const pendantRingVertical = useConfig((s) => s.pendantRingVertical);
  const lightShaftsEnabled = useConfig((s) => s.lightShaftsEnabled);
  const lightShaftDensity = useConfig((s) => s.lightShaftDensity);
  const lightboxLogoEnabled = useConfig((s) => s.lightboxLogoEnabled);
  const radiatingRigEnabled = useConfig((s) => s.radiatingRigEnabled);
  const radiatingRings = useConfig((s) => s.radiatingRings);
  const radiatingRadiusM = useConfig((s) => s.radiatingRadiusM);
  const radiatingYOffsetM = useConfig((s) => s.radiatingYOffsetM);
  const radiatingColor = useConfig((s) => s.radiatingColor);
  const glassBalconyEnabled = useConfig((s) => s.glassBalconyEnabled);
  const circularScreenEnabled = useConfig((s) => s.circularScreenEnabled);
  const wraparoundScreenEnabled = useConfig((s) => s.wraparoundScreenEnabled);
  const ledWallEnabled = useConfig((s) => s.ledWallEnabled);
  const ledWallWidthM = useConfig((s) => s.ledWallWidthM);
  const ledWallHeightM = useConfig((s) => s.ledWallHeightM);
  const ledWallBrightness = useConfig((s) => s.ledWallBrightness);
  const logoExtrusionM = useConfig((s) => s.logoExtrusionM);
  const logoEmissive = useConfig((s) => s.logoEmissive);
  const sofaCount = useConfig((s) => s.sofaCount);
  const cupsEnabled = useConfig((s) => s.cupsEnabled);
  const coffeeTableVariant = useConfig((s) => s.coffeeTableVariant);
  const standingDisplayCount = useConfig((s) => s.standingDisplayCount);
  const posterboardCount = useConfig((s) => s.posterboardCount);
  const posterboardUrls = useConfig((s) => s.posterboardUrls);
  const cubeCount = useConfig((s) => s.cubeCount);
  const platformHeightM = useConfig((s) => s.platformHeightM);
  const windowsEnabled = useConfig((s) => s.windowsEnabled);
  const ceilingEnabled = useConfig((s) => s.ceilingEnabled);
  const windowSillM = useConfig((s) => s.windowSillM);
  const roomCount = useConfig((s) => s.roomCount);
  const tableLengthM = useConfig((s) => s.tableLengthM);
  const tableWidthM = useConfig((s) => s.tableWidthM);
  const chairCount = useConfig((s) => s.chairCount);
  const tableVariant = useConfig((s) => s.tableVariant);
  const tableOrientationDeg = useConfig((s) => s.tableOrientationDeg);
  const chairVariant = useConfig((s) => s.chairVariant);
  const colourOverrides = useConfig((s) => s.colourOverrides);
  const shape = useConfig((s) => s.shape);
  const exposure = useConfig((s) => s.exposure);
  const keyLightIntensity = useConfig((s) => s.keyLightIntensity);
  const plantCount = useConfig((s) => s.plantCount);
  const logoGlow = useConfig((s) => s.logoGlow);
  const kit = useBrandKit();
  const isDark = hallMode === "warehouse.dark";

  // Resolve surface colours: user override > kit scene override > kit palette default
  const wallColor    = colourOverrides.walls   ?? kit.scene?.wallColor   ?? kit.palette.primary;
  const floorColor   = colourOverrides.floor   ?? kit.scene?.floorColor  ?? mixHex(kit.palette.neutralLight, kit.palette.primary, 0.25);
  const trimColor    = colourOverrides.trim    ?? kit.palette.accent;
  const pendantColor = colourOverrides.pendant ?? kit.palette.primary;
  const trussColor   = colourOverrides.truss   ?? "#15171c";
  const sofaResolved    = colourOverrides.sofa    ?? kit.palette.primary;
  const counterColor    = colourOverrides.counter ?? kit.palette.accent;
  const vitrineColor    = colourOverrides.vitrine ?? kit.palette.accent;
  const monitorColor    = colourOverrides.monitor ?? kit.palette.primary;
  // Brand-tinted table colour. Almost every kit's `neutralDark` is near-
  // black, so falling back to it made every table look identical. Mix the
  // brand primary 30% into a dark walnut base — gives Tesla a red-toned
  // table, BMW a navy-toned table, Rolex a deep-green-toned table, all
  // still reading as "dark boardroom surface".
  const tableResolved = colourOverrides.table ?? kit.scene?.tableColor ?? mixHex("#1a1814", kit.palette.primary, 0.3);
  // Brand-tinted chair upholstery. `secondary` is often too saturated for
  // chair fabric (Ferrari yellow, Nike orange) so mix it 60% into the kit's
  // own neutralDark — keeps brand recognition without circus-chair vibes.
  const chairResolved = colourOverrides.chair ?? kit.scene?.chairColor ?? mixHex(kit.palette.neutralDark, kit.palette.secondary, 0.55);

  // Extruded brand signage that flanks the front door on the room's exterior.
  const logoInvert = !!kit.scene?.invertLogo;
  const exteriorLogo = kit.logos.primary.rasterUrl
    ? {
        url: kit.logos.primary.rasterUrl,
        viewBox: kit.logos.primary.viewBox,
        invert: logoInvert,
        chroma: (kit.scene?.logoChroma ?? "") as "white" | "black" | "",
        sideTint: logoInvert ? kit.palette.neutralDark : kit.palette.neutralLight,
        extrusionM: logoExtrusionM,
        emissive: logoEmissive,
      }
    : undefined;

  // Per-kit GI / key multipliers (atelier kits dial down ambient)
  const giMult  = kit.scene?.giMultiplier  ?? 1;
  const keyMult = kit.scene?.keyMultiplier ?? 1;

  // Multi-room cluster — rooms are cloned along X with doorways linking the
  // shared side walls. `xOffsetFor` centres the cluster on the origin so
  // OrbitControls' pivot still maps to roughly the cluster centre.
  const roomIndices = Array.from({ length: roomCount }, (_, i) => i);
  const xOffsetFor = (i: number) => (i - (roomCount - 1) / 2) * widthM;
  const clusterWidthM = widthM * roomCount;

  // Renderer-side: exposure + soft-shadow type set once on mount.
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = Math.pow(2, exposure);
  }, [gl, exposure]);
  useEffect(() => {
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.shadowMap.needsUpdate = true;
  }, [gl]);

  // Pendant suspension — hangs from the ceiling when the room is enclosed,
  // otherwise floats below the truss canopy (open / exhibition look).
  const pendantYM = (ceilingEnabled
    ? platformHeightM + wallHeightM - 0.95
    : Math.max(wallHeightM + 0.4, trussTopM - 1.2)
  ) + pendantYOffsetM;

  return (
    <>
      <Suspense fallback={<ambientLight intensity={0.6} />}>
        <Environment
          files={asset(`/hdri/${hdriIdOverride || HDRI_BY_MODE[hallMode]}.hdr`)}
          background
          // Sliders for blur + rotation now drive these directly. Default
          // hdrBlur is 0.05 (almost sharp); warehouse mode adds a baseline
          // blur of 0.5 on top so the hall geometry stays primary.
          backgroundBlurriness={Math.min(1, hdrBlur + (hallVisible ? 0.5 : 0))}
          backgroundRotation={[0, (hdrRotationDeg * Math.PI) / 180, 0]}
          environmentRotation={[0, (hdrRotationDeg * Math.PI) / 180, 0]}
          backgroundIntensity={hdrBgIntensity * (hallVisible ? (isDark ? 0.6 : 1.4) : 1.2)}
          environmentIntensity={hdrIntensity * (isDark ? 1.2 : 1.4)}
        />
      </Suspense>

      {/* Hall glb context — sits AROUND the stand for scale + context. */}
      {hallVisible && (
        <HallContext
          mode={hallMode}
          targetWidthM={55}
          opacity={isDark ? 0.4 : 0.55}
          darkness={hallDarkness}
        />
      )}

      <ambientLight intensity={(isDark ? 0.1 : 0.2) * giMult} />

      {/* Key light — single shadow caster. Modest map + radius for smooth penumbra at affordable cost. */}
      <directionalLight
        position={[8, 12, 6]}
        intensity={keyLightIntensity * keyMult * (isDark ? 1.0 : 1.4)}
        color={isDark ? "#dde2ec" : "#fff5e6"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00018}
        shadow-normalBias={0.05}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-radius={8}
        shadow-blurSamples={10}
      />
      <directionalLight position={[-6, 6, -4]} intensity={(isDark ? 0.22 : 0.3) * keyLightIntensity} color="#a8b4cc" />

      <Suspense fallback={null}>
        <PbrFloor isDark={isDark} widthM={clusterWidthM} depthM={depthM} />
      </Suspense>

      <Suspense fallback={null}>
        <PlatformBlock widthM={clusterWidthM} depthM={depthM} platformHeightM={platformHeightM} sideColor={floorColor} floorStyle={floorStyle} shape={shape} />
      </Suspense>

      <PlatformEdgeAccent widthM={clusterWidthM} depthM={depthM} platformHeightM={platformHeightM} color={trimColor} shape={shape} />

      {roomIndices.map((ri) => (
        <group key={`room-${ri}`} position={[xOffsetFor(ri), 0, 0]}>
      {!editMode && (
        <>
          <BoothInteriorLights widthM={widthM} depthM={depthM} wallHeightM={wallHeightM} accent={kit.palette.accent} isDark={isDark} />
          {/* Sconce — overhead spot grazing the back-wall logo */}
          <BackWallSconce widthM={widthM} depthM={depthM} wallHeightM={wallHeightM} accent={kit.palette.accent} intensity={logoGlow} />
        </>
      )}

      <TimedReveal delay={150}>
        <Suspense fallback={null}>
          <Room
            shape={shape}
            widthM={widthM}
            depthM={depthM}
            wallHeightM={wallHeightM}
            platformHeightM={platformHeightM}
            kitPrimary={wallColor}
            kitAccent={kit.palette.accent}
            backWallGraphic={kit.scene?.wallGraphic}
            backWallMotif={kit.scene?.wallMotif}
            windowsEnabled={windowsEnabled}
            windowSillM={windowSillM}
            windowTrimColor={kit.scene?.windowTrimColor ?? kit.palette.accent}
            logo={exteriorLogo}
            connectLeft={ri > 0}
            skipRight={ri < roomCount - 1}
          />
        </Suspense>
      </TimedReveal>

      {/* Corner pillars — the structural columns the room is framed on. */}
      <TimedReveal delay={200}>
        <CornerPillars shape={shape} widthM={widthM} depthM={depthM} wallHeightM={wallHeightM} platformHeightM={platformHeightM} color={kit.palette.neutralDark} />
      </TimedReveal>

      {/* Ceiling — enclosed boardroom. Toggle off for an open / exhibition
          look (which also reveals the truss canopy above). */}
      {ceilingEnabled && (
        <TimedReveal delay={250}>
          <Ceiling shape={shape} widthM={widthM} depthM={depthM} wallHeightM={wallHeightM} platformHeightM={platformHeightM} ceilingColor={colourOverrides.ceiling ?? "#e9eaee"} />
        </TimedReveal>
      )}

      {/* The truss canopy is the open / exhibition rig — hidden once the
          ceiling encloses the room. */}
      {!ceilingEnabled && (
        <TimedReveal delay={300}>
          <TrussCanopy widthM={widthM} depthM={depthM} trussTopM={trussTopM} color={trussColor} editMode={editMode} />
        </TimedReveal>
      )}
        </group>
      ))}

      {/* Props + branded content — rendered ONLY in the first room of the
          cluster. Multi-room duplication is for empty architectural shells;
          the pendant, logo, video wall, hero GLBs and default dressing all
          stay anchored to the lead room rather than copying across clones. */}
      <group position={[xOffsetFor(0), 0, 0]}>
        {/* Brand logo — prominent inside the room (migrates to the left flank
            when the video wall occupies the back wall). The exterior signage
            flanking the front door is rendered by Room/DoorEdgeWall. */}
        <Suspense fallback={null}>
          <BrandLogoOnWall
            kit={kit}
            widthM={widthM}
            depthM={depthM}
            wallHeightM={wallHeightM}
            platformHeightM={platformHeightM}
            glow={logoGlow}
            extrusionM={logoExtrusionM}
            emissive={logoEmissive}
            placement={ledWallEnabled ? "flank-both" : "back-centre"}
            shape={shape}
          />
        </Suspense>

        {/* LED / video wall — emissive panel mounted on the back wall. For
            circular rooms we pull the back-wall Z inward onto the chord that
            actually fits the assembly (LED + flanking monitors); otherwise
            the panels poke through the curved wall at their x-edges. */}
        {ledWallEnabled && (() => {
          const assemblyHalfW = ledWallWidthM / 2 + 1.4 * 2 + 0.7; // led + ~2 monitors + gap
          const ledBackZ = circularBackWallZ(shape, widthM, depthM, assemblyHalfW);
          return (
            <Suspense fallback={null}>
              <LedWall
                kit={kit}
                backWallZ={ledBackZ}
                widthM={ledWallWidthM}
                heightM={ledWallHeightM}
                roomWidthM={widthM}
                roomHeightM={wallHeightM}
                platformHeightM={platformHeightM}
                brightness={ledWallBrightness}
              />
              {/* FlankingMonitors removed — the back wall is now ONE
                  full-span video wall. Keep DoorWallSatellites though,
                  they live on the front (door) wall. */}
              <DoorWallSatellites
                kit={kit}
                roomDepthM={depthM}
                roomWidthM={widthM}
                wallHeightM={wallHeightM}
                platformHeightM={platformHeightM}
              />
            </Suspense>
          );
        })()}

        {/* The branded pendant stays in both modes — it hangs from the ceiling
            when enclosed, from the truss when open (see pendantYM above). */}
        {pendantEnabled && (
          <TimedReveal delay={450}>
            <PendantWithLogo
              shape={pendantShape}
              widthM={pendantWidthM}
              depthM={pendantDepthM}
              heightM={pendantHeightM}
              yPositionM={pendantYM}
              extrusionM={logoExtrusionM}
              emissive={logoEmissive}
              rotationDeg={pendantRotationDeg}
              ringVertical={pendantRingVertical}
              colorOverride={pendantColor}
              kit={kit}
            />
            {/* Pool of light cast straight down by the pendant onto the table,
                making the fixture read as a working downlight rather than
                purely decorative. Two spotlights aimed at the long axis of
                the table so a long boardroom table is evenly lit. */}
            <PendantDownlight
              centerXZ={[0, 0]}
              yPendant={pendantYM}
              yFloor={platformHeightM + 0.74}
              widthM={pendantWidthM}
              depthM={pendantDepthM}
              color={kit.palette.neutralLight}
            />
          </TimedReveal>
        )}

        {/* Hero elements — toggles in Lighting section. In edit mode the
            performance-heavy / shadow-casting ones are skipped. */}
        {lightShaftsEnabled && !editMode && (
          <LightShafts
            widthM={widthM}
            depthM={depthM}
            railY={trussTopM + 0.1}
            color={kit.palette.accent}
            count={6}
            density={lightShaftDensity}
            floorY={platformHeightM + 0.05}
          />
        )}
        {lightboxLogoEnabled && (
          <Suspense fallback={null}>
            {/* Lightbox hangs from the truss — suspended near the truss height
                (trussTopM - 0.4) with a thin cable from above, so it reads as
                part of the overhead rig instead of floating mid-room. */}
            <group position={[0, trussTopM - 1.2, depthM / 2 - 1.5]}>
              <mesh position={[0, 0.7, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 1.0, 6]} />
                <meshStandardMaterial color="#1a1c22" roughness={0.4} metalness={0.6} />
              </mesh>
              <LightboxLogo kit={kit} position={[0, 0, 0]} widthM={2.6} heightM={1.0} />
            </group>
          </Suspense>
        )}
        {radiatingRigEnabled && (
          <RadiatingRig
            centerXZ={[0, 0]}
            baseRadius={radiatingRadiusM}
            rings={radiatingRings}
            yPos={(pendantEnabled ? pendantYM : trussTopM - 0.5) + radiatingYOffsetM}
            color={radiatingColor || kit.palette.accent}
          />
        )}
        {glassBalconyEnabled && (
          <GlassBalcony widthM={widthM} depthM={depthM} platformHeightM={platformHeightM} brandPrimary={kit.palette.primary} brandAccent={kit.palette.accent} />
        )}
        {circularScreenEnabled && (
          <CircularScreen kit={kit} position={[0, platformHeightM + wallHeightM * 0.6, -depthM / 2 + 0.18]} radius={1.4} />
        )}
        {wraparoundScreenEnabled && (
          <WraparoundScreen kit={kit} widthM={widthM} depthM={depthM} heightM={wallHeightM * 0.8} yBaseM={platformHeightM + 0.4} />
        )}

        {/* Per-kit brand-hero assets — the GLBs in /components/brand-hero/<slug>/. */}
        <KitProps kit={kit} booth={{ widthM, depthM, wallHeightM, trussTopM, platformHeightM, shape, tableLengthM, tableWidthM }} />

        {/* Boardroom furnishing — the table + chairs are the centrepiece; plants
            dress the corners; sofas are optional breakout seating. Suppressed
            when a kit brings its own bespoke set. */}
        {!kit.scene?.noDefaultDressing && (
          <>
            {/* Boardroom table + chairs + cups + decals all share the SAME
                tableLengthM/tableWidthM and centre on the room origin —
                wrapping them in one rotation group lets the user flip the
                whole ensemble between long-axis-along-Z (0°) and long-axis-
                along-X (90°) via boardroom.setTableOrientation. Default 90°
                so the long table aligns with the room's wider dimension. */}
            <Suspense fallback={null}>
              <group rotation-y={(tableOrientationDeg * Math.PI) / 180}>
                <BoardroomTable
                  variant={tableVariant}
                  lengthM={tableLengthM}
                  widthM={tableWidthM}
                  position={[0, platformHeightM, 0]}
                  tintHex={tableResolved}
                />
                <ChairsAroundTable
                  count={chairCount}
                  tableLengthM={tableLengthM}
                  tableWidthM={tableWidthM}
                  chairVariant={chairVariant}
                  position={[0, platformHeightM, 0]}
                  tintHex={chairResolved}
                  kit={kit}
                />
                {cupsEnabled && (
                  <BrandedCupsOnTable
                    count={chairCount}
                    tableLengthM={tableLengthM}
                    tableWidthM={tableWidthM}
                    position={[0, platformHeightM, 0]}
                    kit={kit}
                    cupTint={colourOverrides.cup ?? undefined}
                  />
                )}
                <TableTopBrandDecals
                  position={[0, platformHeightM, 0]}
                  tableLengthM={tableLengthM}
                  tableWidthM={tableWidthM}
                  kit={kit}
                />
              </group>
            </Suspense>

            {/* Optional breakout seating — sofa pair against the front-right
                wall, count-driven (0 by default for a clean boardroom). The
                sofa is rotated -π/2 so its long axis (~1.7m) runs along Z
                and its depth (~0.85m) points outward into the room. We use
                0.85m as the radius for `placeOnFloor` so wall + table
                clearance always covers the *longer* extent — a touch
                conservative across-wall but safe in every shape.

                Coffee table sits between the sofas and the boardroom table.
                Both flow through `placeOnFloor` so they cannot crash into
                walls / table / chairs in any room shape. */}
            {Array.from({ length: Math.min(sofaCount, 2) }, (_, i) => {
              const SOFA_HEIGHT = 1.0;
              const SOFA_RADIUS = 0.85;
              // Ideal: hugged against the right wall, forward sofa at +z,
              // pair sits behind it. Real values then get clamped to safe
              // bounds for this room shape + table footprint.
              const idealX = widthM / 2 - 1.05;
              const idealZ = depthM / 2 - 1.6 - (i === 0 ? 0 : 1.45);
              const placed = placeOnFloor({
                label: `sofa.${i}`,
                x: idealX,
                z: idealZ,
                radius: SOFA_RADIUS,
                shape: shape as RoomShape,
                widthM, depthM,
                tableLengthM, tableWidthM,
                tableClearanceM: 0.7,
              });
              const rotY = -Math.PI / 2;
              return (
                <Suspense key={`sofa-${i}`} fallback={null}>
                  <Sofa
                    position={[placed.x, platformHeightM + SOFA_HEIGHT * 0.5, placed.z]}
                    rotationY={rotY}
                    heightM={SOFA_HEIGHT}
                    tintHex={sofaResolved}
                  />
                </Suspense>
              );
            })}
            {sofaCount >= 2 && (() => {
              // Coffee table sits in front of the sofa pair, between sofas
              // and the boardroom table. Routed through `placeOnFloor` so
              // it's guaranteed to clear the boardroom-table footprint plus
              // chair walking-zone.
              const ct = placeOnFloor({
                label: "coffeeTable",
                x: widthM / 2 - 2.0,
                z: depthM / 2 - 2.3,
                radius: 0.45,
                shape: shape as RoomShape,
                widthM, depthM,
                tableLengthM, tableWidthM,
                tableClearanceM: 0.6,
              });
              return (
                <Suspense fallback={null}>
                  <CoffeeTable variant={coffeeTableVariant} position={[ct.x, platformHeightM, ct.z]} heightM={0.335} />
                </Suspense>
              );
            })()}

            <Plants widthM={widthM} depthM={depthM} plantCount={plantCount} platformHeightM={platformHeightM} shape={shape} tableLengthM={tableLengthM} tableWidthM={tableWidthM} />

            {/* Freestanding display screens — count-driven, placed along the
                side walls facing the table. Each one can optionally show a
                campaign graphic from kit.scene.exhibitionGraphics (entries
                with surface="standingDisplay"); otherwise it ken-burns the
                brand mark over an emissive panel. */}
            <StandingDisplays
              count={standingDisplayCount}
              widthM={widthM}
              depthM={depthM}
              platformHeightM={platformHeightM}
              kit={kit}
              shape={shape}
              tableLengthM={tableLengthM}
              tableWidthM={tableWidthM}
            />

            {/* Exhibition graphics applied to the back wall (printed posters /
                campaign artwork rather than full-bleed `wallGraphic`). */}
            <WallExhibitionGraphics kit={kit} widthM={widthM} depthM={depthM} wallHeightM={wallHeightM} platformHeightM={platformHeightM} />

            {/* Upright portrait posterboards — count-driven, distributed
                along the side walls. Each carries a kit-uploaded image
                (or the kit's primary logo if no upload). Added via the
                wizard's Customisation step. */}
            <Posterboards
              count={posterboardCount}
              urls={posterboardUrls}
              widthM={widthM}
              depthM={depthM}
              wallHeightM={wallHeightM}
              platformHeightM={platformHeightM}
              kit={kit}
            />

            {/* Centre-of-room cube plinths — dealers'-choice slots. The
                clickable hotspot UI (upload / generate) is the next
                iteration; for now each cube renders with a brand
                accent material so the user sees where they'll land. */}
            <CubePlinths
              count={cubeCount}
              widthM={widthM}
              depthM={depthM}
              platformHeightM={platformHeightM}
              kit={kit}
            />
          </>
        )}
      </group>

      {/* Camera sync — applies FOV + preset moves + surfaces live readouts.
          Lives outside the per-room map so it observes the cluster as a
          whole rather than re-mounting for every room. */}
      <CameraSync />

      <ContactShadows
        position={[0, 0.012, 0]}
        opacity={isDark ? 0.4 : 0.32}
        scale={Math.max(clusterWidthM, depthM) * 1.8}
        blur={3.5}
        far={6}
      />

      {/* OrbitControls owns no static target — CameraSync is the single source
          of truth for the orbit pivot, so it stays synced to the look-at. */}
      {/* Stiff "strafing" feel was the combo of low rotate speed (0.85) and
          heavy damping (0.08 → drag carries on after release for ~12 frames).
          Bumped rotate speed and dropped damping factor for a more direct
          one-to-one feel. Mouse buttons set explicitly so left-drag is
          ALWAYS rotate (was the same default but explicit is safer). */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.22}
        zoomSpeed={0.6}
        rotateSpeed={1.4}
        panSpeed={1.0}
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        minDistance={1.5}
        // Cap orbit radius so the camera can't dolly far enough back to
        // clip through the front wall. Room diagonal sets the upper
        // bound: half the diagonal plus a 1.5m breathing buffer keeps
        // the camera comfortably inside even at the widest rooms.
        maxDistance={Math.hypot(clusterWidthM, depthM) * 0.5 + 1.5}
        maxPolarAngle={Math.PI / 2 - 0.04}
      />
      <CameraRoomClamp widthM={clusterWidthM} depthM={depthM} wallHeightM={wallHeightM} platformHeightM={platformHeightM} />
      <Flycam speed={2} />
      <PerfMonitor />
    </>
  );
}

// ── Camera room clamp ──────────────────────────────────────────────────────
// Per-frame: if the user orbits the camera past any wall, pull it back to
// just inside the room. The previous implementation lerped at 0.35 every
// frame — that's strong enough to feel like the camera is rubber-banding
// back as the user drags, fighting OrbitControls' inertial damping. Now
// we apply only a TINY 0.06 lerp, which gathers correction over a few
// frames once the user stops dragging instead of yanking visibly during
// the drag itself. The clamp also stays out of the way for 1.2s after a
// preset transition (`gotoPreset`) so the cinematic move can park the
// camera wherever it wants without us immediately fighting it.
function CameraRoomClamp({ widthM, depthM, wallHeightM, platformHeightM }: { widthM: number; depthM: number; wallHeightM: number; platformHeightM: number }) {
  const { camera } = useThree();
  const cameraPreset = useConfig((s) => s.cameraPreset);
  const cooldownRef = useRef<number>(0);
  // Reset the cooldown whenever a preset fires so the cinematic move
  // can fly through wall space without the clamp dragging it back.
  useEffect(() => {
    // 6s window — must outlast the camera-preset transition (5.5s) +
    // a small settle. Otherwise the clamp starts pulling the camera
    // back to room interior mid-flight and fights the cinematic move.
    if (cameraPreset) cooldownRef.current = Date.now() + 6000;
  }, [cameraPreset]);
  useFrame(() => {
    if (Date.now() < cooldownRef.current) return;
    // Keep an 0.4m wall buffer so the camera never sits flush with the
    // glass / panelling. Vertical buffers are looser because the polar-
    // angle limit already protects us from flying through the ceiling.
    const margin = 0.4;
    const xLim = widthM / 2 - margin;
    const zLim = depthM / 2 - margin;
    const yMin = platformHeightM + 0.4;
    const yMax = platformHeightM + wallHeightM - 0.2;
    let nx = camera.position.x;
    let nz = camera.position.z;
    let ny = camera.position.y;
    if (nx >  xLim) nx =  xLim;
    if (nx < -xLim) nx = -xLim;
    if (nz >  zLim) nz =  zLim;
    if (nz < -zLim) nz = -zLim;
    if (ny < yMin)  ny = yMin;
    if (ny > yMax)  ny = yMax;
    if (nx !== camera.position.x || nz !== camera.position.z || ny !== camera.position.y) {
      // 0.06 = drift in over ~20 frames after the user stops dragging.
      // Much weaker than before so it doesn't visibly fight the user.
      camera.position.lerp(new THREE.Vector3(nx, ny, nz), 0.06);
    }
  });
  return null;
}

// ── Lighting ────────────────────────────────────────────────────────────────

function BoothInteriorLights({ widthM, depthM, wallHeightM, accent, isDark }: { widthM: number; depthM: number; wallHeightM: number; accent: string; isDark: boolean }) {
  // Interior wash spots — non-shadow-casting to keep render budget for the key only.
  return (
    <group>
      <spotLight
        position={[-widthM / 4, wallHeightM + 0.4, depthM / 4]}
        target-position={[-widthM / 4, wallHeightM * 0.6, -depthM / 2]}
        angle={0.55}
        penumbra={0.7}
        intensity={isDark ? 22 : 14}
        decay={1.4}
        distance={depthM * 2.2}
        color="#fff1d8"
      />
      <spotLight
        position={[widthM / 4, wallHeightM + 0.4, depthM / 4]}
        target-position={[widthM / 4, wallHeightM * 0.6, -depthM / 2]}
        angle={0.55}
        penumbra={0.7}
        intensity={isDark ? 22 : 14}
        decay={1.4}
        distance={depthM * 2.2}
        color="#fff1d8"
      />
      <pointLight position={[0, wallHeightM + 0.2, 0]} intensity={isDark ? 5 : 3} decay={2} distance={Math.max(widthM, depthM) * 1.3} color={accent} />
    </group>
  );
}

function BackWallSconce({ widthM, depthM, wallHeightM, accent, intensity }: { widthM: number; depthM: number; wallHeightM: number; accent: string; intensity: number }) {
  // Sconces hang above the top of the back-wall LED panel so they don't punch
  // through the screen geometry. LED is yBase + heightM (≈ 0.2 + up-to wall*0.95)
  // — so we anchor at wall*0.96 and Z out in front of the panel.
  const y = wallHeightM * 0.86;
  const sconceY = wallHeightM * 0.96;
  const z = -depthM / 2 + 0.7;
  return (
    <group>
      {/* Two physical sconces flanking the logo — pushed halfway out toward
          the outer walls (was widthM*0.18 → widthM*0.36) so they bracket the
          stand instead of crowding the logo. */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * widthM * 0.36, sconceY, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.125, 0.15, 0.3, 16]} />
            <meshStandardMaterial color="#1a1c22" roughness={0.4} metalness={0.7} />
          </mesh>
          <pointLight intensity={intensity * 2.5} distance={3} decay={2} color={"#fff5e6"} />
        </group>
      ))}
      {/* Wash spotlight from above the logo */}
      <spotLight
        position={[0, wallHeightM + 0.5, z + 0.2]}
        target-position={[0, y, -depthM / 2 + 0.05]}
        angle={0.45}
        penumbra={0.85}
        intensity={intensity * 12}
        decay={1.3}
        distance={6}
        color="#fff1d8"
      />
      {/* Subtle accent-coloured backlight kissing the wall */}
      <pointLight
        position={[0, y, -depthM / 2 + 0.15]}
        intensity={intensity * 1.5}
        distance={4}
        decay={2}
        color={accent}
      />
    </group>
  );
}

// ── Pendant downlight ──────────────────────────────────────────────────────
// Casts a soft pool of warm light from the pendant fixture straight down onto
// the table. Pair of spotlights along the long axis ensures even coverage for
// long boardroom tables — for a square pendant they overlap and read as one.
function PendantDownlight({
  centerXZ, yPendant, yFloor, widthM, depthM, color,
}: {
  centerXZ: [number, number]; yPendant: number; yFloor: number;
  widthM: number; depthM: number; color: string;
}) {
  const [cx, cz] = centerXZ;
  // Split into two spots along the long axis so a 4m-long pendant still pools
  // light onto a 3.6m table evenly. For short / square pendants the pair sits
  // close to the centre and acts like one.
  const longAxis = depthM > widthM ? "z" : "x";
  const longSpan = Math.max(widthM, depthM);
  const offset = Math.min(longSpan * 0.25, 0.8);
  const seats = longAxis === "z"
    ? [[cx, cz - offset], [cx, cz + offset]]
    : [[cx - offset, cz], [cx + offset, cz]];
  // Pendant lights are notional 0.05m below the body — aimed at the table top.
  const lampY = yPendant - 0.05;
  return (
    <group>
      {seats.map(([sx, sz], i) => (
        <spotLight
          key={i}
          position={[sx, lampY, sz]}
          target-position={[sx, yFloor, sz]}
          angle={0.7}
          penumbra={0.85}
          intensity={6}
          decay={1.4}
          distance={Math.max(2.5, lampY - yFloor + 1.5)}
          color={color}
          castShadow={false}
        />
      ))}
      {/* Soft warm fill — wraps the pool with a warm glow so the under-pendant
          area reads as a "lit" zone, not just a hard spot. */}
      <pointLight
        position={[cx, (lampY + yFloor) / 2, cz]}
        intensity={1.8}
        distance={Math.max(widthM, depthM) * 1.8}
        decay={2}
        color={color}
      />
    </group>
  );
}

// ── Floor ───────────────────────────────────────────────────────────────────

function PlatformBlock({ widthM, depthM, platformHeightM, sideColor, floorStyle, shape = "rectangle" }: { widthM: number; depthM: number; platformHeightM: number; sideColor: string; floorStyle: "herringbone" | "diagonal" | "rectangular"; shape?: FootprintShape }) {
  const { map, normalMap, aoMap } = useParquetTextures(floorStyle);
  // Size-aware tiling — one parquet tile per ~2 m of floor, so the planks
  // keep their proportion regardless of room size, and max anisotropy so the
  // detail holds up at glancing angles instead of smearing in the centre.
  useEffect(() => {
    const rx = Math.max(1, widthM / 2);
    const ry = Math.max(1, depthM / 2);
    [map, normalMap, aoMap].forEach((t) => {
      t.repeat.set(rx, ry);
      t.anisotropy = 16;
      t.needsUpdate = true;
    });
  }, [map, normalMap, aoMap, widthM, depthM]);
  // Parquet brand tint: the top-surface multiply colour washes the PBR
  // diffuse map by ~65% toward the brand floor colour, so the floor reads
  // as brand-toned wood instead of generic oak. The previous 35% wash
  // (lerp 0.65 toward white) muted the brand so heavily that every kit
  // looked the same on the floor — Rolex's deep green, Ferrari's red,
  // Tesla's smoke-grey all rendered as identical-looking oak. The sides
  // keep the full brand colour for stronger fascia signalling.
  const parquetTint = useMemo(() => {
    const base = new THREE.Color(sideColor);
    const white = new THREE.Color("#ffffff");
    return base.clone().lerp(white, 0.35).getStyle();
  }, [sideColor]);
  // Circular room → a cylindrical plinth so the floor matches the cylindrical
  // wall ring instead of leaving uncarpeted slivers at the corners.
  if (shape === "circular") {
    const radius = Math.min(widthM, depthM) / 2;
    return (
      <group position={[0, platformHeightM / 2, 0]} userData={{ kind: "floor" }}>
        <mesh receiveShadow castShadow userData={{ kind: "floor" }}>
          <cylinderGeometry args={[radius, radius, platformHeightM, 64, 1, false]} />
          <meshPhysicalMaterial color={sideColor} roughness={0.7} metalness={0.04} />
        </mesh>
        {/* Top cap carries the parquet — separate mesh so we don't have to
            re-uv the cylinder. Slight Y lift so it sits proud of the body
            and the parquet AO doesn't z-fight with the side. */}
        <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, platformHeightM / 2 + 0.001, 0]} userData={{ kind: "floor" }}>
          <circleGeometry args={[radius, 64]} />
          <meshPhysicalMaterial map={map} normalMap={normalMap} aoMap={aoMap} color={parquetTint} roughness={0.4} metalness={0.05} clearcoat={0.45} clearcoatRoughness={0.25} envMapIntensity={1.2} />
        </mesh>
      </group>
    );
  }
  // 6 face materials on a BoxGeometry: parquet on the top (+Y), brand-coloured on the rest.
  // Order in three: +X -X +Y -Y +Z -Z
  return (
    <mesh receiveShadow castShadow position={[0, platformHeightM / 2, 0]} userData={{ kind: "floor" }}>
      <boxGeometry args={[widthM, platformHeightM, depthM]} />
      <meshPhysicalMaterial attach="material-0" color={sideColor} roughness={0.7} metalness={0.04} />
      <meshPhysicalMaterial attach="material-1" color={sideColor} roughness={0.7} metalness={0.04} />
      <meshPhysicalMaterial attach="material-2" map={map} normalMap={normalMap} aoMap={aoMap} color={parquetTint} roughness={0.4} metalness={0.05} clearcoat={0.45} clearcoatRoughness={0.25} envMapIntensity={1.2} />
      <meshPhysicalMaterial attach="material-3" color={sideColor} roughness={0.7} metalness={0.04} />
      <meshPhysicalMaterial attach="material-4" color={sideColor} roughness={0.7} metalness={0.04} />
      <meshPhysicalMaterial attach="material-5" color={sideColor} roughness={0.7} metalness={0.04} />
    </mesh>
  );
}

function PbrFloor({ isDark, widthM, depthM }: { isDark: boolean; widthM: number; depthM: number }) {
  const { map, normalMap, roughnessMap } = useFloorTextures();
  // 1.5x the room dimensions — gives a sense of exterior context just
  // outside the room shell, but isn't an infinite quad with stretched-thin
  // texture detail. The concrete texture's repeat is already set in
  // useFloorTextures; this just sizes the plane.
  const w = widthM * 1.5;
  const d = depthM * 1.5;
  return (
    <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={map} normalMap={normalMap} roughnessMap={roughnessMap} color={isDark ? "#8d8d8d" : "#cccccc"} roughness={isDark ? 0.72 : 0.82} metalness={0.05} envMapIntensity={isDark ? 0.9 : 1.05} />
    </mesh>
  );
}

// ── Walls ───────────────────────────────────────────────────────────────────

type FootPt = [number, number];   // [x, z] in metres, room-centred

/** Footprint polygon for each room shape, as XZ points. Every shape fits
 *  inside the width × depth bounding box. */
function footprintPolygon(shape: FootprintShape, w: number, d: number): FootPt[] {
  const hw = w / 2, hd = d / 2;
  switch (shape) {
    case "L": {
      const bw = w * 0.42, bd = d * 0.45;            // bite from the front-right
      return [[-hw, -hd], [hw, -hd], [hw, hd - bd], [hw - bw, hd - bd], [hw - bw, hd], [-hw, hd]];
    }
    case "invertedL": {
      const bw = w * 0.42, bd = d * 0.45;            // bite from the front-left
      return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw + bw, hd], [-hw + bw, hd - bd], [-hw, hd - bd]];
    }
    case "U": {
      const bw = w * 0.34, bd = d * 0.58;            // bite from the front-centre
      return [[-hw, -hd], [hw, -hd], [hw, hd], [bw / 2, hd], [bw / 2, hd - bd], [-bw / 2, hd - bd], [-bw / 2, hd], [-hw, hd]];
    }
    case "circular": {
      const r = Math.min(hw, hd);
      const n = 32;
      const out: FootPt[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;   // first vertex at -Z (back)
        out.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return out;
    }
    // rectangle / corner / pavilion — a plain rectangle bounding box
    default:
      return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
  }
}

/** Even-odd point-in-polygon test (XZ plane). */
function pointInPolygon(x: number, z: number, poly: FootPt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!;
    const [xj, zj] = poly[j]!;
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Pavilion atrium footprint — a centred rectangle, ~42% of the room. */
function atriumSize(w: number, d: number): [number, number] {
  return [w * 0.42, d * 0.42];
}

function Room({
  shape, widthM, depthM, wallHeightM, platformHeightM, kitPrimary, kitAccent,
  backWallGraphic, backWallMotif, windowsEnabled, windowSillM, windowTrimColor, logo,
  connectLeft = false, skipRight = false,
}: {
  shape: FootprintShape; widthM: number; depthM: number; wallHeightM: number; platformHeightM: number;
  kitPrimary: string; kitAccent: string;
  backWallGraphic?: string;
  backWallMotif?: MotifKind;
  windowsEnabled: boolean;
  windowSillM: number;
  windowTrimColor: string;
  logo?: {
    url: string; viewBox: [number, number, number, number];
    invert: boolean; chroma: "white" | "black" | "";
    sideTint: string; extrusionM: number; emissive: number;
  };
  /** When true, the leftmost side wall becomes a doorway linking to the
   *  room immediately to the left. */
  connectLeft?: boolean;
  /** When true, skip rendering the rightmost side wall — the next room
   *  on the right renders the shared wall as its connecting doorway. */
  skipRight?: boolean;
}) {
  // Walls are built edge-by-edge around the footprint polygon: the rearmost
  // edge is the solid feature wall (logo + video live there), the frontmost
  // edge carries the door opening, side-ish edges are ribbon-windowed.
  const thick = 0.08;
  const platformTop = platformHeightM;
  const poly = footprintPolygon(shape, widthM, depthM);
  const n = poly.length;
  const circular = shape === "circular";

  let doorEdge = 0, backEdge = 0, maxZ = -Infinity, minZ = Infinity;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!, b = poly[(i + 1) % n]!;
    const midZ = (a[1] + b[1]) / 2;
    if (midZ > maxZ) { maxZ = midZ; doorEdge = i; }
    if (midZ < minZ) { minZ = midZ; backEdge = i; }
  }
  // For multi-room linking: pick the leftmost / rightmost SIDE edges (those
  // that aren't the door or back), so adjacent rooms can share them.
  let leftEdge = -1, rightEdge = -1, minX = Infinity, maxX = -Infinity;
  for (let i = 0; i < n; i++) {
    if (i === doorEdge || i === backEdge) continue;
    const a = poly[i]!, b = poly[(i + 1) % n]!;
    const midX = (a[0] + b[0]) / 2;
    if (midX < minX) { minX = midX; leftEdge = i; }
    if (midX > maxX) { maxX = midX; rightEdge = i; }
  }

  return (
    <group>
      {poly.map((a, i) => {
        const b = poly[(i + 1) % n]!;
        const dx = b[0] - a[0], dz = b[1] - a[1];
        const len = Math.hypot(dx, dz);
        if (len < 0.05) return null;
        const mid: [number, number, number] = [(a[0] + b[0]) / 2, platformTop, (a[1] + b[1]) / 2];
        const rotY = Math.atan2(-dz, dx);
        const sideish = Math.abs(dz) >= Math.abs(dx);

        if (i === doorEdge) {
          return <DoorEdgeWall key={i} lengthM={len} wallHeightM={wallHeightM} thick={thick} position={mid} rotationY={rotY} color={kitPrimary} logo={logo} />;
        }
        // Multi-room: shared edges become connecting doorways (left) or are
        // skipped entirely (right — the next room's left renders the doorway).
        if (skipRight && i === rightEdge) return null;
        if (connectLeft && i === leftEdge) {
          return (
            <WindowedDoorwayWall key={i} lengthM={len} wallHeightM={wallHeightM} thick={thick}
              position={mid} rotationY={rotY} sillM={windowSillM} color={kitPrimary} frameColor={windowTrimColor} />
          );
        }
        if (windowsEnabled && (circular || (i !== backEdge && sideish))) {
          return (
            <WindowedWall key={i} lengthM={len} wallHeightM={wallHeightM} thick={thick}
              position={mid} rotationY={rotY} sillM={windowSillM} color={kitPrimary} frameColor={windowTrimColor}
              logo={logo} />
          );
        }
        if (i === backEdge) {
          return (
            <group key={i} position={mid} rotation-y={rotY}>
              <BackWallPanel w={len} h={wallHeightM} d={thick} pos={[0, wallHeightM / 2, 0]}
                color={kitPrimary} accent={kitAccent} graphicUrl={backWallGraphic} motif={backWallMotif} />
            </group>
          );
        }
        return (
          <group key={i} position={mid} rotation-y={rotY}>
            <WallPanelPlaster w={len} h={wallHeightM} d={thick} pos={[0, wallHeightM / 2, 0]} color={kitPrimary} />
          </group>
        );
      })}

      {/* Circular rooms: the wall is a ribbon-glass cylinder so per-segment
          flank logos don't fit (each 32-segment chord is ~1.2m). Render four
          large brand signs at the inter-cardinal points instead, tangent to
          the exterior, avoiding the door (+Z) and back (-Z) axes. */}
      {shape === "circular" && logo && (() => {
        const r = Math.min(widthM, depthM) / 2;
        const angles = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
        const signWidthM = Math.min(r * 0.5, 1.6);
        const signHeightM = wallHeightM;
        return angles.map((ang, i) => {
          const x = Math.cos(ang) * r;
          const z = Math.sin(ang) * r;
          // Local +Z should point outward (radially away from centre).
          const rotY = Math.PI / 2 - ang;
          return (
            <group key={`circ-logo-${i}`} position={[x, platformTop, z]} rotation-y={rotY}>
              <Suspense fallback={null}>
                <LogoSign
                  url={logo.url}
                  viewBox={logo.viewBox}
                  widthM={signWidthM}
                  heightM={signHeightM}
                  anchorZ={0}
                  faceDir={1}
                  xOffset={0}
                  y={wallHeightM * 0.55}
                  extrusionM={logo.extrusionM}
                  sideTint={logo.sideTint}
                  emissive={logo.emissive * 2.4}
                  invert={logo.invert}
                  chroma={logo.chroma}
                  maxWidthM={signWidthM}
                />
              </Suspense>
            </group>
          );
        });
      })()}

      {/* Pavilion — a full-height GLASS atrium box in the centre with sliding
          glass doors on each side. Reads as an internal courtyard you can
          walk into through any face. */}
      {shape === "pavilion" && (() => {
        const [aw, ad] = atriumSize(widthM, depthM);
        const hw = aw / 2, hd = ad / 2;
        const innerH = Math.min(wallHeightM - 0.2, wallHeightM * 0.96);
        const ring: { pos: [number, number, number]; rotY: number; len: number }[] = [
          { pos: [0, platformTop, -hd], rotY: 0, len: aw },
          { pos: [0, platformTop, hd], rotY: 0, len: aw },
          { pos: [-hw, platformTop, 0], rotY: Math.PI / 2, len: ad },
          { pos: [hw, platformTop, 0], rotY: Math.PI / 2, len: ad },
        ];
        return ring.map((e, i) => (
          <AtriumGlassWall
            key={`atrium-${i}`}
            lengthM={e.len}
            wallHeightM={innerH}
            thick={thick}
            position={e.pos}
            rotationY={e.rotY}
            frameColor={kitAccent}
          />
        ));
      })()}
    </group>
  );
}

// Wall along an edge with a central door opening — two segments + a header,
// built in a local frame: `lengthM` runs along local X, `wallHeightM` up Y.
// When a `logo` is given, extruded brand signs flank the door on the
// exterior (local -Z) face.
function DoorEdgeWall({
  lengthM, wallHeightM, thick, position, rotationY, color, logo,
}: {
  lengthM: number; wallHeightM: number; thick: number;
  position: [number, number, number]; rotationY: number; color: string;
  logo?: {
    url: string; viewBox: [number, number, number, number];
    invert: boolean; chroma: "white" | "black" | "";
    sideTint: string; extrusionM: number; emissive: number;
  };
}) {
  // Door dimensions bumped from a standard residential 1.3 × 2.25m to a more
  // generous 2.0 × wall-height-minus-0.2m so the room reads as a real
  // corporate / showroom space rather than a domestic entry.
  const doorW = Math.min(2.0, lengthM * 0.55);
  const doorH = Math.max(2.0, wallHeightM - 0.2);
  const segW = Math.max(0.02, (lengthM - doorW) / 2);
  const headerH = Math.max(0, wallHeightM - doorH);
  const segCx = doorW / 2 + segW / 2;
  return (
    <group position={position} rotation-y={rotationY}>
      {/* Front wall (the door wall) carries the quadrated panelling —
          brand-tinted square panels with relief. The other walls keep the
          plaster finish (toggleable via room.setWallTextureEnabled). */}
      <WallPanelQuadrated w={segW} h={wallHeightM} d={thick} pos={[-segCx, wallHeightM / 2, 0]} color={color} />
      <WallPanelQuadrated w={segW} h={wallHeightM} d={thick} pos={[segCx, wallHeightM / 2, 0]} color={color} />
      {headerH > 0.05 && (
        <WallPanelQuadrated w={doorW} h={headerH} d={thick} pos={[0, doorH + headerH / 2, 0]} color={color} />
      )}
      {/* Extruded brand signage flanking the door on the exterior face */}
      {logo && segW > 0.6 && [-1, 1].map((sx) => (
        <Suspense key={sx} fallback={null}>
          <LogoSign
            url={logo.url}
            viewBox={logo.viewBox}
            widthM={segW}
            heightM={wallHeightM}
            anchorZ={-thick / 2}
            faceDir={-1}
            xOffset={sx * segCx}
            y={wallHeightM * 0.52}
            extrusionM={logo.extrusionM}
            sideTint={logo.sideTint}
            emissive={logo.emissive}
            invert={logo.invert}
            chroma={logo.chroma}
            maxWidthM={Math.min(segW * 0.8, 2.6)}
          />
        </Suspense>
      ))}
    </group>
  );
}

// Side wall with a ribbon window — a solid sill panel, a glazed band using the
// transmission glass material, and a header panel above. Built in a local
// frame: `lengthM` runs along local X, `wallHeightM` up Y, `thick` along Z.
// When a `logo` is given, small extruded brand signs flank the ribbon window
// on the exterior face (one at each end of the wall, on the sill below the
// glazing) so the room reads symmetrically from outside.
function WindowedWall({
  lengthM, wallHeightM, thick, position, rotationY, sillM, color, frameColor, logo,
}: {
  lengthM: number; wallHeightM: number; thick: number;
  position: [number, number, number]; rotationY: number;
  sillM: number; color: string; frameColor: string;
  logo?: {
    url: string; viewBox: [number, number, number, number];
    invert: boolean; chroma: "white" | "black" | "";
    sideTint: string; extrusionM: number; emissive: number;
  };
}) {
  const headerM = 0.35;
  const winH = Math.max(0.3, wallHeightM - sillM - headerM);
  const actualHeaderH = wallHeightM - sillM - winH;
  const winY = sillM + winH / 2;
  const glassT = thick * 0.4;
  // Mullion count comes from `room.setWindowSegments` (1..8 panes). The
  // mullion count is `panes - 1` since N panes have N-1 vertical bars.
  const segments = useConfig((s) => s.windowSegments);
  const mullions = Math.max(0, segments - 1);
  // Window-flank logo: tucked onto the SILL (below the glazing) at each end,
  // exterior face. ~50% smaller than the back-wall logo per spec and with the
  // glow boosted so they read at distance.
  const logoMaxW = Math.min(lengthM * 0.18, 0.9);
  const logoEmissiveBoost = 2.4;
  const logoEnabled = !!logo && lengthM > 2.6;
  return (
    <group position={position} rotation-y={rotationY}>
      {/* Sill panel */}
      <WallPanelPlaster w={lengthM} h={sillM} d={thick} pos={[0, sillM / 2, 0]} color={color} />
      {/* Header panel */}
      {actualHeaderH > 0.02 && (
        <WallPanelPlaster w={lengthM} h={actualHeaderH} d={thick} pos={[0, sillM + winH + actualHeaderH / 2, 0]} color={color} />
      )}
      {/* Glazing — the transmission glass band. envMapIntensity is now low
          (0.35) so the HDR-as-surroundings actually reads THROUGH the
          glass instead of being drowned out by surface reflection at
          grazing angles. ior dropped from 1.5 → 1.15 and thickness from
          0.04 → 0.015 to soften the refraction so the exterior reads
          undistorted from inside the room. */}
      <mesh position={[0, winY, 0]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[lengthM - 0.06, winH, glassT]} />
        <meshPhysicalMaterial
          transmission={0.98}
          roughness={0.02}
          metalness={0}
          ior={1.15}
          thickness={0.015}
          transparent
          color="#ffffff"
          envMapIntensity={0.35}
          attenuationColor="#e0e6ec"
          attenuationDistance={6}
        />
      </mesh>
      {/* Frame rails (top + bottom of the glazed band) */}
      {[sillM, sillM + winH].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[lengthM, 0.05, thick * 1.05]} />
          <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      {/* Vertical mullions */}
      {Array.from({ length: mullions }, (_, i) => {
        const x = -lengthM / 2 + ((i + 1) * lengthM) / (mullions + 1);
        return (
          <mesh key={`m${i}`} position={[x, winY, 0]}>
            <boxGeometry args={[0.05, winH, thick * 1.05]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
          </mesh>
        );
      })}
      {/* Exterior brand signage flanking the ribbon window — TEMPORARILY
          DISABLED while we sort out the per-side parity issue (the right-
          side flank was reading as "floating outside" because the deep
          extrusion punched through the glass). The interior `flank-left` /
          `flank-right` signs from BrandLogoOnWall now cover both sides
          symmetrically. */}
      {false && logoEnabled && [-1, 1].map((sx) => {
        const margin = logoMaxW * 0.6;
        const xOffset = sx * (lengthM / 2 - margin);
        // Centre vertically on the wall so the brand reads even when the
        // glazing dominates the elevation.
        const y = wallHeightM * 0.55;
        return (
          <Suspense key={sx} fallback={null}>
            <LogoSign
              url={logo!.url}
              viewBox={logo!.viewBox}
              widthM={logoMaxW}
              heightM={wallHeightM * 0.55}
              anchorZ={-thick / 2}
              faceDir={-1}
              xOffset={xOffset}
              y={y}
              extrusionM={logo!.extrusionM}
              sideTint={logo!.sideTint}
              emissive={logo!.emissive * logoEmissiveBoost}
              invert={logo!.invert}
              chroma={logo!.chroma}
              maxWidthM={logoMaxW}
            />
          </Suspense>
        );
      })}
    </group>
  );
}

// Full-height glass atrium wall with a centred sliding-door opening. Used
// to enclose the central courtyard of the pavilion footprint — each of the
// four atrium sides renders one of these, so you can step into the atrium
// through any side.
function AtriumGlassWall({
  lengthM, wallHeightM, thick, position, rotationY, frameColor,
}: {
  lengthM: number; wallHeightM: number; thick: number;
  position: [number, number, number]; rotationY: number; frameColor: string;
}) {
  // Atrium glass doors — wider than the typical room door so the courtyard
  // reads as a generous, walk-through space.
  const doorW = Math.min(2.2, lengthM * 0.5);
  const halfW = Math.max(0.4, (lengthM - doorW) / 2);
  const halfCx = doorW / 2 + halfW / 2;
  const glassT = thick * 0.4;
  // Each half-side renders a single glass pane; the door opening stays empty.
  // A slim top rail spans the full length so the doorway reads as framed.
  const headerH = 0.08;
  return (
    <group position={position} rotation-y={rotationY}>
      {/* Two glass side panes flanking the door. */}
      {[-halfCx, halfCx].map((cx, idx) => (
        <group key={idx} position={[cx, 0, 0]}>
          <mesh position={[0, wallHeightM / 2, 0]} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[halfW - 0.03, wallHeightM, glassT]} />
            <meshPhysicalMaterial
              transmission={0.98}
              roughness={0.02}
              metalness={0}
              ior={1.15}
              thickness={0.015}
              transparent
              color="#ffffff"
              envMapIntensity={0.35}
              attenuationColor="#e0e6ec"
              attenuationDistance={6}
            />
          </mesh>
          {/* Slim vertical jamb between glass and door opening. */}
          <mesh position={[idx === 0 ? halfW / 2 - 0.015 : -halfW / 2 + 0.015, wallHeightM / 2, 0]}>
            <boxGeometry args={[0.03, wallHeightM, thick * 1.05]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Top header rail spans the entire wall (gives the atrium a
          continuous frame so the doorway reads architecturally). */}
      <mesh position={[0, wallHeightM - headerH / 2, 0]}>
        <boxGeometry args={[lengthM, headerH, thick * 1.1]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Bottom rail (low threshold) — only under the glass panes so the
          door has a clear floor. */}
      {[-halfCx, halfCx].map((cx, idx) => (
        <mesh key={`r${idx}`} position={[cx, 0.025, 0]}>
          <boxGeometry args={[halfW - 0.03, 0.05, thick * 1.05]} />
          <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// Interior divider between adjacent cluster rooms. Earlier versions reused
// `WindowedWall` (with its `transmission=0.95` ribbon glass) for the two
// flanking halves — but at 6 rooms in a cluster you've got 5 such dividers
// PLUS the perimeter ribbon windows, and three.js's transmission renderer
// fails to sort more than a handful of overlapping transmissive panels,
// producing "errant black glass panels" cutting through the geometry.
//
// Reworked here as a frameless full-height glass divider with a wide door
// opening, identical material to `AtriumGlassWall`: simple physical glass
// without transmission so it composes cleanly with the perimeter glass.
function WindowedDoorwayWall({
  lengthM, wallHeightM, thick, position, rotationY, frameColor,
}: {
  lengthM: number; wallHeightM: number; thick: number;
  position: [number, number, number]; rotationY: number;
  // sillM + color retained for caller compatibility but unused — the divider
  // is no longer a ribbon-window pastiche.
  sillM?: number; color?: string; frameColor: string;
}) {
  const doorW = Math.min(2.2, lengthM * 0.5);
  const halfW = Math.max(0.4, (lengthM - doorW) / 2);
  const halfCx = doorW / 2 + halfW / 2;
  const glassT = thick * 0.4;
  const headerH = 0.08;
  return (
    <group position={position} rotation-y={rotationY}>
      {[-halfCx, halfCx].map((cx, idx) => (
        <group key={idx} position={[cx, 0, 0]}>
          {/* Full-height frameless glass pane — physical material with NO
              transmission so it doesn't compound the perimeter glazing's
              transmission stack. Slight reflectivity + low roughness still
              reads as glass. */}
          <mesh position={[0, wallHeightM / 2, 0]} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[halfW - 0.03, wallHeightM, glassT]} />
            <meshPhysicalMaterial
              transparent
              opacity={0.18}
              roughness={0.04}
              metalness={0}
              ior={1.5}
              color="#dde4ec"
              envMapIntensity={1.4}
              depthWrite={false}
            />
          </mesh>
          {/* Slim vertical jamb between glass and door opening */}
          <mesh position={[idx === 0 ? halfW / 2 - 0.015 : -halfW / 2 + 0.015, wallHeightM / 2, 0]}>
            <boxGeometry args={[0.03, wallHeightM, thick * 1.05]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Continuous top header rail spanning the full divider width. */}
      <mesh position={[0, wallHeightM - headerH / 2, 0]}>
        <boxGeometry args={[lengthM, headerH, thick * 1.1]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

function BackWallPanel({
  w, h, d, pos, color, accent, graphicUrl, motif,
}: {
  w: number; h: number; d: number; pos: [number, number, number]; color: string; accent: string;
  graphicUrl?: string; motif?: MotifKind;
}) {
  if (graphicUrl) return <WallPanelGraphic w={w} h={h} d={d} pos={pos} color={color} url={graphicUrl} />;
  if (motif) return <WallPanelMotif w={w} h={h} d={d} pos={pos} color={color} accent={accent} motif={motif} />;
  return <WallPanelPlaster w={w} h={h} d={d} pos={pos} color={color} />;
}

function WallPanel({ w, h, d, pos, color }: { w: number; h: number; d: number; pos: [number, number, number]; color: string }) {
  return <WallPanelPlaster w={w} h={h} d={d} pos={pos} color={color} />;
}

function WallPanelGraphic({ w, h, d, pos, color, url }: { w: number; h: number; d: number; pos: [number, number, number]; color: string; url: string }) {
  const tex = useWallGraphic(url);
  return (
    <RoundedBox position={pos} args={[w, h, d]} radius={0.012} smoothness={4} castShadow receiveShadow>
      {/* The +Z face is the "front" of the back wall (facing into booth). Apply image there.
          Other faces use a solid colour. We use a multi-material array via attach. */}
      <meshPhysicalMaterial attach="material-0" color={color} roughness={0.55} metalness={0.05} />
      <meshPhysicalMaterial attach="material-1" color={color} roughness={0.55} metalness={0.05} />
      <meshPhysicalMaterial attach="material-2" color={color} roughness={0.55} metalness={0.05} />
      <meshPhysicalMaterial attach="material-3" color={color} roughness={0.55} metalness={0.05} />
      <meshPhysicalMaterial attach="material-4" map={tex} color="#ffffff" roughness={0.45} metalness={0.04} clearcoat={0.35} clearcoatRoughness={0.25} envMapIntensity={1.1} />
      <meshPhysicalMaterial attach="material-5" color={color} roughness={0.55} metalness={0.05} />
    </RoundedBox>
  );
}

function WallPanelMotif({ w, h, d, pos, color, accent, motif }: { w: number; h: number; d: number; pos: [number, number, number]; color: string; accent: string; motif: MotifKind }) {
  const tex = useMotifTexture(motif, color, accent);
  return (
    <RoundedBox position={pos} args={[w, h, d]} radius={0.012} smoothness={4} castShadow receiveShadow>
      <meshPhysicalMaterial attach="material-0" color={color} roughness={0.55} />
      <meshPhysicalMaterial attach="material-1" color={color} roughness={0.55} />
      <meshPhysicalMaterial attach="material-2" color={color} roughness={0.55} />
      <meshPhysicalMaterial attach="material-3" color={color} roughness={0.55} />
      <meshPhysicalMaterial attach="material-4" map={tex ?? null} color={"#ffffff"} roughness={0.4} metalness={0.04} clearcoat={0.4} envMapIntensity={1.15} />
      <meshPhysicalMaterial attach="material-5" color={color} roughness={0.55} />
    </RoundedBox>
  );
}

function WallPanelPlaster({ w, h, d, pos, color }: { w: number; h: number; d: number; pos: [number, number, number]; color: string }) {
  const { map, normalMap, aoMap } = useWallTextures();
  const textured = useConfig((s) => s.wallTextureEnabled);
  // Normal-scale bumped from 0.05 → 0.45 so the plaster relief is actually
  // visible (the old value was so subtle it read as matte).
  // wallTextureEnabled toggles plaster on/off (off = matte painted).
  return (
    <group userData={{ kind: "walls" }}>
    <RoundedBox position={pos} args={[w, h, d]} radius={0.014} smoothness={4} castShadow receiveShadow userData={{ kind: "walls" }}>
      <meshPhysicalMaterial
        color={color}
        map={textured ? map : null}
        normalMap={textured ? normalMap : null}
        aoMap={textured ? aoMap : null}
        roughness={textured ? 0.5 : 0.55}
        metalness={0.04}
        clearcoat={textured ? 0.2 : 0.2}
        clearcoatRoughness={0.35}
        envMapIntensity={1.15}
        normalScale={textured ? new THREE.Vector2(0.45, 0.45) : new THREE.Vector2(0, 0)}
        sheen={0.2}
        sheenRoughness={0.5}
      />
    </RoundedBox>
    </group>
  );
}

/** Quadrated panelling — used for the front wall (the one with the door).
 *  Brand-tinted via material `color`, but the diffuse map's full value is
 *  preserved (we lerp the tint 60% toward white so the panelling relief
 *  isn't crushed by saturated brand colours). */
function WallPanelQuadrated({ w, h, d, pos, color }: { w: number; h: number; d: number; pos: [number, number, number]; color: string }) {
  const { map, normalMap, roughnessMap, aoMap } = useQuadratedWallTextures();
  // Lerp the brand colour 60% toward white so the texture's mid-tones
  // survive the multiply — otherwise dark brand colours (Rolex green,
  // Apple near-black) crush the relief to a flat dark surface.
  const tint = useMemo(() => {
    const c = new THREE.Color(color);
    return c.lerp(new THREE.Color("#ffffff"), 0.6).getStyle();
  }, [color]);
  return (
    <group userData={{ kind: "walls" }}>
      <RoundedBox position={pos} args={[w, h, d]} radius={0.012} smoothness={4} castShadow receiveShadow userData={{ kind: "walls" }}>
        <meshPhysicalMaterial
          color={tint}
          map={map}
          normalMap={normalMap}
          roughnessMap={roughnessMap}
          aoMap={aoMap}
          metalness={0.08}
          envMapIntensity={1.1}
          normalScale={new THREE.Vector2(1.4, 1.4)}
        />
      </RoundedBox>
    </group>
  );
}

// ── Ceiling ─────────────────────────────────────────────────────────────────

function Ceiling({
  shape, widthM, depthM, wallHeightM, platformHeightM, ceilingColor = "#e9eaee",
}: { shape: FootprintShape; widthM: number; depthM: number; wallHeightM: number; platformHeightM: number; ceilingColor?: string }) {
  const y = platformHeightM + wallHeightM;
  const poly = footprintPolygon(shape, widthM, depthM);
  const isPavilion = shape === "pavilion";

  // Ceiling surface — a flat polygon matching the footprint, with a hole over
  // the atrium for the pavilion shape.
  const geom = useMemo(() => {
    const s = new THREE.Shape();
    poly.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, z) : s.lineTo(x, z)));
    s.closePath();
    if (isPavilion) {
      const [aw, ad] = atriumSize(widthM, depthM);
      const hole = new THREE.Path();
      hole.moveTo(-aw / 2, -ad / 2);
      hole.lineTo(aw / 2, -ad / 2);
      hole.lineTo(aw / 2, ad / 2);
      hole.lineTo(-aw / 2, ad / 2);
      hole.closePath();
      s.holes.push(hole);
    }
    return new THREE.ShapeGeometry(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, widthM, depthM]);

  // Recessed downlights — a grid clipped to the footprint polygon.
  const cols = Math.max(1, Math.round((widthM - 2) / 2.4));
  const rows = Math.max(1, Math.round((depthM - 2) / 2.4));
  const gridPos = (i: number, m: number, span: number) => (m <= 1 ? 0 : -span / 2 + (i * span) / (m - 1));
  const lights: [number, number][] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = gridPos(i, cols, widthM - 2);
      const z = gridPos(j, rows, depthM - 2);
      if (!pointInPolygon(x, z, poly)) continue;
      if (isPavilion) {
        const [aw, ad] = atriumSize(widthM, depthM);
        if (Math.abs(x) < aw / 2 && Math.abs(z) < ad / 2) continue;   // over the open void
      }
      lights.push([x, z]);
    }
  }

  return (
    <group>
      {/* Ceiling surface — castShadow off so the key light still reaches the
          room; the underside reads as lit via the recessed downlights below. */}
      <mesh geometry={geom} position={[0, y, 0]} rotation-x={Math.PI / 2} receiveShadow castShadow={false} userData={{ kind: "ceiling" }}>
        <meshStandardMaterial color={ceilingColor} roughness={0.92} metalness={0.02} side={THREE.DoubleSide} />
      </mesh>
      {/* Recessed downlights flush with the ceiling underside */}
      {lights.map(([x, z], i) => (
        <mesh key={i} position={[x, y - 0.012, z]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.16, 20]} />
          <meshStandardMaterial color="#fff4e2" emissive="#fff4e2" emissiveIntensity={1.7} toneMapped={false} />
        </mesh>
      ))}
      {/* Soft fill so the downlights actually pool light into the room */}
      <pointLight position={[0, y - 0.5, 0]} intensity={6} distance={Math.max(widthM, depthM) * 1.2} decay={1.6} color="#fff4e2" />
    </group>
  );
}

// ── Corner pillars ──────────────────────────────────────────────────────────
// The structural columns the room is framed on — floor-to-ceiling at each
// corner. Carried over from the trade-show system's corner-pillar logic.

function CornerPillars({
  shape, widthM, depthM, wallHeightM, platformHeightM, color,
}: { shape: FootprintShape; widthM: number; depthM: number; wallHeightM: number; platformHeightM: number; color: string }) {
  const p = 0.18;
  const y = platformHeightM + wallHeightM / 2;
  const pts: FootPt[] = [];
  if (shape === "circular") {
    // A ring of eight columns around the rotunda.
    const r = Math.min(widthM, depthM) / 2 - p / 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  } else {
    // One pillar per footprint vertex, nudged inward off the wall centreline.
    for (const [x, z] of footprintPolygon(shape, widthM, depthM)) {
      pts.push([x - Math.sign(x) * (p / 2), z - Math.sign(z) * (p / 2)]);
    }
    if (shape === "pavilion") {
      const [aw, ad] = atriumSize(widthM, depthM);
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        pts.push([sx * (aw / 2 - p / 2), sz * (ad / 2 - p / 2)]);
      }
    }
  }
  return (
    <group>
      {pts.map(([x, z], i) => (
        <RoundedBox
          key={i}
          position={[x, y, z]}
          args={[p, wallHeightM, p]}
          radius={0.02}
          smoothness={3}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial color={color} roughness={0.5} metalness={0.2} clearcoat={0.3} clearcoatRoughness={0.25} />
        </RoundedBox>
      ))}
    </group>
  );
}

// ── Logos ───────────────────────────────────────────────────────────────────

type LogoPlacement = "back-centre" | "flank-left" | "flank-right" | "flank-both";

/** For circular rooms: returns the back-wall Z value that places the chord
 *  needed to host an element with the given half-width without the element
 *  poking through the curved wall. For non-circular rooms returns the flat
 *  back-wall z (`-depthM/2`). */
function circularBackWallZ(shape: FootprintShape, widthM: number, depthM: number, halfWidthM: number): number {
  if (shape !== "circular") return -depthM / 2;
  const r = Math.min(widthM, depthM) / 2;
  const hw = Math.min(halfWidthM, r * 0.92);
  // 5cm safety margin pushed inward from the chord.
  return -(Math.sqrt(Math.max(0, r * r - hw * hw)) - 0.05);
}

function BrandLogoOnWall({
  kit, widthM, depthM, wallHeightM, platformHeightM, glow, extrusionM, emissive, placement = "back-centre", shape = "rectangle",
}: {
  kit: BrandKit; widthM: number; depthM: number; wallHeightM: number; platformHeightM: number;
  glow: number; extrusionM: number; emissive: number; placement?: LogoPlacement; shape?: FootprintShape;
}) {
  const invert = !!kit.scene?.invertLogo;
  const chroma = kit.scene?.logoChroma ?? "";
  const url = kit.logos.primary.rasterUrl;
  if (!url) return null;
  const yCentre = wallHeightM * 0.55 + platformHeightM;
  const accent = kit.palette.neutralLight;
  // Sign panel contrasts with the logo: a light panel for dark/colour marks,
  // a dark panel for inverted (white) marks — so the logo always reads.
  const sideTint = invert ? kit.palette.neutralDark : kit.palette.neutralLight;
  const boost = glow * 0.6;

  if (placement === "back-centre") {
    const targetMaxW = Math.min(widthM * 0.45, 3.2);
    // For round rooms, pull the sign forward onto a chord wide enough to
    // host its visible width — keeps the sign inside the curved wall
    // instead of poking past it at the edges.
    const anchorZ = circularBackWallZ(shape, widthM, depthM, targetMaxW / 2) + 0.08;
    return (
      <LogoSign
        url={url}
        viewBox={kit.logos.primary.viewBox}
        widthM={widthM * 0.5}
        heightM={wallHeightM}
        anchorZ={anchorZ}
        y={yCentre}
        extrusionM={extrusionM}
        accent={accent}
        sideTint={sideTint}
        emissiveBoost={boost}
        emissive={emissive}
        invert={invert}
        chroma={chroma}
        maxWidthM={targetMaxW}
      />
    );
  }
  // Circular rooms don't have flat side walls — fall back to the back
  // centre placement (the side-wall LogoSignFlank would poke through the
  // curve at the same z extent).
  if (shape === "circular") {
    const targetMaxW = Math.min(widthM * 0.45, 3.2);
    const anchorZ = circularBackWallZ(shape, widthM, depthM, targetMaxW / 2) + 0.08;
    return (
      <LogoSign
        url={url}
        viewBox={kit.logos.primary.viewBox}
        widthM={widthM * 0.5}
        heightM={wallHeightM}
        anchorZ={anchorZ}
        y={yCentre}
        extrusionM={extrusionM}
        accent={accent}
        sideTint={sideTint}
        emissiveBoost={boost}
        emissive={emissive}
        invert={invert}
        chroma={chroma}
        maxWidthM={targetMaxW}
      />
    );
  }
  const sides: Array<"flank-left" | "flank-right"> =
    placement === "flank-both" ? ["flank-left", "flank-right"]
    : placement === "flank-right" ? ["flank-right"]
    : ["flank-left"];
  // Two logos per side wall — centred at 30% and 70% along the wall's
  // depth axis, each 15% of depth wide. Falls between the default window
  // mullion bays so they don't fight the glass detail.
  const zOffsets = [-depthM * 0.2, depthM * 0.2];  // 30% and 70% along [-d/2, +d/2]
  const logoMaxW = Math.min(depthM * 0.15, 1.8);
  return (
    <>
      {sides.map((side) => {
        const flankX = side === "flank-left" ? -widthM / 2 : widthM / 2;
        const rotY = side === "flank-left" ? Math.PI / 2 : -Math.PI / 2;
        return zOffsets.map((zOff, i) => (
          <LogoSignFlank
            key={`${side}-${i}`}
            url={url}
            viewBox={kit.logos.primary.viewBox}
            depthM={depthM}
            wallHeightM={wallHeightM}
            x={flankX}
            z={zOff}
            rotY={rotY}
            y={yCentre}
            extrusionM={extrusionM}
            accent={accent}
            sideTint={sideTint}
            emissiveBoost={boost}
            emissive={emissive}
            invert={invert}
            chroma={chroma}
            maxWidthM={logoMaxW}
          />
        ));
      })}
    </>
  );
}

function LogoSignFlank({
  url, viewBox, depthM, wallHeightM, x, z, rotY, y, extrusionM, sideTint, maxWidthM, emissive = 1.2, invert = false, chroma = "",
}: {
  url: string; viewBox: [number, number, number, number]; depthM: number; wallHeightM: number;
  x: number; z: number; rotY: number; y: number; extrusionM: number;
  accent?: string; sideTint: string; emissiveBoost?: number; maxWidthM: number; emissive?: number; invert?: boolean;
  chroma?: "white" | "black" | "";
}) {
  const tex = useLogoTexture(url, invert, chroma);
  const aspect = viewBox[2] / Math.max(viewBox[3], 1);
  const targetWidthM = Math.min(depthM * 0.5, maxWidthM);
  const targetHeightM = Math.min(targetWidthM / aspect, wallHeightM * 0.4);
  const finalWidthM = targetHeightM * aspect;
  const d = Math.max(0.0001, extrusionM);
  const offsetOut = (x < 0 ? 1 : -1) * (0.04 + d / 2);
  // SVG → in-engine extruded geometry; JPG → rasterised plane fallback.
  if (canExtrude(url)) {
    return (
      <group position={[x + offsetOut, y, z]} rotation-y={rotY}>
        <Suspense fallback={null}>
          <ExtrudedSvgLogo
            url={url}
            widthM={finalWidthM}
            heightM={targetHeightM}
            depthM={d}
            tintHex={invert ? "#FFFFFF" : sideTint}
            emissive={Math.max(0, emissive - 0.5)}
            metalness={0.4}
            roughness={0.4}
          />
        </Suspense>
      </group>
    );
  }
  return (
    <group position={[x + offsetOut, y, z]} rotation-y={rotY}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[finalWidthM, targetHeightM, d]} />
        <meshPhysicalMaterial color={sideTint} roughness={0.5} metalness={0.05} clearcoat={0.25} clearcoatRoughness={0.3} />
      </mesh>
      <mesh position={[0, 0, d / 2 + 0.0008]}>
        <planeGeometry args={[finalWidthM, targetHeightM]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive={new THREE.Color("#ffffff")}
          emissiveIntensity={emissive}
          color="#ffffff"
          transparent
          toneMapped={false}
          depthWrite={false}
          alphaTest={0.02}
        />
      </mesh>
      {/* Mirrored back-face decal so the brand reads through the glass
          when looking out from inside the room. */}
      <mesh position={[0, 0, -(d / 2 + 0.0008)]} rotation-y={Math.PI}>
        <planeGeometry args={[finalWidthM, targetHeightM]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive={new THREE.Color("#ffffff")}
          emissiveIntensity={emissive * 0.85}
          color="#ffffff"
          transparent
          toneMapped={false}
          depthWrite={false}
          alphaTest={0.02}
        />
      </mesh>
    </group>
  );
}

/**
 * Logo "sign" — a solid backing box in `sideTint` (brand primary) plus a
 * logo decal plane 0.5mm in front of the +Z face. The decal preserves the
 * PNG's actual colours (`color={white}` so the multiply is a no-op) and the
 * transparent areas of the PNG reveal the solid brand-coloured box behind —
 * so the logo reads as ink-on-brand, not as a cut-out into the wall.
 */
function LogoSign({
  url, viewBox, widthM, heightM, anchorZ, y, extrusionM, sideTint, maxWidthM, emissive = 1.2, invert = false, chroma = "", faceDir = 1, xOffset = 0,
}: {
  url: string;
  viewBox: [number, number, number, number];
  widthM: number;
  heightM: number;
  /** Z of the wall surface; sign mounts so its back face touches this z. */
  anchorZ: number;
  /** Vertical centre of the sign (world Y). */
  y: number;
  extrusionM: number;
  /** Solid backing color the box is painted in (alpha-transparent areas of the logo show this). */
  sideTint: string;
  maxWidthM: number;
  /** Self-illumination intensity of the front decal (0 = matte, ~2 = glowy sign). */
  emissive?: number;
  invert?: boolean;
  chroma?: "white" | "black" | "";
  accent?: string;
  emissiveBoost?: number;
  /** +1 = sign faces +Z (into the room); -1 = faces -Z (exterior signage). */
  faceDir?: 1 | -1;
  /** Horizontal offset within the parent frame — for door-flanking signs. */
  xOffset?: number;
}) {
  const tex = useLogoTexture(url, invert, chroma);
  const aspect = viewBox[2] / Math.max(viewBox[3], 1);
  const targetWidthM = Math.min(widthM * 0.5, maxWidthM);
  const targetHeightM = Math.min(targetWidthM / aspect, heightM * 0.4);
  const finalWidthM = targetHeightM * aspect;
  const d = Math.max(0.0001, extrusionM);
  const z = anchorZ + faceDir * (d / 2 + 0.005);

  // ── In-engine SVG extrusion ────────────────────────────────────────────
  // When the logo is an SVG, extrude the actual letter / mark shapes as 3D
  // geometry instead of slapping a rasterised PNG onto a rectangular box.
  // This is what the user means by "extrude the logo lettering / shape
  // instead of the whole logo block". Falls back to the rasterised approach
  // for JPGs (TMRW, Rolex) where alpha isn't reliable.
  if (canExtrude(url)) {
    return (
      <group position={[xOffset, y, z]} rotation-y={faceDir === -1 ? Math.PI : 0}>
        <Suspense fallback={null}>
          <ExtrudedSvgLogo
            url={url}
            widthM={finalWidthM}
            heightM={targetHeightM}
            depthM={d}
            tintHex={invert ? "#FFFFFF" : sideTint}
            emissive={Math.max(0, emissive - 0.5)}
            metalness={0.4}
            roughness={0.4}
          />
        </Suspense>
      </group>
    );
  }

  return (
    <group position={[xOffset, y, z]} rotation-y={faceDir === -1 ? Math.PI : 0}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[finalWidthM, targetHeightM, d]} />
        <meshPhysicalMaterial color={sideTint} roughness={0.5} metalness={0.05} clearcoat={0.25} clearcoatRoughness={0.3} />
      </mesh>
      {/* Logo decal on the OUTWARD face (the face the sign is mounted to
          face). Self-illuminates like real backlit signage. */}
      <mesh position={[0, 0, d / 2 + 0.0008]}>
        <planeGeometry args={[finalWidthM, targetHeightM]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive={new THREE.Color("#ffffff")}
          emissiveIntensity={emissive}
          color="#ffffff"
          transparent
          toneMapped={false}
          depthWrite={false}
          alphaTest={0.02}
        />
      </mesh>
      {/* Second logo decal on the INWARD face of the backing box so the
          mark is also visible through the window glass from inside the
          room. Mirrored along X so the text reads correctly from inside. */}
      <mesh position={[0, 0, -(d / 2 + 0.0008)]} rotation-y={Math.PI}>
        <planeGeometry args={[finalWidthM, targetHeightM]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive={new THREE.Color("#ffffff")}
          emissiveIntensity={emissive * 0.85}
          color="#ffffff"
          transparent
          toneMapped={false}
          depthWrite={false}
          alphaTest={0.02}
        />
      </mesh>
    </group>
  );
}

// ── Brand standing screen (freestanding display + ken-burns logo) ──────────

// ── Standing displays formation ────────────────────────────────────────────
// Distributes N freestanding screens along the left + right side walls,
// facing the table. Picks graphics from kit.scene.exhibitionGraphics when
// any are tagged `surface: "standingDisplay"`; falls back to the kit's
// brand-mark ken-burns panel.
function StandingDisplays({
  count, widthM, depthM, platformHeightM, kit, shape = "rectangle", tableLengthM = 0, tableWidthM = 0,
}: { count: number; widthM: number; depthM: number; platformHeightM: number; kit: BrandKit; shape?: FootprintShape; tableLengthM?: number; tableWidthM?: number }) {
  if (count <= 0) return null;
  const exhibitionScreens = (kit.scene?.exhibitionGraphics ?? []).filter((g) => g.surface === "standingDisplay");
  const inset = 0.55;
  // Stand radius (used by placeOnFloor for wall + table clearance). The
  // BrandStandingScreen base is 0.45m square so 0.25m is a safe half-extent.
  const standRadius = 0.25;
  const slots: { pos: [number, number, number]; rot: number; graphic?: typeof exhibitionScreens[number] }[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const idx = Math.floor(i / 2);
    const zSpread = idx === 0 ? 0 : (idx === 1 ? -depthM / 4 : -depthM / 2.8);
    const placed = placeOnFloor({
      label: `standingDisplay.${i}`,
      x: side * (widthM / 2 - inset),
      z: zSpread,
      radius: standRadius,
      shape: shape as RoomShape, widthM, depthM,
      tableLengthM, tableWidthM,
      tableClearanceM: 0.85,        // wider than plants so users can stand at the display
    });
    const rot = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    slots.push({
      pos: [placed.x, platformHeightM, placed.z],
      rot,
      graphic: exhibitionScreens[i],
    });
  }
  return (
    <>
      {slots.map((s, i) => (
        <group key={i} position={s.pos} rotation-y={s.rot}>
          <BrandStandingScreen kit={kit} position={[0, 0, 0]} graphic={s.graphic} />
        </group>
      ))}
    </>
  );
}

// ── Wall exhibition graphics ───────────────────────────────────────────────
// Renders any kit graphics tagged `surface: "wall"` as printed-poster decals
// on the back wall. Different from `wallGraphic` (which is the full-bleed
// hero artwork): these read as gallery-style posters with frame highlights.
// ── Posterboards ───────────────────────────────────────────────────────
// Upright portrait frames distributed along the side walls. Each carries
// either a user-uploaded image or the kit's primary logo. Frame is a
// thin dark box; artwork is a planeGeometry slightly proud of the
// frame's inner face to avoid z-fight.

function Posterboards({ count, urls, widthM, depthM, wallHeightM, platformHeightM, kit }: {
  count: number; urls: (string | null)[]; widthM: number; depthM: number; wallHeightM: number; platformHeightM: number; kit: BrandKit;
}) {
  if (count <= 0) return null;
  // Slot ideal positions: alternate left/right side walls; back-to-front
  // along Z (z negative = back of room, positive = front).
  const w = 1.0;
  const h = 1.6;
  const wallInset = 0.08;
  const cy = platformHeightM + wallHeightM * 0.5;
  const slots: { pos: [number, number, number]; rot: number }[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const idx = Math.floor(i / 2);
    const z = (idx === 0 ? -0.6 : -0.6 + idx * 1.8) - depthM * 0.05;
    const x = side * (widthM / 2 - wallInset);
    slots.push({ pos: [x, cy, z], rot: side === -1 ? Math.PI / 2 : -Math.PI / 2 });
  }
  return (
    <>
      {slots.map((s, i) => (
        <Suspense key={i} fallback={null}>
          <Posterboard
            position={s.pos}
            rotationY={s.rot}
            w={w}
            h={h}
            url={urls[i] ?? kit.logos.primary.rasterUrl ?? ""}
          />
        </Suspense>
      ))}
    </>
  );
}

function Posterboard({ position, rotationY, w, h, url }: {
  position: [number, number, number]; rotationY: number; w: number; h: number; url: string;
}) {
  const tex = useWallGraphic(url);
  return (
    <group position={position} rotation-y={rotationY} userData={{ kind: "walls" }}>
      {/* Frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w + 0.06, h + 0.06, 0.03]} />
        <meshPhysicalMaterial color="#0e1014" roughness={0.55} metalness={0.35} />
      </mesh>
      {/* Artwork — slightly proud of the frame's inner face. */}
      <mesh position={[0, 0, 0.018]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} toneMapped />
      </mesh>
    </group>
  );
}

// ── Cube plinths ───────────────────────────────────────────────────────
// Centre-of-room blocks the user adds in the Customisation step. The
// upload-or-generate hotspot UI is a future iteration; for now we render
// each cube in a brand accent colour so the user sees the slot.

function CubePlinths({ count, widthM, depthM, platformHeightM, kit }: {
  count: number; widthM: number; depthM: number; platformHeightM: number; kit: BrandKit;
}) {
  if (count <= 0) return null;
  const size = 0.6;
  const halfW = widthM / 2 - 1.4;
  const halfD = depthM / 2 - 1.4;
  const slots: [number, number, number][] = [];
  for (let i = 0; i < Math.min(count, 4); i++) {
    // 4-corner pattern around the table.
    const sx = i % 2 === 0 ? -1 : 1;
    const sz = i < 2 ? -1 : 1;
    slots.push([sx * halfW, platformHeightM + size / 2, sz * halfD]);
  }
  const colour = kit.palette.accent;
  return (
    <>
      {slots.map((pos, i) => (
        <mesh key={i} position={pos} castShadow receiveShadow>
          <boxGeometry args={[size, size, size]} />
          <meshPhysicalMaterial color={colour} roughness={0.5} metalness={0.2} clearcoat={0.4} />
        </mesh>
      ))}
    </>
  );
}

function WallExhibitionGraphics({
  kit, widthM, depthM, wallHeightM, platformHeightM,
}: { kit: BrandKit; widthM: number; depthM: number; wallHeightM: number; platformHeightM: number }) {
  const posters = (kit.scene?.exhibitionGraphics ?? []).filter((g) => g.surface === "wall");
  if (posters.length === 0) return null;
  const z = -depthM / 2 + 0.045;
  const cy = platformHeightM + wallHeightM * 0.55;
  return (
    <>
      {posters.map((g, i) => {
        // Distribute across the back wall evenly. With N posters, position at
        //   x = (i - (N-1)/2) * stride   where stride = clamp(widthM/(N+1), ~1.2)
        const stride = Math.min(widthM / (posters.length + 1), 2.4);
        const x = (i - (posters.length - 1) / 2) * stride;
        const pos: [number, number, number] = g.position ?? [x, cy, z];
        return <WallPoster key={i} url={g.url} caption={g.caption} position={pos} />;
      })}
    </>
  );
}

function WallPoster({ url, caption, position }: { url: string; caption?: string; position: [number, number, number] }) {
  const tex = useWallGraphic(url);
  const widthM = 1.4;
  const heightM = 1.6;
  return (
    <group position={position}>
      {/* Frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthM + 0.08, heightM + 0.08, 0.04]} />
        <meshPhysicalMaterial color="#0e1014" roughness={0.55} metalness={0.35} />
      </mesh>
      {/* Artwork */}
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[widthM, heightM]} />
        <meshStandardMaterial map={tex} toneMapped />
      </mesh>
      {caption && (
        <Html position={[0, -heightM / 2 - 0.08, 0.022]} center distanceFactor={6}>
          <div style={{ color: "#fff", background: "rgba(8,10,14,0.6)", padding: "4px 10px", fontSize: 14, borderRadius: 4, fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>{caption}</div>
        </Html>
      )}
    </group>
  );
}

function BrandStandingScreen({ kit, position, graphic }: { kit: BrandKit; position: [number, number, number]; graphic?: { url: string; surface: "wall" | "standingDisplay"; position?: [number, number, number]; caption?: string } }) {
  return (
    <group position={position}>
      {/* Stand pillar — thin dark column */}
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[0.08, 1.2, 0.08]} />
        <meshPhysicalMaterial color="#0e1014" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Square base */}
      <mesh castShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[0.45, 0.04, 0.45]} />
        <meshPhysicalMaterial color="#0e1014" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Screen housing */}
      <mesh castShadow position={[0, 1.4, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.05]} />
        <meshPhysicalMaterial color="#0a0c10" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Emissive content panel. If the kit ships an exhibition graphic for
          this slot, render it; otherwise ken-burns the brand mark. */}
      <group position={[0, 1.4, 0.03]}>
        <mesh>
          <planeGeometry args={[0.76, 0.46]} />
          <meshStandardMaterial color={kit.palette.primary} emissive={new THREE.Color(kit.palette.primary)} emissiveIntensity={graphic ? 0.45 : 0.9} toneMapped={false} />
        </mesh>
        <Suspense fallback={null}>
          {graphic
            ? <StandingDisplayGraphic url={graphic.url} availW={0.74} availH={0.44} />
            : <KenBurnsLogo kit={kit} availW={0.7} availH={0.4} />}
        </Suspense>
      </group>
    </group>
  );
}

function StandingDisplayGraphic({ url, availW, availH }: { url: string; availW: number; availH: number }) {
  const tex = useWallGraphic(url);
  return (
    <mesh position={[0, 0, 0.001]}>
      <planeGeometry args={[availW, availH]} />
      <meshStandardMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function KenBurnsLogo({ kit, availW, availH }: { kit: BrandKit; availW: number; availH: number }) {
  const url = kit.logos.primary.rasterUrl;
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const s = 1.0 + 0.06 * Math.sin(t * 0.4);          // gentle pulse
    const dx = 0.02 * Math.sin(t * 0.25);
    const dy = 0.015 * Math.cos(t * 0.3);
    meshRef.current.scale.set(s, s, s);
    meshRef.current.position.set(dx, dy, 0.001);
  });
  if (!url) return null;
  const aspect = kit.logos.primary.viewBox[2] / Math.max(kit.logos.primary.viewBox[3], 1);
  // Expand to ~95% of the available panel (was 75%) so the logo actually
  // reads from a normal viewing distance.
  let w = availW * 0.95;
  let h = w / aspect;
  if (h > availH * 0.92) { h = availH * 0.92; w = h * aspect; }
  return (
    <KenBurnsLogoInner url={url} w={w} h={h} meshRef={meshRef} invert={!!kit.scene?.invertLogo} chroma={kit.scene?.logoChroma ?? ""} />
  );
}

function KenBurnsLogoInner({ url, w, h, meshRef, invert = false, chroma = "" }: { url: string; w: number; h: number; meshRef: React.RefObject<THREE.Mesh | null>; invert?: boolean; chroma?: "white" | "black" | "" }) {
  const tex = useLogoTexture(url, invert, chroma);
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive={new THREE.Color("#ffffff")} emissiveIntensity={1.6} color="#ffffff" transparent toneMapped={false} depthWrite={false} alphaTest={0.02} />
    </mesh>
  );
}

// ── LED / Video wall ────────────────────────────────────────────────────────

function LedWall({
  kit, backWallZ, widthM, heightM, roomWidthM, roomHeightM, platformHeightM, brightness,
}: {
  kit: BrandKit; backWallZ: number; widthM: number; heightM: number;
  roomWidthM: number; roomHeightM: number; platformHeightM: number; brightness: number;
}) {
  // Fill the back wall — clamp width to roomWidth - 0.5m margin and height
  // to wallHeight - 0.5m. We DON'T enforce 16:9 anymore because the matrix
  // is meant to span the wall regardless of aspect; the YouTube iframe is
  // cropped top+bottom inside its parent so the video still reads.
  const maxW = roomWidthM - 0.5;
  const maxH = roomHeightM - 0.5;
  const w169 = Math.min(widthM, maxW);
  const h169 = Math.min(heightM, maxH);
  const bezelD = 0.12;                       // slimmer bezel — the matrix is the focal point
  const cols = useConfig((s) => s.videoMatrixCols);
  const rows = useConfig((s) => s.videoMatrixRows);
  const cells = useConfig((s) => s.videoMatrixCells);
  // Sit just in front of the back wall's inner face (wall thickness 0.08),
  // proud of it by the bezel's half-depth. Anchored ~0.25m off the floor so
  // a full-span wall reaches near to the floor.
  const z = backWallZ + 0.08 + bezelD / 2 + 0.015;
  const cy = platformHeightM + 0.25 + h169 / 2;
  // The matrix uses a "shared iframe" treatment: when EVERY cell is default
  // and the kit has a youtubeId, one big iframe spans the whole wall (the
  // video crops top+bottom to fit). Any per-cell override falls back to
  // the previous per-cell rendering.
  const allDefault = cells.length === 0 || cells.every((c) => !c || c.kind === "default");
  const youtubeId = kit.scene?.youtubeId ?? "";
  const showSharedVideo = allDefault && !!youtubeId;
  const gutter = cols * rows > 1 ? 0.025 : 0;
  const cellW = (w169 - gutter * (cols + 1)) / cols;
  const cellH = (h169 - gutter * (rows + 1)) / rows;
  return (
    <group position={[0, cy, z]}>
      {/* Outer dark bezel frame */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[w169, h169, bezelD]} />
        <meshPhysicalMaterial color="#0a0c10" roughness={0.4} metalness={0.6} clearcoat={0.3} />
      </mesh>

      {/* Shared video — one iframe spanning the whole wall, with the
          bezel grid as DOM overlay inside the Html container. */}
      {showSharedVideo && (
        <SharedMatrixVideo
          ytId={youtubeId}
          wallW={w169}
          wallH={h169}
          zFront={bezelD / 2 + 0.002}
          cols={cols}
          rows={rows}
        />
      )}

      {/* Per-cell content — only renders for cells that explicitly opt out
          of the shared-video default (kind = "youtube" or "image"). When
          shared video is rendering, default cells are blank because the
          iframe already covers them. */}
      {!showSharedVideo && Array.from({ length: cols * rows }, (_, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = -w169 / 2 + gutter * (col + 1) + cellW * (col + 0.5);
        const cy2 = h169 / 2 - gutter * (row + 1) - cellH * (row + 0.5);
        const cell = cells[idx] ?? { kind: "default", value: "" };
        return (
          <MatrixCell
            key={idx}
            cell={cell}
            isPrimary={idx === 0}
            kit={kit}
            x={cx}
            y={cy2}
            zFront={bezelD / 2 + 0.004}
            cellW={cellW}
            cellH={cellH}
            brightness={brightness}
          />
        );
      })}
      {/* Per-cell overrides on top of the shared video. */}
      {showSharedVideo && cells.map((cell, idx) => {
        if (!cell || cell.kind === "default" || !cell.value) return null;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = -w169 / 2 + gutter * (col + 1) + cellW * (col + 0.5);
        const cy2 = h169 / 2 - gutter * (row + 1) - cellH * (row + 0.5);
        return (
          <MatrixCell
            key={`over-${idx}`}
            cell={cell}
            isPrimary={false}
            kit={kit}
            x={cx}
            y={cy2}
            zFront={bezelD / 2 + 0.008}
            cellW={cellW}
            cellH={cellH}
            brightness={brightness}
          />
        );
      })}

      {/* Small backlight for the room (soft brand glow into the booth) */}
      <pointLight
        position={[0, 0, 0.5]}
        intensity={brightness * 4}
        distance={Math.max(widthM, heightM) * 3}
        decay={1.6}
        color={kit.palette.primary}
      />
    </group>
  );
}

/** Shared video — ONE YouTube iframe spanning the full back wall, with
 *  the bezel grid drawn AS DOM ON TOP OF the iframe (3D meshes can't
 *  occlude HTML in r3f's CSS3D layer, so the grid lives in the same
 *  HTML container as the video). */
function SharedMatrixVideo({ ytId, wallW, wallH, zFront, cols, rows }: { ytId: string; wallW: number; wallH: number; zFront: number; cols: number; rows: number }) {
  const videoMuted = useConfig((s) => s.videoMuted);
  const videoVolume = useConfig((s) => s.videoVolume);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      w.postMessage(JSON.stringify({ event: "command", func: videoMuted ? "mute" : "unMute", args: [] }), "*");
      w.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [videoVolume] }), "*");
    } catch { /* cross-origin */ }
  }, [videoMuted, videoVolume]);
  // CSS sizes (px) at the world's `transform` factor of 200 px / metre.
  const wallPxW = Math.round(wallW * 200);
  const wallPxH = Math.round(wallH * 200);
  const videoPxH = Math.round(wallPxW * 9 / 16);   // 16:9 at wall width
  const bezelPx = 4;                                // CSS thickness of the bezel grid
  return (
    <Html
      transform
      position={[0, 0, zFront]}
      distanceFactor={1}
      occlude="blending"
      style={{ pointerEvents: "auto" }}
    >
      <div style={{ width: wallPxW, height: wallPxH, overflow: "hidden", position: "relative", background: "#000" }}>
        <iframe
          ref={iframeRef}
          width={wallPxW}
          height={videoPxH}
          src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&disablekb=1&iv_load_policy=3&fs=0`}
          title="back-wall video"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{
            border: 0,
            display: "block",
            pointerEvents: "none",
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          onLoad={(e) => {
            const w = (e.currentTarget as HTMLIFrameElement).contentWindow;
            if (!w) return;
            try {
              w.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [videoVolume] }), "*");
              if (!videoMuted) w.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
            } catch { /* cross-origin */ }
          }}
        />
        {/* Bezel grid — DOM divs absolutely-positioned over the iframe.
            r3f's `<Html>` is a CSS3D layer that always paints over the
            WebGL canvas, so 3D meshes can't occlude it. Drawing the grid
            here is the reliable way to read the wall as N×M segmented
            screens with the video continuous behind. */}
        {Array.from({ length: cols - 1 }, (_, i) => {
          const x = ((i + 1) * wallPxW) / cols - bezelPx / 2;
          return <div key={`v${i}`} style={{ position: "absolute", top: 0, height: "100%", left: x, width: bezelPx, background: "#0a0c10" }} />;
        })}
        {Array.from({ length: rows - 1 }, (_, i) => {
          const y = ((i + 1) * wallPxH) / rows - bezelPx / 2;
          return <div key={`h${i}`} style={{ position: "absolute", left: 0, width: "100%", top: y, height: bezelPx, background: "#0a0c10" }} />;
        })}
      </div>
    </Html>
  );
}

// One cell of the LED-wall matrix. Renders a YouTube iframe, an image plane,
// or (default) a brand-glow panel with the kit logo overlaid.
function MatrixCell({
  cell, isPrimary, kit, x, y, zFront, cellW, cellH, brightness,
}: {
  cell: VideoCell;
  isPrimary: boolean;          // (0,0) cell — falls back to kit.scene.youtubeId when default
  kit: BrandKit;
  x: number; y: number; zFront: number;
  cellW: number; cellH: number;
  brightness: number;
}) {
  const videoVolume = useConfig((s) => s.videoVolume);
  const videoMuted = useConfig((s) => s.videoMuted);
  // Resolve cell kind — "default" → youtube if primary + kit has id, else logo.
  const resolved: VideoCell = cell.kind === "default"
    ? (isPrimary && kit.scene?.youtubeId
        ? { kind: "youtube", value: kit.scene.youtubeId }
        : { kind: "image", value: "" })  // empty value triggers logo fallback below
    : cell;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      w.postMessage(JSON.stringify({ event: "command", func: videoMuted ? "mute" : "unMute", args: [] }), "*");
      w.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [videoVolume] }), "*");
    } catch { /* cross-origin throws — ignore */ }
  }, [videoMuted, videoVolume]);
  if (resolved.kind === "youtube" && resolved.value) {
    const ytId = resolved.value;
    return (
      <group position={[x, y, 0]}>
        <Html transform position={[0, 0, zFront]} distanceFactor={1} occlude="blending" style={{ pointerEvents: "auto" }}>
          <iframe
            ref={iframeRef}
            width={Math.round(cellW * 200)}
            height={Math.round(cellH * 200)}
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&disablekb=1&iv_load_policy=3&fs=0`}
            title="cell video"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ border: "0", display: "block", pointerEvents: "none" }}
            onLoad={(e) => {
              const w = (e.currentTarget as HTMLIFrameElement).contentWindow;
              if (!w) return;
              try {
                w.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [videoVolume] }), "*");
                if (!videoMuted) w.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
              } catch { /* cross-origin will throw — ignore */ }
            }}
          />
        </Html>
      </group>
    );
  }
  // Image or default-logo fallback. The brand-glow plane is the BACKGROUND;
  // the logo / image sits IN FRONT of it (zFront + 0.004) so it isn't
  // occluded by the glow's emissive face. Logo is sized to the cell so
  // matrix subdivisions actually read as separate small screens.
  return (
    <group position={[x, y, 0]}>
      <mesh position={[0, 0, zFront]}>
        <planeGeometry args={[cellW, cellH]} />
        <meshStandardMaterial
          color={kit.palette.primary}
          emissive={new THREE.Color(kit.palette.primary)}
          emissiveIntensity={brightness * 0.9}
          toneMapped={false}
        />
      </mesh>
      {resolved.kind === "image" && resolved.value ? (
        <MatrixCellImage url={resolved.value} cellW={cellW} cellH={cellH} zFront={zFront + 0.005} />
      ) : (
        <MatrixCellLogo kit={kit} cellW={cellW} cellH={cellH} zFront={zFront + 0.005} />
      )}
    </group>
  );
}

function MatrixCellImage({ url, cellW, cellH, zFront }: { url: string; cellW: number; cellH: number; zFront: number }) {
  const tex = useWallGraphic(url);
  return (
    <mesh position={[0, 0, zFront]}>
      <planeGeometry args={[cellW * 0.95, cellH * 0.93]} />
      <meshStandardMaterial map={tex} toneMapped={false} emissive={new THREE.Color("#ffffff")} emissiveMap={tex} emissiveIntensity={0.6} />
    </mesh>
  );
}

/** Cell-sized brand logo. Unlike `LedWallLogo` (which positions a 32%-tall
 *  logo at the upper-right of a full-size LED wall), this one fills the
 *  cell — sized to fit width OR height, centred in the cell, IN FRONT of
 *  the brand-glow plane. Solves the "I can't see new screens" complaint
 *  where matrix cells looked blank because the logo was occluded by the
 *  glow plane and positioned for full-LED-wall coordinates. */
function MatrixCellLogo({ kit, cellW, cellH, zFront }: { kit: BrandKit; cellW: number; cellH: number; zFront: number }) {
  const url = kit.logos.primary.rasterUrl;
  if (!url) return null;
  const aspect = kit.logos.primary.viewBox[2] / Math.max(kit.logos.primary.viewBox[3], 1);
  let w = cellW * 0.6;
  let h = w / aspect;
  if (h > cellH * 0.6) { h = cellH * 0.6; w = h * aspect; }
  return (
    <Suspense fallback={null}>
      <MatrixCellLogoInner url={url} w={w} h={h} zFront={zFront} invert={!!kit.scene?.invertLogo} chroma={kit.scene?.logoChroma ?? ""} tint={kit.palette.neutralLight} />
    </Suspense>
  );
}

function MatrixCellLogoInner({ url, w, h, zFront, invert, chroma, tint }: { url: string; w: number; h: number; zFront: number; invert: boolean; chroma: "white" | "black" | ""; tint: string }) {
  const tex = useLogoTexture(url, invert, chroma);
  return (
    <mesh position={[0, 0, zFront]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        map={tex}
        transparent
        toneMapped={false}
        depthWrite={false}
        color={tint}
        opacity={1}
      />
    </mesh>
  );
}

// ── Flanking monitors ──────────────────────────────────────────────────────
// Two smaller side panels on the same back wall, left and right of the LED
// video wall. Static brand-glow signage rather than a second video stream so
// they read as "supporting screens" — like the trade-show layout.
function FlankingMonitors({
  kit, backWallZ, roomWidthM, wallHeightM, platformHeightM, ledWallWidthM, ledWallHeightM,
}: {
  kit: BrandKit; backWallZ: number; roomWidthM: number; wallHeightM: number;
  platformHeightM: number; ledWallWidthM: number; ledWallHeightM: number;
}) {
  // Each monitor is sized to fill ~70% of the available wall on either side
  // of the LED panel — but capped so it doesn't dwarf the LED. Bigger
  // wall-corner inset (1.2m) than the LED-side gap (0.45m), so the
  // monitor lands snug to the LED rather than tucked into the corner.
  const cornerInset = 1.2;
  const ledGap = 0.45;
  const remainingPerSide = (roomWidthM - ledWallWidthM) / 2 - ledGap - cornerInset;
  if (remainingPerSide < 0.7) return null;     // not enough wall to host a sensible side screen
  const w = Math.min(remainingPerSide, ledWallWidthM * 0.42);
  const h = Math.min(w * 9 / 16, wallHeightM - 1.4);
  if (h < 0.5) return null;
  const bezelD = 0.1;
  const z = backWallZ + 0.08 + bezelD / 2 + 0.015;
  // Centre vertically on the LED wall so the row of screens reads as a band.
  const ledCy = platformHeightM + 0.5 + ledWallHeightM / 2;
  const cx = ledWallWidthM / 2 + ledGap + w / 2;
  return (
    <group>
      {[-1, 1].map((sx) => (
        <FlankingMonitor key={sx} kit={kit} x={sx * cx} y={ledCy} z={z} w={w} h={h} bezelD={bezelD} />
      ))}
    </group>
  );
}

// ── Door-wall satellite screens ────────────────────────────────────────────
// Twin screens on the INTERIOR face of the front (door) wall, one on each
// side of the door opening. Same monitor look as the LED-flanking ones.
function DoorWallSatellites({
  kit, roomDepthM, roomWidthM, wallHeightM, platformHeightM,
}: {
  kit: BrandKit; roomDepthM: number; roomWidthM: number; wallHeightM: number; platformHeightM: number;
}) {
  const wallLen = roomWidthM;
  const doorW = Math.min(2.0, wallLen * 0.55);
  const segW = Math.max(0.02, (wallLen - doorW) / 2);
  // Monitor sized smaller than before (was filling the whole segment minus
  // 0.4m margin → now 55% of the segment), and lifted upward to sit nearer
  // the top of the wall like a real signage display.
  const margin = 0.5;
  const w = Math.min(segW - margin * 2, 1.6);
  if (w < 0.6) return null;
  const h = Math.min(w * 9 / 16, wallHeightM - 2.2);
  if (h < 0.4) return null;
  const bezelD = 0.08;
  const wallThick = 0.08;
  const z = roomDepthM / 2 - wallThick - bezelD / 2 - 0.015;
  // Mount the monitor's CENTRE at ~72% of wall height (was 0.5 + h/2 ≈
  // 1.5m, now ~3.6m for a 5m wall) so it reads as overhead signage rather
  // than at eye level.
  const cy = platformHeightM + wallHeightM * 0.72;
  const segCx = doorW / 2 + segW / 2;
  return (
    <group>
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * segCx, cy, z]} rotation-y={Math.PI}>
          <FlankingMonitor kit={kit} x={0} y={0} z={0} w={w} h={h} bezelD={bezelD} />
        </group>
      ))}
    </group>
  );
}

function FlankingMonitor({ kit, x, y, z, w, h, bezelD }: { kit: BrandKit; x: number; y: number; z: number; w: number; h: number; bezelD: number }) {
  const url = kit.logos.primary.rasterUrl;
  return (
    <group position={[x, y, z]}>
      {/* Dark bezel housing */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[w, h, bezelD]} />
        <meshPhysicalMaterial color="#0a0c10" roughness={0.4} metalness={0.6} clearcoat={0.3} />
      </mesh>
      {/* Glow panel — brand primary, soft */}
      <mesh position={[0, 0, bezelD / 2 + 0.004]}>
        <planeGeometry args={[w * 0.96, h * 0.94]} />
        <meshStandardMaterial
          color={kit.palette.primary}
          emissive={new THREE.Color(kit.palette.primary)}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      {/* Brand logo overlay (~40% of monitor height) */}
      {url && (
        <Suspense fallback={null}>
          <LedWallLogo
            url={url}
            viewBox={kit.logos.primary.viewBox}
            widthM={w}
            heightM={h}
            brightness={0.9}
            tint={kit.palette.neutralLight}
            invert={!!kit.scene?.invertLogo}
            chroma={kit.scene?.logoChroma ?? ""}
          />
        </Suspense>
      )}
    </group>
  );
}

function LedWallContent({ kit, widthM, heightM, brightness }: { kit: BrandKit; widthM: number; heightM: number; brightness: number }) {
  const url = kit.logos.primary.rasterUrl;
  if (!url) return null;
  return (
    <Suspense fallback={null}>
      <LedWallLogo
        url={url}
        viewBox={kit.logos.primary.viewBox}
        widthM={widthM}
        heightM={heightM}
        brightness={brightness}
        tint={kit.palette.neutralLight}
        invert={!!kit.scene?.invertLogo}
        chroma={kit.scene?.logoChroma ?? ""}
      />
    </Suspense>
  );
}

function LedWallLogo({
  url, viewBox, widthM, heightM, brightness, tint, invert = false, chroma = "",
}: { url: string; viewBox: [number, number, number, number]; widthM: number; heightM: number; brightness: number; tint: string; invert?: boolean; chroma?: "white" | "black" | "" }) {
  const tex = useLogoTexture(url, invert, chroma);
  const aspect = viewBox[2] / Math.max(viewBox[3], 1);
  const targetH = heightM * 0.32;
  const targetW = Math.min(targetH * aspect, widthM * 0.5);
  // Position upper-right of the panel
  const x = widthM * 0.5 - targetW * 0.5 - 0.15;
  const y = heightM * 0.5 - targetH * 0.6 - 0.1;
  return (
    <mesh position={[x, y, 0.036]}>
      <planeGeometry args={[targetW, targetH]} />
      <meshBasicMaterial
        map={tex}
        transparent
        toneMapped={false}
        depthWrite={false}
        color={tint}
        opacity={Math.min(1, 0.75 + brightness * 0.2)}
      />
    </mesh>
  );
}

function TileBezelGrid({ widthM, heightM, cols, rows }: { widthM: number; heightM: number; cols: number; rows: number }) {
  const t = 0.01;
  const lines: { args: [number, number, number]; pos: [number, number, number] }[] = [];
  // Vertical lines (excluding outer edges)
  for (let i = 1; i < cols; i++) {
    const x = -widthM / 2 + (widthM / cols) * i;
    lines.push({ args: [t, heightM, t], pos: [x, 0, 0.038] });
  }
  // Horizontal lines (excluding outer edges)
  for (let j = 1; j < rows; j++) {
    const y = -heightM / 2 + (heightM / rows) * j;
    lines.push({ args: [widthM, t, t], pos: [0, y, 0.038] });
  }
  return (
    <group>
      {lines.map((l, i) => (
        <mesh key={i} position={l.pos}>
          <boxGeometry args={l.args} />
          <meshStandardMaterial color="#000000" roughness={0.6} toneMapped />
        </mesh>
      ))}
    </group>
  );
}

// ── Pendant ─────────────────────────────────────────────────────────────────

function PendantWithLogo({ shape, widthM, depthM, heightM, yPositionM, extrusionM, emissive = 1.2, rotationDeg = 0, ringVertical = false, kit, colorOverride }: { shape: PendantShape; widthM: number; depthM: number; heightM: number; yPositionM: number; extrusionM: number; emissive?: number; rotationDeg?: number; ringVertical?: boolean; kit: BrandKit; colorOverride?: string }) {
  const colorPrimary = colorOverride ?? kit.palette.primary;
  const colorAccent = kit.palette.accent;
  // Pendant emissive picks up the BRAND PRIMARY rather than the accent, so a
  // kit with a saturated accent (Lufthansa gold-on-navy, NRWA red-on-green)
  // doesn't read as a muddy mix on the pendant body. Accent only nudges the
  // very dark primaries (TAG Heuer, Neura) toward visible warmth.
  const isDarkPrimary = new THREE.Color(colorPrimary).getHSL({ h: 0, s: 0, l: 0 }).l < 0.15;
  const emissiveCol = new THREE.Color(isDarkPrimary ? colorAccent : colorPrimary);
  const matProps = {
    color: colorPrimary,
    roughness: 0.32,
    metalness: 0.04,
    clearcoat: 0.5,
    clearcoatRoughness: 0.18,
    emissive: emissiveCol,
    emissiveIntensity: 0.14,
    envMapIntensity: 1.15,
  } as const;

  let body: React.ReactNode = null;
  let faceLogos: { pos: [number, number, number]; rotY: number; w: number; h: number }[] = [];
  // For the horizontal ring pendant only — a logo plane facing straight down
  // through the donut hole, since faceLogos can't represent a downward-facing
  // decal (it only supports Y-axis rotation).
  let ringLogoUnderside: { y: number; w: number; h: number } | null = null;

  if (shape === "rectangle") {
    body = (
      <RoundedBox position={[0, yPositionM, 0]} args={[widthM, heightM, depthM]} radius={0.06} smoothness={4} castShadow>
        <meshPhysicalMaterial {...matProps} />
      </RoundedBox>
    );
    faceLogos = [
      { pos: [0, yPositionM,  depthM / 2 + 0.001], rotY: 0,            w: widthM, h: heightM },
      { pos: [0, yPositionM, -depthM / 2 - 0.001], rotY: Math.PI,      w: widthM, h: heightM },
      { pos: [ widthM / 2 + 0.001, yPositionM, 0], rotY: Math.PI / 2,  w: depthM, h: heightM },
      { pos: [-widthM / 2 - 0.001, yPositionM, 0], rotY: -Math.PI / 2, w: depthM, h: heightM },
    ];
  } else if (shape === "squircle") {
    const r = Math.min(0.4, heightM / 2 - 0.02, widthM / 2 - 0.05, depthM / 2 - 0.05);
    body = (
      <RoundedBox position={[0, yPositionM, 0]} args={[widthM, heightM, depthM]} radius={r} smoothness={6} castShadow>
        <meshPhysicalMaterial {...matProps} />
      </RoundedBox>
    );
    const inset = r * 0.6;
    faceLogos = [
      { pos: [0, yPositionM,  depthM / 2 + 0.001], rotY: 0,            w: widthM - 2 * inset, h: heightM - 2 * inset * 0.4 },
      { pos: [0, yPositionM, -depthM / 2 - 0.001], rotY: Math.PI,      w: widthM - 2 * inset, h: heightM - 2 * inset * 0.4 },
      { pos: [ widthM / 2 + 0.001, yPositionM, 0], rotY: Math.PI / 2,  w: depthM - 2 * inset, h: heightM - 2 * inset * 0.4 },
      { pos: [-widthM / 2 - 0.001, yPositionM, 0], rotY: -Math.PI / 2, w: depthM - 2 * inset, h: heightM - 2 * inset * 0.4 },
    ];
  } else if (shape === "hexagon") {
    // Hexagonal prism — axis Y (default CylinderGeometry orientation).
    const radius = Math.min(widthM, depthM) / 2;
    body = (
      <mesh position={[0, yPositionM, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, heightM, 6, 1]} />
        <meshPhysicalMaterial {...matProps} />
      </mesh>
    );
    // 6 vertical faces at angles offset by π/6 from each vertex; faces lie in XZ plane.
    const apothem = radius * Math.cos(Math.PI / 6);
    const faceWidth = 2 * radius * Math.sin(Math.PI / 6);   // = radius
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.cos(angle) * (apothem + 0.001);
      const z = Math.sin(angle) * (apothem + 0.001);
      // Plane default normal = +Z; rotate Y by (π/2 - angle) so normal points outward at this face.
      faceLogos.push({ pos: [x, yPositionM, z], rotY: Math.PI / 2 - angle, w: faceWidth * 0.85, h: heightM * 0.7 });
    }
  } else if (shape === "triangle") {
    // Rounded triangular prism — using ExtrudeGeometry with a 3-corner shape.
    const r = Math.min(widthM, depthM) / 2;
    const corners: [number, number][] = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      corners.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    const triShape = new THREE.Shape();
    triShape.moveTo(corners[0]![0], corners[0]![1]);
    triShape.lineTo(corners[1]![0], corners[1]![1]);
    triShape.lineTo(corners[2]![0], corners[2]![1]);
    triShape.lineTo(corners[0]![0], corners[0]![1]);
    // ExtrudeGeometry: shape in XY, depth along Z. Rotate -π/2 around X to make the
    // shape lie in XZ (horizontal) and extrude along +Y.
    body = (
      <group position={[0, yPositionM - heightM / 2, 0]}>
        <mesh castShadow rotation-x={-Math.PI / 2}>
          <extrudeGeometry args={[triShape, { depth: heightM, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.04, bevelSegments: 3 }]} />
          <meshPhysicalMaterial {...matProps} />
        </mesh>
      </group>
    );
    // 3 vertical faces — midpoints of triangle sides face outward.
    // After the -π/2 X-rotation, shape-(x,y) maps to world-(x, ?, -y).
    for (let i = 0; i < 3; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % 3]!;
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;          // shape-space y
      const wz = -my;                          // world-space z after rotation
      const sideLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const outwardAngle = Math.atan2(wz, mx);
      faceLogos.push({
        pos: [mx + Math.cos(outwardAngle) * 0.01, yPositionM, wz + Math.sin(outwardAngle) * 0.01],
        rotY: Math.PI / 2 - outwardAngle,
        w: sideLen * 0.75,
        h: heightM * 0.65,
      });
    }
  } else if (shape === "innerCurve") {
    // Concave half-shape — curved arc segment facing inward (towards camera, +Z).
    // The arc's midpoint must be on the front-facing side. After the -π/2 X-rotation
    // the shape's +Y maps to world -Z, so we want the arc's midpoint at shape-Y -r,
    // i.e. θ = -π/2 (or 3π/2). Span ±0.17π around that.
    const radius = Math.max(widthM, depthM) * 1.2;
    const arc = new THREE.Shape();
    const thetaC = -Math.PI / 2;
    arc.absarc(0, 0, radius,           thetaC - 0.17 * Math.PI, thetaC + 0.17 * Math.PI, false);
    arc.absarc(0, 0, radius * 0.85,    thetaC + 0.17 * Math.PI, thetaC - 0.17 * Math.PI, true);
    body = (
      <group position={[0, yPositionM - heightM / 2, -radius * 0.92]}>
        <mesh castShadow rotation-x={-Math.PI / 2}>
          <extrudeGeometry args={[arc, { depth: heightM, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 3 }]} />
          <meshPhysicalMaterial {...matProps} />
        </mesh>
      </group>
    );
    // One logo at the centre of the concave (front) face
    faceLogos.push({ pos: [0, yPositionM, -radius * 0.07], rotY: 0, w: widthM * 0.5, h: heightM * 0.55 });
  } else if (shape === "wedge") {
    // Wedge — horizontal trapezoidal slab (Neura Robotics style). Top is the
    // largest face, bottom is tapered. Extrude the trapezoid in XY (which after
    // -π/2 X rotation becomes XZ horizontal) along +Y so the slab is heightM
    // thick from yPositionM-heightM/2 to yPositionM+heightM/2.
    const halfW = widthM / 2;
    const halfD = depthM / 2;
    const taper = 0.55;
    const wedgeShape = new THREE.Shape();
    // Top (Y > 0) is the wider edge; bottom (Y < 0) is tapered.
    wedgeShape.moveTo(-halfW, halfD);
    wedgeShape.lineTo(halfW, halfD);
    wedgeShape.lineTo(halfW * taper, -halfD);
    wedgeShape.lineTo(-halfW * taper, -halfD);
    wedgeShape.lineTo(-halfW, halfD);
    body = (
      <group position={[0, yPositionM - heightM / 2, 0]}>
        <mesh castShadow rotation-x={-Math.PI / 2}>
          <extrudeGeometry args={[wedgeShape, { depth: heightM, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 2 }]} />
          <meshPhysicalMaterial {...matProps} />
        </mesh>
        {/* LED strips along the bottom-edge sloped sides (the Neura visual cue) */}
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * (halfW * (1 + taper) / 2), -heightM / 2 + 0.015, 0]} rotation-y={sx > 0 ? Math.atan2(halfW * (1 - taper), depthM) : -Math.atan2(halfW * (1 - taper), depthM)}>
            <boxGeometry args={[0.02, 0.02, depthM * 1.02]} />
            <meshStandardMaterial color={colorAccent} emissive={new THREE.Color(colorAccent)} emissiveIntensity={2.0} toneMapped={false} />
          </mesh>
        ))}
      </group>
    );
    // Front + back face logos on the long sloped sides
    faceLogos.push({ pos: [0, yPositionM, halfD + 0.001], rotY: 0, w: widthM * 0.45, h: heightM * 0.45 });
    faceLogos.push({ pos: [0, yPositionM, -halfD - 0.001], rotY: Math.PI, w: widthM * 0.45, h: heightM * 0.45 });
  } else {
    // ring
    const outerR = Math.min(widthM, depthM) / 2;
    const innerR = outerR * 0.6;
    const tube = (outerR - innerR) / 2;
    const ringR = (outerR + innerR) / 2;
    // Vertical mode stands the torus on its edge so it faces the camera (Nissan-style
    // light halo). Horizontal mode leaves it as a flat overhead ring.
    const xRot = ringVertical ? 0 : -Math.PI / 2;
    body = (
      <group position={[0, yPositionM, 0]} rotation-x={xRot}>
        <mesh castShadow>
          <torusGeometry args={[ringR, tube, 18, 128]} />
          <meshPhysicalMaterial {...matProps} />
        </mesh>
      </group>
    );
    // Emblazon the brand logo in the centre of the ring. The horizontal
    // (overhead) variant gets a decal under the donut hole facing the table;
    // the vertical (camera-facing) variant gets one on the front face.
    if (ringVertical) {
      // Front face — logo sits just in front of the ring centre.
      faceLogos.push({ pos: [0, yPositionM, tube * 0.6], rotY: 0, w: innerR * 1.7, h: innerR * 1.7 });
    } else {
      ringLogoUnderside = { y: yPositionM - tube * 0.2, w: innerR * 1.7, h: innerR * 1.7 };
    }
  }

  // Render per-face logo decals.
  const url = kit.logos.primary.rasterUrl;
  const rotY = (rotationDeg * Math.PI) / 180;
  return (
    <group rotation-y={rotY}>
      {body}
      {url && faceLogos.map((f, i) => (
        <Suspense key={i} fallback={null}>
          <PendantFaceLogo
            url={url}
            viewBox={kit.logos.primary.viewBox}
            position={f.pos}
            rotY={f.rotY}
            availW={f.w}
            availH={f.h}
            extrusionM={extrusionM}
            sideTint={kit.scene?.invertLogo ? kit.palette.neutralDark : kit.palette.neutralLight}
            emissive={emissive}
            invert={!!kit.scene?.invertLogo}
            chroma={kit.scene?.logoChroma ?? ""}
          />
        </Suspense>
      ))}
      {url && ringLogoUnderside && (
        <Suspense fallback={null}>
          <PendantRingUndersideLogo
            url={url}
            viewBox={kit.logos.primary.viewBox}
            y={ringLogoUnderside.y}
            availW={ringLogoUnderside.w}
            availH={ringLogoUnderside.h}
            emissive={emissive}
            invert={!!kit.scene?.invertLogo}
            chroma={kit.scene?.logoChroma ?? ""}
          />
        </Suspense>
      )}
    </group>
  );
}

// Logo plane mounted under the centre of a horizontal ring pendant, facing
// straight down so people sitting at the table see it. Uses rotation-x to
// orient the plane downward (which PendantFaceLogo can't do since it only
// rotates around Y).
function PendantRingUndersideLogo({
  url, viewBox, y, availW, availH, emissive = 1.2, invert = false, chroma = "",
}: {
  url: string;
  viewBox: [number, number, number, number];
  y: number;
  availW: number;
  availH: number;
  emissive?: number;
  invert?: boolean;
  chroma?: "white" | "black" | "";
}) {
  const tex = useLogoTexture(url, invert, chroma);
  const aspect = viewBox[2] / Math.max(viewBox[3], 1);
  let w = availW * 0.9;
  let h = w / aspect;
  if (h > availH * 0.9) { h = availH * 0.9; w = h * aspect; }
  // Same glass-readable boost as PendantFaceLogo so the logo pops through
  // the windowed wall's transmission attenuation.
  const glassReadable = emissive * 2.2;
  return (
    <mesh position={[0, y, 0]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={tex}
        emissiveMap={tex}
        emissive={new THREE.Color("#ffffff")}
        emissiveIntensity={glassReadable}
        color="#ffffff"
        transparent
        toneMapped={false}
        depthWrite={false}
        alphaTest={0.02}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function PendantFaceLogo({
  url, viewBox, position, rotY, availW, availH, extrusionM, sideTint, emissive = 1.2, invert = false, chroma = "",
}: {
  url: string;
  viewBox: [number, number, number, number];
  position: [number, number, number];
  rotY: number;
  availW: number;
  availH: number;
  extrusionM: number;
  sideTint: string;
  emissive?: number;
  invert?: boolean;
  chroma?: "white" | "black" | "";
}) {
  const tex = useLogoTexture(url, invert, chroma);
  const aspect = viewBox[2] / Math.max(viewBox[3], 1);
  let w = availW * 0.85;
  let h = w / aspect;
  if (h > availH * 0.85) { h = availH * 0.85; w = h * aspect; }
  const d = Math.max(0.0001, extrusionM * 0.6);
  // Boost emissive so the logo reads through the windowed-wall glass
  // (transmission=0.95 takes a noticeable bite out of distant emissives).
  const glassReadable = emissive * 2.2;
  if (canExtrude(url)) {
    // Pendant face logo as a real 3D extrusion. No backing-box plate — the
    // extruded letters / mark catch the pendant body colour through HDR
    // reflections and the brand reads from any angle.
    return (
      <group position={position} rotation-y={rotY}>
        <Suspense fallback={null}>
          <ExtrudedSvgLogo
            url={url}
            widthM={w}
            heightM={h}
            depthM={d}
            tintHex={invert ? "#FFFFFF" : sideTint}
            emissive={Math.max(0, glassReadable - 0.6)}
            metalness={0.5}
            roughness={0.35}
          />
        </Suspense>
      </group>
    );
  }
  return (
    <group position={position} rotation-y={rotY}>
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshPhysicalMaterial color={sideTint} roughness={0.45} metalness={0.05} clearcoat={0.3} />
      </mesh>
      {/* Front-face decal */}
      <mesh position={[0, 0, d / 2 + 0.0008]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive={new THREE.Color("#ffffff")}
          emissiveIntensity={glassReadable}
          color="#ffffff"
          transparent
          toneMapped={false}
          depthWrite={false}
          alphaTest={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Back-face decal mirrored 180° around Y so when a camera looks at the
          pendant from the OPPOSITE side of this face (through the room's
          opposing glass wall), it still sees the brand. Slightly dimmer than
          the front so the front still feels primary. */}
      <mesh position={[0, 0, -(d / 2 + 0.0008)]} rotation-y={Math.PI}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive={new THREE.Color("#ffffff")}
          emissiveIntensity={glassReadable * 0.8}
          color="#ffffff"
          transparent
          toneMapped={false}
          depthWrite={false}
          alphaTest={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ── Glass vitrine ───────────────────────────────────────────────────────────

function GlassVitrine({ position, widthM, depthM, heightM, glowColor }: { position: [number, number, number]; widthM: number; depthM: number; heightM: number; glowColor: string }) {
  const baseH = 0.45;
  const frameT = 0.025;
  const glassH = heightM - baseH;
  return (
    <group position={position}>
      {/* Solid base */}
      <RoundedBox args={[widthM, baseH, depthM]} radius={0.015} smoothness={4} position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#1a1c22" roughness={0.45} metalness={0.4} clearcoat={0.5} clearcoatRoughness={0.2} />
      </RoundedBox>

      {/* Internal LED strip — visible glow inside */}
      <mesh position={[0, baseH + glassH - 0.05, 0]}>
        <boxGeometry args={[widthM - 0.1, 0.025, depthM - 0.1]} />
        <meshStandardMaterial emissive={new THREE.Color(glowColor)} emissiveIntensity={2.5} color="#000" toneMapped={false} />
      </mesh>

      {/* Glass — 6mm thick walls with transmission */}
      {[
        { args: [widthM, glassH, frameT] as [number, number, number], pos: [0, baseH + glassH / 2, depthM / 2 - frameT / 2] as [number, number, number] },
        { args: [widthM, glassH, frameT] as [number, number, number], pos: [0, baseH + glassH / 2, -depthM / 2 + frameT / 2] as [number, number, number] },
        { args: [frameT, glassH, depthM - 2 * frameT] as [number, number, number], pos: [widthM / 2 - frameT / 2, baseH + glassH / 2, 0] as [number, number, number] },
        { args: [frameT, glassH, depthM - 2 * frameT] as [number, number, number], pos: [-widthM / 2 + frameT / 2, baseH + glassH / 2, 0] as [number, number, number] },
        { args: [widthM, frameT, depthM] as [number, number, number], pos: [0, baseH + glassH - frameT / 2, 0] as [number, number, number] },
      ].map((p, i) => (
        <mesh key={i} position={p.pos} castShadow>
          <boxGeometry args={p.args} />
          <meshPhysicalMaterial
            transmission={0.95}
            roughness={0.05}
            metalness={0}
            ior={1.5}
            thickness={0.05}
            transparent
            opacity={1}
            color="#ffffff"
            envMapIntensity={1.4}
            attenuationColor="#bccfd9"
            attenuationDistance={2}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Other dressing ──────────────────────────────────────────────────────────

function PlatformEdgeAccent({ widthM, depthM, platformHeightM, color, shape = "rectangle" }: { widthM: number; depthM: number; platformHeightM: number; color: string; shape?: FootprintShape }) {
  const y = platformHeightM + 0.005;
  const t = 0.02;
  if (shape === "circular") {
    const radius = Math.min(widthM, depthM) / 2;
    const tube = t * 0.8;
    return (
      <mesh position={[0, y, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[radius - tube * 0.5, tube, 12, 96]} />
        <meshStandardMaterial emissive={new THREE.Color(color)} emissiveIntensity={1.4} color="#000" toneMapped={false} />
      </mesh>
    );
  }
  const make = (w: number, d: number, pos: [number, number, number], key: string) => (
    <mesh key={key} position={pos}>
      <boxGeometry args={[w, t, d]} />
      <meshStandardMaterial emissive={new THREE.Color(color)} emissiveIntensity={1.4} color="#000" toneMapped={false} />
    </mesh>
  );
  return (
    <group>
      {make(widthM, t * 2, [0, y, depthM / 2 - t], "n")}
      {make(widthM, t * 2, [0, y, -depthM / 2 + t], "s")}
      {make(t * 2, depthM, [widthM / 2 - t, y, 0], "e")}
      {make(t * 2, depthM, [-widthM / 2 + t, y, 0], "w")}
    </group>
  );
}

function TrussCanopy({ widthM, depthM, trussTopM, color, editMode }: { widthM: number; depthM: number; trussTopM: number; color: string; editMode?: boolean }) {
  const t = 0.18;                                 // 180mm box truss (slimmer, more visible at distance)
  const matProps = { color, roughness: 0.35, metalness: 0.92, clearcoat: 0.3, envMapIntensity: 1.3 };
  const railY = trussTopM + 0.1;

  // Cross-beam spacing — interior grid lines every ~1.5m so the canopy reads as proper rigged truss
  const xBeams = Math.max(1, Math.floor((widthM - 2 * t) / 1.5) - 1);
  const zBeams = Math.max(1, Math.floor((depthM - 2 * t) / 1.5) - 1);

  return (
    <group>
      {/* Four vertical truss legs at corners */}
      {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz], i) => (
        <RoundedBox key={`leg-${i}`} position={[(sx as number) * (widthM / 2 - t / 2), trussTopM / 2 + 0.1, (sz as number) * (depthM / 2 - t / 2)]} args={[t, trussTopM, t]} radius={0.015} smoothness={4} castShadow>
          <meshPhysicalMaterial {...matProps} />
        </RoundedBox>
      ))}

      {/* Perimeter top beams — front, back, left, right */}
      {[-1, 1].map((sz) => (
        <RoundedBox key={`fb-${sz}`} position={[0, railY, sz * (depthM / 2 - t / 2)]} args={[widthM, t, t]} radius={0.015} smoothness={4} castShadow>
          <meshPhysicalMaterial {...matProps} />
        </RoundedBox>
      ))}
      {[-1, 1].map((sx) => (
        <RoundedBox key={`lr-${sx}`} position={[sx * (widthM / 2 - t / 2), railY, 0]} args={[t, t, depthM - 2 * t]} radius={0.015} smoothness={4} castShadow>
          <meshPhysicalMaterial {...matProps} />
        </RoundedBox>
      ))}

      {/* Interior cross-beams running width-wise (depth-axis cross-bracing) */}
      {Array.from({ length: zBeams }, (_, i) => {
        const z = -depthM / 2 + ((i + 1) * depthM) / (zBeams + 1);
        return (
          <RoundedBox key={`xb-${i}`} position={[0, railY, z]} args={[widthM - t, t * 0.7, t * 0.7]} radius={0.01} smoothness={4} castShadow>
            <meshPhysicalMaterial {...matProps} />
          </RoundedBox>
        );
      })}
      {/* Interior cross-beams running depth-wise */}
      {Array.from({ length: xBeams }, (_, i) => {
        const x = -widthM / 2 + ((i + 1) * widthM) / (xBeams + 1);
        return (
          <RoundedBox key={`zb-${i}`} position={[x, railY, 0]} args={[t * 0.7, t * 0.7, depthM - t]} radius={0.01} smoothness={4} castShadow>
            <meshPhysicalMaterial {...matProps} />
          </RoundedBox>
        );
      })}

      {/* Truss-mounted spotlights — fixtures always visible, lights gated in editMode */}
      <TrussSpotlights widthM={widthM} depthM={depthM} railY={railY} editMode={editMode} />
    </group>
  );
}

function TrussSpotlights({ widthM, depthM, railY, editMode }: { widthM: number; depthM: number; railY: number; editMode?: boolean }) {
  // 4 spots along the back rail aimed at the back wall, and 4 along the front rail aimed inward.
  const yFixture = railY - 0.08;
  const positions: { pos: [number, number, number]; target: [number, number, number] }[] = [];
  const inset = 0.6;
  const stepCount = 4;
  for (let i = 0; i < stepCount; i++) {
    const x = -widthM / 2 + inset + (i * (widthM - 2 * inset)) / (stepCount - 1);
    // Back-rail spots aimed at the back wall (z = -depth/2)
    positions.push({
      pos: [x, yFixture, -depthM / 2 + 0.2],
      target: [x, 1.6, -depthM / 2 + 0.05],
    });
    // Front-rail spots aimed at centre floor
    positions.push({
      pos: [x, yFixture, depthM / 2 - 0.2],
      target: [x * 0.6, 1.0, 0],
    });
  }
  return (
    <group>
      {positions.map((p, i) => (
        <SpotlightFixture key={i} pos={p.pos} target={p.target} editMode={editMode} />
      ))}
    </group>
  );
}

function SpotlightFixture({ pos, target, editMode }: { pos: [number, number, number]; target: [number, number, number]; editMode?: boolean }) {
  return (
    <group>
      {/* Yoke clamp on the truss */}
      <mesh position={[pos[0], pos[1] + 0.08, pos[2]]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.16, 12]} />
        <meshPhysicalMaterial color="#0e1014" roughness={0.35} metalness={0.9} />
      </mesh>
      {/* Spot body — vertical cylinder pointing downward */}
      <mesh position={[pos[0], pos[1] - 0.06, pos[2]]} castShadow>
        <cylinderGeometry args={[0.07, 0.085, 0.18, 14]} />
        <meshPhysicalMaterial color="#15171c" roughness={0.4} metalness={0.85} clearcoat={0.2} />
      </mesh>
      {/* Emitter face — emissive disc at the bottom of the spot body */}
      <mesh position={[pos[0], pos[1] - 0.155, pos[2]]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.072, 14]} />
        <meshStandardMaterial color="#fff1d8" emissive="#fff1d8" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      {/* Actual spotLight — gated in edit mode for snappier interactivity */}
      {!editMode && (
        <spotLight
          position={[pos[0], pos[1] - 0.16, pos[2]]}
          target-position={target}
          angle={0.42}
          penumbra={0.55}
          intensity={9}
          decay={1.3}
          distance={12}
          color="#fff1d8"
        />
      )}
    </group>
  );
}

// ── Plants ──────────────────────────────────────────────────────────────────

function Plants({ widthM, depthM, plantCount, platformHeightM, shape = "rectangle", tableLengthM = 0, tableWidthM = 0 }: { widthM: number; depthM: number; plantCount: number; platformHeightM: number; shape?: FootprintShape; tableLengthM?: number; tableWidthM?: number }) {
  const slots = useMemo(
    () => generatePlantSlots(widthM, depthM, plantCount, platformHeightM, shape, tableLengthM, tableWidthM),
    [widthM, depthM, plantCount, platformHeightM, shape, tableLengthM, tableWidthM],
  );
  return (
    <>
      {slots.map((s, i) => (
        <Suspense key={i} fallback={null}>
          <Plant kind={s.kind} position={s.pos} rotationY={s.rot} heightM={s.h} />
        </Suspense>
      ))}
    </>
  );
}

type PlantKind = "snake" | "hexapot" | "tree" | "cactus" | "tarro";
function generatePlantSlots(
  widthM: number, depthM: number, count: number, platformHeightM: number,
  shape: FootprintShape = "rectangle",
  tableLengthM = 0, tableWidthM = 0,
) {
  if (count <= 0) return [];
  const y = platformHeightM;
  const inT = safeInsetForKind("tree", 0.15);
  const inS = safeInsetForKind("hexapot", 0.35);

  // Ideal slot anchors per shape. The unified placer (placeOnFloor) then
  // shape-clamps + table-clears each one so a wide table never crashes
  // into the slot and a circular room never lets a plant escape the
  // wall.
  const ideal: { kind: PlantKind; pos: [number, number]; rot: number; h: number }[] = shape === "circular"
    ? (() => {
        const r = Math.min(widthM, depthM) / 2;
        const treeR = r - inT;
        const potR  = r - inS;
        return [
          { kind: "tree",    pos: [Math.cos(2.7) * treeR,   Math.sin(2.7) * treeR],   rot: 2.7 - Math.PI,    h: 2.0 },
          { kind: "tree",    pos: [Math.cos(0.45) * treeR,  Math.sin(0.45) * treeR],  rot: 0.45 + Math.PI,   h: 2.0 },
          { kind: "hexapot", pos: [Math.cos(-0.9) * potR,   Math.sin(-0.9) * potR],   rot: -0.9 + Math.PI,   h: 1.0 },
          { kind: "tarro",   pos: [Math.cos(-2.25) * potR,  Math.sin(-2.25) * potR],  rot: -2.25 + Math.PI,  h: 1.0 },
          { kind: "snake",   pos: [Math.cos(0) * potR,      Math.sin(0) * potR],      rot: -Math.PI / 2,     h: 1.3 },
          { kind: "snake",   pos: [Math.cos(Math.PI) * potR, Math.sin(Math.PI) * potR], rot: Math.PI / 2,    h: 1.3 },
        ];
      })()
    : [
        { kind: "tree",    pos: [ widthM / 2 - inT,  depthM / 2 - inT], rot: -Math.PI / 4, h: 2.0 },
        { kind: "tree",    pos: [-widthM / 2 + inT,  depthM / 2 - inT], rot:  Math.PI / 4, h: 2.0 },
        { kind: "hexapot", pos: [ widthM / 2 - inS, -depthM / 2 + inS], rot: -Math.PI / 6, h: 1.0 },
        { kind: "tarro",   pos: [-widthM / 2 + inS, -depthM / 2 + inS], rot:  Math.PI / 6, h: 1.0 },
        { kind: "snake",   pos: [ widthM / 2 - inS, 0],                  rot: -Math.PI / 2, h: 1.3 },
        { kind: "snake",   pos: [-widthM / 2 + inS, 0],                  rot:  Math.PI / 2, h: 1.3 },
      ];

  const picked = ideal.slice(0, Math.min(count, ideal.length));
  return picked.map((s) => {
    const r = PROP_RADIUS_M[s.kind] ?? 0.45;
    const placed = placeOnFloor({
      label: `plant.${s.kind}`,
      x: s.pos[0], z: s.pos[1], radius: r,
      shape: shape as RoomShape, widthM, depthM,
      tableLengthM, tableWidthM,
    });
    return { kind: s.kind, pos: [placed.x, y, placed.z] as [number, number, number], rot: s.rot, h: s.h };
  });
}
