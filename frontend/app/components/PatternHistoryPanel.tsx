"use client";

import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { apiBase, getJSON } from "../lib/api";
import { UITimezone, useTimezone } from "../context/TimezoneContext";
import { formatDateTime, formatDateTimeParts } from "../lib/datetime";
import { analyzeHistory, Side } from "../lib/historyAnalysis";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  patron: string | null;
  direccion: "V" | "R" | null;
  mercado: string;
  intervalo: "5m" | "15m" | "1h" | "4h";
  inicio: string;
  fin: string;
};

export type Ocurrencia = {
  fecha: string;
  hora: string;
  direccion_resultado: "V" | "R";
  mercado_slug?: string | null;
  mercado_id?: string | null;
};

export type HistorialResponse = {
  patron: string;
  direccion: "V" | "R";
  mercado: string;
  intervalo: "5m" | "15m" | "1h" | "4h";
  total_muestras: number;
  rango_fecha_inicio?: string | null;
  rango_fecha_fin?: string | null;
  ocurrencias: Ocurrencia[];
};

export type PatternHistoryParams = {
  patron: string;
  direccion: "V" | "R";
  mercado: string;
  intervalo: "5m" | "15m" | "1h" | "4h";
  inicio: string;
  fin: string;
};

const historyCache = new Map<string, HistorialResponse>();

function buildHistoryQuery(base: string, params: PatternHistoryParams) {
  const q = new URLSearchParams({
    patron: params.patron,
    direccion: params.direccion,
    mercado: params.mercado,
    intervalo: params.intervalo,
    inicio: params.inicio,
    fin: params.fin,
  });
  return `${base}/patrones/historial?${q.toString()}`;
}

function buildHistoryCacheKey(params: PatternHistoryParams) {
  return [params.mercado, params.intervalo, params.patron, params.direccion, params.inicio, params.fin].join("|");
}

export function usePatternHistory(params: PatternHistoryParams | null, enabled: boolean) {
  const base = apiBase();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistorialResponse | null>(null);

  const query = useMemo(() => {
    if (!params) return "";
    return buildHistoryQuery(base, params);
  }, [base, params]);

  const cacheKey = useMemo(() => {
    if (!params) return "";
    return buildHistoryCacheKey(params);
  }, [params]);

  useEffect(() => {
    if (!enabled || !params || !query || !cacheKey) return;

    const cached = historyCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setError(null);
      setCargando(false);
      return;
    }

    let activo = true;
    (async () => {
      setCargando(true);
      setError(null);
      setData(null);
      try {
        const res = await getJSON<HistorialResponse>(query);
        if (!activo) return;
        historyCache.set(cacheKey, res);
        setData(res);
      } catch (e: any) {
        if (!activo) return;
        setError(e?.message || "Error al cargar historial");
      } finally {
        if (activo) setCargando(false);
      }
    })();

    return () => {
      activo = false;
    };
  }, [enabled, params, query, cacheKey]);

  return { cargando, error, data };
}

