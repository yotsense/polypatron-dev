#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

case "${1:-}" in
  up)        docker compose up -d ;;
  build)     docker compose build ;;
  rebuild)   docker compose up -d --build ;;
  restart)   docker compose restart ;;
  down)      docker compose down ;;
  ps)        docker compose ps ;;
  logs-api)  docker compose logs -f --tail=200 api ;;
  logs-web)  docker compose logs -f --tail=200 web ;;
  logs-db)   docker compose logs -f --tail=200 db ;;
  sh-api)    docker compose exec api sh ;;
  sh-web)    docker compose exec web sh ;;
  *) echo "Uso: ./pp {up|build|rebuild|restart|down|ps|logs-api|logs-web|logs-db|sh-api|sh-web}" ; exit 1 ;;
esac
