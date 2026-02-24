from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
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


def _metricas_desde_colores(
    colores: List[str],
    patron: str,
    direccion: Optional[str],
    fin_ts_list: Optional[List[datetime]] = None,
) -> Dict:
    L = len(patron)
    v = 0
    r = 0
    ocurrencias_ts: List[datetime] = []

    for i in range(L, len(colores)):
        if "".join(colores[i - L:i]) != patron:
            continue

        if colores[i] == "V":
            v += 1
        else:
            r += 1

        if fin_ts_list is not None and len(fin_ts_list) == len(colores):
            ocurrencias_ts.append(fin_ts_list[i - 1])

    muestras = v + r

    dir_norm = direccion if direccion in ("V", "R") else None
    if dir_norm is None:
        dir_calc = "V" if v >= r else "R"
    else:
        dir_calc = dir_norm

    if muestras == 0:
        efectividad = None
    elif dir_calc == "V":
        efectividad = v / muestras
    else:
        efectividad = r / muestras

    aparece_cada_seg: Optional[int] = None
    ultima_vez_utc: Optional[datetime] = None

    if len(ocurrencias_ts) >= 1:
        ultima_vez_utc = max(ocurrencias_ts).replace(tzinfo=timezone.utc)
    if len(ocurrencias_ts) >= 2:
        occ = sorted(ocurrencias_ts)
        diffs = [int((b - a).total_seconds()) for a, b in zip(occ[:-1], occ[1:])]
        if diffs:
            aparece_cada_seg = int(sum(diffs) / len(diffs))

    return {
        "direccion": dir_calc,
        "efectividad": efectividad,
        "muestras": muestras,
        "verdes": v,
        "rojas": r,
        "aparece_cada_seg": aparece_cada_seg,
        "ultima_vez_utc": ultima_vez_utc,
    }


def comparar_rango(
    db: Session,
    mercado: str,
    intervalo: str,
    inicio: datetime,
    fin: datetime,
    patron: str,
    direccion: Optional[str],
):
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

    velas = [f for f in filas if f.color in ("V", "R")]
    colores = [v.color for v in velas]
    fin_ts_list = [v.fin_ts_utc for v in velas]

    met = _metricas_desde_colores(colores, patron, direccion, fin_ts_list)
    return {
        "inicio": inicio,
        "fin": fin,
        **met,
    }


def comparar_a_vs_b(
    db: Session,
    mercado: str,
    intervalo: str,
    patron: str,
    direccion: Optional[str],
    a_inicio: datetime,
    a_fin: datetime,
    b_inicio: datetime,
    b_fin: datetime,
):
    a = comparar_rango(db, mercado, intervalo, a_inicio, a_fin, patron, direccion)
    b = comparar_rango(db, mercado, intervalo, b_inicio, b_fin, patron, direccion)

    delta_efectividad = None
    if a["efectividad"] is not None and b["efectividad"] is not None:
        delta_efectividad = float(a["efectividad"]) - float(b["efectividad"])

    return {
        "a": a,
        "b": b,
        "delta_efectividad": delta_efectividad,
        "delta_muestras": int(a["muestras"]) - int(b["muestras"]),
    }


def comparar_patron_vs_patron(
    db: Session,
    mercado: str,
    intervalo: str,
    inicio: datetime,
    fin: datetime,
    patron_a: str,
    direccion_a: Optional[str],
    patron_b: str,
    direccion_b: Optional[str],
):
    a = comparar_rango(db, mercado, intervalo, inicio, fin, patron_a, direccion_a)
    b = comparar_rango(db, mercado, intervalo, inicio, fin, patron_b, direccion_b)

    gana = "empate"
    ef_a = a["efectividad"]
    ef_b = b["efectividad"]
    if ef_a is not None and ef_b is not None:
        umbral = 0.005
        if ef_a > ef_b + umbral:
            gana = "A"
        elif ef_b > ef_a + umbral:
            gana = "B"

    delta_efectividad = None
    if ef_a is not None and ef_b is not None:
        delta_efectividad = float(ef_a) - float(ef_b)

    return {
        "a": {"patron": patron_a, **a},
        "b": {"patron": patron_b, **b},
        "delta_efectividad": delta_efectividad,
        "delta_muestras": int(a["muestras"]) - int(b["muestras"]),
        "ganador": gana,
    }

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
