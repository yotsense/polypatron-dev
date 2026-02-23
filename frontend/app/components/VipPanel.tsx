"use client";

import React, { useMemo, useState } from "react";
import { apiBase, postJSON, Intervalo } from "../lib/api";
import type { FilaPatron } from "./RankTable";
import type { Controles } from "./Controls";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function isoMinusMs(iso: string, ms: number) {
  const t = new Date(iso).getTime();
  return new Date(t - ms).toISOString();
}

type Props = {
  controles: Controles;
  setFilas: (f: any[]) => void;
  setError: (e: string | null) => void;
  setCargando: (b: boolean) => void;
};

export default function VipPanel({ controles, setFilas, setError, setCargando }: Props) {
  const [efMin, setEfMin] = useState<number>(70); // %
  const [minM, setMinM] = useState<number>(20);
  const [lenMin, setLenMin] = useState<number>(2);
  const [lenMax, setLenMax] = useState<number>(6);
  const [modoRango, setModoRango] = useState<"custom" | "12h" | "1d" | "3d" | "7d">("1d");

  const rango = useMemo(() => {
    const fin = controles.usarUltimo ? controles.fin : controles.fin;
    let inicio = controles.inicio;

    const H = 60 * 60 * 1000;
    const D = 24 * H;

    if (modoRango === "12h") inicio = isoMinusMs(fin, 12 * H);
    if (modoRango === "1d") inicio = isoMinusMs(fin, 1 * D);
    if (modoRango === "3d") inicio = isoMinusMs(fin, 3 * D);
    if (modoRango === "7d") inicio = isoMinusMs(fin, 7 * D);

    return { inicio, fin };
  }, [modoRango, controles.inicio, controles.fin, controles.usarUltimo]);

  async function buscarVIP() {
    try {
      setError(null);
      setCargando(true);

      const base = apiBase();

      const payload: any = {
        mercado: controles.mercadoApi,
        intervalo: controles.intervalo as Intervalo,
        inicio: rango.inicio,
        fin: rango.fin,
        longitud_min: clamp(lenMin, 2, 12),
        longitud_max: clamp(lenMax, 2, 12),
        min_muestras: clamp(minM, 1, 100000),
        suavizado: controles.suavizado ?? 0,
      };

      const res = await postJSON<{ filas: FilaPatron[] }>(`${base}/patrones/rankear`, payload);

      const ef = clamp(efMin, 0, 100) / 100;
      const out = (res.filas || [])
        .filter((x) => x.efectividad >= ef)
        .slice(0, 200);

      // Reutilizamos la tabla principal (RankTable) mostrando resultados VIP como ranking normal
      setFilas(out as any[]);
    } catch (e: any) {
      setError(e?.message || "Error en VIP");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="cardHeader">
        <b>Búsqueda VIP (rápida)</b>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Filtra por % mínimo y muestras mínimas. Usa rangos rápidos (12h / 1d / 3d / 7d).
        </div>
      </div>

      <div className="cardBody">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <button type="button" onClick={() => setModoRango("12h")} className={modoRango === "12h" ? "btnPrimary" : ""}>Últimas 12h</button>
          <button type="button" onClick={() => setModoRango("1d")} className={modoRango === "1d" ? "btnPrimary" : ""}>Último día</button>
          <button type="button" onClick={() => setModoRango("3d")} className={modoRango === "3d" ? "btnPrimary" : ""}>Últimos 3 días</button>
          <button type="button" onClick={() => setModoRango("7d")} className={modoRango === "7d" ? "btnPrimary" : ""}>Últimos 7 días</button>
          <button type="button" onClick={() => setModoRango("custom")} className={modoRango === "custom" ? "btnPrimary" : ""}>Usar Inicio/Fin</button>
        </div>

        <div className="grid grid2">
          <div>
            <label>% efectividad mínima</label>
            <input type="number" min={0} max={100} value={efMin} onChange={(e) => setEfMin(Number(e.target.value))} />
          </div>

          <div>
            <label>Muestras mínimas</label>
            <input type="number" min={1} value={minM} onChange={(e) => setMinM(Number(e.target.value))} />
          </div>

          <div>
            <label>Longitud mínima</label>
            <input type="number" min={2} max={12} value={lenMin} onChange={(e) => setLenMin(Number(e.target.value))} />
          </div>

          <div>
            <label>Longitud máxima</label>
            <input type="number" min={2} max={12} value={lenMax} onChange={(e) => setLenMax(Number(e.target.value))} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={buscarVIP} className="btnPrimary">
            Buscar patrones VIP
          </button>
          <div className="small" style={{ opacity: 0.7, alignSelf: "center" }}>
            Rango usado: {modoRango === "custom" ? "Inicio/Fin" : modoRango} (termina en tu “Fin” actual)
          </div>
        </div>
      </div>
    </div>
  );
}
