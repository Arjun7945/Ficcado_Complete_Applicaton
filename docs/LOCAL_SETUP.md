# Ficcado Application Suite — Local Machine Setup & Runbook

This guide describes how to run all components of the Ficcado microservices platform locally.
Starting with **Part 2**, all infrastructure services (**PostgreSQL 18 container, Redis Session, Redis Cache, RabbitMQ, and the NGINX API Gateway**) run inside **Docker Compose** (`infra/docker-compose.yml`), while application services (Java Spring Boot backends and Next.js frontends) run natively on the host machine.

---

## 1. System Architecture & Port Allocation

### Infrastructure Services (Docker Compose — `infra/`)

| Service Name | Container Name | Host Port | Container Port | Base Image (Pinned) | Purpose |
|---|---|---|---|---|---|
| **PostgreSQL** | `ficcado-postgres` | **`5433`** | `5432` | `postgres:18.6-alpine` | New databases: `ficcado_website_data`, `ficcado_payment_gateway_data`, and all test databases (`*_test`) |
| **Redis Session** | `ficcado-redis-session` | **`6380`** | `6379` | `redis:7.4.2-alpine` | Customer sessions only (`noeviction` policy, password protected) |
| **Redis Cache** | `ficcado-redis-cache` | **`6379`** | `6379` | `redis:7.4.2-alpine` | Storefront catalog & product cache (`allkeys-lru` policy, 256MB cap) |
| **RabbitMQ AMQP** | `ficcado-rabbitmq` | **`5672`** | `5672` | `rabbitmq:4.0.5-management-alpine` | Asynchronous message broker for orders, payments & notifications |
| **RabbitMQ Management** | `ficcado-rabbitmq` | **`15672`** | `15672` | `rabbitmq:4.0.5-management-alpine` | Web management dashboard (`http://localhost:15672`) |
| **API Gateway** | `ficcado-gateway` | **`8000`** | `8000` | `nginx:1.27.4-alpine` | Reverse proxy, security gate, and single entry point (`/api/internal/**` blocked) |
| **Prometheus** *(profile: monitoring)* | `ficcado-prometheus` | **`9090`** | `9090` | `prom/prometheus:v2.54.1` | Metrics scraper for Spring Boot actuator endpoints |
| **Grafana** *(profile: monitoring)* | `ficcado-grafana` | **`3002`** | `3000` | `grafana/grafana:11.2.2` | Operational metrics visualization dashboard |

### Application Services (Host Machine)

| Application / Service | Directory Location | Local Port | Tech Stack | Notes |
|---|---|---|---|---|
| **Existing PostgreSQL** | Native Windows Service | **`5432`** | PostgreSQL 18.6 | Holds existing `ficcado_data` (CRM database). Never modified, dumped, or used for tests. |
| **Ficcado-Data** | `crm/backend/ficcado_crm_backend/` | **`8081`** | Spring Boot 3.4.3, Java 21, Maven | Core catalog, inventory, sales, admin CRM backend |
| **Ficcado-Website-Data** | `website/backend/ficcado_website_data/` | **`8082`** | Spring Boot 3.4.3, Java 21, Maven | Enquiries, complaints, OTP, wishlist service |
| **Payment Gateway** | `payment/backend/ficcado_payment_gateway_data/` | **`8083`** | Spring Boot 3.4.3, Java 21, Maven | Razorpay orders, webhook verification, reconciliation |
| **Website Frontend** | `website/frontend/` | **`3000`** | Next.js 16, React 19, Vanilla CSS / Tailwind | Customer storefront |
| **CRM Frontend** | `crm/ficcado_crm_app/` | **`3001`** | Next.js 16, React 19, Tailwind CSS | Backoffice admin panel |

---

## 2. Prerequisites

1. **Docker Desktop:** Docker engine and Compose v2 installed (`docker --version`, `docker compose version`). Ensure Docker Desktop is running.
2. **Java Development Kit (JDK):** Java 21 LTS installed (`java -version`).
3. **Node.js:** Node.js 20+ LTS and npm (`node -v`, `npm -v`).
4. **Existing PostgreSQL:** Running on port `5432` holding the `ficcado_data` database.

