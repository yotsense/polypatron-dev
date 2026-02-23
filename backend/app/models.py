from sqlalchemy import String, Integer, DateTime, Float, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from .db import Base

class Vela(Base):
    __tablename__ = "velas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    mercado: Mapped[str] = mapped_column(String(128), index=True)          # ej. "btc-updown"
    intervalo: Mapped[str] = mapped_column(String(16), index=True)         # "5m", "15m", "1h", "4h"
    slug: Mapped[str] = mapped_column(String(256), index=True)
    market_id: Mapped[str] = mapped_column(String(64), index=True)

    fin_ts_utc: Mapped[datetime] = mapped_column(DateTime(timezone=False), index=True)
    color: Mapped[str] = mapped_column(String(8), index=True)             # "V" o "R"

    precio_cierre_up: Mapped[float | None] = mapped_column(Float, nullable=True)
    precio_cierre_down: Mapped[float | None] = mapped_column(Float, nullable=True)

    fuente: Mapped[str] = mapped_column(String(32), default="gamma")
    insertado_en: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("intervalo", "fin_ts_utc", "slug", name="uq_vela_int_fin_slug"),
        Index("ix_velas_int_mercado_fin", "intervalo", "mercado", "fin_ts_utc"),
    )
