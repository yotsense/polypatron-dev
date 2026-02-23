from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional


@dataclass
class StatsPatron:
    verdes: int = 0
    rojas: int = 0
    # Guardamos timestamps (UTC naive) de la "última vela del patrón" cada vez que aparece
    ocurrencias_ts: List[datetime] = field(default_factory=list)

    @property
    def muestras(self) -> int:
        return self.verdes + self.rojas


def _avg_seg_entre(ts_list: List[datetime]) -> Optional[int]:
    if len(ts_list) < 2:
        return None
    # orden por si acaso
    ts_list = sorted(ts_list)
    diffs = []
    for a, b in zip(ts_list[:-1], ts_list[1:]):
        diffs.append(int((b - a).total_seconds()))
    if not diffs:
        return None
    return int(sum(diffs) / len(diffs))


def rankear_patrones(
    colores: List[str],
    max_len: int,
    min_muestras: int,
    alpha: float = 0.0
) -> List[Tuple[str, str, float, int, int, int]]:
    """
    Versión simple (sin tiempos) para compatibilidad.
    """
    filas = rankear_patrones_con_tiempos(
        colores=colores,
        fin_ts_list=None,
        longitud_min=2,
        longitud_max=max_len,
        min_muestras=min_muestras,
        alpha=alpha,
        now_utc=None,
    )
    # recorta a los 6 campos originales
    out = []
    for (patron, direccion, efect, total, verdes, rojas, *_rest) in filas:
        out.append((patron, direccion, efect, total, verdes, rojas))
    return out


def rankear_patrones_con_tiempos(
    *,
    colores: List[str],
    fin_ts_list: Optional[List[datetime]],
    longitud_min: int,
    longitud_max: int,
    min_muestras: int,
    alpha: float = 0.0,
    now_utc: Optional[datetime] = None,
) -> List[Tuple[str, str, float, int, int, int, Optional[datetime], Optional[int], Optional[int]]]:
    """
    Cuenta patrones de V/R y calcula efectividad (dirección dominante).
    Además devuelve:
      - ultima_vez_utc (aware UTC) = cuándo se vio por última vez el patrón
      - aparece_cada_seg (promedio entre ocurrencias)
      - desde_ultima_seg (segundos desde la última vez hasta ahora)
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    stats: Dict[str, StatsPatron] = {}
    n = len(colores)

    Lmin = max(2, int(longitud_min))
    Lmax = max(Lmin, int(longitud_max))

    # Si fin_ts_list viene, debe ser mismo largo que colores
    usar_tiempos = fin_ts_list is not None and len(fin_ts_list) == len(colores)

    for L in range(Lmin, Lmax + 1):
        for i in range(L, n):
            patron = "".join(colores[i - L:i])
            siguiente = colores[i]

            s = stats.get(patron)
            if s is None:
                s = StatsPatron()
                stats[patron] = s

            if siguiente == "V":
                s.verdes += 1
            else:
                s.rojas += 1

            if usar_tiempos:
                # timestamp de la última vela del patrón (posición i-1)
                s.ocurrencias_ts.append(fin_ts_list[i - 1])

    filas: List[Tuple[str, str, float, int, int, int, Optional[datetime], Optional[int], Optional[int]]] = []

    for patron, s in stats.items():
        total = s.muestras
        if total < min_muestras:
            continue

        if alpha > 0:
            pv = (s.verdes + alpha) / (total + 2 * alpha)
            pr = (s.rojas + alpha) / (total + 2 * alpha)
        else:
            pv = s.verdes / total
            pr = s.rojas / total

        if pv >= pr:
            direccion = "V"
            efect = float(pv)
        else:
            direccion = "R"
            efect = float(pr)

        ultima_vez_utc = None
        aparece_cada_seg = None
        desde_ultima_seg = None

        if usar_tiempos and s.ocurrencias_ts:
            last_naive = max(s.ocurrencias_ts)
            # lo devolvemos como aware UTC para que FastAPI lo serialice bien
            ultima_vez_utc = last_naive.replace(tzinfo=timezone.utc)
            aparece_cada_seg = _avg_seg_entre(s.ocurrencias_ts)
            desde_ultima_seg = int((now_utc - ultima_vez_utc).total_seconds())

        filas.append((
            patron,
            direccion,
            efect,
            int(total),
            int(s.verdes),
            int(s.rojas),
            ultima_vez_utc,
            aparece_cada_seg,
            desde_ultima_seg
        ))

    filas.sort(key=lambda x: (x[2], x[3]), reverse=True)
    return filas