---

## 3. Docker Infrastructure Setup (`infra/`)

### 3.1 Create Infrastructure Environment File
Copy the example environment file to `infra/.env` and define your local passwords:
```powershell
cp infra/.env.example infra/.env
```
Open `infra/.env` in your editor and adjust the passwords:
- `POSTGRES_PASSWORD`: Root password for the Compose PostgreSQL container.
- `WEBSITE_DB_PASSWORD`: Password for `ficcado_website_user`.
- `PAYMENT_DB_PASSWORD`: Password for `ficcado_payment_user`.
- `TEST_DB_PASSWORD`: Password for `ficcado_test_user` (owns `ficcado_data_test`, `ficcado_website_data_test`, `ficcado_payment_gateway_data_test`).
- `REDIS_SESSION_PASSWORD`: Password for Session Redis (port 6380).
- `REDIS_CACHE_PASSWORD`: Password for Cache Redis (port 6379).
- `RABBITMQ_USER` and `RABBITMQ_PASSWORD`: Credentials for RabbitMQ.

### 3.2 Start Infrastructure Containers
```powershell
# From the repository root
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
```

### 3.3 Check Infrastructure Status & Health
```powershell
docker compose -f infra/docker-compose.yml ps
```
All core services (`ficcado-postgres`, `ficcado-redis-session`, `ficcado-redis-cache`, `ficcado-rabbitmq`, `ficcado-gateway`) should report status `Up (healthy)`.

### 3.4 Infrastructure Maintenance & Operations
- **View logs for a service:**
  ```powershell
  docker compose -f infra/docker-compose.yml logs -f [service_name]
  # Example: docker compose -f infra/docker-compose.yml logs -f postgres
  ```
- **Restart a single service:**
  ```powershell
  docker compose -f infra/docker-compose.yml restart [service_name]
  ```
- **Stop all infrastructure:**
  ```powershell
  docker compose -f infra/docker-compose.yml down
  ```
- **Reset a service volume (clean slate):**
  ```powershell
  docker compose -f infra/docker-compose.yml down -v
  docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
  ```
- **Start with monitoring (Prometheus + Grafana):**
  ```powershell
  docker compose -f infra/docker-compose.yml --profile monitoring --env-file infra/.env up -d
  ```

---

## 4. Application Environment Configuration

Each application service running on the host consumes configuration from environment variables.

### 4.1 Ficcado-Data (CRM Backend — Port 8081)
- `PORT`: `8081`
- `DB_URL`: `jdbc:postgresql://localhost:5432/ficcado_data` (uses existing host PostgreSQL)
- `DB_USERNAME`: `postgres`
- `DB_PASSWORD`: (your host PostgreSQL password)
- `REDIS_HOST`: `localhost`
- `REDIS_PORT`: `6379` (Cache Redis)
- `REDIS_PASSWORD`: (from `infra/.env` `REDIS_CACHE_PASSWORD`)
- `REDIS_SESSION_HOST`: `localhost`
- `REDIS_SESSION_PORT`: `6380` (Session Redis)
- `REDIS_SESSION_PASSWORD`: (from `infra/.env` `REDIS_SESSION_PASSWORD`)
- `TEST_DB_URL`: `jdbc:postgresql://localhost:5433/ficcado_data_test` (Compose PostgreSQL)
- `TEST_DB_USER`: `ficcado_test_user`
- `TEST_DB_PASSWORD`: (from `infra/.env` `TEST_DB_PASSWORD`)

### 4.2 Ficcado-Website-Data (Port 8082)
- `PORT`: `8082`
- `DB_URL`: `jdbc:postgresql://localhost:5433/ficcado_website_data` (Compose PostgreSQL)
- `DB_USERNAME`: `ficcado_website_user`
- `DB_PASSWORD`: (from `infra/.env` `WEBSITE_DB_PASSWORD`)
- `RABBITMQ_HOST`: `localhost`
- `RABBITMQ_PORT`: `5672`
- `RABBITMQ_USERNAME`: (from `infra/.env` `RABBITMQ_USER`)
- `RABBITMQ_PASSWORD`: (from `infra/.env` `RABBITMQ_PASSWORD`)
- `TEST_DB_URL`: `jdbc:postgresql://localhost:5433/ficcado_website_data_test` (Compose PostgreSQL)
- `TEST_DB_USER`: `ficcado_test_user`
- `TEST_DB_PASSWORD`: (from `infra/.env` `TEST_DB_PASSWORD`)

