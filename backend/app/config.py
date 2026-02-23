from pydantic_settings import BaseSettings

class Ajustes(BaseSettings):
    """Ajustes de la API (variables de entorno)."""
    DATABASE_URL: str
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

ajustes = Ajustes()
