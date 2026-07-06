/**
 * Material library for the POC.
 *
 * All paths point to files inside:
 * public/assets/...
 *
 * In Next.js, anything inside public/ is served from the site root.
 * Example:
 * public/assets/textures/pool/bright-azure-basecolor.jpg
 * becomes:
 * /assets/textures/pool/bright-azure-basecolor.jpg
 */

export const MATERIAL_LIBRARY = {
  pool: [
    {
      key: "brightAzure",
      name: "Bright Azure",
      description: "Premium blue pool tile",
      maps: {
        baseColor: "/assets/textures/pool/bright-azure-basecolor.jpg",
        normal: "/assets/textures/pool/bright-azure-normal.jpg",
        roughness: "/assets/textures/pool/bright-azure-roughness.jpg",
      },
    },
    {
      key: "deepNavy",
      name: "Deep Navy",
      description: "Dark luxury marble pool tile",
      maps: {
        baseColor: "/assets/textures/pool/deep-navy-basecolor.jpg",
        normal: "/assets/textures/pool/deep-navy-normal.jpg",
        roughness: "/assets/textures/pool/deep-navy-roughness.jpg",
      },
    },
  ],

  coping: [
    {
      key: "silverGrey",
      name: "Silver Grey",
      description: "Stone pool edge",
      maps: {
        baseColor: "/assets/textures/coping/silver-grey-basecolor.jpg",
        roughness: "/assets/textures/coping/silver-grey-roughness.jpg",
      },
    },
  ],

  deck: [
    {
      key: "greige",
      name: "Greige Stone",
      description: "Modern patio stone",
      maps: {
        baseColor: "/assets/textures/deck/greige-basecolor.jpg",
        normal: "/assets/textures/deck/greige-normal.jpg",
        roughness: "/assets/textures/deck/greige-roughness.jpg",
      },
    },
  ],
} as const;

/**
 * Water is a shader/material preset, not a normal texture category.
 * We use color presets now; the uploaded water normal map is applied in 3D.
 */
export const WATER_PRESETS = [
  {
    key: "caribbean",
    name: "Caribbean",
    color: "#38d5ff",
    secondary: "#0ea5e9",
  },
  {
    key: "azure",
    name: "Azure",
    color: "#1b9ad1",
    secondary: "#0369a1",
  },
  {
    key: "midnight",
    name: "Midnight",
    color: "#14506b",
    secondary: "#082f49",
  },
  {
    key: "emerald",
    name: "Emerald",
    color: "#1fa98c",
    secondary: "#065f46",
  },
] as const;

export type PoolTileKey = (typeof MATERIAL_LIBRARY.pool)[number]["key"];
export type CopingMaterialKey = (typeof MATERIAL_LIBRARY.coping)[number]["key"];
export type DeckMaterialKey = (typeof MATERIAL_LIBRARY.deck)[number]["key"];
export type WaterColorKey = (typeof WATER_PRESETS)[number]["key"];

export type PoolMaterials = {
  poolTile: PoolTileKey;
  coping: CopingMaterialKey;
  deck: DeckMaterialKey;
  water: WaterColorKey;
};
