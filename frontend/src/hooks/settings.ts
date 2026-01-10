import { useEffect, useState } from "react";
import { settingsApi } from "../lib/client";
import type { Settings } from "../types/types";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    settingsApi.getSettings().then(setSettings);
  }, []);

  return { settings };
}
