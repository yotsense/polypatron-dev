# PolyPatron

Analizador histórico de patrones (V/R) para mercados binarios tipo Up/Down en Polymarket.

## Qué hace
- Carga velas históricas (V/R) en una base de datos.
- Rankea patrones (por ejemplo: `VVVR`) y muestra su efectividad histórica.
- Simula “entrar en todas” las apariciones del patrón con banca/stake/payout.
- Compara el mismo patrón en distintos periodos (por ejemplo 3, 7, 15, 30 días) y marca tendencia.

## Qué NO hace
- No da señales en vivo.
- No ejecuta operaciones.
- No garantiza resultados.

## Correr con Docker
1. Instala Docker Desktop
2. En esta carpeta:
   - `docker compose up --build`
3. Abre:
   - Frontend: http://localhost:3000
   - API: http://localhost:8000/salud

## Nota sobre “hora CDMX”
La interfaz usa inputs de fecha/hora del navegador. Si estás en CDMX, coincide con lo que verás.

## Ingesta live (API)
Si quieres actualizar datos desde Gamma (sin botón en UI por ahora):
- POST http://localhost:8000/ingesta/live
  Body ejemplo:
  {
    "mercado": "btc-updown",
    "intervalo": "5m",
    "bloques_lookback": 600
  }
