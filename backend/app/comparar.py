from __future__ import annotations
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from .models import Vela
from .utils_time import iso_a_utc_naive

def _cargar_colores(db: Session, mercado: str, intervalo: str, inicio: datetime, fin: datetime) -> List[str]:
    ini_n = iso_a_utc_naive(inicio)
    fin_n = iso_a_utc_naive(fin)
    filas = (
        db.query(Vela)
        .filter(Vela.mercado == mercado)
        .filter(Vela.intervalo == intervalo)
        .filter(Vela.fin_ts_utc >= ini_n)
        .filter(Vela.fin_ts_utc <= fin_n)
        .order_by(Vela.fin_ts_utc.asc())
        .all()
    )
    return [f.color for f in filas if f.color in ("V","R")]

def _edge(colores: List[str], patron: str, direccion: str) -> Tuple[Optional[float], int, int, int]:
    L = len(patron)
    v = r = 0
    for i in range(L, len(colores)):
        if "".join(colores[i-L:i]) == patron:
            if colores[i] == "V":
                v += 1
            else:
                r += 1
    total = v + r
    if total == 0:
        return None, 0, 0, 0
    if direccion == "V":
        return v/total, total, v, r
    return r/total, total, v, r

def comparar_ventanas(
    db: Session,
    mercado: str,
    intervalo: str,
    fin: datetime,
    patron: str,
    direccion: str,
    ventanas_dias: List[int]
):
    """Calcula efectividad del mismo patrón en varias ventanas hacia atrás desde 'fin'."""
    filas = []
    fin_dt = fin
    for dias in sorted(set(int(x) for x in ventanas_dias if int(x) > 0)):
        inicio = fin_dt - timedelta(days=dias)
        colores = _cargar_colores(db, mercado, intervalo, inicio, fin_dt)
        efect, muestras, v, r = _edge(colores, patron, direccion) if len(colores) > len(patron) else (None,0,0,0)
        filas.append((dias, inicio, fin_dt, efect, muestras, v, r))

    # Tendencia simple: comparar ventana más corta vs más larga (si hay datos)
    tendencia = "plano"
    if len(filas) >= 2:
        cortas = [f for f in filas if f[3] is not None]
        if len(cortas) >= 2:
            corta = min(cortas, key=lambda x: x[0])
            larga = max(cortas, key=lambda x: x[0])
            if corta[3] > larga[3] + 0.02:
                tendencia = "ascenso"
            elif corta[3] < larga[3] - 0.02:
                tendencia = "descenso"
    return filas, tendencia
