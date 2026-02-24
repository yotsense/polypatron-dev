"use client";

import React from "react";
import { useTimezone } from "../context/TimezoneContext";

export default function TimezoneSelector() {
  const { tz, setTz } = useTimezone();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ fontSize: 12, opacity: 0.85 }}>Zona horaria</label>
      <select
        value={tz}
        onChange={(e) => setTz(e.target.value as "UTC" | "America/Mexico_City")}
      >
        <option value="UTC">UTC (Z)</option>
        <option value="America/Mexico_City">CDMX</option>
      </select>
    </div>
  );
}
