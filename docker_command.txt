# First time / rebuild
docker compose up --build -d

# Logs
docker compose logs -f api

# Stop everything
docker compose down

# Stop + wipe Mongo data
docker compose down -v
