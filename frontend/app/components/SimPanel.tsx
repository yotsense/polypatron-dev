"use client";

import React, { useMemo, useState } from "react";
import Modal from "./Modal";
import { Intervalo, simular, SimularRes } from "../lib/api";
import { useTimezone } from "../context/TimezoneContext";
import { formatDateTime } from "../lib/datetime";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  mercadoApi: string;
  intervalo: Intervalo;
  inicio: string;
  fin: string;
  patron: string | null;
  direccion: "V" | "R" | null;
};

function fmtPct(x?: number | null) {
  if (x == null) return "-";
  return `${(x * 100).toFixed(2)}%`;
}

function fmtNum(x?: number | null) {
  if (x == null) return "-";
  return Number(x).toFixed(2);
}

export default function SimPanel({
  abierto,
  onCerrar,
  mercadoApi,
  intervalo,
  inicio,
  fin,
  patron,
  direccion,
}: Props) {
  const { tz } = useTimezone();
  const [banca0, setBanca0] = useState(1000);
  const [stake, setStake] = useState(10);
  const [payout, setPayout] = useState(0.85);
  const [reinvertir, setReinvertir] = useState(true);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SimularRes | null>(null);

  const header = useMemo(() => {
    return patron && direccion
      ? `Patrón: ${patron} | Dir: ${direccion}`
      : "Selecciona patrón y dirección desde el ranking";
  }, [patron, direccion]);

  async function correrSimulacion() {
    console.log("[SimPanel] click correr", { patron, direccion, mercadoApi, intervalo, inicio, fin });

    if (!patron || !direccion) {
      setErr("Falta patrón o dirección. Selecciónalo desde el ranking.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await simular({
        mercado: mercadoApi,
        intervalo,
        inicio,
        fin,
        patron,
        direccion,
        banca0: Number(banca0),
        stake: Number(stake),
        payout: Number(payout),
        reinvertir,
      });
      setData(res);
    } catch (e: any) {
      setErr(e?.message || "Error al simular");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      title="Simulación"
      subtitle={header}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Mercado: <b>{mercadoApi}</b> | Intervalo: <b>{intervalo}</b>
          <div>Rango: {formatDateTime(inicio, tz)} → {formatDateTime(fin, tz)}</div>
        </div>

        <div className="grid grid2">
          <div>
            <label>Banca inicial</label>
            <input type="number" min={1} step={1} value={banca0} onChange={(e) => setBanca0(Number(e.target.value))} />
          </div>
          <div>
            <label>Stake por entrada</label>
            <input type="number" min={0.01} step={0.01} value={stake} onChange={(e) => setStake(Number(e.target.value))} />
          </div>
          <div>
            <label>Payout</label>
            <input type="number" min={0} max={2} step={0.01} value={payout} onChange={(e) => setPayout(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 24 }}>
              <input type="checkbox" checked={reinvertir} onChange={(e) => setReinvertir(e.target.checked)} />
              Reinvertir
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btnPrimary" onClick={correrSimulacion} disabled={loading}>
            {loading ? "Corriendo..." : "Correr simulación"}
          </button>
          {err && <div style={{ color: "crimson" }}>{err}</div>}
        </div>

        {data && (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div><b>Banca final:</b> {fmtNum(data.banca_fin)}</div>
              <div><b>PnL:</b> {fmtNum(data.pnl_total)}</div>
              <div><b>ROI %:</b> {fmtPct(data.roi)}</div>
              <div><b>Max drawdown:</b> {fmtNum(data.max_drawdown)}</div>
              <div>
                <b>Resumen:</b> Trades {data.trades?.length ?? 0} | Máx racha pérdidas {data.max_racha_perdidas} | Máx racha ganadas {data.max_racha_ganadas}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
