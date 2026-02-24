"use client";

import React from "react";
import { TimezoneProvider } from "./context/TimezoneContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <TimezoneProvider>{children}</TimezoneProvider>;
}
