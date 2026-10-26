# Ficcado Rebuild — Part 2 UI Guide & Style Standards

> **MANDATORY DIRECTIVE:** The website and CRM frontend have fundamentally distinct design philosophies, tokens, layouts, and component architectures. **Never mix them.** Every new page, modal, or component created in Part 2 must strictly adhere to the section corresponding to its host application.

---

## 1. Executive Summary & Cross-Frontend Differences

| Dimension | Website Frontend (`website/frontend`) | CRM Frontend (`crm/ficcado_crm_app`) |
|---|---|---|
| **Audience & Context** | Direct-to-Consumer (D2C) premium streetwear e-commerce | Internal enterprise operations, inventory, and warehouse ERP |
| **Directory Root** | `src/` hierarchy (`src/app`, `src/components`, `src/lib`) | Flat project root (`app/`, `components/`, `lib/`, `types/`) |
| **Styling Framework** | Tailwind CSS v4 via `@tailwindcss/postcss` + `@theme inline` | Tailwind CSS v4 via `@tailwindcss/postcss` + `@theme` block |
| **Design Language** | Consumer pill/curved aesthetic (`--radius-sm: 14px`, `md: 20px`, `lg: 28px`) | Dense, utilitarian enterprise aesthetic (`--radius-sm: 6px`, `md: 10px`, `lg: 14px`) |
| **Color Base** | Light cool grey background (`#EDEFF2`), crisp white cards (`#FFFFFF`) | Warm editorial cream background (`#F4F0E5`), olive ink text (`#22261E`) |
| **Typography** | Single font family: **Plus Jakarta Sans** (weights 300 to 800) | Dual font family: **Space Grotesk** (display/headings) + **Inter** (body) |
| **Iconography** | `lucide-react` icons exclusively (`<Truck />`, `<ShoppingBag />`) | Handcrafted inline SVGs / `NavIcon.tsx` (no Lucide dependency) |
| **Data Fetching** | Native `fetch` with `apiClient` wrapper + React Contexts | SWR (`useSWR`) + `apiFetch` with JWT cookies |
| **Form Handling** | Controlled React state + Zod schemas | Controlled React state + Zod schemas (`lib/validation.ts`) |
| **Responsive Shell** | Mobile bottom nav (`BottomNav.tsx`) + Desktop header/footer | Responsive drawer (`AppSidebar.tsx`) + desktop sticky sidebar |
| **Test Frameworks** | Node test runner (`tsx --test`), `@playwright/test`, `device-checker.mjs` | ESLint + Next.js build validation |

---

## 2. Website Frontend (`website/frontend`)