export function PatternHistoryView({
  patron,
  direccion,
  mercado,
  tz,
  cargando,
  error,
  data,
}: {
  patron: string | null;
  direccion: "V" | "R" | null;
  mercado: string;
  tz: UITimezone;
  cargando: boolean;
  error: string | null;
  data: HistorialResponse | null;
}) {
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const analysis = useMemo(() => {
    const occ = data?.ocurrencias || [];
    if (occ.length === 0) return null;
    const expected = (data?.direccion || direccion || "V") as Side;
    const results = occ.map((o) => o.direccion_resultado as Side);
    return analyzeHistory(results, expected);
  }, [data, direccion]);

  const fmtPct = (value: number) => `${(value * 100).toFixed(2)}%`;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14 }}>
          <div><b>Patrón:</b> {data?.patron || patron || "-"}</div>
          <div><b>Dirección:</b> {data?.direccion || direccion || "-"}</div>
          <div><b>Total de muestras:</b> {data?.total_muestras ?? "-"}</div>
          <div><b>Mercado:</b> {data?.mercado || mercado}</div>
        </div>

        <button
          type="button"
          onClick={() => setAnalysisOpen((v: boolean) => !v)}
          disabled={!analysis}
          title={!analysis ? "Disponible cuando el historial tenga ocurrencias" : undefined}
        >
          Analizar Historial
        </button>
      </div>

      <div style={{ fontSize: 13, opacity: 0.85 }}>
        <b>Rango real de fechas:</b> {formatDateTime(data?.rango_fecha_inicio, tz)} → {formatDateTime(data?.rango_fecha_fin, tz)}
      </div>

      {cargando && <div style={{ opacity: 0.8 }}>Cargando historial...</div>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {analysisOpen && analysis && (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Analizar Historial</div>

          <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <div><b>N muestras:</b> {analysis.n}</div>
            <div><b>Efectividad ({analysis.expectedSide}):</b> {fmtPct(analysis.efectividad)} (IC 95% Wilson: {fmtPct(analysis.ci95.low)} – {fmtPct(analysis.ci95.high)})</div>
            <div><b>Máx racha V:</b> {analysis.maxStreakV} | <b>Máx racha R:</b> {analysis.maxStreakR}</div>
            <div><b>Racha actual:</b> {analysis.currentStreakSide ? `Últimas ${analysis.currentStreakLen}: ${analysis.currentStreakSide}` : "-"}</div>
          </div>

          <div style={{ marginTop: 10, fontSize: 13 }}>
            <b>Condicional por racha actual</b>
            {analysis.currentConditional ? (
              <div style={{ marginTop: 6 }}>
                Históricamente, después de una racha de {analysis.currentConditional.side} de longitud {analysis.currentConditional.k},
                el siguiente fue V: {fmtPct(analysis.currentConditional.pNextV)} / R: {fmtPct(analysis.currentConditional.pNextR)}
                (base: {analysis.currentConditional.base}).
                {analysis.currentConditional.base < 10 && (
                  <span style={{ color: "#fbbf24", marginLeft: 8 }}>Poca evidencia (base menor a 10).</span>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 6, opacity: 0.8 }}>No hay suficiente historial para estimar la condicional de racha actual.</div>
            )}
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Distribución de rachas (k=1..{analysis.distribution.length})</div>
            <div className="tableWrap">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th>k</th>
                    <th>Casos</th>
                    <th>Rupturas</th>
                    <th>% ruptura</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.distribution.map((row) => (
                    <tr key={row.k}>
                      <td>{row.k}</td>
                      <td>{row.casos}</td>
                      <td>{row.rupturas}</td>
                      <td>{fmtPct(row.pctRuptura)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Recencia vs histórico</div>
            <div style={{ fontSize: 13 }}>
              <div><b>Histórico completo:</b> {fmtPct(analysis.all.efectividad)} ({analysis.all.wins}/{analysis.all.n})</div>
              <div><b>Último 25%:</b> {fmtPct(analysis.lastQuarter.efectividad)} ({analysis.lastQuarter.wins}/{analysis.lastQuarter.n})</div>
              <div><b>Delta:</b> {analysis.deltaLastQuarter >= 0 ? "+" : ""}{fmtPct(analysis.deltaLastQuarter)}</div>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.78 }}>
            Nota: Esto no predice el futuro; es un escenario basado en histórico asumiendo que el edge se mantiene.
          </div>
        </div>
      )}

      {!cargando && !error && (
        <div className="tableWrap">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Resultado</th>
                <th>Mercado</th>
              </tr>
            </thead>
            <tbody>
              {(data?.ocurrencias || []).map((o, idx) => {
                const dt = formatDateTimeParts(`${o.fecha}T${o.hora}Z`, tz);
                return (
                <tr key={`${o.fecha}-${o.hora}-${idx}`}>
                  <td>{dt.date}</td>
                  <td>{dt.time}</td>
                  <td>{o.direccion_resultado}</td>
                  <td>{o.mercado_slug || o.mercado_id || "-"}</td>
                </tr>
                );
              })}

              {(data?.ocurrencias || []).length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 12, opacity: 0.7 }}>
                    No hay ocurrencias del patrón en el rango seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PatternHistoryPanel({
  abierto,
  onCerrar,
  patron,
  direccion,
  mercado,
  intervalo,
  inicio,
  fin,
}: Props) {
  const { tz } = useTimezone();
  const params = useMemo(() => {
    if (!patron || !direccion) return null;
    return { patron, direccion, mercado, intervalo, inicio, fin } as PatternHistoryParams;
  }, [patron, direccion, mercado, intervalo, inicio, fin]);
  const { cargando, error, data } = usePatternHistory(params, abierto && !!params);

  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      title="Historial del patrón"
      subtitle={patron && direccion ? `${patron} → ${direccion}` : "-"}
    >
      <PatternHistoryView
        patron={patron}
        direccion={direccion}
        mercado={mercado}
        tz={tz}
        cargando={cargando}
        error={error}
        data={data}
      />
    </Modal>
  );
}