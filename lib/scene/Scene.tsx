"use client";
import { Suspense, useMemo, useEffect, useRef } from "react";
import { Environment, OrbitControls, ContactShadows, RoundedBox, Html } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useConfig, useBrandKit } from "@/lib/store/configStore";
import type { PendantShape, FootprintShape } from "@/lib/schemas";
import { Sofa, CoffeeTable, Plant } from "./Props";
import { useFloorTextures, useWallTextures, useParquetTextures, useLogoTexture } from "./Textures";
import { useWallGraphic, useMotifTexture } from "./WallGraphics";
import { LightShafts, LightboxLogo, RadiatingRig, GlassBalcony, CircularScreen, WraparoundScreen } from "./HeroElements";
import { TimedReveal } from "./SceneReveal";
import { CameraSync } from "./CameraSync";
import { HallContext } from "./HallContext";
import { KitProps } from "./KitProps";
import { BoardroomTable, ChairsAroundTable } from "./Boardroom";
import { Flycam } from "./Flycam";
import { PerfMonitor } from "./PerfMonitor";
import { asset } from "@/lib/assetPath";
import type { BrandKit } from "@/lib/schemas";

// Pruned to 3 (was 9) to keep the repo under a sensible size — each 4K HDRI
// is ~25 MB. Re-add presets from polyhaven.com if you need more variety.
export const HDRI_OPTIONS = [
  { id: "events_hall_interior_4k", label: "Events hall" },
  { id: "newman_lobby_4k", label: "Newman lobby" },
  { id: "studio_kominka_01_4k", label: "Kominka" },
] as const;

