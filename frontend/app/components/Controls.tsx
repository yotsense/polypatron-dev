"use client";

import React from "react";
import { Intervalo, apiBase, getJSON } from "../lib/api";

export type Controles = {
  mercadoUI: "BTC";
  mercadoApi: string; // "btc-updown"
  intervalo: Intervalo;
  inicio: string; // ISO con offset (ej. 2026-02-19T10:30:00-06:00)
  fin: string; // ISO con offset
  usarUltimo: boolean;

  longitudMin: number;
  longitudMax: number;
  minMuestras: number;
  suavizado: number;
};

type Props = {
  value: Controles;
  onChange: (v: Controles) => void;
  onRankear: () => void;
  onComparar: () => void;
  onVerHistorial: () => void;
  cargando?: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISOWithOffsetFromLocalInput(v: string) {
  const d = new Date(v);
  const offsetMin = d.getTimezoneOffset();
  const sign = offsetMin <= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offH = pad(Math.floor(abs / 60));
  const offM = pad(abs % 60);
  return `${v}:00${sign}${offH}:${offM}`;
}

function toLocalInputFromISO(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function Controls({ value, onChange, onRankear, onComparar, onVerHistorial, cargando }: Props) {
  const set = (patch: Partial<Controles>) => onChange({ ...value, ...patch });

  async function usarUltimoMercado() {
    const base = apiBase();
    const data = await getJSON<{ fin_ts_utc: string | null }>(
      `${base}/velas/ultima?mercado=${encodeURIComponent(value.mercadoApi)}&intervalo=${encodeURIComponent(value.intervalo)}`
    );
    if (data.fin_ts_utc) {
      set({ fin: new Date(data.fin_ts_utc).toISOString(), usarUltimo: true });
    }
  }

  return (
    <div className="card">
      <div className="cardBody">
        <div className="grid grid2">
          <div>
            <label>Mercado</label>
            <select value={value.mercadoUI} onChange={() => set({ mercadoUI: "BTC", mercadoApi: "btc-updown" })}>
              <option value="BTC">BTC (Up/Down)</option>
            </select>
          </div>

          <div>
            <label>Intervalo</label>
            <select
              value={value.intervalo}
              onChange={(e) => {
                const intervalo = e.target.value as Intervalo;
                set({ intervalo });
              }}
            >
              <option value="5m">5 minutos</option>
              <option value="15m">15 minutos</option>
              <option value="1h">1 hora (UI)</option>
              <option value="4h">4 horas (UI)</option>
            </select>
            <div className="small" style={{ marginTop: 6 }}>
              (1h y 4h se muestran en la interfaz para futuro; hoy pueden no tener datos cargados)
            </div>
          </div>

          <div>
            <label>Inicio (hora CDMX)</label>
            <input
              type="datetime-local"
              value={toLocalInputFromISO(value.inicio)}
              onChange={(e) => set({ inicio: toISOWithOffsetFromLocalInput(e.target.value), usarUltimo: false })}
            />
          </div>

          <div>
            <label>Fin (hora CDMX)</label>
            <input
              type="datetime-local"
              disabled={value.usarUltimo}
              value={toLocalInputFromISO(value.fin)}
              onChange={(e) => set({ fin: toISOWithOffsetFromLocalInput(e.target.value), usarUltimo: false })}
              style={{ opacity: value.usarUltimo ? 0.6 : 1 }}
            />

            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, color: "var(--text)" }}>
              <input
                type="checkbox"
                checked={value.usarUltimo}
                onChange={async (e) => {
                  if (e.target.checked) await usarUltimoMercado();
                  else set({ usarUltimo: false });
                }}
              />
              Usar último mercado disponible (según lo registrado)
            </label>

            <button type="button" onClick={usarUltimoMercado} style={{ marginTop: 10 }}>
              Buscar último mercado
            </button>
          </div>

          <div>
            <label>Longitud mínima del patrón</label>
            <input
              type="number"
              min={2}
              max={12}
              value={value.longitudMin}
              onChange={(e) => {
                const longitudMin = Number(e.target.value);
                const longitudMax = Math.max(value.longitudMax, longitudMin);
                set({ longitudMin, longitudMax });
              }}
            />
          </div>

          <div>
            <label>Longitud máxima del patrón</label>
            <input
              type="number"
              min={2}
              max={12}
              value={value.longitudMax}
              onChange={(e) => {
                const longitudMax = Number(e.target.value);
                const longitudMin = Math.min(value.longitudMin, longitudMax);
                set({ longitudMin, longitudMax });
              }}
            />
          </div>

          <div>
            <label>Mínimo de muestras</label>
            <input
              type="number"
              min={1}
              value={value.minMuestras}
              onChange={(e) => set({ minMuestras: Number(e.target.value) })}
            />
          </div>

          <div>
            <label>Suavizado (evita engaños con pocas muestras)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={value.suavizado}
              onChange={(e) => set({ suavizado: Number(e.target.value) })}
            />
            <div className="small" style={{ marginTop: 6 }}>
              Más alto = resultados más “conservadores” cuando hay pocas muestras.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={onRankear} disabled={!!cargando} className="btnPrimary">
            {cargando ? "Cargando..." : "Rankear patrones"}
          </button>

          <button type="button" onClick={onComparar}>
            Comparar
          </button>

          <button type="button" onClick={onVerHistorial}>
            Ver historial
          </button>
        </div>
      </div>
    </div>
  );
}
