import React from "react";

type Intervalo = "1h" | "15m" | "5m";

type Props = {
  abierto: boolean;
  onCerrar: () => void;

  mercadoApi: string;
  intervalo: Intervalo;
  fin: string;

  patronInicial: string | null;
  direccionInicial: "V" | "R" | null;
};

export default function ComparePanel({
  abierto,
  onCerrar,
  mercadoApi,
  intervalo,
  fin,
  patronInicial,
  direccionInicial,
}: Props) {
  if (!abierto) return null;

  return (
    <div
      onClick={onCerrar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111",
          padding: 24,
          borderRadius: 12,
          width: "900px",
          maxHeight: "80vh",
          overflow: "auto",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h2>Comparar patrón</h2>

        <p><strong>Mercado:</strong> BTC Up/Down {intervalo}</p>
        <p><strong>mercadoApi:</strong> {mercadoApi}</p>
        <p><strong>intervalo:</strong> {intervalo}</p>
        <p><strong>fin:</strong> {fin}</p>

        <hr style={{ opacity: 0.2, margin: "14px 0" }} />

        <p><strong>Patrón:</strong> {patronInicial || "-"}</p>
        <p><strong>Dirección:</strong> {direccionInicial || "-"}</p>

        <button onClick={onCerrar} style={{ marginTop: 20 }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
