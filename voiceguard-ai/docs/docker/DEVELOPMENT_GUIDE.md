# VoiceGuard AI — Development Docker Workflow Guide
## Phase 30: Dockerization (SIH26104)

### 1. Prerequisites
- Docker Engine 24+ & Docker Compose v2.20+ (or standalone `docker-compose`)
- 8 GB RAM minimum (16 GB recommended for full local model inference)
- Git

---

### 2. Quickstart for Developers

To launch the full development environment with hot-reloading:

```bash
# Clone and enter workspace
git clone https://github.com/voiceguard/voiceguard-ai.git
cd voiceguard-ai

# Start local stack with dev overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

---

### 3. Development Stack Features

The `docker-compose.dev.yml` file layers over the base specification to enable:

1. **Backend Hot-Reloading:**
   - Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug`
   - Host directory `./backend` is mounted into `/app/backend`. Any code change triggers immediate reload.
   - Host directory `./ai-engine` is mounted into `/app/ai-engine`.
2. **Frontend Live Dev Server:**
   - Image: `node:20-alpine`
   - Command: `npm install && npm run dev -- --host 0.0.0.0`
   - Host directory `./frontend` is mounted into `/app`. Vite HMR updates instantly on port 5173.
3. **Database & Redis Debug Ports:**
   - PostgreSQL port `5432:5432` is exposed locally for DBeaver / pgAdmin inspection.
   - Redis port `6379:6379` is exposed locally for Redis Insight / redis-cli.

---

### 4. Common Development Commands

#### Rebuilding After Adding Dependencies
```bash
# If you updated backend/requirements.txt:
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build backend

# If you updated frontend/package.json:
docker-compose -f docker-compose.yml -f docker-compose.dev.yml run --rm frontend npm install
```

#### Viewing Streaming Logs
```bash
# All services
docker-compose logs -f

# Backend service only
docker-compose logs -f backend
```

#### Executing Database Migrations Inside Container
```bash
docker-compose exec backend alembic upgrade head
```

#### Seeding Initial Test Data Inside Container
```bash
docker-compose exec backend python backend/seed_demo_data.py
```

#### Stopping and Cleaning Development Stack
```bash
# Stop containers gracefully
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Stop containers and remove volumes (clean database reset)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

