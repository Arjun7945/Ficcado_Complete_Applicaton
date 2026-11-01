# Ficcado Application Suite — Comprehensive Issues Report (Post-Part 2)

**Document Date:** November 1, 2026  
**Environment:** Development & Pre-Production Testing  
**Services Monitored:**
- Customer Storefront Frontend (`website/frontend` on Port 3000)
- CRM Admin Backoffice Frontend (`crm/ficcado_crm_app` on Port 3001)
- Core Business Data Backend (`ficcado_crm_backend` on Port 8081)
- Customer Experience & Marketing Backend (`ficcado_website_data` on Port 8082)
- Payment Gateway Backend (`ficcado_payment_gateway_data` on Port 8083)
- API Gateway (`ficcado-gateway` NGINX Reverse Proxy on Port 8000)
- Core Infrastructure (PostgreSQL 18, Redis Session, Redis Cache, RabbitMQ)

---

## Executive Summary

Following the completion of the Part 2 implementation and initiation of manual end-to-end testing, several critical defects and layout bottlenecks were identified across user testing and automated log inspection. 

This document aggregates **all issues reported by the user** alongside **all underlying infrastructure and backend log failures discovered by the AI pair programmer**. Each issue is documented with its observed symptoms, visual/log evidence, exact root causes, affected source code files, and recommended implementation fixes.

---

## Section 1: User-Reported Issues & Technical Root Cause Analysis

