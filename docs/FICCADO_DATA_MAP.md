# FICCADO_DATA_MAP.md

Comprehensive architectural map of **Ficcado-Data** (`crm/backend/ficcado_crm_backend`), produced during Phase 0 Discovery.

---

## 1. Component Overview

- **Framework:** Spring Boot 3.4.3
- **Language / Runtime:** Java 21 (LTS)
- **Build Tool:** Apache Maven 3.9.16 (via Maven Wrapper `mvnw.cmd` / `mvnw`)
- **Database:** PostgreSQL (`ficcado_data`), managed via Flyway (`db/migration`)
- **Port:** Default in `application.yaml` is `${PORT:8081}` (Target architecture runs on **8080**)
- **Security:** Spring Security 6 with stateless JWT authentication + token revocation denylist
- **Storage:** Cloudflare R2 / AWS S3 API (`software.amazon.awssdk:s3:2.26.29`) for product media

---

## 2. Inventory of Entities, Repositories, Services, and Controllers

### Entities (`com.aps.ficcado_crm_backend.entity`)
| Entity | Table Name | Purpose |
|---|---|---|
| `Item` | `items` | Product catalog item (name, type, price, cost, status, averageRating, reviewCount) |
| `ItemSize` | `item_sizes` | Available clothing sizes per item (S, M, L, XL, etc.) |
| `ItemImage` | `item_images` | Cloudflare R2 image references with display order (order 1 = cover thumbnail) |
| `Inventory` | `inventory` | Stock tracking per item and size (available, damaged, reserved, thresholds) |
| `InventoryHistory` | `inventory_history` | Audit log of all stock changes (SALE, RESTOCK, RETURN, REPLACEMENT, etc.) |
| `Customer` | `customers` | Customer records with phone (unique), email, password_hash, verification timestamps |
| `CustomerAddress` | `customer_addresses` | Child table for multiple customer delivery addresses with default flag |
| `Sale` | `sales` | Sale transactions, invoice numbers, totals, fulfillment status, payment details |
| `SaleLineItem` | `sale_line_items` | Individual line items per sale linked to catalog `Item` |
| `SalesLog` | `sales_log` | Chronological activity log for sale state progression |
| `Review` | `reviews` | Customer product reviews (star rating 1-5, comment, status) |
| `ReviewToken` | `review_tokens` | Single-use expiring tokens for verified purchase customer reviews |
| `RevokedToken` | `revoked_tokens` | Denylist table storing SHA-256 hashes of revoked JWT tokens for per-device logout |
| `Admin` | `admins` | CRM admin credentials, roles (SUPERADMIN, ADMIN, WAREHOUSE_HANDLER), bcrypt password |
| `ActivityLog` | `activity_logs` | Admin action auditing |
| `KeepNote` | `keep_notes` | Internal CRM team sticky notes |
| `Replacement` | `replacements` | Replacement workflow records |
| `ReplacementOldItem` | `replacement_old_items` | Returned items in replacement |
| `ReplacementNewItem` | `replacement_new_items` | New items dispatched in replacement |
| `ReturnRefund` | `return_refunds` | Return and refund workflow records |
| `ReturnRefundItem` | `return_refund_items` | Items involved in return/refund |
| `DamagedProduct` | `damaged_products` | Logged damaged garments |
| `Expense` | `expenses` | Operating expenses |
| `Vendor` | `vendors` | Garment suppliers and manufacturers |
| `VendorContactNumber` | `vendor_contact_numbers` | Multi-contact phone records for vendors |
| `VendorPayment` | `vendor_payments` | Payout tracking to vendors |
| `WarehouseAllocation` | `warehouse_allocations` | Stock allocations assigned to warehouse handlers |

---

### Repositories (`com.aps.ficcado_crm_backend.repository`)
- `ItemRepository`: CRUD, `findByItemNameIgnoreCase`, active item queries
- `ItemImageRepository`: `findByItemIdOrderByDisplayOrderAsc`, reordering queries
- `InventoryRepository`: `findByItemIdAndSize`, stock balance lookups
- `InventoryHistoryRepository`: history queries by item and invoice
- `CustomerRepository`: `findByPhoneNumber`, `findByPhoneNumberEndingWith`, `existsByPhoneNumber`
- `SaleRepository`: `findByInvoiceNumber`, keyset pagination (`findPageBefore`), query search
- `SaleLineItemRepository`: line items by sale
- `SalesLogRepository`: logs by sale
- `ReviewRepository`: reviews by item, status filters
- `ReviewTokenRepository`: `findByTokenHash`, expiry check
- `RevokedTokenRepository`: `findByTokenHash`, cleanup queries
- `AdminRepository`: `findByEmailIdIgnoreCase`, active admin checks
- `ActivityLogRepository`, `KeepNoteRepository`, `ReplacementRepository`, `ReturnRefundRepository`, `DamagedProductRepository`, `ExpenseRepository`, `VendorRepository`, `VendorPaymentRepository`, `WarehouseAllocationRepository`

