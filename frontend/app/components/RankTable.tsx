"use client";

import React, { useMemo, useState } from "react";
import { useTimezone } from "../context/TimezoneContext";
import { formatDateTime } from "../lib/datetime";

export type FilaPatron = {
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

function fmtDur(seg?: number | null) {
  if (seg == null) return "-";
  const s = Math.max(0, Math.floor(seg));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}

export default function RankTable({
  filas,
  ahoraUtc,
  onSimular,
  onElegirParaComparar,
  onVerHistorial,
}: {
  filas: FilaPatron[];
  ahoraUtc: string | null;
  onSimular: (patron: string, direccion: "V" | "R") => void;
  onElegirParaComparar: (patron: string, direccion: "V" | "R") => void;
  onVerHistorial: (patron: string, direccion: "V" | "R") => void;
}) {
  const { tz } = useTimezone();
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const total = filas?.length || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const slice = useMemo(() => {
    const start = page * pageSize;
    return (filas || []).slice(start, start + pageSize);
  }, [filas, page]);

  const ahoraLocal = useMemo(() => {
    return formatDateTime(ahoraUtc, tz);
  }, [ahoraUtc, tz]);

  return (
    <div className="card">
      <div className="cardHeader" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <b>Ranking de patrones</b>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Efectividad = % de veces que la vela siguiente fue V o R (según dirección).
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
            <b>AHORA:</b> {ahoraLocal || "-"} (base para "desde última vez")
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0}>
            ← Anterior
          </button>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Página {page + 1} / {pages}
          </div>
          <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>
            Siguiente →
          </button>
        </div>
      </div>

      <div className="tableWrap">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Patrón</th>
              <th>Dir</th>
              <th>Efectividad</th>
              <th>Muestras</th>
              <th>V</th>
              <th>R</th>
              <th>Visto última vez</th>
              <th>Aparece cada</th>
              <th>Desde última vez</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {(slice || []).map((r, idx) => {
              const visto = formatDateTime(r.ultima_vez_utc, tz);
              return (
                <tr key={idx}>
                  <td>{r.patron}</td>
                  <td>{r.direccion}</td>
                  <td>{(r.efectividad * 100).toFixed(2)}%</td>
                  <td>{r.muestras}</td>
                  <td>{r.verdes}</td>
                  <td>{r.rojas}</td>
                  <td>{visto}</td>
                  <td>{fmtDur(r.aparece_cada_seg ?? null)}</td>
                  <td>{fmtDur(r.desde_ultima_seg ?? null)}</td>
                  <td>
                    <button onClick={() => onSimular(r.patron, r.direccion)} className="btnPrimary">
                      Simular
                    </button>
                    <button onClick={() => onElegirParaComparar(r.patron, r.direccion)}>
                      Usar en comparar
                    </button>
                    <button onClick={() => onVerHistorial(r.patron, r.direccion)}>
                      Ver historial
                    </button>
                  </td>
                </tr>
              );
            })}

            {(filas || []).length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 12, opacity: 0.7 }}>
                  No hay resultados (prueba ampliar rango o bajar mínimo de muestras).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ padding: 12, fontSize: 12, opacity: 0.75 }}>
        Mostrando {Math.min(pageSize, total - page * pageSize)} de {total} resultados (10 por página).
      </div>
    </div>
  );
}