### 4.3 Ficcado-Payment-Gateway-Data (Port 8083)
- `PORT`: `8083`
- `DB_URL`: `jdbc:postgresql://localhost:5433/ficcado_payment_gateway_data` (Compose PostgreSQL)
- `DB_USERNAME`: `ficcado_payment_user`
- `DB_PASSWORD`: (from `infra/.env` `PAYMENT_DB_PASSWORD`)
- `RABBITMQ_HOST`: `localhost`
- `RABBITMQ_PORT`: `5672`
- `RABBITMQ_USERNAME`: (from `infra/.env` `RABBITMQ_USER`)
- `RABBITMQ_PASSWORD`: (from `infra/.env` `RABBITMQ_PASSWORD`)
- `TEST_DB_URL`: `jdbc:postgresql://localhost:5433/ficcado_payment_gateway_data_test` (Compose PostgreSQL)
- `TEST_DB_USER`: `ficcado_test_user`
- `TEST_DB_PASSWORD`: (from `infra/.env` `TEST_DB_PASSWORD`)

---

## 5. Starting the Platform (Step-by-Step)

### Step 5.1: Start Infrastructure in Docker
```powershell
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
docker compose -f infra/docker-compose.yml ps
```

### Step 5.2: Start Ficcado-Data (Port 8081)
Open a new terminal:
```powershell
cd "crm\backend\ficcado_crm_backend"
.\mvnw.cmd spring-boot:run
```
Health Check: `http://localhost:8081/actuator/health`

### Step 5.3: Start Ficcado-Website-Data (Port 8082)
Open a new terminal:
```powershell
cd "website\backend\ficcado_website_data"
.\mvnw.cmd spring-boot:run
```
Health Check: `http://localhost:8082/actuator/health`

### Step 5.4: Start Ficcado-Payment-Gateway-Data (Port 8083)
Open a new terminal:
```powershell
cd "payment\backend\ficcado_payment_gateway_data"
.\mvnw.cmd spring-boot:run
```
Health Check: `http://localhost:8083/actuator/health`

### Step 5.5: Start Website Frontend (Port 3000)
Open a new terminal:
```powershell
cd "website\frontend"
npm install
npm run dev
```
Storefront URL: `http://localhost:3000`

### Step 5.6: Start CRM Frontend (Port 3001)
Open a new terminal:
```powershell
cd "crm\ficcado_crm_app"
npm install
npm run dev -- -p 3001
```
CRM Dashboard URL: `http://localhost:3001`

---

## 6. Verification & Health Check Commands

### 1. Test Gateway Health
```powershell
curl http://localhost:8000/health
```
Expected output:
```json
{"status":"UP","gateway":"Ficcado API Gateway","port":8000,"version":"1.0.0"}
```

### 2. Verify Internal Endpoint Protection
```powershell
curl -i http://localhost:8000/api/internal/test
```
Expected HTTP Status: `403 Forbidden`

### 3. Verify Redis Policies
- **Session Redis (must reject evictions):**
  ```powershell
  docker exec -it ficcado-redis-session redis-cli -a "<REDIS_SESSION_PASSWORD>" config get maxmemory-policy
  # Output: maxmemory-policy: noeviction
  ```
- **Cache Redis (must evict LRU):**
  ```powershell
  docker exec -it ficcado-redis-cache redis-cli -a "<REDIS_CACHE_PASSWORD>" config get maxmemory-policy
  # Output: maxmemory-policy: allkeys-lru
  ```

### 4. Verify RabbitMQ Management
Open `http://localhost:15672` in your browser. Log in with `RABBITMQ_USER` and `RABBITMQ_PASSWORD`.