### 2.1 Styling Approach & Design Tokens
- **Configuration & Integration:** Defined in [`src/app/globals.css`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/globals.css#L1-L90) with `@import "tailwindcss";` and `@theme inline`.
- **Typography:**
  - Font: `'Plus Jakarta Sans', system-ui, sans-serif` loaded via Google Fonts ([`src/app/globals.css:1`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/globals.css#L1)).
  - Base body font size: `15px`, line-height: `1.6`.
- **Color Palette Tokens ([`src/app/globals.css:13-46`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/globals.css#L13-L46)):**
  - **Brand Primary:** `--primary: #2B62C6` (Royal Blue), `--primary-hover: #1E4FA8`, `--primary-dark: #163888`, `--primary-light: #EEF5FD`, `--primary-glow: rgba(43, 98, 198, 0.28)`.
  - **Accents:** `--accent-ice: #B4D1EF`, `--accent-orange: #FF6B00`, `--accent-red: #FF3B30`, `--accent-green: #10B981`, `--accent-gold: #F59E0B`, `--accent-mint: #9FD2C7`.
  - **Backgrounds:** `--bg-page: #EDEFF2`, `--bg-app: #F7F7FA`, `--bg-surface: #FFFFFF`, `--bg-surface-alt: #F8FAFC`, `--bg-overlay: rgba(0, 0, 0, 0.45)`.
  - **Text:** `--text-main: #111827`, `--text-secondary: #374151`, `--text-muted: #6B7280`, `--text-light: #9CA3AF`, `--text-inverse: #FFFFFF`.
  - **Borders:** `--border-light: #E5E7EB`, `--border-medium: #D1D5DB`, `--border-focus: var(--primary)`.
- **Radius Scale ([`src/app/globals.css:48-54`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/globals.css#L48-L54)):**
  - `--radius-xs: 8px`, `--radius-sm: 14px`, `--radius-md: 20px`, `--radius-lg: 28px`, `--radius-xl: 36px`, `--radius-full: 9999px`.
- **Shadow Scale ([`src/app/globals.css:56-64`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/globals.css#L56-L64)):**
  - `--shadow-xs`, `--shadow-sm`, `--shadow-card`, `--shadow-hover`, `--shadow-btn`, `--shadow-float`, `--shadow-modal`.
- **Z-Index Hierarchy ([`src/app/globals.css:66-72`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/globals.css#L66-L72)):**
  - `--z-base: 0`, `--z-above: 10`, `--z-sticky: 100`, `--z-drawer: 200`, `--z-modal: 300`, `--z-toast: 400`.

### 2.2 Layout Structure
- **Root Layout:** [`src/app/layout.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/layout.tsx) wraps the app with `AppShell`, context providers, and dynamic viewport meta tags.
- **App Shell:** [`src/components/layout/AppShell.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/layout/AppShell.tsx) renders:
  - **Mobile:** Fixed header + main content padded at bottom (`pb-20` or `pb-24`) to clear the mobile bottom bar.
  - **Desktop:** Sticky header with navigation links + central max-width container (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`) + full-bleed footer.
- **Navigation Components:**
  - **Desktop Header:** [`src/components/layout/DesktopHeader.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/layout/DesktopHeader.tsx) featuring search bar, drop nav links, customer auth trigger, and cart badge.
  - **Mobile Bottom Nav:** [`src/components/layout/BottomNav.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/layout/BottomNav.tsx) providing persistent 5-tab thumb navigation (`Home`, `Categories`, `Search`, `Orders/Support`, `Cart`).
  - **Desktop Footer:** [`src/components/layout/DesktopFooter.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/layout/DesktopFooter.tsx) with brand ethos, quick links, legal links, and social links.
  - **Drawers:** Slide-in cart drawer ([`src/components/modals/CartDrawer.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/modals/CartDrawer.tsx)) and mobile menu drawer ([`src/components/modals/MobileNavDrawer.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/modals/MobileNavDrawer.tsx)).

### 2.3 Reusable Components & UI Patterns
- **Buttons ([`src/app/globals.css:273-356`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/globals.css#L273-L356)):**
  - `.btn-primary`: Royal blue background, white text, pill radius (`--radius-full`), slight hover elevation and scale.
  - `.btn-secondary`: Light icy background (`var(--primary-light)`), brand blue text.
  - `.btn-outline`: 1.5px solid border, transparent background, transitions to solid on hover.
  - `.btn-ghost`: Borderless, subtle background tint on hover.
- **Inputs & Forms ([`src/app/globals.css:408-444`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/globals.css#L408-L444)):**
  - `.input-field`: Height 44px (touch friendly), background `var(--bg-surface-alt)`, border `var(--border-light)`, rounded `var(--radius-sm)` (14px). Focus state highlights border with `var(--primary)` and subtle outer ring.
  - Example usage in Checkout: [`src/app/checkout/page.tsx:807-820`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/checkout/page.tsx#L807-L820).
- **Cards & Surfaces ([`src/app/globals.css:236-258`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/globals.css#L236-L258)):**
  - `.card`: Surface background, `--shadow-card`, rounded `var(--radius-md)` (20px) or `rounded-3xl` (28px).
  - Product Card: [`src/components/ui/ProductCard.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/ui/ProductCard.tsx) with aspect ratio image, stock pill, price display, and quick-add actions.
- **Modals & Drawers:**
  - Built with responsive transitions: bottom-sheet slide up on mobile (`@keyframes sheet-in`), centered fade-scale on desktop (`@keyframes modal-in`). Example: [`src/components/modals/AuthModal.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/modals/AuthModal.tsx).
- **Toasts:** Managed via [`src/context/ToastContext.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/context/ToastContext.tsx) and rendered in [`src/components/layout/ToastContainer.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/layout/ToastContainer.tsx) with 4-second auto-dismiss.

### 2.4 State Management & Data Fetching Patterns
- **Context Providers:** React Context hierarchy for global reactive state:
  - `CustomerAuthContext`: Active session user, login, logout, and token refresh.
  - `CartContext`: LocalStorage backed shopping cart with quantity modifiers.
  - `ModalContext`: Open/close state for login, product quickview, and filter dialogs.
  - `ToastContext`: Flash notifications and feedback.
- **HTTP Client:** [`src/lib/api/client.ts`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/lib/api/client.ts) routes all calls through the NGINX gateway (`http://localhost:8000` via `NEXT_PUBLIC_GATEWAY_URL`), sends `credentials: 'include'`, parses JSON/text errors into `ApiError`, and handles abort timeouts.
- **Validation:** Zod schemas validate form inputs (checkout, registration, contact forms).

### 2.5 Loading, Empty, Error & Unauthorized States
- **Loading:** Skeleton shimmer loaders ([`src/app/globals.css:480-515`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/globals.css#L480-L515)) using `.skeleton` with moving linear gradient; full-page transition screen in [`src/components/ui/GhostLoadingScreen.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/ui/GhostLoadingScreen.tsx).
- **Empty:** Clean rounded illustration container with helpful action button (e.g. Empty Cart in [`src/components/modals/CartDrawer.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/modals/CartDrawer.tsx)).
- **Error:** Route-level error boundaries in [`src/app/error.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/error.tsx) and [`src/app/global-error.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/global-error.tsx) showing friendly error cards with retry triggers.
- **Unauthorized:** Opens the authentication modal (`openAuthModal()`) and preserves return URL.

### 2.6 Testing & Validation Tools
- **Unit & Integration Tests:** Executed via `npm test` using `tsx --test scripts/tests/*.test.mjs`.
- **Cross-Device Matrix:** [`scripts/device-checker.mjs`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/scripts/device-checker.mjs) testing 12 device profiles (iOS iPhone SE, iPhone 15 Pro, Android Galaxy S24, Pixel 8, iPad Mini, iPad Air, Galaxy Tab S9, MacBook Air, Windows 1080p, 4K UHD) against the explicit `ROUTES` array ([`scripts/device-checker.mjs:198-220`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/scripts/device-checker.mjs#L198-L220)).
- **Brand Enforcement:** `npm run check:brand` verifies 0 occurrences of lowercase or mis-spelled brand tokens.

---

## 3. CRM Frontend (`crm/ficcado_crm_app`)

### 3.1 Styling Approach & Design Tokens
- **Configuration & Integration:** Defined in [`app/globals.css`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L1-L100) with `@import "tailwindcss";` and `@theme` block.
- **Typography:**
  - Display / Headings: `'Space Grotesk', system-ui, sans-serif` (weights 500, 600, 700) ([`app/globals.css:24`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L24)).
  - Body: `'Inter', system-ui, sans-serif` (weights 400, 500, 600) ([`app/globals.css:25`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L25)).
  - Base body font size: `14px`, line-height: `1.6`.
  - Number Columns: Enforces `.tabular-nums` (`font-variant-numeric: tabular-nums`) on all financial and inventory data ([`app/globals.css:87-90`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L87-L90)).
- **Color Palette Tokens ([`app/globals.css:10-22`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L10-L22)):**
  - **Brand Primary:** `--color-brand-primary: #2B62C6` (Royal blue — primary actions, active navigation, focus).
  - **Brand Secondary:** `--color-brand-secondary: #B4D1EF` (Pale periwinkle — secondary accents, highlights).
  - **App Shell Background:** `--color-bg: #F4F0E5` (Warm cream / editorial paper tone).
  - **Surface Panels:** `--color-surface: #FFFFFF` (Cards, tables, modals, form panels).
  - **Ink (Text):** `--color-ink: #22261E` (Dark olive-charcoal primary text), `--color-ink-muted: #6B6A5E` (Secondary captions/subtexts).
  - **Borders & Dividers:** `--color-border: #E2DCC9` (Warm sand table borders, input outlines).
  - **Status Accents:** `--color-success: #2F7D4F` (Forest green), `--color-warning: #B8862B` (Amber gold), `--color-error: #B0403A` (Brick red).
- **Radius Scale ([`app/globals.css:46-49`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L46-L49)):**
  - `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`, `--radius-full: 999px`.
- **Spacing Scale ([`app/globals.css:35-43`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L35-L43)):**
  - 8px base unit: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 20px`, `--space-6: 24px`, `--space-8: 32px`, `--space-10: 40px`, `--space-12: 48px`.
- **Layout Dimensions ([`app/globals.css:57-58`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L57-L58)):**
  - `--sidebar-width: 250px`, `--topbar-height: 60px`.

### 3.2 Layout Structure
- **Root & App Layout:** [`app/layout.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/layout.tsx) and [`app/(app)/dashboard/layout.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/%28app%29/dashboard/layout.tsx).
- **Desktop Sidebar:** [`components/AppSidebar.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/components/AppSidebar.tsx) fixed at 250px width, containing brand logo, role indicator badge, categorized navigation links with badge counts, and logout trigger.
- **Mobile Adaptations:** Dual rendering pattern using utility classes:
  - `.desktop-only`: Visible on viewports >= 768px (renders rich data tables).
  - `.mobile-only`: Visible on viewports < 768px (renders `.mobile-data-card` lists with top headers and bottom action bars). Example: [`app/(app)/dashboard/items/page.tsx:355-403`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/%28app%29/dashboard/items/page.tsx#L355-L403).
  - Mobile header bar in [`components/MobileHeader.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/components/MobileHeader.tsx).

### 3.3 Reusable Components & UI Patterns
- **Buttons ([`app/globals.css:218-290`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L218-L290)):**
  - `.btn .btn-primary`: Royal blue, crisp 10px radius (`--radius-md`), compact height (36px, `btn-sm`: 30px).
  - `.btn .btn-secondary`: Cream/surface background, warm border `var(--color-border)`.
  - `.btn .btn-danger`: Red tinted border and text, red solid on hover.
- **Data Tables ([`app/globals.css:350-420`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L350-L420)):**
  - `.data-table`: Dense tabular layout with `border-collapse: collapse`, sticky header with uppercase captions, alternating subtle row hover, right-aligned monetary values with `.tabular-nums`.
- **Badges & Pills:**
  - Status Pills: [`components/StatusBadge.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/components/StatusBadge.tsx) rendering semantic colors (`ACTIVE`, `INACTIVE`, `PAID`, `PENDING`, `COMPLETED`).
  - Catalog Tag Badges: `.badge .badge-neutral` for sizes and metadata ([`app/(app)/dashboard/items/page.tsx:450`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/%28app%29/dashboard/items/page.tsx#L450)).
- **Forms & Inputs ([`app/globals.css:295-345`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/globals.css#L295-L345)):**
  - Compact inputs with height 36px, 1px border `var(--color-border)`, focus border `var(--color-brand-primary)`.
  - Modals: Centered surface panels with backdrop blur, structured header, scrollable body, and sticky action footer.
- **Loaders:** [`components/LoadingGecko.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/components/LoadingGecko.tsx) custom animated brand mascot supporting `size="fullscreen"`, `size="card"`, or `size="inline"`.

### 3.4 Data Fetching & Authorization Patterns
- **Direct Backend Binding:** Targets `NEXT_PUBLIC_API_URL || 'http://localhost:8081'` via [`lib/apiClient.ts`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/lib/apiClient.ts#L53). **Never targets the gateway or other services.**
- **SWR & Fetching:** Data fetching uses SWR hooks or native async handlers with `credentials: 'include'`.
- **Route Guards & Permissions:** Handled in [`middleware.ts`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/middleware.ts) and menu visibility checks in [`components/AppSidebar.tsx:165-220`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/components/AppSidebar.tsx#L165-L220).

### 3.5 Loading, Empty, Error & Session Expiry States
- **Loading:** [`app/(app)/dashboard/loading.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/%28app%29/dashboard/loading.tsx) displaying centered `LoadingGecko`.
- **Empty State:** Filter/table empty rows showing "No records found matching your filter criteria" with a "Clear Filter" action.
- **Error Display:** Handled via [`components/ErrorMessage.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/components/ErrorMessage.tsx) parsing structured API error messages via `parseApiError`.
- **Session Timeout:** Modal warning in [`components/SessionTimeoutModal.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/components/SessionTimeoutModal.tsx) when token approaches expiry.

---

## 4. UI Implementation Rules for Part 2 Tasks

1. **For Phase P2-1 (CRM Fixes):**
   - Edit [`components/AppSidebar.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/components/AppSidebar.tsx) to ensure `ADMIN` has identical menu access to `SUPERADMIN`. Use existing font tokens and inline SVGs.
2. **For Phase P2-2 (Colors, Descriptions, Tags):**
   - **CRM Item Form:** In [`app/(app)/dashboard/items/page.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/ficcado_crm_app/app/%28app%29/dashboard/items/page.tsx), add hex color code inputs (with `#RRGGBB` uppercase enforcement), plain-text textarea for description, and tag chips using `.badge-neutral`.
   - **Website Product Detail:** Render round color swatches with accessible aria labels, plain-text escaped description (preserving whitespace/linebreaks), and small tag pills following website `.btn-secondary` or badge style.
3. **For Phase P2-3 (Custom T-Shirt Notice):**
   - Implement the custom t-shirt notice page using the website's `AppShell`, `DesktopHeader`, and `DesktopFooter`.
4. **For Phase P2-5 (Wishlist) & P2-6 (Addresses):**
   - **Guest Wishlist Prompt Modal:** Follows the website's modal pattern ([`ModalContext.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/context/ModalContext.tsx)) and [`AuthModal.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/modals/AuthModal.tsx). Provides "Log In" and "Sign Up" actions that transition seamlessly into `AuthModal` tab flows.
   - **Feedback & Notifications:** Use [`ToastContext.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/context/ToastContext.tsx) (`showToast`) for wishlist add/remove confirmations and guest resume notices.
   - **Wishlist Grid & Page:** Dedicated route `/wishlist` using [`AppShell.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/layout/AppShell.tsx) and reusing [`ProductCard.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/ui/ProductCard.tsx) for items. Inactive or deleted items are hidden. Empty state renders luxury brand shopping bag/heart icon with a direct CTA to explore drops.
   - **Heart Toggle Action:** Render heart toggle button on `ProductCard.tsx` (top-right of image) and inside `ProductModal.tsx`. Displays active filled red/primary heart when in wishlist, stroke outline when not.
   - **Header & Navigation:** Header link with dynamic counter badge in [`DesktopHeader.tsx`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/layout/DesktopHeader.tsx) and navigation drawers.
   - **Addresses (P2-6):** Use `.card` and `.input-field` styling with standard luxury brand border radius and typography tokens.

