import { useEffect, useState } from "react";
import { settingsApi } from "../lib/client";
import type { Settings } from "../types/types";
import { STATIC_MODE } from "../config";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    // No backend in static mode; leave settings null (title falls back to "").
    if (STATIC_MODE) return;
    settingsApi.getSettings().then(setSettings);
  }, []);

  return { settings };
}
