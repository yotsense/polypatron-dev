"use client";

import React, { useMemo, useState } from "react";
import Controls, { Controles } from "./components/Controls";
import RankTable, { FilaPatron } from "./components/RankTable";
import SimPanel from "./components/SimPanel";
import VipPanel from "./components/VipPanel";
import ComparePanel from "./components/ComparePanel";
import PatternHistoryPanel from "./components/PatternHistoryPanel";
import HistorySearchPanel from "./components/HistorySearchPanel";
import Top3Panel from "./components/Top3Panel";
import TimezoneSelector from "./components/TimezoneSelector";
import { apiBase, postJSON, Intervalo } from "./lib/api";
import { useTimezone } from "./context/TimezoneContext";

function isoAhoraMenosDias(dias: number) {
  const d = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function isoAhora() {
  return new Date().toISOString();
}

export default function Page() {
  const base = apiBase();
  const { label } = useTimezone();

  const [controles, setControles] = useState<Controles>({
    mercadoUI: "BTC",
    mercadoApi: "btc-updown",
    intervalo: "5m",
    inicio: isoAhoraMenosDias(7),
    fin: isoAhora(),
    usarUltimo: false,
    longitudMin: 2,
    longitudMax: 6,
    minMuestras: 20,
    suavizado: 1.0,
  });

  const [filas, setFilas] = useState<FilaPatron[]>([]);
  const [ahoraUtc, setAhoraUtc] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [simAbierto, setSimAbierto] = useState(false);
  const [simPatron, setSimPatron] = useState<string | null>(null);
  const [simDir, setSimDir] = useState<"V" | "R" | null>(null);

  const [compAbierto, setCompAbierto] = useState(false);
  const [compPatron, setCompPatron] = useState<string | null>(null);
  const [compDir, setCompDir] = useState<"V" | "R" | null>(null);

  const [histAbierto, setHistAbierto] = useState(false);
  const [histPatron, setHistPatron] = useState<string | null>(null);
  const [histDir, setHistDir] = useState<"V" | "R" | null>(null);
  const [histGlobalAbierto, setHistGlobalAbierto] = useState(false);

  async function rankear() {
    setCargando(true);
    setError(null);
    try {
      const res = await postJSON<{ filas: FilaPatron[] }>(`${base}/patrones/rankear`, {
        mercado: controles.mercadoApi,
        intervalo: controles.intervalo,
        inicio: controles.inicio,
        fin: controles.fin,
        longitud_min: controles.longitudMin,
        longitud_max: controles.longitudMax,
        min_muestras: controles.minMuestras,
        suavizado: controles.suavizado,
      });
      setFilas(res.filas || []);
      setAhoraUtc(new Date().toISOString());
    } catch (e: any) {
      setError(e?.message || "Error al rankear");
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }

  const header = useMemo(() => {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <h1 className="h1" style={{ color: "red" }}>PolyPatronVIP DEV MODE</h1>
          <div className="small">Analiza patrones V/R en mercados binarios (histórico + simulación).</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <TimezoneSelector />
          <div className="small">TZ activa: {label}</div>
          <div className="small">API: {base}</div>
        </div>
      </div>
    );
  }, [base, label]);

  function onSimular(patron: string, direccion: "V" | "R") {
    console.log("[Ranking] click Simular", { patron, direccion });
    setSimPatron(patron);
    setSimDir(direccion);
    setSimAbierto(true);
  }

  function onElegirParaComparar(patron: string, direccion: "V" | "R") {
    console.log("[Ranking] click Usar en comparar", { patron, direccion });
    setCompPatron(patron);
    setCompDir(direccion);
    setCompAbierto(true);
  }

  return (
    <div className="container">
      {header}

      <div style={{ marginTop: 14 }}>
        <Controls
          value={controles}
          onChange={setControles}
          onRankear={rankear}
          onComparar={() => setCompAbierto(true)}
          onVerHistorial={() => setHistGlobalAbierto(!histGlobalAbierto)}
          cargando={cargando}
        />
      </div>

      {histGlobalAbierto && (
        <HistorySearchPanel
          mercado={controles.mercadoApi}
          intervalo={controles.intervalo as Intervalo}
          inicio={controles.inicio}
          fin={controles.fin}
          patronInicial={histPatron}
          direccionInicial={histDir}
        />
      )}

      <Top3Panel controles={controles} setFilas={setFilas} setError={setError} setCargando={setCargando} />
      <VipPanel controles={controles} setFilas={setFilas} setError={setError} setCargando={setCargando} />

      {error && <div style={{ marginTop: 10, color: "crimson" }}>{error}</div>}

      <div style={{ marginTop: 14 }}>
        <RankTable
          filas={filas}
          ahoraUtc={ahoraUtc}
          onSimular={onSimular}
          onElegirParaComparar={onElegirParaComparar}
          onVerHistorial={(p, d) => {
            setHistPatron(p);
            setHistDir(d);
            setHistAbierto(true);
          }}
        />
      </div>

      <SimPanel
        abierto={simAbierto}
        onCerrar={() => setSimAbierto(false)}
        mercadoApi={controles.mercadoApi}
        intervalo={controles.intervalo as Intervalo}
        inicio={controles.inicio}
        fin={controles.fin}
        patron={simPatron}
        direccion={simDir}
      />

      <ComparePanel
        abierto={compAbierto}
        onCerrar={() => setCompAbierto(false)}
        mercadoApi={controles.mercadoApi}
        intervalo={controles.intervalo as Intervalo}
        inicio={controles.inicio}
        fin={controles.fin}
        patronInicial={compPatron}
        direccionInicial={compDir}
      />

      <PatternHistoryPanel
        abierto={histAbierto}
        onCerrar={() => setHistAbierto(false)}
        patron={histPatron}
        direccion={histDir}
        mercado={controles.mercadoApi}
        intervalo={controles.intervalo as Intervalo}
        inicio={controles.inicio}
        fin={controles.fin}
      />

      <div style={{ marginTop: 22, fontSize: 12, opacity: 0.7 }}>
        Nota: Este programa analiza histórico. No da señales en vivo ni garantiza resultados futuros.
      </div>
    </div>
  );
}
