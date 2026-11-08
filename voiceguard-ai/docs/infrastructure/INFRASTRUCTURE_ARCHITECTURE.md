# VoiceGuard AI — Production Infrastructure Architecture
## Phase 32: Production Infrastructure (SIH26104)

---

## 1. Logical Architecture & Network Segmentation

The VoiceGuard AI production infrastructure enforces defense-in-depth through strict network tiering:

```
               [ Public Internet ]
                       |
               [ DNS (Cloudflare) ]
                       |
             [ TLS 1.2/1.3 Termination ]
                       |
            +---------------------+
            |     Public Port     |
            |     80 (Redirect)   |
            |     443 (HTTPS/WSS) |
            +----------+----------+
                       |
          [ Nginx Reverse Proxy & WAF ]
          (Rate Limiting: API 30r/s, Auth 5r/m)
          (HSTS, CSP, X-Frame-Options, SSL stapling)
                       |
       +---------------+---------------+
       |                               |
[ frontend-network ]           [ backend-network ]
       |                               |
+--------------+               +---------------+
| Frontend     |               | FastAPI       |
| SPA (Nginx)  |               | Backend API   |
| (port 80)    |               | (port 8000)   |
+--------------+               +-------+-------+
                                       |
                       +---------------+---------------+
                       |                               |
              [ data-network ]                [ monitoring-net ]
              (INTERNAL ONLY)                 (INTERNAL ONLY)
                       |                               |
             +---------+---------+          +----------+----------+
             |                   |          |          |          |
      +------+------+     +------+-----+ +--+---+   +--+---+  +---+----+
      | PostgreSQL  |     | Redis 7    | | Prom |   | Alert|  | Grafana|
      | 16 (SCRAM)  |     | (Auth +    | | (9090|   | (9093|  | (3000) |
      | (port 5432) |     |  LRU RAM)  | +------+   +------+  +---+----+
      +-------------+     +------------+                          |
             |                   |                          (Proxied via
      [ Named Volume ]    [ Named Volume ]                   Nginx /admin)
      (postgres_data)     (redis_data)
```

---

## 2. Port & Firewall Security Matrix

| Component | Port | Protocol | Binding / Scope | Access Control Rule |
|-----------|------|----------|-----------------|---------------------|
| Nginx Public HTTP | 80 | TCP | `0.0.0.0:80` | Public Internet -> 301 Redirect to HTTPS |
| Nginx Public HTTPS | 443 | TCP | `0.0.0.0:443` | Public Internet -> TLS 1.2/1.3 Only |
| Frontend SPA | 80 | TCP | `frontend-network` only | Nginx reverse proxy only |
| Backend API | 8000 | TCP | `backend-network` only | Nginx reverse proxy only (No host bind) |
| PostgreSQL | 5432 | TCP | `data-network` (Internal) | Backend container only (No host bind) |
| Redis | 6379 | TCP | `data-network` (Internal) | Backend container only (No host bind) |
| Prometheus | 9090 | TCP | `monitoring-network` | Grafana & internal scrapers only |
| Alertmanager | 9093 | TCP | `monitoring-network` | Prometheus alerts only |
| Grafana | 3000 | TCP | `monitoring-network` | Proxied via Nginx under authenticated route |

> [!CAUTION]
> Neither PostgreSQL (5432) nor Redis (6379) expose ports to the host system. They are unreachable from the public internet or external VPC interfaces.

---

## 3. Technology Stack & Provider Evaluation

| Dimension | AWS | Google Cloud (GCP) | Microsoft Azure | Single-Server VPS (Recommended for SIH) |
|-----------|-----|-------------------|-----------------|-----------------------------------------|
| Compute Service | ECS / EKS / EC2 | Cloud Run / GKE / GCE | Container Apps / AKS | Ubuntu 22.04 LTS + Docker Engine |
| Managed Database | RDS PostgreSQL | Cloud SQL for PostgreSQL | Azure Database for PG | Containerized PostgreSQL 16 + automated backup cron |
| Managed Cache | ElastiCache Redis | Memorystore Redis | Azure Cache for Redis | Containerized Redis 7 Alpine with password + LRU |
| Reverse Proxy | AWS ALB | Cloud Load Balancing | Azure App Gateway | Nginx Alpine (TLS + Rate Limiting + WebSockets) |
| Metrics / Observability | CloudWatch | Cloud Monitoring | Azure Monitor | Prometheus + Grafana + Alertmanager |
| Complexity | High (IAM, VPC, NAT) | Moderate (VPC, IAM) | High (ARM, VNet) | **Low & Self-Contained** |
| Estimated Cost / Month | ~$350 - $600 | ~$320 - $550 | ~$340 - $580 | **$40 - $80 (All-Inclusive)** |

### Architectural Decision:
For the Smart India Hackathon (SIH26104) and initial staging/production rollout, a **Hardened Single-Node Docker Compose Architecture** is selected:
1. Completely reproducible across cloud providers and bare-metal servers.
2. Zero cloud vendor lock-in.
3. Fully isolated Docker networks (`internal: true`) mimic multi-tier VPC security.
4. Smooth migration path: Container images are published to GHCR with cryptographic digests, enabling immediate deployment to AWS ECS/EKS or GCP GKE whenever enterprise multi-region scaling is funded.

---

## 4. Container Life-Cycle & Operational Controls

- **Immutable Digests**: Production releases run only verified images (e.g. `ghcr.io/org/backend@sha256:...`), rejecting mutable `:latest` tags.
- **Resource Constraints**:
  - Backend: `cpus: '4.0'`, `memory: 4G`
  - PostgreSQL: `cpus: '2.0'`, `memory: 2G`
  - Redis: `cpus: '1.0'`, `memory: 1G`
  - Nginx: `cpus: '1.0'`, `memory: 512M`
- **Graceful Shutdown**: All services configure `stop_grace_period: 30s` to drain in-flight audio buffers and database transactions.
- **Health Checks**: Automated interval probing (`/api/v1/health`) prevents traffic routing to unready replicas.

