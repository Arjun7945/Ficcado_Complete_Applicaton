# Ficcado Architecture Scaling Notes (AUD-11 Guidance)

## 1. Connection Capacity & Thread Pool Sizing

### Current Configuration & Capacity Budget
Across all three Ficcado backend services, explicit environment-driven limits are configured for HikariCP connection pools and Tomcat request threads:

| Service | Port | Hikari Max Pool (`HIKARI_MAX_POOL_SIZE`) | Hikari Min Idle (`HIKARI_MIN_IDLE`) | Tomcat Max Threads (`TOMCAT_MAX_THREADS`) | Accept Queue (`TOMCAT_ACCEPT_COUNT`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`ficcado_crm_backend`** | 8081 | 30 | 5 | 100 | 100 |
| **`ficcado_website_data`** | 8082 | 15 | 2 | 100 | 100 |
| **`ficcado_payment_gateway_data`** | 8083 | 15 | 5 | 100 | 100 |
| **Total Connections Allocated** | — | **60** | **12** | **300** | — |

### PostgreSQL `max_connections` Limit
- **PostgreSQL Default Limit:** `100` connections.
- **Superuser Reserved Connections:** `3` (`superuser_reserved_connections`).
- **Available User Connections:** `97`.
- **Total Backend Allocation:** `60` connections.
- **Headroom Remaining:** `37` connections (reserved for Flyway migrations, admin sessions, replica streaming, and ad-hoc troubleshooting).

### Rationale for Pool and Thread Sizing
1. **HikariCP Max Connections (30 / 15 / 15):** Keeps total connections at 60, strictly below PostgreSQL's 97 usable connections, preventing `FATAL: remaining connection slots are reserved for non-superuser connections` under high load.
2. **Tomcat Threads (100 per service):** Reduced from default 200 to 100. Sizing 100 threads against a 15–30 connection pool ensures that database-bound requests execute quickly without thread starvation, context-switching thrashing, or pool exhaustion.
3. **Connection Timeouts (20s–30s):** Fails fast if the pool is saturated rather than holding client connections indefinitely.
4. **Leak Detection:** Defaults to 0 in production; parameterizable to 5000–10000ms (`HIKARI_LEAK_DETECTION_THRESHOLD`) in development/staging to identify queries or transactions holding connections abnormally long.

---

## 2. Storefront Catalog Caching (Redis)

### Architecture
- **Engine:** Redis (Port 6379, standalone or cluster).
- **TTL:** 10 minutes (`Duration.ofMinutes(10)`).
- **Graceful Degradation:** If Redis experiences network partition, latency spikes, or downtime, `CacheConfig.errorHandler()` catches cache exceptions and falls back directly to the PostgreSQL database without throwing errors to clients.
- **Eviction Invalidation:** When inventory or item details are updated via CRM (`ItemService.java`), `@CacheEvict(allEntries = true)` invalidates:
  - `public-products` (filtered listing and search results)
  - `public-product-id` (product detail by ID)
  - `public-product-slug` (product detail by slug)
  - `public-categories` (active categories list)
- **Micrometer Metrics:** Cache hits and misses are tracked via `InstrumentedCacheManager` and exported under:
  - `ficcado.cache.hits{cache="public-products"}`
  - `ficcado.cache.misses{cache="public-products"}`

---

## 3. PgBouncer Guidance: Scaling Beyond Single Node

### When is PgBouncer Needed?
PgBouncer is **not** required for single-instance container or local development deployments where total connections (60) are well within PostgreSQL's capacity (100).

PgBouncer becomes necessary when:
1. **Horizontal Pod Autoscaling (HPA) / Multi-Instance Deployments:** If 5 CRM replicas and 5 Website replicas are launched, `(5 * 30) + (5 * 15) = 225` connections, exceeding PostgreSQL's connection ceiling.
2. **High Concurrency Spikes (10,000+ Concurrent Web Clients):** PostgreSQL forks a backend process per connection (each consuming ~5–10MB RAM). Hundreds of idle or semi-active connections waste memory and degrade cache performance.
3. **Serverless Functions or Rapid Worker Scaling:** Ephemeral jobs opening short-lived connections without pooled reuse.

### How PgBouncer Fits in the Architecture
```
[ Website Backend (Replicas 1..N) ]  ───┐
[ CRM Backend     (Replicas 1..N) ]  ───┼──> [ PgBouncer (Port 6432) ] ──> [ PostgreSQL (Port 5432) ]
[ Payment Gateway (Replicas 1..N) ]  ───┘        pool_mode = transaction       max_connections = 100
```
- PgBouncer runs as a sidecar or dedicated service on port `6432`.
- Backends point their `DB_PORT` or `DB_URL` to `6432`.
- Backends maintain small client connection pools to PgBouncer.
- PgBouncer maintains a tight, fixed pool (e.g. 20–30 real connections) to PostgreSQL.

### Recommended Pooling Mode: Transaction Pooling (`pool_mode = transaction`)
- **Mode:** `pool_mode = transaction` provides the highest connection reuse efficiency. A server connection is returned to the pool as soon as each transaction completes (`COMMIT` or `ROLLBACK`).
- **Caveats & Best Practices:**
  - **No Session State:** Application code must not rely on `SET LOCAL`, session-level variables, or `LISTEN/NOTIFY` (RabbitMQ is used for messaging in Ficcado instead of PostgreSQL `LISTEN/NOTIFY`).
  - **Prepared Statements:** If using JDBC prepared statements with PgBouncer, either configure `max_prepared_statements` in PgBouncer (v1.21+) or configure the PostgreSQL JDBC driver parameter `prepareThreshold=0` to use direct execution without named server-side prepared statements.
  - **Reset Query:** Set `server_reset_query = DISCARD ALL` in `pgbouncer.ini` to guarantee connection state cleanliness between transactions.

### What to Change When Introducing PgBouncer
1. **Environment Variables:** Change `DB_PORT=6432` in backend environment files (`.env`).
2. **Hikari Pool Size:** Lower `HIKARI_MAX_POOL_SIZE` on backend instances (e.g., from 30 to 10 per instance) since PgBouncer handles the connection multiplexing.
3. **JDBC URL Parameters:** Append `?prepareThreshold=0` to JDBC connection URLs if named prepared statements are not supported by the PgBouncer configuration.
4. **Do NOT add PgBouncer to local Docker Compose** until production multi-node scaling is active.
