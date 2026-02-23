"use client";

import React from "react";
import { apiBase, Intervalo } from "../lib/api";

type Controles = {
  mercadoUI: "BTC";
  mercadoApi: string;
  intervalo: Intervalo;
  inicio: string;
  fin: string;
  usarUltimo: boolean;

  longitudMin: number;
  longitudMax: number;
  minMuestras: number;
  suavizado: number;
};

type FilaPatron = {
  patron: string;
  direccion: "V" | "R";
  efectividad: number;
  muestras: number;
  verdes: number;
  rojas: number;

  ultima_vez_utc?: string | null;
  aparece_cada_seg?: number | null;
  desde_ultima_seg?: number | null;
};

function isoMinusHours(iso: string, hours: number) {
  const d = new Date(iso);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

async function postJSON<T>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const msg = await r.text();
    throw new Error(msg || `Error HTTP ${r.status}`);
  }
  return (await r.json()) as T;
}

export default function Top3Panel({
  controles,
  setFilas,
  setError,
  setCargando,
}: {
  controles: Controles;
  setFilas: (filas: FilaPatron[]) => void;
  setError: (msg: string | null) => void;
  setCargando: (v: boolean) => void;
}) {
  async function runTop3(minMuestras: number) {
    try {
      setError(null);
      setCargando(true);

      const base = apiBase();
      const fin = controles.fin; // ya viene ISO
      const inicio = isoMinusHours(fin, 24);

      const payload = {
        mercado: controles.mercadoApi,
        intervalo: controles.intervalo,
        inicio,
        fin,
        longitud_min: 3,
        longitud_max: 6,
        min_muestras: minMuestras,
        suavizado: controles.suavizado ?? 0,
      };

      const data = await postJSON<{ filas: FilaPatron[] }>(`${base}/patrones/rankear`, payload);
      setFilas((data.filas || []).slice(0, 3));
    } catch (e: any) {
      setError(e?.message || "Error desconocido");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="cardHeader">
        <b>TOP 3 (últimas 24 horas)</b>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Longitud min 3, max 6. Termina en tu “Fin” actual (o último mercado si lo activas).
        </div>
      </div>

      <div className="cardBody">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => runTop3(10)}>Opción básica (10 muestras)</button>
          <button type="button" onClick={() => runTop3(15)}>Opción media (15 muestras)</button>
          <button type="button" onClick={() => runTop3(20)}>Opción fuerte (20 muestras)</button>
          <button type="button" onClick={() => runTop3(25)}>Opción ultra fuerte (25+)</button>
        </div>

        <div className="small" style={{ marginTop: 8 }}>
          Nota: “Ultra” usa mínimo 25 exacto (25 o más).
        </div>
      </div>
    </div>
  );
}
