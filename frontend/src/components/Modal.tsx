import React, { useEffect } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, title, subtitle, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: "min(1100px, 98vw)",
          maxHeight: "92vh",
          background: "#0b0b0b",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              {title && <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>}
              {subtitle && <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{subtitle}</div>}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "white",
                borderRadius: 10,
                padding: "6px 10px",
                cursor: "pointer",
              }}
              aria-label="Cerrar"
            >
              Cerrar ✕
            </button>
          </div>
        </div>

        <div style={{ padding: 16, overflow: "auto", maxHeight: "calc(92vh - 64px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
