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

export type SavedDesignResponse = {
  id: string;
  name: string | null;
  config: DesignPreviewInput;
  summary: DesignPreviewResponse["summary"];
  createdAt: string;
  updatedAt: string;
  futureSharePath: string;
  futureShareUrl: string;
};

export async function saveDesign(input: DesignPreviewInput & { name?: string }) {
  const response = await fetch(`${API_BASE_URL}/api/designs`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Save design failed: ${response.status}`);
  }

  const result = (await response.json()) as ApiEnvelope<SavedDesignResponse>;

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("Save design response did not include data.");
  }

  return {
    data: result.data,
    error: null,
    meta: result.meta,
  };
}

export type SavedDesignListItem = {
  id: string;
  name: string | null;
  shape: string;
  length: number;
  width: number;
  depth: number;
  poolTile: string;
  coping: string;
  deck: string;
  water: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedDesignDetailResponse = {
  id: string;
  name: string | null;
  shape: string;
  length: number;
  width: number;
  depth: number;
  poolTile: string;
  coping: string;
  deck: string;
  water: string;
  source: string;
  config: DesignPreviewInput;
  previewSummary: DesignPreviewResponse["summary"] | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Lists latest saved designs from the backend.
 */
export async function listSavedDesigns(): Promise<
  ApiSuccess<SavedDesignListItem[]>
> {
  const response = await fetch(`${API_BASE_URL}/api/designs`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`List saved designs failed: ${response.status}`);
  }

  const result = (await response.json()) as ApiEnvelope<SavedDesignListItem[]>;

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("Saved designs response did not include data.");
  }

  return {
    data: result.data,
    error: null,
    meta: result.meta,
  };
}

/**
 * Gets one saved design by id.
 *
 * Used when user clicks "Load" from Saved Designs card.
 */
export async function getSavedDesign(
  id: string
): Promise<ApiSuccess<SavedDesignDetailResponse>> {
  const response = await fetch(`${API_BASE_URL}/api/designs/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Get saved design failed: ${response.status}`);
  }

  const result =
    (await response.json()) as ApiEnvelope<SavedDesignDetailResponse>;

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("Saved design response did not include data.");
  }

  return {
    data: result.data,
    error: null,
    meta: result.meta,
  };
}

export type CreateLeadInput = {
  customerName: string;
  email?: string;
  phone?: string;
  city?: string;
  message?: string;
  designId?: string;
  config: DesignPreviewInput;
  source: "studio" | "shared-design" | "ar";
};

export type LeadResponse = {
  id: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  message: string | null;
  designId: string | null;
  config: DesignPreviewInput;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadListItem = LeadResponse;

/**
 * Lists recent quote/inquiry leads.
 *
 * Used by:
 * - admin dashboard
 */
export async function listLeads(): Promise<ApiSuccess<LeadListItem[]>> {
  const response = await fetch(`${API_BASE_URL}/api/leads`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`List leads failed: ${response.status}`);
  }

  const result = (await response.json()) as ApiEnvelope<LeadListItem[]>;

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("Leads response did not include data.");
  }

  return {
    data: result.data,
    error: null,
    meta: result.meta,
  };
}

/**
 * Creates a customer quote/inquiry lead.
 */
export async function createLead(
  input: CreateLeadInput
): Promise<ApiSuccess<LeadResponse>> {
  const response = await fetch(`${API_BASE_URL}/api/leads`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Create lead failed: ${response.status}`);
  }

  const result = (await response.json()) as ApiEnvelope<LeadResponse>;

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new Error("Create lead response did not include data.");
  }

  return {
    data: result.data,
    error: null,
    meta: result.meta,
  };
}
