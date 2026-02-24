"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UITimezone = "UTC" | "America/Mexico_City";

type TimezoneContextValue = {
  tz: UITimezone;
  setTz: (tz: UITimezone) => void;
  label: string;
};

const STORAGE_KEY = "polypatron.ui.timezone";
const DEFAULT_TZ: UITimezone = "America/Mexico_City";

const TimezoneContext = createContext<TimezoneContextValue | undefined>(undefined);

function tzLabel(tz: UITimezone) {
  return tz === "UTC" ? "UTC (Z)" : "CDMX";
}

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [tz, setTz] = useState<UITimezone>(DEFAULT_TZ);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "UTC" || saved === "America/Mexico_City") {
      setTz(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, tz);
  }, [tz]);

  const value = useMemo(
    () => ({ tz, setTz, label: tzLabel(tz) }),
    [tz]
  );

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export function useTimezone() {
  const ctx = useContext(TimezoneContext);
  if (!ctx) {
    throw new Error("useTimezone debe usarse dentro de TimezoneProvider");
  }
  return ctx;
}
