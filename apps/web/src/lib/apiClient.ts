/**
 * Frontend API client config.
 *
 * NEXT_PUBLIC_API_BASE_URL is public because browser code needs to know
 * where the backend server is hosted.
 *
 * We remove trailing slashes so requests do not become:
 * https://server.com//api/health
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

/**
 * Standard API response shape used by our backend.
 */
export type ApiEnvelope<T> = {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
  meta: {
    timestamp: string;
  };
};

/**
 * API success response shape.
 *
 * After our client validates that data exists and error is null,
 * components can safely use result.data without extra null checks.
 */
export type ApiSuccess<T> = {
  data: T;
  error: null;
  meta: {
    timestamp: string;
  };
};

/**
 * Backend health response payload.
 */
export type BackendHealth = {
  ok: boolean;
  service: string;
};

/**
 * Calls the Node server health endpoint.
 *
 * This proves:
 * - frontend can reach backend
 * - backend CORS is configured
 * - env variable is working
 */
export async function getBackendHealth(): Promise<ApiSuccess<BackendHealth>> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Backend health check failed: ${response.status}`);
  }

  const result = (await response.json()) as ApiEnvelope<BackendHealth>;

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("Backend health response did not include data.");
  }

  return {
    data: result.data,
    error: null,
    meta: result.meta,
  };
}

/**
 * Current frontend design config sent to backend.
 *
 * This shape intentionally matches the server Zod schema.
 */
export type DesignPreviewInput = {
  version: 1;
  shape: "rectangular";
  dimensions: {
    length: number;
    width: number;
    depth: number;
  };
  materials: {
    poolTile: "brightAzure" | "deepNavy";
    coping: "silverGrey";
    deck: "greige";
    water: "caribbean" | "azure" | "midnight" | "emerald";
  };
  source: "studio" | "ar" | "pwa";
};

export type DesignPreviewResponse = {
  previewId: string;
  config: DesignPreviewInput;
  summary: {
    title: string;
    dimensionsLabel: string;
    waterSurfaceAreaSqm: number;
    approximateWaterVolumeCbm: number;
    deckFootprintAreaSqm: number;
  };
  ar: {
    androidWebXR: string;
    iPhoneQuickLook: string;
    nextStep: string;
  };
};

/**
 * Sends current pool design to the Node backend.
 *
 * This is the first real backend design API.
 * Later the same endpoint family will support:
 * - save design
 * - share design
 * - generate USDZ
 */
export async function createDesignPreview(
  input: DesignPreviewInput
): Promise<ApiSuccess<DesignPreviewResponse>> {
  const response = await fetch(`${API_BASE_URL}/api/designs/preview`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Design preview failed: ${response.status}`);
  }

  const result =
    (await response.json()) as ApiEnvelope<DesignPreviewResponse>;

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("Design preview response did not include data.");
  }

  return {
    data: result.data,
    error: null,
    meta: result.meta,
  };
}

export type IphoneArPreviewResponse = {
  previewId: string;
  mode:
  | "static-usdz-fallback"
  | "server-static-usdz-fallback"
  | "dynamic-usdz"
  | "dynamic-usdz-v1";
  config: DesignPreviewInput;
  quickLook: {
    platform: "ios";
    fileFormat: "usdz";
    href: string;
    rel: "ar";
    status: string;
  };
  pipeline: {
    dynamicGeneration: string;
    currentStep: string;
    futureOutputPath: string;
  };
  notes: string[];
};

/**
 * Requests iPhone AR preview information from the backend.
 *
 * Current behavior:
 * - backend validates the design
 * - backend returns static USDZ fallback URL
 *
 * Future behavior:
 * - backend generates a dynamic USDZ from this design
 * - backend returns generated USDZ URL
 */
export async function createIphoneArPreview(
  input: DesignPreviewInput
): Promise<ApiSuccess<IphoneArPreviewResponse>> {
  const response = await fetch(`${API_BASE_URL}/api/ar/iphone-preview`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`iPhone AR preview failed: ${response.status}`);
  }

  const result =
    (await response.json()) as ApiEnvelope<IphoneArPreviewResponse>;

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("iPhone AR preview response did not include data.");
  }

  return {
    data: result.data,
    error: null,
    meta: result.meta,
  };
}
