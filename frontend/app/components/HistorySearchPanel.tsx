"use client";

import React, { useEffect, useMemo, useState } from "react";
import { compararRango, Direccion, Intervalo } from "../lib/api";
import { useTimezone } from "../context/TimezoneContext";
import {
  PatternHistoryParams,
  PatternHistoryView,
  usePatternHistory,
} from "./PatternHistoryPanel";

type Props = {
  mercado: string;
  intervalo: Intervalo;
  inicio: string;
  fin: string;
  patronInicial?: string | null;
  direccionInicial?: Direccion | null;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInput(v: string) {
  return new Date(v).toISOString();
}

export default function HistorySearchPanel({
  mercado,
  intervalo,
  inicio,
  fin,
  patronInicial,
  direccionInicial,
}: Props) {
  const { tz } = useTimezone();
  const [patron, setPatron] = useState((patronInicial || "").toUpperCase());
  const [direccion, setDireccion] = useState<"AUTO" | Direccion>(direccionInicial || "AUTO");
  const [mercadoSel, setMercadoSel] = useState(mercado);
  const [intervaloSel, setIntervaloSel] = useState<Intervalo>(intervalo);
  const [inicioLocal, setInicioLocal] = useState(toLocalInput(inicio));
  const [finLocal, setFinLocal] = useState(toLocalInput(fin));
  const [resolviendoAuto, setResolviendoAuto] = useState(false);

  const [submittedParams, setSubmittedParams] = useState<PatternHistoryParams | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (patronInicial) setPatron(patronInicial.toUpperCase());
  }, [patronInicial]);

  useEffect(() => {
    if (direccionInicial) setDireccion(direccionInicial);
  }, [direccionInicial]);

  useEffect(() => {
    setInicioLocal(toLocalInput(inicio));
    setFinLocal(toLocalInput(fin));
  }, [inicio, fin]);

  useEffect(() => {
    setMercadoSel(mercado);
  }, [mercado]);

  useEffect(() => {
    setIntervaloSel(intervalo);
  }, [intervalo]);

  const queryEnabled = !!submittedParams;
  const { cargando, error, data } = usePatternHistory(submittedParams, queryEnabled);

  const effectiveDireccion = useMemo(() => {
    if (direccion === "AUTO") {
      if (direccionInicial) return direccionInicial;
      if (data?.direccion) return data.direccion;
      return null;
    }
    return direccion;
  }, [direccion, direccionInicial, data]);

  function validarPatron(basePatron: string) {
    const ok = !!basePatron && basePatron.length >= 2 && /^([VR]+)$/i.test(basePatron);
    if (!ok) throw new Error("Patrón inválido. Usa solo V/R y longitud >= 2.");
  }

  async function onBuscarHistorial() {
    try {
      setLocalError(null);
      validarPatron(patron);
      if (!inicioLocal || !finLocal) {
        throw new Error("Define inicio y fin para consultar historial.");
      }

      const ini = fromLocalInput(inicioLocal);
      const fn = fromLocalInput(finLocal);
      let dir = effectiveDireccion;

      if (!dir) {
        setResolviendoAuto(true);
        const auto = await compararRango({
          mercado: mercadoSel,
          intervalo: intervaloSel,
          inicio: ini,
          fin: fn,
          patron: patron.toUpperCase(),
        });
        dir = auto.direccion;
      }

      setSubmittedParams({
        patron: patron.toUpperCase(),
        direccion: dir,
        mercado: mercadoSel,
        intervalo: intervaloSel,
        inicio: ini,
        fin: fn,
      });
    } catch (e: any) {
      setLocalError(e?.message || "No se pudo preparar la búsqueda de historial");
      setSubmittedParams(null);
    } finally {
      setResolviendoAuto(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="cardHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div><b>Historial del patrón</b></div>
      </div>

      <div className="cardBody" style={{ display: "grid", gap: 12 }}>
        <div className="grid grid3">
          <div>
            <label>Patrón</label>
            <input value={patron} onChange={(e) => setPatron(e.target.value.toUpperCase())} placeholder="Ej: VVRR" />
          </div>
          <div>
            <label>Dirección</label>
            <select value={direccion} onChange={(e) => setDireccion(e.target.value as any)}>
              <option value="AUTO">Automática</option>
              <option value="V">V</option>
              <option value="R">R</option>
            </select>
          </div>
          <div>
            <label>Mercado</label>
            <select value={mercadoSel} onChange={(e) => setMercadoSel(e.target.value)}>
              <option value="btc-updown">btc-updown</option>
              {mercadoSel !== "btc-updown" && <option value={mercadoSel}>{mercadoSel}</option>}
            </select>
          </div>
        </div>

        <div className="grid grid3">
          <div>
            <label>Intervalo</label>
            <select value={intervaloSel} onChange={(e) => setIntervaloSel(e.target.value as Intervalo)}>
              <option value="5m">5 minutos</option>
              <option value="15m">15 minutos</option>
              <option value="1h">1 hora (UI)</option>
              <option value="4h">4 horas (UI)</option>
            </select>
          </div>
          <div>
            <label>Inicio</label>
            <input type="datetime-local" value={inicioLocal} onChange={(e) => setInicioLocal(e.target.value)} />
          </div>
          <div>
            <label>Fin</label>
            <input type="datetime-local" value={finLocal} onChange={(e) => setFinLocal(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btnPrimary" onClick={onBuscarHistorial} disabled={cargando || resolviendoAuto}>
            {resolviendoAuto ? "Resolviendo dirección..." : cargando ? "Cargando historial..." : "Ver historial"}
          </button>
        </div>

        {!submittedParams && !localError && (
          <div style={{ fontSize: 13, opacity: 0.8 }}>Completa los filtros y presiona "Ver historial" para cargar datos.</div>
        )}

        {localError && <div style={{ color: "crimson" }}>{localError}</div>}

        {submittedParams && (
          <PatternHistoryView
            patron={submittedParams.patron}
            direccion={submittedParams.direccion}
            mercado={submittedParams.mercado}
            tz={tz}
            cargando={cargando}
            error={error}
            data={data}
          />
        )}
      </div>
    </div>
  );
}
