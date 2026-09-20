# Docker and Containerization Guide

This document explains the Docker architecture, container builds, and Docker Compose orchestration for running Roxstar in an isolated environment.

---

## 1. Docker Architecture

The containerized stack consists of two services running in an isolated Docker network:

```
+-----------------------------------------------------------+
|                   Docker Network                          |
|                                                           |
|  +-----------------------+     +-----------------------+  |
|  |   spinwheel_backend   |     |  spinwheel_postgres   |  |
|  |   (Node.js 22 Alpine) |     |  (PostgreSQL 17)      |  |
|  |                       |     |                       |  |
|  |   Express + Socket.IO |====>|  spinwheel_db         |  |
|  |   Port: 5000          |     |  Port: 5432           |  |
|  +-----------------------+     +-----------------------+  |
|              |                             |              |
+--------------|-----------------------------|--------------+
               |                             |
       Port 5000 (Host)              Port 5432 (Host)
               |                             |
               v                             v
      Browser / Frontend              DB GUI / psql
```

1. **`spinwheel_postgres`**: Official `postgres:17-alpine` image with healthcheck probes and automated initial schema mounting (`schema.sql` mapped to `/docker-entrypoint-initdb.d/init.sql`).
2. **`spinwheel_backend`**: Custom lightweight Alpine image running Node 22, Express, and Socket.IO. Waits for the PostgreSQL health check before launching.

---

## 2. Docker Compose (Recommended)

Docker Compose orchestrates both the database and application server with a single command.

### 2.1 Starting Containers
From the project root:

```bash
# Start all services in the background and build images if needed
docker compose up -d --build
```

### 2.2 Checking Logs
```bash
# Stream logs from both services
docker compose logs -f

# View logs exclusively from the backend
docker compose logs -f backend

# View logs exclusively from the database
docker compose logs -f postgres
```

### 2.3 Verifying Service Status
```bash
docker compose ps
```
Both `spinwheel_postgres` (healthy) and `spinwheel_backend` (running) should be listed.

### 2.4 Testing Health Endpoint
Once started, check the backend health from your host machine:
```bash
curl http://localhost:5000/health
# Output: {"status":"OK"}
```

### 2.5 Stopping Containers
```bash
# Stop and remove containers and networks
docker compose down

# Stop containers and delete persistent database volumes (Clean reset)
docker compose down -v
```

---

## 3. Standalone Docker Commands

If you prefer building and running the backend container without Docker Compose:

### 3.1 Build Backend Docker Image
Navigate to the root directory and run:
```bash
docker build -t spinwheel-backend -f server/Dockerfile ./server
```

### 3.2 Run Standalone PostgreSQL Container
```bash
docker run -d \
  --name spinwheel_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=spinwheel_db \
  -p 5432:5432 \
  -v $(pwd)/server/db/schema.sql:/docker-entrypoint-initdb.d/init.sql:ro \
  postgres:17-alpine
```

### 3.3 Run Standalone Backend Container
```bash
docker run -d \
  --name spinwheel_backend \
  -p 5000:5000 \
  -e PORT=5000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/spinwheel_db" \
  -e CLIENT_URL="http://localhost:5173" \
  spinwheel-backend
```

---

## 4. Volume and Data Persistence

- Database records are stored inside a persistent Docker named volume (`pgdata`).
- Restarting or rebuilding the container images does not erase room history, chat messages, or spin logs.
- To completely reset the database state:
  ```bash
  docker compose down -v
  docker compose up -d
  ```
