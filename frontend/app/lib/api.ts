export type Intervalo = "5m" | "15m" | "1h" | "4h";

export type Direccion = "V" | "R";

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

export type SimularReq = {
  mercado: string;
  intervalo: Intervalo;
  inicio: string;
  fin: string;
  patron: string;
  direccion: Direccion;
  banca0: number;
  stake: number;
  payout: number;
  reinvertir: boolean;
};

export type SimularRes = {
  banca0: number;
  banca_fin: number;
  pnl_total: number;
  roi: number;
  max_drawdown: number;
  max_racha_perdidas: number;
  max_racha_ganadas: number;
  trades: Array<{
    fin_ts_utc: string;
    patron: string;
    direccion: Direccion;
    real: Direccion;
    gano: boolean;
    pnl: number;
    banca_despues: number;
  }>;
};

export type CompararVentanasReq = {
  mercado: string;
  intervalo: Intervalo;
  fin: string;
  patron: string;
  direccion?: Direccion;
  ventanas_dias: number[];
};

export type CompararVentanasRes = {
  patron: string;
  direccion: Direccion;
  tendencia: "ascenso" | "descenso" | "plano";
  filas: Array<{
    dias: number;
    inicio: string;
    fin: string;
    direccion: Direccion;
    efectividad?: number | null;
    muestras: number;
    verdes: number;
    rojas: number;
  }>;
};

export type CompararRangoReq = {
  mercado: string;
  intervalo: Intervalo;
  inicio: string;
  fin: string;
  patron: string;
  direccion?: Direccion;
};

export type CompararRangoRes = {
  mercado: string;
  intervalo: Intervalo;
  patron: string;
  direccion: Direccion;
  inicio: string;
  fin: string;
  efectividad?: number | null;
  muestras: number;
  verdes: number;
  rojas: number;
  aparece_cada_seg?: number | null;
  ultima_vez_utc?: string | null;
};

export type CompararAVsBReq = {
  mercado: string;
  intervalo: Intervalo;
  patron: string;
  direccion?: Direccion;
  a_inicio: string;
  a_fin: string;
  b_inicio: string;
  b_fin: string;
};

export type CompararAVsBRes = {
  mercado: string;
  intervalo: Intervalo;
  patron: string;
  direccion?: Direccion;
  a: CompararRangoRes;
  b: CompararRangoRes;
  delta_efectividad?: number | null;
  delta_muestras: number;
};

export type CompararPatronesVsReq = {
  mercado: string;
  intervalo: Intervalo;
  inicio: string;
  fin: string;
  patron_a: string;
  direccion_a?: Direccion;
  patron_b: string;
  direccion_b?: Direccion;
};

export type CompararPatronesVsRes = {
  mercado: string;
  intervalo: Intervalo;
  a: {
    patron: string;
    direccion: Direccion;
    inicio: string;
    fin: string;
    efectividad?: number | null;
    muestras: number;
    verdes: number;
    rojas: number;
    aparece_cada_seg?: number | null;
    ultima_vez_utc?: string | null;
  };
  b: {
    patron: string;
    direccion: Direccion;
    inicio: string;
    fin: string;
    efectividad?: number | null;
    muestras: number;
    verdes: number;
    rojas: number;
    aparece_cada_seg?: number | null;
    ultima_vez_utc?: string | null;
  };
  delta_efectividad?: number | null;
  delta_muestras: number;
  ganador: "A" | "B" | "empate";
};

export function simular(req: SimularReq) {
  return postJSON<SimularRes>(`${apiBase()}/simular`, req);
}

export function compararVentanas(req: CompararVentanasReq) {
  return postJSON<CompararVentanasRes>(`${apiBase()}/comparar/ventanas`, req);
}

export function compararRango(req: CompararRangoReq) {
  return postJSON<CompararRangoRes>(`${apiBase()}/comparar/rango`, req);
}

export function compararAVsB(req: CompararAVsBReq) {
  return postJSON<CompararAVsBRes>(`${apiBase()}/comparar/a-vs-b`, req);
}

export function compararPatronesVs(req: CompararPatronesVsReq) {
  return postJSON<CompararPatronesVsRes>(`${apiBase()}/comparar/patrones-vs`, req);
}
