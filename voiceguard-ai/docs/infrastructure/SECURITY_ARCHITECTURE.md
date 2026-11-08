# VoiceGuard AI — Production Security Architecture
## Phase 32: Production Infrastructure (SIH26104)

---

## 1. Security Principles & Threat Model

VoiceGuard AI processes biometric audio data and real-time fraud detection signals. The infrastructure enforces strict zero-trust boundaries:
1. **Defense-in-Depth**: Multiple layers of defense (Network firewall -> Nginx reverse proxy -> Application middleware -> Database ACLs).
2. **Least Privilege**: Services run with minimum required permissions (non-root Docker users, read-only analytical DB roles).
3. **Data Minimization & Ephemeral Buffering**: Raw audio chunks live strictly in volatile RAM ring buffers unless explicit user consent has been logged.
4. **Biometric Data Protection**: Voice embeddings are treated as high-risk biometric identifiers, encrypted at rest and in transit.

---

## 2. Infrastructure Security Controls & Phase 25 Hardening Preservation

| Control Category | Implementation Details | Verification Test / Mechanism |
|------------------|------------------------|-------------------------------|
| **Public Surface Minimization** | Only ports 80 and 443 are exposed publicly. Ports 5432 (PostgreSQL) and 6379 (Redis) have NO host bindings. | `test_database_has_no_host_port_exposure`, `test_redis_has_no_host_port_exposure` |
| **Network Segmentation** | `data-network` and `monitoring-network` are marked `internal: true`. Containers in `data-network` cannot initiate outbound internet traffic. | `test_data_network_is_internal`, `test_monitoring_network_is_internal` |
| **Transport Layer Security (TLS)** | TLS 1.2 and 1.3 only; weak ciphers disabled. ECDHE-ECDSA and ECDHE-RSA with forward secrecy. Automated Let's Encrypt renewal. | `test_nginx_vhost_uses_tls_12_and_13_only` |
| **HTTP Security Headers** | - Strict-Transport-Security (`max-age=31536000; includeSubDomains; preload`)<br>- X-Frame-Options: `DENY`<br>- X-Content-Type-Options: `nosniff`<br>- Content-Security-Policy (CSP) restricting script execution<br>- Server tokens hidden (`server_tokens off;`) | `test_nginx_vhost_has_hsts`, `test_nginx_vhost_has_x_frame_options`, `test_nginx_vhost_has_content_security_policy`, `test_nginx_hides_server_version` |
| **Rate Limiting & Anti-Brute-Force** | - General API: 30 req/s per IP<br>- Authentication endpoints: 5 req/min per IP<br>- Audio upload endpoints: 2 req/s per IP<br>- WebSocket handshakes: 10 req/s per IP | `test_nginx_has_rate_limiting` |
| **Container User Security** | Backend container runs under non-root user `voiceguard` (UID 10001). Nginx drops privileges to `nginx` user. | Verified in `test_backend_dockerfile_uses_non_root_user` (Phase 30) |
| **Database Authentication** | PostgreSQL enforces `scram-sha-256` password hashing. `pg_hba.conf` explicitly rejects all non-whitelisted connections (`host all all all reject`). | `test_pg_hba_uses_scram_sha_256`, `test_pg_hba_rejects_all_other_connections` |
| **Secrets Management** | Production compose uses `${VAR:?}` syntax, aborting startup if mandatory secrets (`SECRET_KEY`, `DB_PASSWORD`, `REDIS_PASSWORD`) are missing or blank. No hardcoded default credentials. | `test_backend_requires_secret_key_env`, `test_no_infra_file_contains_hardcoded_passwords` |
| **Monitoring Dashboard Isolation** | Grafana disables anonymous authentication (`GF_AUTH_ANONYMOUS_ENABLED=false`) and self-signup (`GF_USERS_ALLOW_SIGN_UP=false`). | `test_grafana_disables_anonymous_access`, `test_grafana_disables_user_signup` |

---

## 3. Secret Rotation & Key Lifecycle

1. **`SECRET_KEY` (JWT Signing)**: Generated via cryptographically secure randomness (`python -c "import secrets; print(secrets.token_hex(32))"`). Rotated every 90 days.
2. **PostgreSQL Credentials**: Updated by altering role passwords and restarting the application stack gracefully.
3. **Redis Credentials**: Configured via `requirepass` in environment.
4. **TLS Certificates**: Automated renewal every 60 days via Let's Encrypt Certbot. Alertmanager triggers alert if expiration is within 14 days.

