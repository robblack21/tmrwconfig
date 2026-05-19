// ── Inventory ────────────────────────────────────────────────────────────────
// A plain list of what's in the room, grouped, with each item's addressable
// sub-parts. tmrwconfig is a brand-experience configurator, not a quoting
// tool — there are no costs or rates here.

export type InventoryNode = {
  label: string;
  count?: number;            // omit for a single item
  subnodes?: string[];       // addressable sub-parts
};
export type InventoryGroup = { id: string; label: string; nodes: InventoryNode[] };

export type InventoryCfg = {
  windowsEnabled: boolean;
  ceilingEnabled: boolean;
  ledWallEnabled: boolean;
  pendantEnabled: boolean;
  pendantShape: string;
  chairCount: number;
  tableVariant: string;
  chairVariant: string;
  plantCount: number;
  sofaCount: number;
  heroProps: Array<{ url?: string }>;
};

export function prettyAssetName(url: string): string {
  const file = url.split("/").pop() ?? url;
  return (
    file
      .replace(/\.(glb|gltf)$/i, "")
      .replace(/\s*\(\d+\)\s*$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || "Item"
  );
}

/** Build the room's inventory tree from the live config. No costs — just the
 *  items present and their addressable subnodes. */
export function deriveInventory(cfg: InventoryCfg): InventoryGroup[] {
  const groups: InventoryGroup[] = [];

  const structure: InventoryNode[] = [
    { label: "Back wall", subnodes: ["Plaster panel", "Interior logo sign", "Exterior logo sign"] },
    {
      label: "Side wall", count: 2,
      subnodes: cfg.windowsEnabled
        ? ["Sill panel", "Glazed window band", "Header panel", "Mullions"]
        : ["Plaster panel"],
    },
    { label: "Front wall", subnodes: ["Door opening", "Wall segments", "Door header"] },
    { label: "Corner pillar", count: 4 },
    { label: "Raised floor platform", subnodes: ["Parquet top", "Edge trim"] },
  ];
  if (cfg.ceilingEnabled) {
    structure.push({ label: "Ceiling slab", subnodes: ["Recessed downlights", "Accent cove"] });
  }
  groups.push({ id: "structure", label: "Structure", nodes: structure });

  const furniture: InventoryNode[] = [
    { label: `Boardroom table — ${cfg.tableVariant}`, subnodes: ["Tabletop", "Base / trestle"] },
  ];
  if (cfg.chairCount > 0) {
    furniture.push({
      label: `Conference chair — ${cfg.chairVariant}`,
      count: cfg.chairCount,
      subnodes: ["Seat shell", "Backrest", "Swivel base"],
    });
  }
  if (cfg.sofaCount > 0) {
    furniture.push({ label: "Breakout sofa", count: Math.min(cfg.sofaCount, 2) });
    if (cfg.sofaCount >= 2) furniture.push({ label: "Coffee table" });
  }
  groups.push({ id: "furniture", label: "Furniture", nodes: furniture });

  const media: InventoryNode[] = [];
  if (cfg.ledWallEnabled) {
    media.push({ label: "Video wall", subnodes: ["Bezel frame", "YouTube screen", "Backlight"] });
  }
  if (cfg.pendantEnabled) {
    media.push({ label: `Pendant sign — ${cfg.pendantShape}`, subnodes: ["Body", "Logo faces"] });
  }
  if (media.length) groups.push({ id: "media", label: "Media & lighting", nodes: media });

  if (cfg.heroProps.length) {
    groups.push({
      id: "brand",
      label: "Brand display",
      nodes: cfg.heroProps.map((p) => ({ label: prettyAssetName(p.url ?? "") })),
    });
  }

  if (cfg.plantCount > 0) {
    groups.push({ id: "dressing", label: "Dressing", nodes: [{ label: "Plant", count: cfg.plantCount }] });
  }

  return groups;
}