const HDRI_BY_MODE: Record<"gallery.light" | "warehouse.dark", string> = {
  "gallery.light": "newman_lobby_4k",
  "warehouse.dark": "events_hall_interior_4k",
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
  const coffeeTableVariant = useConfig((s) => s.coffeeTableVariant);
  const standingDisplayCount = useConfig((s) => s.standingDisplayCount);
  const platformHeightM = useConfig((s) => s.platformHeightM);
  const windowsEnabled = useConfig((s) => s.windowsEnabled);
  const ceilingEnabled = useConfig((s) => s.ceilingEnabled);
  const windowSillM = useConfig((s) => s.windowSillM);
  const tableLengthM = useConfig((s) => s.tableLengthM);
  const tableWidthM = useConfig((s) => s.tableWidthM);
  const chairCount = useConfig((s) => s.chairCount);
  const tableVariant = useConfig((s) => s.tableVariant);
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
  const floorColor   = colourOverrides.floor   ?? kit.scene?.floorColor  ?? (isDark ? "#2c2f3b" : "#dde0e6");
  const trimColor    = colourOverrides.trim    ?? kit.palette.accent;
  const pendantColor = colourOverrides.pendant ?? kit.palette.primary;
  const trussColor   = colourOverrides.truss   ?? "#15171c";
  const sofaResolved    = colourOverrides.sofa    ?? kit.palette.primary;
  const counterColor    = colourOverrides.counter ?? kit.palette.accent;
  const vitrineColor    = colourOverrides.vitrine ?? kit.palette.accent;
  const monitorColor    = colourOverrides.monitor ?? kit.palette.primary;

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
          backgroundBlurriness={isDark ? 0.6 : 0.35}
          backgroundIntensity={hdrBgIntensity * (isDark ? 0.6 : 1.4)}
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

      {!editMode && (
        <>
          <BoothInteriorLights widthM={widthM} depthM={depthM} wallHeightM={wallHeightM} accent={kit.palette.accent} isDark={isDark} />
          {/* Sconce — overhead spot grazing the back-wall logo */}
          <BackWallSconce widthM={widthM} depthM={depthM} wallHeightM={wallHeightM} accent={kit.palette.accent} intensity={logoGlow} />
        </>
      )}

      <Suspense fallback={null}>
        <PbrFloor isDark={isDark} />
      </Suspense>

      <Suspense fallback={null}>
        <PlatformBlock widthM={widthM} depthM={depthM} platformHeightM={platformHeightM} sideColor={floorColor} floorStyle={floorStyle} />
      </Suspense>

      <PlatformEdgeAccent widthM={widthM} depthM={depthM} platformHeightM={platformHeightM} color={trimColor} />

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
          <Ceiling shape={shape} widthM={widthM} depthM={depthM} wallHeightM={wallHeightM} platformHeightM={platformHeightM} />
        </TimedReveal>
      )}

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
          placement={ledWallEnabled ? "flank-left" : "back-centre"}
        />
      </Suspense>

      {/* LED / video wall — emissive panel mounted on the back wall */}
      {ledWallEnabled && (
        <Suspense fallback={null}>
          <LedWall
            kit={kit}
            backWallZ={-depthM / 2}
            widthM={ledWallWidthM}
            heightM={ledWallHeightM}
            roomWidthM={widthM}
            roomHeightM={wallHeightM}
            platformHeightM={platformHeightM}
            brightness={ledWallBrightness}
          />
        </Suspense>
      )}

      {/* The truss canopy is the open / exhibition rig — hidden once the
          ceiling encloses the room. */}
      {!ceilingEnabled && (
        <TimedReveal delay={300}>
          <TrussCanopy widthM={widthM} depthM={depthM} trussTopM={trussTopM} color={trussColor} editMode={editMode} />
        </TimedReveal>
      )}

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
      <KitProps kit={kit} booth={{ widthM, depthM, wallHeightM, trussTopM, platformHeightM }} />

      {/* Camera sync — applies FOV + preset moves + surfaces live readouts */}
      <CameraSync />

      {/* Boardroom furnishing — the table + chairs are the centrepiece; plants
          dress the corners; sofas are optional breakout seating. Suppressed
          when a kit brings its own bespoke set. */}
      {!kit.scene?.noDefaultDressing && (
        <>
          {/* Boardroom table + chairs arranged around it, all facing inward. */}
          <Suspense fallback={null}>
            <BoardroomTable
              variant={tableVariant}
              lengthM={tableLengthM}
              widthM={tableWidthM}
              position={[0, platformHeightM, 0]}
              tintHex={kit.palette.primary}
            />
            <ChairsAroundTable
              count={chairCount}
              tableLengthM={tableLengthM}
              tableWidthM={tableWidthM}
              chairVariant={chairVariant}
              position={[0, platformHeightM, 0]}
              tintHex={kit.palette.secondary}
            />
          </Suspense>

          {/* Optional breakout seating — sofa pair against the front-right
              corner, count-driven (0 by default for a clean boardroom). */}
          {Array.from({ length: Math.min(sofaCount, 2) }, (_, i) => {
            const sx = i === 0 ? -1 : 1;
            const SOFA_HEIGHT = 1.0;
            const x = sx > 0 ? widthM / 2 - 1.3 : widthM / 2 - 1.3;
            const z = depthM / 2 - 1.6 - (i === 0 ? 0 : 1.4);
            const rotY = -Math.PI / 2;
            return (
              <Suspense key={`sofa-${i}`} fallback={null}>
                <Sofa
                  position={[x, platformHeightM + SOFA_HEIGHT * 0.5, z]}
                  rotationY={rotY}
                  heightM={SOFA_HEIGHT}
                  tintHex={sofaResolved}
                />
              </Suspense>
            );
          })}
          {sofaCount >= 2 && (
            <Suspense fallback={null}>
              <CoffeeTable variant={coffeeTableVariant} position={[widthM / 2 - 2.4, platformHeightM, depthM / 2 - 2.3]} heightM={0.335} />
            </Suspense>
          )}

          <Plants widthM={widthM} depthM={depthM} plantCount={plantCount} platformHeightM={platformHeightM} />
        </>
      )}

      <ContactShadows
        position={[0, 0.012, 0]}
        opacity={isDark ? 0.4 : 0.32}
        scale={Math.max(widthM, depthM) * 1.8}
        blur={3.5}
        far={6}
      />

      {/* OrbitControls owns no static target — CameraSync is the single source
          of truth for the orbit pivot, so it stays synced to the look-at. */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        zoomSpeed={0.3}
        rotateSpeed={0.85}
        panSpeed={0.7}
        minDistance={2}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2 - 0.04}
      />
      <Flycam speed={2} />
      <PerfMonitor />
    </>
  );
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

// ── Floor ───────────────────────────────────────────────────────────────────

