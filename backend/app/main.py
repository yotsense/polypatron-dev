from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Tuple

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from .config import ajustes
from .db import Base, engine, get_db
from .models import Vela
from .schemas import (
    ReqRankearPatrones, ResRankearPatrones, FilaPatron,
    ReqSimular, ResSimular, TradeSim,
    ResUltimaVela, ReqCompararVentanas, ResCompararVentanas, FilaComparacion,
    ResHistorialPatron, OcurrenciaPatron,
    ReqCompararRango, ResCompararRango,
    ReqCompararAVsB, ResCompararAVsB,
    ReqCompararPatronesVs, ResCompararPatronesVs, ResPatronMetricas,
)
from .utils_time import iso_a_utc_naive
from .ingest_gamma import backfill_markets, extraer_campos_vela
from .patrones import rankear_patrones_con_tiempos
from .simular import simular_entrar_siempre
from .comparar import comparar_ventanas, comparar_rango, comparar_a_vs_b, comparar_patron_vs_patron

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PolyPatron API", version="0.3.1")

origins = [o.strip() for o in ajustes.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _prefix_por_defecto(mercado: str, intervalo: str, override: str = "") -> str:
    if override:
        return override
    return f"{mercado}-{intervalo}-"

def _insertar_si_no_existe(db: Session, v: Vela) -> bool:
    stmt = (
        insert(Vela.__table__)
        .values(
            mercado=v.mercado,
            intervalo=v.intervalo,
            slug=v.slug,
            market_id=v.market_id,
            fin_ts_utc=v.fin_ts_utc,
            color=v.color,
            precio_cierre_up=v.precio_cierre_up,
            precio_cierre_down=v.precio_cierre_down,
            fuente=v.fuente,
        )
        .on_conflict_do_nothing(index_elements=["intervalo", "fin_ts_utc", "slug"])
    )
    res = db.execute(stmt)
    db.commit()
    return (res.rowcount or 0) > 0

async def _asegurar_datos_en_rango(
    db: Session,
    *,
    mercado: str,
    intervalo: str,
    inicio: datetime,
    fin: datetime,
    prefix_override: str = "",
    max_pages: int = 30,
):
    prefix = _prefix_por_defecto(mercado, intervalo, prefix_override)

    ini_utc = inicio
    fin_utc = fin
    if ini_utc.tzinfo is None:
        ini_utc = ini_utc.replace(tzinfo=timezone.utc)
    else:
        ini_utc = ini_utc.astimezone(timezone.utc)

    if fin_utc.tzinfo is None:
        fin_utc = fin_utc.replace(tzinfo=timezone.utc)
    else:
        fin_utc = fin_utc.astimezone(timezone.utc)

    data = await backfill_markets(
        closed=True,
        limit=500,
        max_pages=max_pages,
        start_date_min=None,
        start_date_max=None,
        end_date_min=ini_utc,
        end_date_max=fin_utc,
        order="id",
        ascending=False,
    )

    for m in data:
        market_id, fin_ts, slug, color, up_p, down_p = extraer_campos_vela(m)
        if not slug or not slug.startswith(prefix):
            continue
        if not market_id or fin_ts is None or color is None:
            continue

        v = Vela(
            mercado=mercado,
            intervalo=intervalo,
            slug=slug,
            market_id=market_id,
            fin_ts_utc=fin_ts,
            color=color,
            precio_cierre_up=up_p,
            precio_cierre_down=down_p,
            fuente="gamma",
        )
        try:
            _insertar_si_no_existe(db, v)
        except Exception:
            db.rollback()
            continue

def _cargar_colores(
    db: Session,
    mercado: str,
    intervalo: str,
    inicio: datetime,
    fin: datetime
) -> Tuple[List[datetime], List[str]]:
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

    fin_ts_list: List[datetime] = []
    colores: List[str] = []
    for f in filas:
        if f.color in ("V", "R"):
            fin_ts_list.append(f.fin_ts_utc)
            colores.append(f.color)
    return fin_ts_list, colores

@app.get("/salud")
def salud():
    return {"ok": True, "app": "PolyPatron"}

@app.get("/velas/ultima", response_model=ResUltimaVela)
def ultima_vela(mercado: str = "btc-updown", intervalo: str = "5m", db: Session = Depends(get_db)):
    fila = (
        db.query(Vela)
        .filter(Vela.mercado == mercado)
        .filter(Vela.intervalo == intervalo)
        .order_by(Vela.fin_ts_utc.desc())
        .first()
    )
    return ResUltimaVela(fin_ts_utc=fila.fin_ts_utc if fila else None)

@app.post("/patrones/rankear", response_model=ResRankearPatrones)
async def patrones_rankear(req: ReqRankearPatrones, db: Session = Depends(get_db)):
    await _asegurar_datos_en_rango(
        db,
        mercado=req.mercado,
        intervalo=req.intervalo,
        inicio=req.inicio,
        fin=req.fin,
    )

    fin_ts_list, colores = _cargar_colores(db, req.mercado, req.intervalo, req.inicio, req.fin)
    if len(colores) < (req.longitud_max + 2):
        return ResRankearPatrones(filas=[])

    filas = rankear_patrones_con_tiempos(
        colores=colores,
        fin_ts_list=fin_ts_list,
        longitud_min=req.longitud_min,
        longitud_max=req.longitud_max,
        min_muestras=req.min_muestras,
        alpha=req.suavizado,
        now_utc=datetime.now(timezone.utc),
    )

    out = []
    for (p, d, e, s, v, r, ultima_vez_utc, aparece_cada_seg, desde_ultima_seg) in filas[:500]:
        out.append(FilaPatron(
            patron=p,
            direccion=d,
            efectividad=float(e),
            muestras=int(s),
            verdes=int(v),
            rojas=int(r),
            ultima_vez_utc=ultima_vez_utc,
            aparece_cada_seg=aparece_cada_seg,
            desde_ultima_seg=desde_ultima_seg,
        ))
    return ResRankearPatrones(filas=out)


@app.get("/patrones/historial", response_model=ResHistorialPatron)
async def patrones_historial(
    patron: str,
    direccion: str,
    mercado: str,
    intervalo: str,
    inicio: datetime,
    fin: datetime,
    db: Session = Depends(get_db),
):
    if direccion not in ("V", "R"):
        raise HTTPException(status_code=400, detail="direccion debe ser V o R")

    if not patron or len(patron) < 2 or any(c not in ("V", "R") for c in patron):
        raise HTTPException(status_code=400, detail="patron inválido: usa solo V/R y longitud >= 2")

    await _asegurar_datos_en_rango(
        db,
        mercado=mercado,
        intervalo=intervalo,
        inicio=inicio,
        fin=fin,
    )

    ini_n = iso_a_utc_naive(inicio)
    fin_n = iso_a_utc_naive(fin)

    velas = (
        db.query(Vela)
        .filter(Vela.mercado == mercado)
        .filter(Vela.intervalo == intervalo)
        .filter(Vela.fin_ts_utc >= ini_n)
        .filter(Vela.fin_ts_utc <= fin_n)
        .order_by(Vela.fin_ts_utc.asc())
        .all()
    )

    velas = [v for v in velas if v.color in ("V", "R")]

    L = len(patron)
    ocurrencias: List[OcurrenciaPatron] = []
    ts_ocurrencias: List[datetime] = []

    for i in range(L, len(velas)):
        patron_actual = "".join(v.color for v in velas[i - L:i])
        if patron_actual != patron:
            continue

        vela_res = velas[i]
        ts = vela_res.fin_ts_utc
        ts_ocurrencias.append(ts)

        ocurrencias.append(OcurrenciaPatron(
            fecha=ts.strftime("%Y-%m-%d"),
            hora=ts.strftime("%H:%M:%S"),
            direccion_resultado=vela_res.color,
            mercado_slug=vela_res.slug,
            mercado_id=vela_res.market_id,
        ))

    rango_inicio = min(ts_ocurrencias).replace(tzinfo=timezone.utc) if ts_ocurrencias else None
    rango_fin = max(ts_ocurrencias).replace(tzinfo=timezone.utc) if ts_ocurrencias else None

    return ResHistorialPatron(
        patron=patron,
        direccion=direccion,
        mercado=mercado,
        intervalo=intervalo,
        total_muestras=len(ocurrencias),
        rango_fecha_inicio=rango_inicio,
        rango_fecha_fin=rango_fin,
        ocurrencias=ocurrencias,
    )

@app.post("/simular", response_model=ResSimular)
async def simular(req: ReqSimular, db: Session = Depends(get_db)):
    # 1) Asegurar datos del rango (sin botón de ingesta)
    await _asegurar_datos_en_rango(
        db,
        mercado=req.mercado,
        intervalo=req.intervalo,
        inicio=req.inicio,
        fin=req.fin,
    )

    # 2) Cargar datos
    fin_ts_list, colores = _cargar_colores(db, req.mercado, req.intervalo, req.inicio, req.fin)
    if len(colores) < (len(req.patron) + 1):
        raise HTTPException(status_code=400, detail="No hay suficientes datos en el rango.")

    # 3) Simular (tu simulador regresa una TUPLA; aquí la convertimos a ResSimular)
    res = simular_entrar_siempre(
        fin_ts_list=fin_ts_list,
        colores=colores,
        patron=req.patron,
        direccion=req.direccion,
        banca0=req.banca0,
        stake=req.stake,
        payout=req.payout,
        reinvertir=req.reinvertir,
    )

    # Esperamos: (banca0, banca_fin, pnl_total, roi, max_drawdown, max_racha_perdidas, max_racha_ganadas, trades)
    banca0, banca_fin, pnl_total, roi, max_drawdown, max_racha_perdidas, max_racha_ganadas, trades = res

    trades_out = []
    for tr in (trades or []):
        # tr puede ser dataclass/objeto con atributos
        trades_out.append(
            TradeSim(
                fin_ts_utc=tr.fin_ts_utc,
                patron=tr.patron,
                direccion=tr.direccion,
                real=tr.real,
                gano=bool(tr.gano),
                pnl=float(tr.pnl),
                banca_despues=float(tr.banca_despues),
            )
        )

    return ResSimular(
        banca0=float(banca0),
        banca_fin=float(banca_fin),
        pnl_total=float(pnl_total),
        roi=float(roi),
        max_drawdown=float(max_drawdown),
        max_racha_perdidas=int(max_racha_perdidas),
        max_racha_ganadas=int(max_racha_ganadas),
        trades=trades_out,
    )

@app.post("/comparar/ventanas", response_model=ResCompararVentanas)
async def comparar(req: ReqCompararVentanas, db: Session = Depends(get_db)):
    # 1) Asegurar data en DB para el rango (backfill desde gamma)
    await _asegurar_datos_en_rango(
        db,
        mercado=req.mercado,
        intervalo=req.intervalo,
        inicio=req.fin,  # se recalcula dentro, pero forzamos fetch amplio con fin como referencia
        fin=req.fin,
        max_pages=60,
    )

    # 2) comparar_ventanas NO es async. Puede regresar: dict o (tendencia, filas) o (filas, tendencia)
    res = comparar_ventanas(db, req.mercado, req.intervalo, req.fin, req.patron, req.direccion, req.ventanas_dias)

    tendencia = "plano"
    filas = []

    if isinstance(res, dict):
        tendencia = res.get("tendencia") or "plano"
        filas = res.get("filas") or []
    elif isinstance(res, (tuple, list)) and len(res) == 2:
        a, b = res
        if isinstance(a, str) and isinstance(b, list):
            tendencia, filas = a, b
        elif isinstance(b, str) and isinstance(a, list):
            tendencia, filas = b, a
        else:
            if isinstance(a, list): filas = a
            if isinstance(b, list): filas = b
            if isinstance(a, str): tendencia = a
            if isinstance(b, str): tendencia = b
    elif isinstance(res, list):
        filas = res

    if tendencia not in ("ascenso", "descenso", "plano"):
        tendencia = "plano"

    filas_out = []
    for row in (filas or []):
        if isinstance(row, dict):
            row.setdefault("direccion", req.direccion)
            filas_out.append(row)
            continue

        # tupla: (dias, inicio, fin, efectividad, muestras, verdes, rojas)
        if isinstance(row, (tuple, list)) and len(row) >= 7:
            dias, ini, fin, efect, muestras, verdes, rojas = row[:7]
            filas_out.append({
                "dias": int(dias),
                "direccion": req.direccion,
                "inicio": ini,
                "fin": fin,
                "efectividad": float(efect),
                "muestras": int(muestras),
                "verdes": int(verdes),
                "rojas": int(rojas),
            })

    return ResCompararVentanas(
        patron=req.patron,
        direccion=req.direccion,
        tendencia=tendencia,
        filas=filas_out,
    )


@app.post("/comparar/rango", response_model=ResCompararRango)
async def comparar_por_rango(req: ReqCompararRango, db: Session = Depends(get_db)):
    await _asegurar_datos_en_rango(
        db,
        mercado=req.mercado,
        intervalo=req.intervalo,
        inicio=req.inicio,
        fin=req.fin,
    )

    res = comparar_rango(
        db,
        req.mercado,
        req.intervalo,
        req.inicio,
        req.fin,
        req.patron,
        req.direccion,
    )

    return ResCompararRango(
        mercado=req.mercado,
        intervalo=req.intervalo,
        patron=req.patron,
        direccion=res["direccion"],
        inicio=res["inicio"],
        fin=res["fin"],
        efectividad=res["efectividad"],
        muestras=res["muestras"],
        verdes=res["verdes"],
        rojas=res["rojas"],
        aparece_cada_seg=res.get("aparece_cada_seg"),
        ultima_vez_utc=res.get("ultima_vez_utc"),
    )


@app.post("/comparar/a-vs-b", response_model=ResCompararAVsB)
async def comparar_a_vs_b_endpoint(req: ReqCompararAVsB, db: Session = Depends(get_db)):
    await _asegurar_datos_en_rango(
        db,
        mercado=req.mercado,
        intervalo=req.intervalo,
        inicio=min(req.a_inicio, req.b_inicio),
        fin=max(req.a_fin, req.b_fin),
    )

    out = comparar_a_vs_b(
        db,
        req.mercado,
        req.intervalo,
        req.patron,
        req.direccion,
        req.a_inicio,
        req.a_fin,
        req.b_inicio,
        req.b_fin,
    )

    a = out["a"]
    b = out["b"]

    return ResCompararAVsB(
        mercado=req.mercado,
        intervalo=req.intervalo,
        patron=req.patron,
        direccion=req.direccion,
        a=ResCompararRango(
            mercado=req.mercado,
            intervalo=req.intervalo,
            patron=req.patron,
            direccion=a["direccion"],
            inicio=a["inicio"],
            fin=a["fin"],
            efectividad=a["efectividad"],
            muestras=a["muestras"],
            verdes=a["verdes"],
            rojas=a["rojas"],
            aparece_cada_seg=a.get("aparece_cada_seg"),
            ultima_vez_utc=a.get("ultima_vez_utc"),
        ),
        b=ResCompararRango(
            mercado=req.mercado,
            intervalo=req.intervalo,
            patron=req.patron,
            direccion=b["direccion"],
            inicio=b["inicio"],
            fin=b["fin"],
            efectividad=b["efectividad"],
            muestras=b["muestras"],
            verdes=b["verdes"],
            rojas=b["rojas"],
            aparece_cada_seg=b.get("aparece_cada_seg"),
            ultima_vez_utc=b.get("ultima_vez_utc"),
        ),
        delta_efectividad=out.get("delta_efectividad"),
        delta_muestras=out["delta_muestras"],
    )


@app.post("/comparar/patrones-vs", response_model=ResCompararPatronesVs)
async def comparar_patrones_vs_endpoint(req: ReqCompararPatronesVs, db: Session = Depends(get_db)):
    await _asegurar_datos_en_rango(
        db,
        mercado=req.mercado,
        intervalo=req.intervalo,
        inicio=req.inicio,
        fin=req.fin,
    )

    out = comparar_patron_vs_patron(
        db,
        req.mercado,
        req.intervalo,
        req.inicio,
        req.fin,
        req.patron_a,
        req.direccion_a,
        req.patron_b,
        req.direccion_b,
    )

    a = out["a"]
    b = out["b"]

    return ResCompararPatronesVs(
        mercado=req.mercado,
        intervalo=req.intervalo,
        a=ResPatronMetricas(
            patron=a["patron"],
            direccion=a["direccion"],
            inicio=a["inicio"],
            fin=a["fin"],
            efectividad=a["efectividad"],
            muestras=a["muestras"],
            verdes=a["verdes"],
            rojas=a["rojas"],
            aparece_cada_seg=a.get("aparece_cada_seg"),
            ultima_vez_utc=a.get("ultima_vez_utc"),
        ),
        b=ResPatronMetricas(
            patron=b["patron"],
            direccion=b["direccion"],
            inicio=b["inicio"],
            fin=b["fin"],
            efectividad=b["efectividad"],
            muestras=b["muestras"],
            verdes=b["verdes"],
            rojas=b["rojas"],
            aparece_cada_seg=b.get("aparece_cada_seg"),
            ultima_vez_utc=b.get("ultima_vez_utc"),
        ),
        delta_efectividad=out.get("delta_efectividad"),
        delta_muestras=out["delta_muestras"],
        ganador=out["ganador"],
    )
