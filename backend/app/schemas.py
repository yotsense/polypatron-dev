from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Optional, List

Intervalo = Literal["5m", "15m", "1h", "4h"]

class ReqIngestLive(BaseModel):
    mercado: str = "btc-updown"
    intervalo: Intervalo = "5m"
    bloques_lookback: int = Field(144, ge=1, le=4000)
    prefix: str = ""  # opcional: forzar prefix tipo "btc-updown-5m-"

class ReqRankearPatrones(BaseModel):
    mercado: str = "btc-updown"
    intervalo: Intervalo
    inicio: datetime
    fin: datetime
    longitud_min: int = Field(2, ge=2, le=12)
    longitud_max: int = Field(6, ge=2, le=12)
    min_muestras: int = Field(20, ge=1, le=100000)
    suavizado: float = Field(0.0, ge=0.0, le=10.0)

class FilaPatron(BaseModel):
    patron: str
    direccion: Literal["V", "R"]
    efectividad: float
    muestras: int
    verdes: int
    rojas: int

    # métricas de tiempo (opcionales)
    ultima_vez_utc: Optional[datetime] = None
    aparece_cada_seg: Optional[int] = None
    desde_ultima_seg: Optional[int] = None

class ResRankearPatrones(BaseModel):
    filas: List[FilaPatron]

class ReqSimular(BaseModel):
    mercado: str = "btc-updown"
    intervalo: Intervalo
    inicio: datetime
    fin: datetime
    patron: str
    direccion: Optional[Literal["V", "R"]] = None
    banca0: float = Field(1000.0, gt=0)
    stake: float = Field(10.0, gt=0)
    payout: float = Field(0.85, ge=0, le=2.0)
    reinvertir: bool = True

class TradeSim(BaseModel):
    fin_ts_utc: datetime
    patron: str
    direccion: Literal["V", "R"]
    real: Literal["V", "R"]
    gano: bool
    pnl: float
    banca_despues: float

class ResSimular(BaseModel):
    banca0: float
    banca_fin: float
    pnl_total: float
    roi: float
    max_drawdown: float
    max_racha_perdidas: int
    max_racha_ganadas: int
    trades: List[TradeSim]

class ReqUltimaVela(BaseModel):
    mercado: str = "btc-updown"
    intervalo: Intervalo

class ResUltimaVela(BaseModel):
    fin_ts_utc: Optional[datetime]

class ReqCompararVentanas(BaseModel):
    mercado: str = "btc-updown"
    intervalo: Intervalo
    fin: datetime
    patron: str
    direccion: Optional[Literal["V", "R"]] = None
    ventanas_dias: List[int] = Field(default_factory=lambda: [3, 7, 15, 30])

class FilaComparacion(BaseModel):
    dias: int
    inicio: datetime
    fin: datetime
    direccion: Literal["V", "R"]
    efectividad: Optional[float]
    muestras: int
    verdes: int
    rojas: int

class ResCompararVentanas(BaseModel):
    patron: str
    direccion: Literal["V", "R"]
    filas: List[FilaComparacion]
    tendencia: Literal["ascenso", "descenso", "plano"]


class ReqCompararRango(BaseModel):
    mercado: str = "btc-updown"
    intervalo: Intervalo
    inicio: datetime
    fin: datetime
    patron: str
    direccion: Optional[Literal["V", "R"]] = None


class ResCompararRango(BaseModel):
    mercado: str
    intervalo: Intervalo
    patron: str
    direccion: Literal["V", "R"]
    inicio: datetime
    fin: datetime
    efectividad: Optional[float]
    muestras: int
    verdes: int
    rojas: int
    aparece_cada_seg: Optional[int] = None
    ultima_vez_utc: Optional[datetime] = None


class ReqCompararAVsB(BaseModel):
    mercado: str = "btc-updown"
    intervalo: Intervalo
    patron: str
    direccion: Optional[Literal["V", "R"]] = None
    a_inicio: datetime
    a_fin: datetime
    b_inicio: datetime
    b_fin: datetime


class ResCompararAVsB(BaseModel):
    mercado: str
    intervalo: Intervalo
    patron: str
    direccion: Optional[Literal["V", "R"]] = None
    a: ResCompararRango
    b: ResCompararRango
    delta_efectividad: Optional[float]
    delta_muestras: int


class ReqCompararPatronesVs(BaseModel):
    mercado: str = "btc-updown"
    intervalo: Intervalo
    inicio: datetime
    fin: datetime
    patron_a: str
    direccion_a: Optional[Literal["V", "R"]] = None
    patron_b: str
    direccion_b: Optional[Literal["V", "R"]] = None


class ResPatronMetricas(BaseModel):
    patron: str
    direccion: Literal["V", "R"]
    inicio: datetime
    fin: datetime
    efectividad: Optional[float]
    muestras: int
    verdes: int
    rojas: int
    aparece_cada_seg: Optional[int] = None
    ultima_vez_utc: Optional[datetime] = None


class ResCompararPatronesVs(BaseModel):
    mercado: str
    intervalo: Intervalo
    a: ResPatronMetricas
    b: ResPatronMetricas
    delta_efectividad: Optional[float]
    delta_muestras: int
    ganador: Literal["A", "B", "empate"]


class OcurrenciaPatron(BaseModel):
    fecha: str
    hora: str
    direccion_resultado: Literal["V", "R"]
    mercado_slug: Optional[str] = None
    mercado_id: Optional[str] = None


class ResHistorialPatron(BaseModel):
    patron: str
    direccion: Literal["V", "R"]
    mercado: str
    intervalo: Intervalo
    total_muestras: int
    rango_fecha_inicio: Optional[datetime] = None
    rango_fecha_fin: Optional[datetime] = None
    ocurrencias: List[OcurrenciaPatron]