function PlatformBlock({ widthM, depthM, platformHeightM, sideColor, floorStyle }: { widthM: number; depthM: number; platformHeightM: number; sideColor: string; floorStyle: "herringbone" | "diagonal" | "rectangular" }) {
  const { map, normalMap, aoMap } = useParquetTextures(floorStyle);
  // 6 face materials on a BoxGeometry: parquet on the top (+Y), brand-coloured on the rest.
  // Order in three: +X -X +Y -Y +Z -Z
  return (
    <mesh receiveShadow castShadow position={[0, platformHeightM / 2, 0]}>
      <boxGeometry args={[widthM, platformHeightM, depthM]} />
      <meshPhysicalMaterial attach="material-0" color={sideColor} roughness={0.7} metalness={0.04} />
      <meshPhysicalMaterial attach="material-1" color={sideColor} roughness={0.7} metalness={0.04} />
      <meshPhysicalMaterial attach="material-2" map={map} normalMap={normalMap} aoMap={aoMap} color={sideColor} roughness={0.4} metalness={0.05} clearcoat={0.45} clearcoatRoughness={0.25} envMapIntensity={1.2} />
      <meshPhysicalMaterial attach="material-3" color={sideColor} roughness={0.7} metalness={0.04} />
      <meshPhysicalMaterial attach="material-4" color={sideColor} roughness={0.7} metalness={0.04} />
      <meshPhysicalMaterial attach="material-5" color={sideColor} roughness={0.7} metalness={0.04} />
    </mesh>
  );
}