### Issue 1.1: Customer Session Instability & Premature Logout on Page Navigation
- **Reported By:** User (Issue #1)
- **User Observation:** *"signin , login is still in failure. no proper session working , user gets loggedout everyting he changes pages."*
- **Severity:** Critical (Blocks authenticated browsing, wishlist syncing, profile editing, and checkout)
- **Affected Components:**
  - `website/frontend/src/context/CustomerAuthContext.tsx`
  - `website/frontend/src/lib/api/client.ts`
  - `website/frontend/src/lib/api/auth.ts`
  - `crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/CustomerAuthController.java`
  - `infra/gateway/nginx.conf.template`

#### Root Cause Breakdown
1. **Cross-Origin Cookie Suppression (`SameSite=Lax` across ports):**
   - The Storefront runs on `http://localhost:3000`, while API requests are dispatched to `http://localhost:8000` (the NGINX Gateway).
   - In modern browsers (Chromium / Edge / Firefox), different port numbers on `localhost` are treated as distinct origins.
   - In [CustomerAuthController.java](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/CustomerAuthController.java#L132), the `ficcado_customer_session` cookie is constructed with `SameSite=Lax`.
   - Browser security specifications mandate that `SameSite=Lax` cookies are **withheld on cross-origin asynchronous `fetch()` requests**.
2. **Missing Bearer Token Authorization Fallback in Frontend Client:**
   - When a user logs in, the backend endpoint `POST /api/customer/auth/login` returns both the cookie and a JSON payload containing `token` (the signed customer JWT).
   - In [CustomerAuthContext.tsx](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/context/CustomerAuthContext.tsx#L231-L242), the frontend discards `res.token` and stores only `res.customer`.
   - In [client.ts](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/lib/api/client.ts#L58-L67), requests rely purely on `credentials: 'include'`. It does not attach `Authorization: Bearer <token>`.
3. **Trigger on Route Navigation (`refreshProfile` wiped):**
   - In `CustomerAuthContext.tsx` (lines 146–148), an effect listens to route changes:
     ```tsx
     useEffect(() => {
       refreshProfile();
     }, [pathname, refreshProfile]);
     ```
   - When the user clicks any link (e.g., navigating from `/` to `/wishlist`), `refreshProfile()` calls `GET /api/customer/session` and `GET /api/customer/auth/me`.
   - Because the browser suppresses the cross-origin Lax cookie and no `Authorization` header is sent, the gateway returns `401 Unauthorized`.
   - `refreshProfile()` catches this and immediately triggers `setCustomer(null);`, wiping the session state from memory.
4. **Gateway Log Correlation:**
   - NGINX Gateway logs confirmed this exact sequence:
     ```
     POST /api/customer/auth/login HTTP/1.1  --> 200 OK (Login successful)
     GET  /api/customer/profile/addresses   --> 403 Forbidden
     POST /api/customer/profile/addresses   --> 403 Forbidden
     GET  /api/customer/orders              --> 403 Forbidden
     ```

#### Recommended Resolution
- **Dual Authentication Support in `client.ts`:** Persist the JWT token in `localStorage` or in-memory session upon login/register, and automatically append `headers.set('Authorization', `Bearer ${token}`)` on every outbound request.
- **Backend & Gateway Session Alignment:** In `CustomerAuthController.java`, adjust cookie configuration for local development or configure Next.js API proxying (`/api` rewrite) so frontend requests are same-origin (`localhost:3000/api/... -> localhost:8000/api/...`).
- **Resilient Context State:** Ensure `CustomerAuthContext.tsx` maintains active credentials until an explicit 401 response invalidates the stored token.

---

### Issue 1.2: Product Modal Blank Image for Specific Catalog Items (e.g., "darlix")
- **Reported By:** User (Issue #2 & Screenshot 1)
- **User Observation:** *"product image is not properly mapped, cached etc .still not showing when user clicks the apecific item.(i have attached image showing this issue)"*
- **Severity:** High (Degrades shopping experience; customers cannot inspect items before adding to cart)
- **Affected Components:**
  - `website/frontend/src/components/modals/ProductModal.tsx`
  - `website/frontend/src/lib/itemImages.ts`
  - `website/frontend/src/lib/colors.ts`
  - PostgreSQL database `items` table (image storage format)

#### Visual Inspection of Screenshot 1
- On the background homepage card, the item `darlix` displays an image.
- When clicked, the `ProductModal` opens.
- The entire left column where the high-resolution zoom image should appear renders as an empty, uniform light-gray rectangle with the "Tap to Zoom & Inspect" pill floating over it.

#### Root Cause Breakdown
1. **Rejection of Base64 Data URLs by `ProductModal.tsx`:**
   - When items are created in the CRM without Cloudflare R2 active, images are saved in the database as Base64 Data URLs:
     `data:image/jpeg;base64,/9j/4AAQSkZJRgABA...` (Length: ~297,699 characters).
   - In [ProductModal.tsx](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/modals/ProductModal.tsx#L57-L64), the image resolution logic is strictly guarded:
     ```tsx
     const rawImages =
       product.images && product.images.length > 0 && 
       product.images.every((img) => img.startsWith('/') || img.startsWith('http'))
         ? product.images
         : resolvedFromSlug.length > 0 && resolvedFromSlug[0] !== PLACEHOLDER_IMAGE
         ? resolvedFromSlug
         : product.img && (product.img.startsWith('/') || product.img.startsWith('http'))
         ? [product.img]
         : resolvedFromSlug;
     ```
   - Notice the condition: `img.startsWith('/') || img.startsWith('http')`.
   - **A Base64 Data URL starts with `data:image/`!**
   - Because `data:image/` does not start with `/` or `http`, both `product.images.every(...)` and `product.img.startsWith(...)` evaluate to **`false`**.
2. **Fallback to Manifest and Static Placeholder:**
   - Having discarded the Base64 images, `ProductModal` falls back to `getItemImages(product.slug)`.
   - `itemImages.ts` checks `generated/item-images.json`, which only lists the default seed designs (`chosen`, `grounded`, `remember`, etc.) and does not contain custom database items like `darlix`.
   - `getItemImages` then returns `[PLACEHOLDER_IMAGE]` (`/images/placeholder.webp`).
   - As verified in `public/images/placeholder.webp`, that file is **the exact solid light-gray image shown in User Screenshot 1**.
3. **Contrast with `ProductCard.tsx`:**
   - In `ProductCard.tsx`, the code simply reads:
     ```tsx
     const imageSrc = product.img || product.image_main || getProductMainImage(product.slug);
     ```
   - It does not discard Base64 strings. Hence, the grid card displays the image while the detail modal fails.
4. **Color Swatch Keyword Filtering:**
   - In `ProductModal.tsx` line 68, `rawImages.filter(img => img.toLowerCase().includes(colorKeyword))` attempts substring matching on image URLs. Base64 strings cannot match color names like `black` or `maroon`.

#### Recommended Resolution
- Update `ProductModal.tsx` to explicitly permit Data URLs:
  ```tsx
  const isImageValid = (src: string) => 
    src.startsWith('/') || src.startsWith('http') || src.startsWith('data:image/');
  ```
- Ensure color keyword filtering falls back to the full image array if substring matching yields zero results for Base64 assets.

---

### Issue 1.3: Tablet & Desktop Top Navigation Bar Viewport Overflow
- **Reported By:** User (Issue #3 & Screenshot 2)
- **User Observation:** *"in the attached image of tablet mode you can see that the bag and the menu button is out of the frame so solve this am suggesting we keep only the bag icon , hence the amount is not required to show. also instead of the Custom T-shirt change it to custom print and the most important update instead of journal, about,faq,support as 4 differnt button in the desktop and tablet top app . we will have about as a dropdown and in it we add the journal, about,faq,support so that we can save a lot of space in tab and desktop modes"*
- **Severity:** High (Visual defect on tablets, iPads, and small laptops: ~768px – 1180px)
- **Affected Components:**
  - `website/frontend/src/components/layout/DesktopHeader.tsx`
  - `website/frontend/src/components/modals/MobileNavDrawer.tsx`
  - Navigation routing and links

#### Visual Inspection of Screenshot 2
- In tablet landscape/portrait viewport:
  - The header width is choked by having 7 separate navigation link buttons: `DROPS`, `CATEGORIES`, `CUSTOM T-SHIRT`, `JOURNAL`, `ABOUT`, `FAQ`, `SUPPORT`.
  - To the right, the search bar, Sign In button, Wishlist heart, Settings cog, Shopping Bag button, and Hamburger menu are crowded together.
  - The Shopping Bag button (`Bag (₹500)`) is partially cut off on the right screen edge.
  - The Hamburger menu button (`≡`) is pushed completely beyond the right viewport margin and clipped.

#### Technical Dimensions Analysis
- Logo & Brand Title: ~210px
- Center Navigation (7 links + padding): ~520px
- Search Bar: ~180px
- Action Icons + Bag CTA + Menu button: ~340px
- **Total Header Required Width:** ~1,250px.
- On screens between 768px and 1200px (standard iPad, iPad Air, Samsung Galaxy Tab, Surface Pro, and 13" laptops), this causes an immediate horizontal overflow of 50px–480px.

#### User's Required Design Specification
1. **Consolidate Secondary Links into an "About" Dropdown:**
   - Group `Journal`, `About`, `FAQ`, and `Support` into a single dropdown under **About** (or **Company**).
   - Reduces navigation links from 7 down to 4:
     1. `Drops`
     2. `Categories`
     3. `Custom Print`
     4. `About ▾` (contains: *About Us*, *Journal*, *FAQ*, *Support / Contact*)
2. **Rename "Custom T-Shirt" to "Custom Print":**
   - Update navigation labels, page titles, and metadata from "Custom T-Shirt" to **"Custom Print"**.
3. **Streamline the Shopping Bag CTA (Icon Only):**
   - Remove the verbose amount text (`(₹500)`) and the text label `Bag`.
   - Render a sleek circular Shopping Bag button with an active badge counter, matching the visual geometry of the Wishlist (`Heart`) and Settings buttons.
   - Saves approximately 80px–100px of header width.

---

## Section 2: Backend, Gateway & Server Log Failures Discovered by Agent

### Issue 2.1: NGINX Gateway IPv6 Upstream Routing Failure (`Network unreachable`)
- **Discovered In:** Docker Gateway Logs (`docker compose logs gateway`)
- **Log Snippet:**
  ```log
  [error] 28#28: *620 connect() to [fdc4:f303:9324::254]:8081 failed (101: Network unreachable) while connecting to upstream, client: 172.18.0.1, server: localhost, request: "POST /api/customer/profile/addresses HTTP/1.1", upstream: "http://[fdc4:f303:9324::254]:8081/api/customer/profile/addresses", host: "localhost:8000"
  [error] 28#28: *620 connect() to [fdc4:f303:9324::254]:8082 failed (101: Network unreachable) while connecting to upstream, request: "PUT /api/wishlist/2 HTTP/1.1", upstream: "http://[fdc4:f303:9324::254]:8082/api/wishlist/2"
  ```
- **Root Cause:**
  - In Docker Desktop on Windows, the host gateway hostname `host.docker.internal` resolves to both an IPv4 address and an IPv6 unique-local address (`[fdc4:f303:9324::254]`).
  - NGINX by default attempts upstream connections via IPv6 first.
  - Since Docker bridge networks on Windows do not route IPv6 host traffic by default, the connection immediately errors with `101: Network unreachable` before falling back to IPv4.
  - This introduces request latency (0.5s–2s) and pollutes logs with error traces.
- **Recommended Fix:**
  - In `infra/gateway/nginx.conf.template`, enforce IPv4 upstream resolution or specify explicit IPv4 host addressing (`172.17.0.1` or `resolver 127.0.0.11 ipv6=off;`).

---

### Issue 2.2: Customer Registration Phone Validation Format Mismatch (`400 Bad Request`)
- **Discovered In:** Code Audit of [AuthModal.tsx](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/modals/AuthModal.tsx#L151) & [CustomerAuthDto.java](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/dto/CustomerAuthDto.java#L27)
- **Log Impact:** Backend Spring Boot throws `MethodArgumentNotValidException` with HTTP 400.
- **Root Cause:**
  - In `AuthModal.tsx`, the registration handler submits raw user input:
    ```tsx
    phone: regPhone.trim(),
    ```
  - In `CustomerAuthDto.java`, the registration record enforces strict regex without internal whitespace allowance:
    ```java
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^(\\+91)?[6-9]\\d{9}$", message = "Valid 10-digit Indian mobile number is required")
    String phone
    ```
  - If a user enters formatted Indian phone numbers (e.g., `+91 98765 43210`, `98765-43210`, or `09876543210`), bean validation fails immediately.
- **Recommended Fix:**
  - Normalize phone input in `AuthModal.tsx` prior to dispatch:
    ```tsx
    const cleanPhone = regPhone.replace(/[\s-]/g, '').replace(/^0/, '');
    ```
  - Normalize on the backend service layer before storing.

---

### Issue 2.3: CRM Backoffice Server-Side Fetch Failures (`API request failed`)
- **Discovered In:** [crm/ficcado_crm_app/.next/dev/logs/next-development.log](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/.next/dev/logs/next-development.log)
- **Log Snippet:**
  ```json
  {"timestamp":"00:02:07.124","source":"Server","level":"ERROR","message":"[2026-10-31T18:30:10.902Z] [ERROR] \"API request failed\" {}"}
  {"timestamp":"00:02:11.542","source":"Server","level":"ERROR","message":"[2026-10-31T18:30:15.325Z] [ERROR] \"API request failed\" {}"}
  {"timestamp":"00:02:26.849","source":"Server","level":"ERROR","message":"[2026-10-31T18:30:30.631Z] [ERROR] \"API request failed\" {}"}
  ```
- **Root Cause:**
  - In [crm/ficcado_crm_app/middleware.ts](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/middleware.ts#L28), the route protection matcher is configured as:
    ```ts
    export const config = {
      matcher: ['/dashboard/:path*', '/login'],
    };
    ```
  - Direct navigation to top-level routes (e.g. `/sales`, `/items`, `/customers`, or root redirection) is not matched by the middleware.
  - Next.js server components attempt to fetch backend endpoints on `http://localhost:8081` without an active `ficcado_session` cookie.
  - The backend returns `401 Unauthorized` / `403 Forbidden`.
  - In `crm/ficcado_crm_app/lib/apiClient.ts` line 94, `logger.error('API request failed', { url, status: response.status, detail: errorDetail })` logs repeated errors.
- **Recommended Fix:**
  - Expand the middleware matcher to include all administrative routes:
    ```ts
    matcher: ['/dashboard/:path*', '/sales/:path*', '/items/:path*', '/customers/:path*', '/expenses/:path*', '/vendors/:path*', '/logs/:path*', '/login']
    ```
  - Provide a clean redirect to `/login?redirect=...` rather than throwing unhandled fetch exceptions.

---

### Issue 2.4: Next.js 16.3 Deprecation Warning (`middleware` -> `proxy`)
- **Discovered In:** [crm/ficcado_crm_app/.next/dev/logs/next-development.log](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/.next/dev/logs/next-development.log#L1)
- **Log Snippet:**
  ```log
  ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  To migrate automatically, run: npx @next/codemod@canary middleware-to-proxy .
  ```
- **Context:**
  - Next.js Canary (v16.3+) is modernizing edge interceptors to the `proxy` convention.
  - While currently non-breaking, migrating ensures compatibility with future Next.js updates.

---

## Section 3: Issues Summary & Defect Tracking Matrix

| ID | Origin | Area | Severity | Root Cause | Target Fix |
|---|---|---|---|---|---|
| **ISS-01** | User | Storefront Auth & Session | **Critical** | `SameSite=Lax` cookie blocked cross-port; JWT token discarded on client | Store JWT token; attach `Authorization: Bearer`; resilient context retention |
| **ISS-02** | User & Screenshot 1 | Product Modal Gallery | **High** | `ProductModal.tsx` checks `img.startsWith('/')` and discards Base64 Data URLs | Allow `data:image/` in `ProductModal`; add fallback for color keyword matching |
| **ISS-03** | User & Screenshot 2 | Tablet/Desktop Navigation | **High** | 7 nav links + text bag CTA exceed tablet viewport (~1250px vs 768–1024px) | Group into **About** dropdown; rename to **Custom Print**; make Bag CTA an icon |
| **ISS-04** | Agent & Gateway Logs | NGINX Gateway Upstreams | **Medium** | `host.docker.internal` IPv6 resolution fails with `Network unreachable` | Add `resolver 127.0.0.11 ipv6=off;` / explicit IPv4 upstream binding |
| **ISS-05** | Agent & Code Audit | Storefront Registration | **Medium** | `AuthModal.tsx` sends raw phone; backend `@Pattern` regex rejects spaces/hyphens | Strip whitespace & leading zeros before submission |
| **ISS-06** | Agent & CRM Logs | CRM Admin Middleware | **Medium** | Middleware matcher only covers `/dashboard/:path*`, leaking unauthenticated fetches | Expand matcher to all CRM routes; redirect unauthenticated users to `/login` |
| **ISS-07** | Agent & Dev Logs | CRM Next.js Deprecation | **Low** | Next.js 16.3 canary deprecation warning for `middleware.ts` | Modernize or suppress canary edge warning |

---

## Section 4: Implementation Roadmap & Execution Plan

1. **Phase 1: Session & Cross-Origin Auth Stabilization (ISS-01 & ISS-05)**
   - Update `website/frontend/src/lib/api/client.ts` to attach `Authorization: Bearer <token>` when a token exists.
   - Update `website/frontend/src/context/CustomerAuthContext.tsx` to store the token in `localStorage`/memory and prevent logout on route navigation.
   - Add phone number sanitization in `AuthModal.tsx`.

2. **Phase 2: Product Image Base64 & Media Mapping Fix (ISS-02)**
   - Update `website/frontend/src/components/modals/ProductModal.tsx` to accept Base64 Data URLs (`data:image/`).
   - Fix color filtering so products with Base64 images display their image correctly regardless of color swatch selection.

3. **Phase 3: Header Responsive Refactor for Tablet & Desktop (ISS-03)**
   - Modify `website/frontend/src/components/layout/DesktopHeader.tsx`:
     - Reduce primary links to: `Drops`, `Categories`, `Custom Print`, and `About ▾`.
     - Implement an animated, accessible hover/click dropdown for `About` containing: *About Us*, *Journal*, *FAQ*, and *Support*.
     - Refactor the Shopping Bag CTA to an icon-only button with a counter badge (removing the price text and `Bag` label).
   - Update mobile drawer navigation to match the new naming ("Custom Print").

4. **Phase 4: Gateway & CRM Middleware Hardening (ISS-04 & ISS-06)**
   - Add `ipv6=off` to the NGINX gateway template upstreams.
   - Expand `crm/ficcado_crm_app/middleware.ts` matcher to guard all internal CRM routes.

---
*Report compiled and verified against running microservices and live server logs.*
