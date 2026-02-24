"use client";

import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import {
  Intervalo,
  Direccion,
  compararVentanas,
  CompararVentanasRes,
  compararRango,
  CompararRangoRes,
  compararAVsB,
  CompararAVsBRes,
  compararPatronesVs,
  CompararPatronesVsRes,
} from "../lib/api";
import {
  PatternHistoryParams,
  PatternHistoryView,
  usePatternHistory,
} from "./PatternHistoryPanel";
import { useTimezone } from "../context/TimezoneContext";
import { formatDateTime } from "../lib/datetime";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  mercadoApi: string;
  intervalo: Intervalo;
  inicio: string;
  fin: string;
  patronInicial: string | null;
  direccionInicial: Direccion | null;
};

type ModoAB = "dia" | "rango";

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

function fmtPct(v?: number | null) {
  return v == null ? "-" : `${(v * 100).toFixed(2)}%`;
}

export default function ComparePanel({
  abierto,
  onCerrar,
  mercadoApi,
  intervalo,
  inicio,
  fin,
  patronInicial,
  direccionInicial,
}: Props) {
  const { tz } = useTimezone();
  const [patron, setPatron] = useState("");
  const [direccion, setDireccion] = useState<"AUTO" | Direccion>("AUTO");

  const [ventanasTxt, setVentanasTxt] = useState("1,2,3,7,15,30");
  const [loadingVentanas, setLoadingVentanas] = useState(false);
  const [resVentanas, setResVentanas] = useState<CompararVentanasRes | null>(null);

  const [rangoInicio, setRangoInicio] = useState("");
  const [rangoFin, setRangoFin] = useState("");
  const [loadingRango, setLoadingRango] = useState(false);
  const [resRango, setResRango] = useState<CompararRangoRes | null>(null);

  const [modoAB, setModoAB] = useState<ModoAB>("dia");
  const [aInicio, setAInicio] = useState("");
  const [aFin, setAFin] = useState("");
  const [bInicio, setBInicio] = useState("");
  const [bFin, setBFin] = useState("");
  const [loadingAB, setLoadingAB] = useState(false);
  const [resAB, setResAB] = useState<CompararAVsBRes | null>(null);

  const [patronA, setPatronA] = useState("");
  const [dirA, setDirA] = useState<"AUTO" | Direccion>("AUTO");
  const [patronB, setPatronB] = useState("");
  const [dirB, setDirB] = useState<"AUTO" | Direccion>("AUTO");
  const [loadingPvP, setLoadingPvP] = useState(false);
  const [resPvP, setResPvP] = useState<CompararPatronesVsRes | null>(null);

  const [historialVisible, setHistorialVisible] = useState(false);
  const [historialDisponible, setHistorialDisponible] = useState(false);
  const [historialParams, setHistorialParams] = useState<PatternHistoryParams | null>(null);
  const { cargando: historialLoading, error: historialError, data: historialData } = usePatternHistory(
    historialParams,
    !!historialParams
  );

  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    const p = patronInicial || "";
    setPatron(p);
    setDireccion(direccionInicial || "AUTO");

    setPatronA(p);
    setDirA(direccionInicial || "AUTO");
    setPatronB("");
    setDirB("AUTO");

    const ini = toLocalInput(inicio);
    const fn = toLocalInput(fin);
    setRangoInicio(ini);
    setRangoFin(fn);
    setAInicio(ini);
    setAFin(ini);
    setBInicio(fn);
    setBFin(fn);

    setErr(null);
    setResVentanas(null);
    setResRango(null);
    setResAB(null);
    setResPvP(null);
    setHistorialVisible(false);
    setHistorialDisponible(false);
    setHistorialParams(null);
  }, [abierto, patronInicial, direccionInicial, inicio, fin]);

  const dirPayload = useMemo(() => (direccion === "AUTO" ? undefined : direccion), [direccion]);

  function validarPatron(basePatron: string) {
    const ok = !!basePatron && basePatron.length >= 2 && /^([VR]+)$/i.test(basePatron);
    if (!ok) throw new Error("Patrón inválido. Usa solo V/R y longitud >= 2.");
  }

  function parseVentanas() {
    return ventanasTxt
      .split(",")
      .map((x: string) => Number(x.trim()))
      .filter((x: number) => Number.isFinite(x) && x > 0);
  }

  function calcularInicioDesdeVentana(finIso: string, ventanas: number[]) {
    const maxDias = Math.max(...ventanas);
    const end = new Date(finIso).getTime();
    return new Date(end - maxDias * 24 * 60 * 60 * 1000).toISOString();
  }

  async function onCompararVentanas() {
    console.log("[ComparePanel] comparar ventanas", { patron, direccion });
    setErr(null);
    setLoadingVentanas(true);
    try {
      validarPatron(patron);
      const ventanas = parseVentanas();
      if (ventanas.length === 0) throw new Error("Define al menos una ventana válida.");

      const res = await compararVentanas({
        mercado: mercadoApi,
        intervalo,
        fin,
        patron: patron.toUpperCase(),
        direccion: dirPayload,
        ventanas_dias: ventanas,
      });
      setResVentanas(res);
      setHistorialParams({
        patron: patron.toUpperCase(),
        direccion: res.direccion,
        mercado: mercadoApi,
        intervalo,
        inicio: calcularInicioDesdeVentana(fin, ventanas),
        fin,
      });
      setHistorialDisponible(true);
      setHistorialVisible(true);
    } catch (e: any) {
      setErr(e?.message || "Error al comparar por periodos");
    } finally {
      setLoadingVentanas(false);
    }
  }

  async function onCompararRango() {
    console.log("[ComparePanel] comparar rango", { patron, direccion, rangoInicio, rangoFin });
    setErr(null);
    setLoadingRango(true);
    try {
      validarPatron(patron);
      const ini = fromLocalInput(rangoInicio);
      const fn = fromLocalInput(rangoFin);
      const res = await compararRango({
        mercado: mercadoApi,
        intervalo,
        inicio: ini,
        fin: fn,
        patron: patron.toUpperCase(),
        direccion: dirPayload,
      });
      setResRango(res);
    } catch (e: any) {
      setErr(e?.message || "Error al comparar rango");
    } finally {
      setLoadingRango(false);
    }
  }

  async function onCompararAB() {
    console.log("[ComparePanel] comparar A vs B", { patron, direccion, modoAB });
    setErr(null);
    setLoadingAB(true);
    try {
      validateAB();
      const res = await compararAVsB({
        mercado: mercadoApi,
        intervalo,
        patron: patron.toUpperCase(),
        direccion: dirPayload,
        a_inicio: fromLocalInput(aInicio),
        a_fin: fromLocalInput(aFin),
        b_inicio: fromLocalInput(bInicio),
        b_fin: fromLocalInput(bFin),
      });
      setResAB(res);
    } catch (e: any) {
      setErr(e?.message || "Error al comparar A vs B");
    } finally {
      setLoadingAB(false);
    }
  }

  async function onCompararPvP() {
    console.log("[ComparePanel] patron vs patron", { patronA, dirA, patronB, dirB });
    setErr(null);
    setLoadingPvP(true);
    try {
      validarPatron(patronA);
      validarPatron(patronB);
      const res = await compararPatronesVs({
        mercado: mercadoApi,
        intervalo,
        inicio: fromLocalInput(rangoInicio),
        fin: fromLocalInput(rangoFin),
        patron_a: patronA.toUpperCase(),
        direccion_a: dirA === "AUTO" ? undefined : dirA,
        patron_b: patronB.toUpperCase(),
        direccion_b: dirB === "AUTO" ? undefined : dirB,
      });
      setResPvP(res);
    } catch (e: any) {
      setErr(e?.message || "Error en patrón vs patrón");
    } finally {
      setLoadingPvP(false);
    }
  }

  function validateAB() {
    validarPatron(patron);
    if (!aInicio || !aFin || !bInicio || !bFin) {
      throw new Error("Completa los rangos A y B.");
    }
    if (modoAB === "dia") {
      setAFin(aInicio);
      setBFin(bInicio);
    }
  }

  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      title="Comparar patrón"
      subtitle={patron ? `Patrón: ${patron} | Dir: ${direccion}` : "Selecciona patrón desde ranking"}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Mercado: <b>{mercadoApi}</b> | Intervalo: <b>{intervalo}</b>
        </div>

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
          <div style={{ alignSelf: "end" }}>
            <button className="btnPrimary" onClick={onCompararVentanas} disabled={loadingVentanas}>
              {loadingVentanas ? "Comparando..." : "Comparar ahora"}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>Comparar por periodos</div>
            <button
              type="button"
              onClick={() => {
                if (!historialDisponible) return;
                setHistorialVisible((v: boolean) => !v);
              }}
              disabled={!historialDisponible}
            >
              Ver historial
            </button>
          </div>
          <div className="grid grid2">
            <div>
              <label>Ventanas (días)</label>
              <input value={ventanasTxt} onChange={(e) => setVentanasTxt(e.target.value)} />
            </div>
            <div style={{ alignSelf: "end" }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Ejemplo: 1,2,3,7,15,30</div>
            </div>
          </div>

          {resVentanas && (
            <>
              <div style={{ marginTop: 8, fontSize: 13 }}><b>Tendencia:</b> {resVentanas.tendencia}</div>
              <div className="tableWrap" style={{ marginTop: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th>Periodo</th><th>Efectividad</th><th>Muestras</th><th>V</th><th>R</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resVentanas.filas.map((f, i) => (
                      <tr key={i}>
                        <td>{f.dias} días</td>
                        <td>{fmtPct(f.efectividad ?? null)}</td>
                        <td>{f.muestras}</td>
                        <td>{f.verdes}</td>
                        <td>{f.rojas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {historialVisible && historialParams && (
            <div className="card" style={{ marginTop: 10, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Historial del patrón</div>
              <PatternHistoryView
                patron={historialParams.patron}
                direccion={historialParams.direccion}
                mercado={historialParams.mercado}
                tz={tz}
                cargando={historialLoading}
                error={historialError}
                data={historialData}
              />
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Comparar por rango de fechas</div>
          <div className="grid grid3">
            <div>
              <label>Fecha inicio</label>
              <input type="datetime-local" value={rangoInicio} onChange={(e) => setRangoInicio(e.target.value)} />
            </div>
            <div>
              <label>Fecha fin</label>
              <input type="datetime-local" value={rangoFin} onChange={(e) => setRangoFin(e.target.value)} />
            </div>
            <div style={{ alignSelf: "end" }}>
              <button onClick={onCompararRango} disabled={loadingRango}>{loadingRango ? "Comparando..." : "Comparar rango"}</button>
            </div>
          </div>

          {resRango && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <div><b>Rango real usado:</b> {formatDateTime(resRango.inicio, tz)} → {formatDateTime(resRango.fin, tz)}</div>
              <div><b>Efectividad:</b> {fmtPct(resRango.efectividad ?? null)} | <b>Muestras:</b> {resRango.muestras} | <b>V:</b> {resRango.verdes} | <b>R:</b> {resRango.rojas}</div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Comparación A vs B</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button className={modoAB === "dia" ? "btnPrimary" : ""} onClick={() => setModoAB("dia")}>Día vs Día</button>
            <button className={modoAB === "rango" ? "btnPrimary" : ""} onClick={() => setModoAB("rango")}>Rango vs Rango</button>
          </div>
          <div className="grid grid2">
            <div>
              <label>A inicio</label>
              <input type="datetime-local" value={aInicio} onChange={(e) => setAInicio(e.target.value)} />
              <label>A fin</label>
              <input type="datetime-local" value={aFin} onChange={(e) => setAFin(e.target.value)} disabled={modoAB === "dia"} />
            </div>
            <div>
              <label>B inicio</label>
              <input type="datetime-local" value={bInicio} onChange={(e) => setBInicio(e.target.value)} />
              <label>B fin</label>
              <input type="datetime-local" value={bFin} onChange={(e) => setBFin(e.target.value)} disabled={modoAB === "dia"} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={onCompararAB} disabled={loadingAB}>{loadingAB ? "Comparando..." : "Comparar A vs B"}</button>
          </div>

          {resAB && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <div><b>A:</b> {fmtPct(resAB.a.efectividad ?? null)} | Muestras {resAB.a.muestras} | V {resAB.a.verdes} | R {resAB.a.rojas}</div>
              <div><b>B:</b> {fmtPct(resAB.b.efectividad ?? null)} | Muestras {resAB.b.muestras} | V {resAB.b.verdes} | R {resAB.b.rojas}</div>
              <div><b>Delta (A-B):</b> Efectividad {fmtPct(resAB.delta_efectividad ?? null)} | Muestras {resAB.delta_muestras}</div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Patrón A vs Patrón B</div>
          <div className="grid grid2">
            <div>
              <label>Patrón A</label>
              <input value={patronA} onChange={(e) => setPatronA(e.target.value.toUpperCase())} />
              <label>Dirección A</label>
              <select value={dirA} onChange={(e) => setDirA(e.target.value as any)}>
                <option value="AUTO">Automática</option>
                <option value="V">V</option>
                <option value="R">R</option>
              </select>
            </div>
            <div>
              <label>Patrón B</label>
              <input value={patronB} onChange={(e) => setPatronB(e.target.value.toUpperCase())} />
              <label>Dirección B</label>
              <select value={dirB} onChange={(e) => setDirB(e.target.value as any)}>
                <option value="AUTO">Automática</option>
                <option value="V">V</option>
                <option value="R">R</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={onCompararPvP} disabled={loadingPvP}>{loadingPvP ? "Comparando..." : "Comparar patrón vs patrón"}</button>
          </div>

          {resPvP && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <div><b>A ({resPvP.a.patron}):</b> Ef {fmtPct(resPvP.a.efectividad ?? null)} | Muestras {resPvP.a.muestras} | Frecuencia {resPvP.a.aparece_cada_seg ?? "-"}s | Última vez {formatDateTime(resPvP.a.ultima_vez_utc, tz)}</div>
              <div><b>B ({resPvP.b.patron}):</b> Ef {fmtPct(resPvP.b.efectividad ?? null)} | Muestras {resPvP.b.muestras} | Frecuencia {resPvP.b.aparece_cada_seg ?? "-"}s | Última vez {formatDateTime(resPvP.b.ultima_vez_utc, tz)}</div>
              <div><b>Resultado:</b> {resPvP.ganador === "A" ? "Gana A" : resPvP.ganador === "B" ? "Gana B" : "Empate"} | Δ Ef {fmtPct(resPvP.delta_efectividad ?? null)} | Δ Muestras {resPvP.delta_muestras}</div>
            </div>
          )}
        </div>

        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </div>
    </Modal>
  );
}
