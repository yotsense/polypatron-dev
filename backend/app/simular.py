from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Tuple

@dataclass
class Trade:
    fin_ts_utc: object
    patron: str
    direccion: str
    real: str
    gano: bool
    pnl: float
    banca_despues: float

def simular_entrar_siempre(
    *,
    fin_ts_list: List[object],
    colores: List[str],
    patron: str,
    direccion: Optional[str],
    banca0: float,
    stake: float,
    payout: float,
    reinvertir: bool
) -> Tuple[float, float, float, float, float, int, int, List[Trade]]:
    L = len(patron)
    banca = banca0
    pico = banca0
    max_dd = 0.0
    racha_perdidas = 0
    racha_ganadas = 0
    max_racha_perdidas = 0
    max_racha_ganadas = 0

    trades: List[Trade] = []

    for i in range(L, len(colores)):
        if "".join(colores[i - L:i]) != patron:
            continue

        real = colores[i]
        dir_use = direccion or "V"
        gano = (real == dir_use)

        stake_use = stake if reinvertir else stake

        if gano:
            pnl = stake_use * payout
            banca += pnl
            racha_ganadas += 1
            racha_perdidas = 0
        else:
            pnl = -stake_use
            banca += pnl
            racha_perdidas += 1
            racha_ganadas = 0

        pico = max(pico, banca)
        dd = pico - banca
        max_dd = max(max_dd, dd)

        max_racha_perdidas = max(max_racha_perdidas, racha_perdidas)
        max_racha_ganadas = max(max_racha_ganadas, racha_ganadas)

        trades.append(Trade(
            fin_ts_utc=fin_ts_list[i],
            patron=patron,
            direccion=dir_use,
            real=real,
            gano=gano,
            pnl=pnl,
            banca_despues=banca
        ))

    pnl_total = banca - banca0
    roi = pnl_total / banca0 if banca0 != 0 else 0.0
    return banca0, banca, pnl_total, roi, max_dd, max_racha_perdidas, max_racha_ganadas, trades
