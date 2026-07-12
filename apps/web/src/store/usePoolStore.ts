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
   * Current saved design id loaded in the studio.
   *
   * null means:
   * - design is not saved yet
   * - or user changed a saved design after loading it
   */
  activeDesignId: string | null;

  /**
   * Updates one dimension at a time.
   * Changing dimensions makes the current design unsaved again.
   */
  setDimension: (key: DimensionKey, value: number) => void;

  /**
   * Updates one material slot at a time.
   * Changing materials makes the current design unsaved again.
   */
  setMaterial: <K extends MaterialKey>(key: K, value: PoolMaterials[K]) => void;

  /**
   * Manually sets the currently active saved design id.
   *
   * Used after:
   * - saving a new design
   * - loading a saved/shared design
   */
  setActiveDesignId: (designId: string | null) => void;

  /**
   * Loads a complete saved design into the studio.
   *
   * Used by:
   * - Saved Designs list
   * - Shareable design URL
   */
  setDesignConfig: (config: {
    dimensions: PoolDimensions;
    materials: PoolMaterials;
    activeDesignId?: string | null;
  }) => void;

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
  activeDesignId: null,

  setDimension: (key, value) => {
    set((state) => ({
      dimensions: {
        ...state.dimensions,
        [key]: value,
      },

      /**
       * User edited the design, so it is no longer exactly the saved design.
       */
      activeDesignId: null,
    }));
  },

  setMaterial: (key, value) => {
    set((state) => ({
      materials: {
        ...state.materials,
        [key]: value,
      },

      /**
       * User edited the design, so it is no longer exactly the saved design.
       */
      activeDesignId: null,
    }));
  },

  setActiveDesignId: (designId) => {
    set({
      activeDesignId: designId,
    });
  },

  setDesignConfig: (config) => {
    set({
      dimensions: config.dimensions,
      materials: config.materials,
      activeDesignId: config.activeDesignId ?? null,
    });
  },

  resetDimensions: () => {
    set({
      dimensions: DEFAULT_DIMENSIONS,
      activeDesignId: null,
    });
  },
}));
