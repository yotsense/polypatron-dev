import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PolyPatron",
  description: "Analizador histórico de patrones para mercados binarios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
