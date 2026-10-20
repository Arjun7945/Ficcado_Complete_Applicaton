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
