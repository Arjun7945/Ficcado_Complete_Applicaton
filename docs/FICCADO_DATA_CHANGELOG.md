# FICCADO_DATA_CHANGELOG.md

Log of all edits to existing files in `crm/backend/ficcado_crm_backend` (Ficcado-Data).

> **Rule from `docs/Ficcadocompleterebuild.md`:**
> Prefer additive changes (new controllers, endpoints, services, and classes in new files). Editing existing methods or calls is allowed **only if truly necessary**, must be minimal and backward-compatible, and must be logged here. Full existing test suite must pass before and after.

---

## Change Log

| Date | File | Method / Location | Reason for Change | Why Additive Was Not Possible | Tested? |
|---|---|---|---|---|---|
| 2026-10-20 | `pom.xml` | Dependencies section | Add `spring-boot-starter-cache` and `spring-boot-starter-data-redis` for Phase 4 product catalog caching | Maven dependencies must be declared in root project `pom.xml` | Yes (All 49 unit/integration tests pass) |
| 2026-10-20 | `src/main/resources/application.yaml` | `spring.cache` & `spring.data.redis` | Configure Redis host, port, 10-minute TTL (600000ms), and disable null caching | Central configuration file for Spring Boot application settings | Yes |
| 2026-10-20 | `src/main/java/com/aps/ficcado_crm_backend/security/SecurityConfig.java` | Line 67 (`filterChain`) | Update `.requestMatchers("/api/public/reviews/**")` to `.requestMatchers("/api/public/**").permitAll()` | Security filter chain owns route authorization for unauthenticated storefront requests | Yes (Verified unauthenticated access via MockMvc) |
| 2026-10-20 | `src/main/java/com/aps/ficcado_crm_backend/service/ItemService.java` | `createItem`, `updateItem`, `toggleStatus`, `deleteItem` | Add `@CacheEvict(value = {"public-products", "public-product-id", "public-product-slug", "public-categories"}, allEntries = true)` | Real-time cache invalidation requires hooking into item mutation methods in the existing service | Yes (All 49 tests pass, existing ItemService tests 100% green) |
| 2026-10-20 | `src/main/java/com/aps/ficcado_crm_backend/repository/CustomerRepository.java` | Interface methods | Add `findByEmailIdIgnoreCase(String email)` and `existsByEmailIdIgnoreCase(String email)` | Query methods required for customer login, registration, and takeover checks | Yes (All 58 tests pass) |
| 2026-10-20 | `src/main/java/com/aps/ficcado_crm_backend/repository/SaleRepository.java` | Interface methods | Add `findByCustomerIdOrderByCreatedAtDesc(Long customerId)` | Query method required for customer order history retrieval | Yes (All 58 tests pass) |
| 2026-10-20 | `src/main/java/com/aps/ficcado_crm_backend/security/SecurityConfig.java` | `filterChain` & beans | Register `CustomerJwtAuthenticationFilter` before `JwtAuthenticationFilter`, permit `/api/customer/auth/**` & `/api/internal/**`, require `ROLE_CUSTOMER` for `/api/customer/**` | Security filter chain configuration must define route authorization rules | Yes (MockMvc customer and admin tests pass) |
| 2026-10-20 | `src/main/java/com/aps/ficcado_crm_backend/service/AuthService.java` | `getAdminFromToken` | Add explicit check: if token role is `ROLE_CUSTOMER`, reject with `Invalid admin credentials` | Enforces strict mutual role isolation so customer tokens cannot access admin/CRM endpoints | Yes (Verified with test suite) |
| 2026-10-20 | `src/main/java/com/aps/ficcado_crm_backend/repository/SaleRepository.java` | Interface methods | Add `findByTransactionId(String transactionId)` | Query method required for idempotent payment transaction lookup in Ficcado-Data | Yes (InternalOrderControllerTest & 62 tests pass) |
| 2026-10-20 | `src/test/java/com/aps/ficcado_crm_backend/OpenApiExporterTest.java` | `exportOpenApiSpec` | Only write OpenAPI spec to `crm/docs/openapi.json` | Keeps `crm/ficcado_crm_app` strictly read-only and bit-identical to `origin/fic/crm` | Yes (Test passes and crm_app git diff is empty) |

---

## Additive Additions (New Files / Endpoints)

