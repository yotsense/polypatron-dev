"use client";

import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { apiBase, Intervalo } from "../lib/api";

type TradeSim = {
  fin_ts_utc: string;
  patron: string;
  direccion: "V" | "R";
  real: "V" | "R";
  gano: boolean;
  pnl: number;
  banca_despues: number;
};

type ResSimular = {
  banca0: number;
  banca_fin: number;
  pnl_total: number;
  roi: number;
  max_drawdown: number;
  max_racha_perdidas: number;
  max_racha_ganadas: number;
  trades: TradeSim[];
};

function fmtPct(x: number) {
  return (x * 100).toFixed(2) + "%";
}
function fmtNum(x: number) {
  return Number(x).toFixed(2);
}
function fmtLocal(isoOrUtcNaive: string) {
  const s = isoOrUtcNaive;
  const hasTZ = /Z$|[+-]\d\d:\d\d$/.test(s);
  const d = new Date(hasTZ ? s : s + "Z");
  return d.toLocaleString();
}

export default function SimPanel(props: {
  abierto: boolean;
  onCerrar: () => void;

  mercadoLabel: string;
  mercadoApi: string;
  intervalo: Intervalo;
  inicio: string;
  fin: string;

  patron: string | null;
  direccion: "V" | "R" | null;

  banca0?: number;
  stake?: number;
  payout?: number;
  reinvertir?: boolean;
}) {
  const {
    abierto,
    onCerrar,
    mercadoLabel,
    mercadoApi,
    intervalo,
    inicio,
    fin,
    patron,
    direccion,
  } = props;

  const banca0 = props.banca0 ?? 1000;
  const stake = props.stake ?? 10;
  const payout = props.payout ?? 0.85;
  const reinvertir = props.reinvertir ?? true;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ResSimular | null>(null);

  const puedeSimular = useMemo(() => {
    return !!(patron && patron.length >= 2 && direccion && abierto);
  }, [patron, direccion, abierto]);

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

  async function correr() {
    if (!patron || !direccion) return;
    setLoading(true);
    setErr(null);
    setData(null);

    try {
      const base = apiBase(); // normalmente "/api"
      const url = `${base}/simular`;

      const body = {
        mercado: mercadoApi,
        intervalo,
        inicio,
        fin,
        patron,
        direccion,
        banca0,
        stake,
        payout,
        reinvertir,
      };

      const res = await postJSON<ResSimular>(url, body);
      setData(res);
    } catch (e: any) {
      setErr(e?.message || "Error al simular");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!puedeSimular) return;
    correr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, patron, direccion, mercadoApi, intervalo, inicio, fin]);

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Simulación">
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <div><b>Mercado:</b> {mercadoLabel}</div>
          <div><b>Patrón:</b> {patron || "-"}</div>
          <div><b>Dirección:</b> {direccion || "-"}</div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            Rango: {new Date(inicio).toLocaleString()} → {new Date(fin).toLocaleString()}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btnPrimary" onClick={correr} disabled={!patron || !direccion || loading}>
            {loading ? "Simulando..." : "Simular ahora"}
          </button>
          <button onClick={onCerrar}>Cerrar</button>
          {err && <div style={{ color: "crimson" }}>{err}</div>}
        </div>

        {data && (
          <div style={{ display: "grid", gap: 10 }}>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div><b>Banca inicial:</b> {fmtNum(data.banca0)}</div>
                <div><b>Banca final:</b> {fmtNum(data.banca_fin)}</div>
                <div><b>PNL total:</b> {fmtNum(data.pnl_total)}</div>
                <div><b>ROI:</b> {fmtPct(data.roi)}</div>
                <div><b>Max drawdown:</b> {fmtNum(data.max_drawdown)}</div>
                <div><b>Max racha ganadas:</b> {data.max_racha_ganadas}</div>
                <div><b>Max racha perdidas:</b> {data.max_racha_perdidas}</div>
                <div><b>Trades:</b> {data.trades?.length ?? 0}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Trades (últimos 60)</div>
              <div style={{ maxHeight: 360, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.9 }}>
                      <th style={{ padding: "6px 8px" }}>Cierre</th>
                      <th style={{ padding: "6px 8px" }}>Real</th>
                      <th style={{ padding: "6px 8px" }}>Gana</th>
                      <th style={{ padding: "6px 8px" }}>PNL</th>
                      <th style={{ padding: "6px 8px" }}>Banca</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.trades || []).slice(-60).reverse().map((t, i) => (
                      <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <td style={{ padding: "6px 8px" }}>{fmtLocal(t.fin_ts_utc)}</td>
                        <td style={{ padding: "6px 8px" }}>{t.real}</td>
                        <td style={{ padding: "6px 8px" }}>{t.gano ? "✅" : "❌"}</td>
                        <td style={{ padding: "6px 8px" }}>{fmtNum(t.pnl)}</td>
                        <td style={{ padding: "6px 8px" }}>{fmtNum(t.banca_despues)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>
                Mostrando últimos 60 para mantener rápido el modal.
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