---

### Services (`com.aps.ficcado_crm_backend.service`)
- `ItemService`: Item lifecycle, size associations, status toggle (ACTIVE/INACTIVE)
- `ItemImageService`: Uploads to R2 via `MediaStorageService`, thumbnail generation, ordering
- `MediaStorageService`: AWS S3 SDK wrapper targeting Cloudflare R2
- `InventoryService`: Stock deduction, restocking, damage recording, warehouse deduction
- `SaleService`: Complete sale creation, item resolution, stock deduction, customer upsert, completion, replacement/refund locking
- `CustomerService`: Phone lookup (trailing 10 digits match), upsert on sale creation, address list update
- `AuthService`: Admin authentication via bcrypt, JWT issuance (HS256), token validation, per-device token revocation denylist, hourly token cleanup
- `ReviewService`: Token validation, review submission, denormalized average rating and count computation on `Item`
- `SalesLogService`, `ActivityLogService`, `ProfitabilityService`, `ReplacementService`, `ReturnRefundService`, `DamagedProductService`, `ExpenseService`, `VendorService`, `WarehouseService`, `LogRetentionService`

---

### Controllers (`com.aps.ficcado_crm_backend.controller`)
- `ItemController` (`/api/items`): `GET /`, `GET /active`, `GET /{id}`, `POST /`, `PUT /{id}`, `PATCH /{id}/status`, `DELETE /{id}`
- `ItemImageController` (`/api/items/{id}/images`): `GET /`, `POST /upload`, `DELETE /{imageId}`, `PUT /reorder`
- `SaleController` (`/api/sales`): `GET /`, `GET /{id}`, `GET /by-invoice/{invoiceNumber}`, `GET /search`, `POST /`, `PUT /{id}`, `POST /{id}/add-items`, `POST /{id}/request-replacement`, `POST /{id}/request-refund`, `POST /{id}/complete`
- `CustomerController` (`/api/customer-info`): `GET /lookup`, `GET /all`, `GET /{id}`, `PUT /update`
- `AuthController` (`/api/auth`): `POST /login`, `POST /logout`, `GET /me`, `POST /change-password`
- `ReviewController` (`/api/items/{id}/reviews`): `GET /`
- `ReviewSubmissionController` (`/api/public/reviews`): `GET /validate/{token}`, `POST /submit` *(Public — no auth)*
- `InventoryController`, `LogsController`, `ReplacementController`, `ReturnRefundController`, `ReportsController`, `AdminController`, `DamagedProductController`, `ExpenseController`, `VendorController`, `WarehouseController`

---

## 3. Product-Related Entities & Read Methods

### Entities
1. `Item`: ID, name, item type (e.g., T-Shirts, Hoodies), retail price (`priceOfItem`), cost price, status (`ACTIVE`/`INACTIVE`), average rating, review count, timestamps.
2. `ItemSize`: Available sizes (`S`, `M`, `L`, `XL`, `XXL`, etc.) linked to `Item`.
3. `ItemImage`: Full-resolution and thumbnail webp URLs on Cloudflare R2, display order (position 1 is primary display image), caption.
4. `Inventory`: Real-time quantity by size for stock checks.

### Controller Methods
- `GET /api/items`: Returns all items (active and inactive) with sizes and image URLs. *(Requires Admin auth)*
- `GET /api/items/active`: Returns active catalog items with sizes. *(Requires Admin auth)*
- `GET /api/items/{id}`: Returns single item with sizes and images. *(Requires Admin auth)*
- `GET /api/items/{id}/images`: Returns image strip for item ordered by `display_order`. *(Requires Admin auth)*
- `GET /api/items/{id}/reviews`: Returns approved customer reviews for the item. *(Requires Admin auth)*

> **Key Architectural Finding / Gap for Website:**
> Currently all product read endpoints under `/api/items` require Admin authentication. The website requires read-only access to active products, details, and images without administrative credentials. In Phase 4, an additive website-accessible read controller (e.g. `/api/public/products` or gateway-scoped website role) must expose these methods.

---

## 4. Sale Creation Method, Parameters & Updates

### Method Signature
- `SaleService.createSale(Sale sale, Admin performedByAdmin)` in `crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/service/SaleService.java`.
- Triggered by `POST /api/sales` via `SaleController.create(@Valid @RequestBody SaleDto.SaleRequest request, @AuthenticationPrincipal Admin admin)`.

