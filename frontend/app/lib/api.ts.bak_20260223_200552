export type Intervalo = "5m" | "15m" | "1h" | "4h";

export function apiBase() {
  // Siempre pegamos al proxy del mismo sitio (evita CORS y nombres internos de Docker)
  return "/api";
}

export async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    const msg = await r.text();
    throw new Error(msg || `Error HTTP ${r.status}`);
  }
  return (await r.json()) as T;
}

export async function postJSON<T>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const msg = await r.text();
    throw new Error(msg || `Error HTTP ${r.status}`);
  }
  return (await r.json()) as T;
}
