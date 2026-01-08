import type { Position, Settings } from "../types/types";

const API_HOST = import.meta.env.VITE_API_HOST || "";
const API_BASE = `${API_HOST}/api`;

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

export const positionApi = {
  getLatest: async (mmsi: string | null = null) =>
    apiFetch<Position>(`/position/latest/${mmsi || ""}`),
  getRange: async (
    mmsi: string | null = null,
    fromTs: string | null = null,
    toTs: string | null = null,
  ) =>
    apiFetch<Position[]>(
      `/position/range/${mmsi || ""}?${fromTs ? `from_ts=${fromTs}` : ""}${toTs ? `&to_ts=${toTs}` : ""}`,
    ),
};

export const settingsApi = {
  getSettings: async () => apiFetch<Settings>(`/settings/`),
};