| Date | New File / Endpoint | Description | Verification |
|---|---|---|---|
| 2026-10-20 | `config/CacheConfig.java` | Resilient cache configuration implementing `CachingConfigurer` with 10-minute TTL and graceful degradation `CacheErrorHandler` (catches Redis errors and falls back to database with zero downtime) | Tested in unit and integration test runs without Redis dependency |
| 2026-10-20 | `dto/PublicProductDto.java` | Sanitized public DTOs (`PublicProductResponse`, `PublicCategoryResponse`, `PublicReviewResponse`, `ApiResponse<T>`) redacting cost price, vendor info, and exposing boolean availability (`inStock`, `sizeStock`) rather than exact warehouse stock counts | Verified by `PublicProductServiceTest` |
| 2026-10-20 | `service/PublicProductService.java` | Storefront catalog service providing active items with size availability, category normalization, URL slug generation, fallback image resolution, category item counts, and anonymized reviews | 5 unit tests in `PublicProductServiceTest` (100% pass) |
| 2026-10-20 | `controller/PublicProductController.java` | REST Controller exposing: <br>- `GET /api/public/products`<br>- `GET /api/public/products/{id}`<br>- `GET /api/public/products/by-slug/{slug}`<br>- `GET /api/public/products/{id}/reviews`<br>- `GET /api/public/categories` | 6 MockMvc tests in `PublicProductControllerTest` (100% pass) |
| 2026-10-20 | `PublicProductServiceTest.java` | Unit tests for catalog filtering, stock calculation, slug resolution, and review anonymization | Passed in `.\mvnw.cmd test` |
| 2026-10-20 | `PublicProductControllerTest.java` | WebMvc tests for all public storefront controller endpoints | Passed in `.\mvnw.cmd test` |
| 2026-10-20 | `dto/CustomerAuthDto.java` | Customer authentication, registration, profile, address, order history, and internal service-to-service handshake DTOs | Tested in `CustomerAuthServiceTest` |
| 2026-10-20 | `service/CustomerAuthService.java` | BCrypt password hashing, customer registration, offline CRM customer takeover protection (requiring OTP validation), Customer JWT generation (`ROLE_CUSTOMER`, audience `ficcado-customer`), validation, and logout token revocation via `RevokedToken` | 4 unit tests in `CustomerAuthServiceTest` (100% pass) |
| 2026-10-20 | `security/CustomerJwtAuthenticationFilter.java` | Security filter parsing `ficcado_customer_session` HTTP-only cookie and Bearer tokens for customer requests | Tested via MockMvc |
| 2026-10-20 | `controller/CustomerAuthController.java` | REST Controller exposing: <br>- `POST /api/customer/auth/register`<br>- `POST /api/customer/auth/login`<br>- `POST /api/customer/auth/logout`<br>- `GET /api/customer/auth/me` | 3 MockMvc tests in `CustomerAuthControllerTest` (100% pass) |
| 2026-10-20 | `controller/CustomerProfileController.java` | REST Controller exposing: <br>- `GET /api/customer/profile`<br>- `PUT /api/customer/profile`<br>- `POST /api/customer/addresses`<br>- `DELETE /api/customer/addresses/{id}` | Tested via CustomerAuth and MockMvc |
| 2026-10-20 | `controller/CustomerOrderController.java` | REST Controller exposing: <br>- `GET /api/customer/orders` (strict ownership check by authenticated customer ID) | Tested with mock sales logs |
| 2026-10-20 | `controller/InternalCustomerController.java` | Internal service-to-service REST endpoint `POST /api/internal/customer/otp-login` guarded by constant-time `X-Internal-Secret` comparison for OTP login handshakes | 2 MockMvc tests in `InternalCustomerControllerTest` (100% pass) |
| 2026-10-20 | `CustomerAuthServiceTest.java` | Unit tests for customer registration, duplicate handling, takeover protection, and password authentication | Passed in `.\mvnw.cmd test` |
| 2026-10-20 | `CustomerAuthControllerTest.java` | MockMvc integration tests for customer registration, login, and `/me` | Passed in `.\mvnw.cmd test` |
| 2026-10-20 | `InternalCustomerControllerTest.java` | MockMvc integration tests for internal service handshake security | Passed in `.\mvnw.cmd test` |
| 2026-10-20 | `dto/InternalOrderDto.java` | Internal service-to-service DTOs (`CreatePaidSaleRequest`, `InternalOrderLineItem`, `InternalSaleResponse`) for verified online orders | Tested in `InternalOrderControllerTest` |
| 2026-10-20 | `controller/InternalOrderController.java` | Internal service-to-service REST endpoint `POST /api/internal/orders/create-paid-sale` guarded by constant-time `X-Internal-Secret` comparison, transaction idempotency, item & inventory stock validation (`inventoryRepository.findByItemIdAndSize`), unique invoice generation (`FIC-INV-[timestamp]`), and automatic stock deduction | 4 tests in `InternalOrderControllerTest` (100% pass) |
| 2026-10-20 | `InternalOrderControllerTest.java` | WebMvc integration tests for internal order creation, stock deduction, unauthorized secret rejection, and out-of-stock 409 conflict handling | Passed in `.\mvnw.cmd test` (62/62 pass) |