function PbrFloor({ isDark }: { isDark: boolean }) {
  const { map, normalMap, roughnessMap } = useFloorTextures();
  return (
    <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial map={map} normalMap={normalMap} roughnessMap={roughnessMap} color={isDark ? "#8d8d8d" : "#ffffff"} roughness={isDark ? 0.72 : 0.82} metalness={0.05} envMapIntensity={isDark ? 0.9 : 1.05} />
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
}: {
  shape: FootprintShape; widthM: number; depthM: number; wallHeightM: number; platformHeightM: number;
  kitPrimary: string; kitAccent: string;
  backWallGraphic?: string;
  backWallMotif?: "stripes.diagonal" | "stripes.horizontal" | "dots" | "hex";
  windowsEnabled: boolean;
  windowSillM: number;
  windowTrimColor: string;
  logo?: {
    url: string; viewBox: [number, number, number, number];
    invert: boolean; chroma: "white" | "black" | "";
    sideTint: string; extrusionM: number; emissive: number;
  };
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
        if (windowsEnabled && (circular || (i !== backEdge && sideish))) {
          return (
            <WindowedWall key={i} lengthM={len} wallHeightM={wallHeightM} thick={thick}
              position={mid} rotationY={rotY} sillM={windowSillM} color={kitPrimary} frameColor={windowTrimColor} />
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

      {/* Pavilion — a low parapet ring framing the open central atrium. */}
      {shape === "pavilion" && (() => {
        const [aw, ad] = atriumSize(widthM, depthM);
        const h = Math.min(1.1, wallHeightM * 0.4);
        const hw = aw / 2, hd = ad / 2;
        const ring: { pos: [number, number, number]; rotY: number; len: number }[] = [
          { pos: [0, platformTop, -hd], rotY: 0, len: aw },
          { pos: [0, platformTop, hd], rotY: 0, len: aw },
          { pos: [-hw, platformTop, 0], rotY: Math.PI / 2, len: ad },
          { pos: [hw, platformTop, 0], rotY: Math.PI / 2, len: ad },
        ];
        return ring.map((e, i) => (
          <group key={`atrium-${i}`} position={e.pos} rotation-y={e.rotY}>
            <WallPanelPlaster w={e.len} h={h} d={thick} pos={[0, h / 2, 0]} color={kitPrimary} />
          </group>
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
  const doorW = Math.min(1.3, lengthM * 0.6);
  const doorH = Math.min(2.25, wallHeightM - 0.35);
  const segW = Math.max(0.02, (lengthM - doorW) / 2);
  const headerH = wallHeightM - doorH;
  const segCx = doorW / 2 + segW / 2;
  return (
    <group position={position} rotation-y={rotationY}>
      <WallPanelPlaster w={segW} h={wallHeightM} d={thick} pos={[-segCx, wallHeightM / 2, 0]} color={color} />
      <WallPanelPlaster w={segW} h={wallHeightM} d={thick} pos={[segCx, wallHeightM / 2, 0]} color={color} />
      {headerH > 0.05 && (
        <WallPanelPlaster w={doorW} h={headerH} d={thick} pos={[0, doorH + headerH / 2, 0]} color={color} />
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
function WindowedWall({
  lengthM, wallHeightM, thick, position, rotationY, sillM, color, frameColor,
}: {
  lengthM: number; wallHeightM: number; thick: number;
  position: [number, number, number]; rotationY: number;
  sillM: number; color: string; frameColor: string;
}) {
  const headerM = 0.35;
  const winH = Math.max(0.3, wallHeightM - sillM - headerM);
  const actualHeaderH = wallHeightM - sillM - winH;
  const winY = sillM + winH / 2;
  const glassT = thick * 0.4;
  const mullions = Math.max(1, Math.round(lengthM / 1.6) - 1);
  return (
    <group position={position} rotation-y={rotationY}>
      {/* Sill panel */}
      <WallPanelPlaster w={lengthM} h={sillM} d={thick} pos={[0, sillM / 2, 0]} color={color} />
      {/* Header panel */}
      {actualHeaderH > 0.02 && (
        <WallPanelPlaster w={lengthM} h={actualHeaderH} d={thick} pos={[0, sillM + winH + actualHeaderH / 2, 0]} color={color} />
      )}
      {/* Glazing — the transmission glass band */}
      <mesh position={[0, winY, 0]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[lengthM - 0.06, winH, glassT]} />
        <meshPhysicalMaterial
          transmission={0.95}
          roughness={0.05}
          metalness={0}
          ior={1.5}
          thickness={0.04}
          transparent
          color="#ffffff"
          envMapIntensity={1.4}
          attenuationColor="#cdd8e0"
          attenuationDistance={3}
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
    </group>
  );
}

function BackWallPanel({
  w, h, d, pos, color, accent, graphicUrl, motif,
}: {
  w: number; h: number; d: number; pos: [number, number, number]; color: string; accent: string;
  graphicUrl?: string; motif?: "stripes.diagonal" | "stripes.horizontal" | "dots" | "hex";
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

function WallPanelMotif({ w, h, d, pos, color, accent, motif }: { w: number; h: number; d: number; pos: [number, number, number]; color: string; accent: string; motif: "stripes.diagonal" | "stripes.horizontal" | "dots" | "hex" }) {
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
  // Smoother, more "printed satin laminate" feel — less plaster bumpiness,
  // slight clearcoat sheen so brand-coloured walls catch the HDR.
  return (
    <RoundedBox position={pos} args={[w, h, d]} radius={0.014} smoothness={4} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={color}
        map={map}
        normalMap={normalMap}
        aoMap={aoMap}
        roughness={0.42}
        metalness={0.04}
        clearcoat={0.45}
        clearcoatRoughness={0.22}
        envMapIntensity={1.15}
        normalScale={new THREE.Vector2(0.05, 0.05)}
        sheen={0.2}
        sheenRoughness={0.5}
      />
    </RoundedBox>
  );
}

// ── Ceiling ─────────────────────────────────────────────────────────────────

function Ceiling({
  shape, widthM, depthM, wallHeightM, platformHeightM,
}: { shape: FootprintShape; widthM: number; depthM: number; wallHeightM: number; platformHeightM: number }) {
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
      <mesh geometry={geom} position={[0, y, 0]} rotation-x={Math.PI / 2} receiveShadow castShadow={false}>
        <meshStandardMaterial color="#e9eaee" roughness={0.92} metalness={0.02} side={THREE.DoubleSide} />
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

type LogoPlacement = "back-centre" | "flank-left" | "flank-right";

function BrandLogoOnWall({
  kit, widthM, depthM, wallHeightM, platformHeightM, glow, extrusionM, emissive, placement = "back-centre",
}: {
  kit: BrandKit; widthM: number; depthM: number; wallHeightM: number; platformHeightM: number;
  glow: number; extrusionM: number; emissive: number; placement?: LogoPlacement;
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
    return (
      <LogoSign
        url={url}
        viewBox={kit.logos.primary.viewBox}
        widthM={widthM * 0.5}
        heightM={wallHeightM}
        anchorZ={-depthM / 2 + 0.08}
        y={yCentre}
        extrusionM={extrusionM}
        accent={accent}
        sideTint={sideTint}
        emissiveBoost={boost}
        emissive={emissive}
        invert={invert}
        chroma={chroma}
        maxWidthM={Math.min(widthM * 0.45, 3.2)}
      />
    );
  }
  const flankZ = -depthM / 4;
  const flankX = placement === "flank-left" ? -widthM / 2 : widthM / 2;
  const rotY = placement === "flank-left" ? Math.PI / 2 : -Math.PI / 2;
  return (
    <LogoSignFlank
      url={url}
      viewBox={kit.logos.primary.viewBox}
      depthM={depthM}
      wallHeightM={wallHeightM}
      x={flankX}
      z={flankZ}
      rotY={rotY}
      y={yCentre}
      extrusionM={extrusionM}
      accent={accent}
      sideTint={sideTint}
      emissiveBoost={boost}
      emissive={emissive}
      invert={invert}
      chroma={chroma}
      maxWidthM={Math.min(depthM * 0.5, 3.4)}
    />
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

  return (
    <group position={[xOffset, y, z]} rotation-y={faceDir === -1 ? Math.PI : 0}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[finalWidthM, targetHeightM, d]} />
        <meshPhysicalMaterial color={sideTint} roughness={0.5} metalness={0.05} clearcoat={0.25} clearcoatRoughness={0.3} />
      </mesh>
      {/* Logo decal — emissive so the sign self-illuminates like real backlit signage. */}
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
    </group>
  );
}

// ── Brand standing screen (freestanding display + ken-burns logo) ──────────

function BrandStandingScreen({ kit, position }: { kit: BrandKit; position: [number, number, number] }) {
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
      {/* Emissive content panel + ken-burns logo */}
      <group position={[0, 1.4, 0.03]}>
        <mesh>
          <planeGeometry args={[0.76, 0.46]} />
          <meshStandardMaterial color={kit.palette.primary} emissive={new THREE.Color(kit.palette.primary)} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
        <Suspense fallback={null}>
          <KenBurnsLogo kit={kit} availW={0.7} availH={0.4} />
        </Suspense>
      </group>
    </group>
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
  // Requested 16:9 panel, then clamped so it always fits inside the back wall.
  let w169 = Math.min(widthM, heightM * (16 / 9));
  let h169 = w169 * (9 / 16);
  const maxW = roomWidthM - 0.5;
  const maxH = roomHeightM - 0.9;             // leaves clear gaps above + below
  if (w169 > maxW) { w169 = maxW; h169 = w169 * (9 / 16); }
  if (h169 > maxH) { h169 = maxH; w169 = h169 * (16 / 9); }
  const bezelD = 0.14;                       // the panel extrudes off the wall
  const videoVolume = useConfig((s) => s.videoVolume);
  const videoMuted = useConfig((s) => s.videoMuted);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      w.postMessage(JSON.stringify({ event: "command", func: videoMuted ? "mute" : "unMute", args: [] }), "*");
      w.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [videoVolume] }), "*");
    } catch { /* cross-origin throws — ignore */ }
  }, [videoMuted, videoVolume]);
  // Sit just in front of the back wall's inner face (wall thickness 0.08),
  // proud of it by the bezel's half-depth. Anchored ~0.5m off the floor so
  // the (clamped) panel always clears the ceiling.
  const z = backWallZ + 0.08 + bezelD / 2 + 0.015;
  const cy = platformHeightM + 0.5 + h169 / 2;
  return (
    <group position={[0, cy, z]}>
      {/* Outer dark bezel frame — extruded off the back wall */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[w169, h169, bezelD]} />
        <meshPhysicalMaterial color="#0a0c10" roughness={0.4} metalness={0.6} clearcoat={0.3} />
      </mesh>

      {/* YouTube iframe via drei Html — only if a YouTube ID is set on the kit */}
      {kit.scene?.youtubeId ? (
        <Html
          transform
          position={[0, 0, bezelD / 2 + 0.006]}
          distanceFactor={1}
          occlude="blending"
          style={{ pointerEvents: "auto" }}
          // Sized in CSS pixels but `transform` makes 1 metre ≈ 1 unit;
          // so we set the iframe to match the panel size in world units * a fixed
          // pixel multiplier. Quality is acceptable for the demo target.
        >
          <iframe
            ref={iframeRef}
            width={Math.round(w169 * 200)}
            height={Math.round(h169 * 200)}
            src={`https://www.youtube-nocookie.com/embed/${kit.scene.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${kit.scene.youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&disablekb=1&iv_load_policy=3&fs=0`}
            title={`${kit.name} video`}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            // pointer-events:none kills hover-spawned bottom controls + the
            // YouTube logo click target. The video keeps playing because
            // autoplay is set in the URL; users never need to click on it.
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
      ) : (
        <>
          {/* Emissive fallback panel — brand colour wash */}
          <mesh position={[0, 0, bezelD / 2 + 0.004]}>
            <planeGeometry args={[w169, h169]} />
            <meshStandardMaterial
              color={kit.palette.primary}
              emissive={new THREE.Color(kit.palette.primary)}
              emissiveIntensity={brightness * 0.9}
              toneMapped={false}
            />
          </mesh>
          {/* Accent vignette — soft secondary colour wash on the bottom */}
          <mesh position={[0, -h169 * 0.32, bezelD / 2 + 0.006]}>
            <planeGeometry args={[w169 * 0.96, h169 * 0.35]} />
            <meshStandardMaterial
              color={kit.palette.accent}
              emissive={new THREE.Color(kit.palette.accent)}
              emissiveIntensity={brightness * 0.6}
              transparent
              opacity={0.55}
              toneMapped={false}
            />
          </mesh>
          {/* Brand logo overlaid — positioned upper-right ("WORLD OF ..." vibe) */}
          <LedWallContent
            kit={kit}
            widthM={w169}
            heightM={h169}
            brightness={brightness}
          />
          {/* Tile bezel grid — 4 cols × 3 rows lines */}
          <TileBezelGrid widthM={w169} heightM={h169} cols={4} rows={3} />
        </>
      )}

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
    </group>
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
  return (
    <group position={position} rotation-y={rotY}>
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshPhysicalMaterial color={sideTint} roughness={0.45} metalness={0.05} clearcoat={0.3} />
      </mesh>
      <mesh position={[0, 0, d / 2 + 0.0008]}>
        <planeGeometry args={[w, h]} />
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

function PlatformEdgeAccent({ widthM, depthM, platformHeightM, color }: { widthM: number; depthM: number; platformHeightM: number; color: string }) {
  const y = platformHeightM + 0.005;
  const t = 0.02;
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

function Plants({ widthM, depthM, plantCount, platformHeightM }: { widthM: number; depthM: number; plantCount: number; platformHeightM: number }) {
  const slots = useMemo(() => generatePlantSlots(widthM, depthM, plantCount, platformHeightM), [widthM, depthM, plantCount, platformHeightM]);
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
function generatePlantSlots(widthM: number, depthM: number, count: number, platformHeightM: number) {
  if (count <= 0) return [];
  const y = platformHeightM;
  // Heights aligned within each L/R pair so the booth reads symmetrically.
  // First pair: trees flanking the front. Second pair: low pots flanking the
  // back. Third pair: mid-height snake plants on the side walls.
  const candidates: { kind: PlantKind; pos: [number, number, number]; rot: number; h: number }[] = [
    { kind: "tree",    pos: [ widthM / 2 - 0.7, y,  depthM / 2 - 0.7], rot: -Math.PI / 4, h: 2.0 },
    { kind: "tree",    pos: [-widthM / 2 + 0.7, y,  depthM / 2 - 0.7], rot:  Math.PI / 4, h: 2.0 },
    { kind: "hexapot", pos: [ widthM / 2 - 0.7, y, -depthM / 2 + 0.7], rot: -Math.PI / 6, h: 1.0 },
    { kind: "tarro",   pos: [-widthM / 2 + 0.7, y, -depthM / 2 + 0.7], rot:  Math.PI / 6, h: 1.0 },
    { kind: "snake",   pos: [ widthM / 2 - 0.7, y, 0], rot: -Math.PI / 2, h: 1.3 },
    { kind: "snake",   pos: [-widthM / 2 + 0.7, y, 0], rot:  Math.PI / 2, h: 1.3 },
  ];
  return candidates.slice(0, Math.min(count, candidates.length));
}