### Parameters
- `Sale sale`: Entity containing:
  - `invoiceNumber` (e.g., `FIC-A0042` or custom prefix)
  - `customerName`, `customerPhoneNumber`, `customerEmail`, `customerAddress`
  - `lineItems` (List of `SaleLineItem`: `item`, `itemName`, `size`, `quantity`, `unitPrice`, `lineTotal`)
  - `subtotal`, `deliveryCharge`, `discountAmount`, `grandTotal`
  - `modeOfPayment` (e.g. `ONLINE`, `COD`, `UPI`)
  - `transactionId` (Razorpay payment ID or gateway transaction reference)
  - `paymentStatus` (`PaymentStatus.PAID`, `PENDING`, `FAILED`)
  - `saleStatus` (`SaleStatus.PENDING`, `ORDER_CONFIRMED`, `SHIPPED`, `COMPLETED`, etc.)
  - `fulfilmentSource` (`FulfilmentSource.TAKE_FROM_INVENTORY` by default)
  - `courierName`, `trackingNumber`, `shippingNotes`
- `performedByAdmin`: `Admin` entity reference, or `null` for automated / system sales (the service explicitly handles `performedByAdmin == null` gracefully).

### Side Effects & What Gets Updated
1. **Catalog Item Resolution:** Resolves each line item against `ItemRepository.findByItemNameIgnoreCase`. Throws exception if item is not found.
2. **Stock Deduction:** Calls `inventoryService.deductFromInventory(itemId, size, quantity, invoiceNumber, "SALE", performedByAdmin)`. Decrements available stock and increments sold stock.
3. **Inventory Audit History:** Inserts record in `InventoryHistory` with transaction type `SALE`, linking the invoice number and quantity changed.
4. **Customer Upsert:** Calls `customerService.upsertOnSaleCreation(phoneNumber, customerName, email, address, performedByAdmin)`. If new, creates `Customer` and `CustomerAddress`. If existing, increments `totalOrdersPlaced` and adds address if new.
5. **Sales Record Persisted:** Saves `Sale` and its `SaleLineItem` rows to `sales` and `sale_line_items` tables.
6. **Sales Log:** Writes initial lifecycle log into `sales_log`.
7. **Return Value:** Returns fully saved and populated `Sale` entity (with database ID and timestamps).

---

## 5. Customer Creation, Lookup, Password Storage & Verification

### Customer Model (`Customer.java`)
- `id`: Auto-incrementing primary key
- `customerName`: Full name
- `phoneNumber`: Unique index, primary customer key for CRM
- `emailId`: Primary customer key for website e-commerce
- `totalOrdersPlaced`: Counter incremented on every sale
- `passwordHash`: Bcrypt hash (pre-existing nullable column ready for website registration)
- `emailVerifiedAt`: Timestamp of email verification (pre-existing nullable column)
- `phoneVerifiedAt`: Timestamp of phone verification (pre-existing nullable column)
- `addresses`: One-to-many relationship with `CustomerAddress` (`address`, `isDefault`, `createdAt`)

### Lookup Methods
- `CustomerService.findByPhone(phone)`: Finds by exact phone or suffix matching last 10 digits.
- `CustomerRepository.findByPhoneNumber(phoneNumber)`.

### Password Storage & Verification
- Hashing Algorithm: Spring Security `BCryptPasswordEncoder` (10 rounds standard).
- Verification: `passwordEncoder.matches(rawPassword, storedHash)`.

### Gap Analysis for Phase 5 (Website Auth)
1. `CustomerRepository` needs `findByEmailIdIgnoreCase(String emailId)` and `existsByEmailIdIgnoreCase(String emailId)`.
2. Ficcado-Data currently only has authentication for `Admin` under `/api/auth/login`. A customer authentication service/controller (or additive customer auth endpoints) is needed for password verification and customer JWT issuance.

---

## 6. Security, JWT & CORS Configuration

### Security Architecture (`SecurityConfig.java`)
- **Stateless Session:** `SessionCreationPolicy.STATELESS` — no server-side HTTP session.
- **CSRF:** Disabled (stateless bearer token / httpOnly token model).
- **CORS:** Handled via `CorsConfigurationSource` using `app.cors.allowed-origins` configured from `${CORS_ALLOWED_ORIGINS}`. Default includes `http://localhost:3000`. Supports credentials, standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`), and maxAge 3600s.

### JWT Filter (`JwtAuthenticationFilter.java`)
- Checks token in order:
  1. Cookie: `ficcado_session`
  2. Header: `Cookie: ficcado_session=...`
  3. Header: `Authorization: Bearer <token>`
- Token Revocation Denylist: Checks `AuthService.isTokenRevoked(token)`. If the SHA-256 hash exists in `revoked_tokens` and has not expired, request is treated as unauthenticated.
- Signing: Symmetric HS256 HMAC key generated from `${JWT_SECRET}`. Default expiration is 24 hours (`86400000 ms`).

### Existing Permitted Endpoints (Unauthenticated)
- `POST /api/auth/login`
- `GET/POST /api/public/reviews/**`
- `GET/POST /v3/api-docs/**`
- `GET /swagger-ui/**`, `GET /swagger-ui.html`
- `GET /actuator/health`
- All other endpoints require authenticated admin role (`ROLE_SUPERADMIN`, `ROLE_ADMIN`, `ROLE_WAREHOUSE_HANDLER`).
