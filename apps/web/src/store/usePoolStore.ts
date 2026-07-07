import { create } from "zustand";
import type { PoolMaterials } from "@/config/materials";

/**
 * Pool dimensions are stored in meters.
 *
 * For the POC:
 * 1 Three.js world unit = 1 meter.
 * This is important because AR needs real-world scale later.
 */
export type PoolDimensions = {
  length: number;
  width: number;
  depth: number;
};

type DimensionKey = keyof PoolDimensions;
type MaterialKey = keyof PoolMaterials;

type PoolStore = {
  dimensions: PoolDimensions;
  materials: PoolMaterials;

  /**
   * Updates one dimension at a time.
   * Example: setDimension("length", 9)
   */
  setDimension: (key: DimensionKey, value: number) => void;

  /**
   * Updates one material slot at a time.
   * Example: setMaterial("poolTile", "deepNavy")
   */
  setMaterial: <K extends MaterialKey>(key: K, value: PoolMaterials[K]) => void;

  /**
   * Brings the pool back to a clean default demo size.
   */
  resetDimensions: () => void;
};

export const DEFAULT_DIMENSIONS: PoolDimensions = {
  length: 8,
  width: 4,
  depth: 1.5,
};

export const DEFAULT_MATERIALS: PoolMaterials = {
  poolTile: "brightAzure",
  coping: "silverGrey",
  deck: "greige",
  water: "caribbean",
};

export const usePoolStore = create<PoolStore>((set) => ({
  dimensions: DEFAULT_DIMENSIONS,
  materials: DEFAULT_MATERIALS,

  setDimension: (key, value) => {
    set((state) => ({
      dimensions: {
        ...state.dimensions,
        [key]: value,
      },
    }));
  },

  setMaterial: (key, value) => {
    set((state) => ({
      materials: {
        ...state.materials,
        [key]: value,
      },
    }));
  },

  resetDimensions: () => {
    set({
      dimensions: DEFAULT_DIMENSIONS,
    });
  },
}));
