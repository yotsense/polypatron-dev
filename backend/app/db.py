from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import ajustes

engine = create_engine(ajustes.DATABASE_URL, pool_pre_ping=True)
SesionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SesionLocal()
    try:
        yield db
    finally:
        db.close()
