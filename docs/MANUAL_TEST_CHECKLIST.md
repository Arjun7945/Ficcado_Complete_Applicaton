# Ficcado Application Suite — Manual Testing Checklist

This runbook provides numbered, step-by-step instructions for manual end-to-end verification across both the **CRM Admin Panel** (`http://localhost:3001`) and the **Website Customer Storefront** (`http://localhost:3000`).

---

## Pre-Test Setup: Starting All Services

Before beginning manual tests, ensure the platform is running:
1. **Docker Infrastructure:**
   ```powershell
   docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
   docker compose -f infra/docker-compose.yml ps
   # Verify all 5 core containers report Up (healthy)
   ```
2. **Backends (Ports 8081, 8082, 8083):**
   - Start Ficcado-Data: `cd crm\backend\ficcado_crm_backend && .\mvnw.cmd spring-boot:run`
   - Start Ficcado-Website-Data: `cd website\backend\ficcado_website_data && .\mvnw.cmd spring-boot:run`
   - Start Payment-Gateway-Data: `cd payment\backend\ficcado_payment_gateway_data && .\mvnw.cmd spring-boot:run`
3. **Frontends (Ports 3000, 3001):**
   - Start Website Storefront: `cd website\frontend && npm run dev` (`http://localhost:3000`)
   - Start CRM Admin Panel: `cd crm\ficcado_crm_app && npm run dev -- -p 3001` (`http://localhost:3001`)

---

## Part 1: CRM Admin Frontend Manual Tests (`http://localhost:3001`)

### Test 1: Admin Role Permissions & Access Control (P2-1A)
- **Goal:** Verify role-based authorization between Superadmin and regular Admin.
- **Steps:**
  1. Open `http://localhost:3001/login`.
  2. Log in with a standard Admin account (e.g., role `admin`).
  3. Attempt to access Superadmin-only areas (e.g., navigating to `/admins` or attempting to edit other admin profiles).
  4. Verify the UI denies access or hides sensitive configuration controls.
  5. Log out, then log in with a Superadmin account (`admin@ficcado.com`).
  6. Verify all admin management, item catalog, and financial logs are fully accessible.
- **Expected Result:**
  - Admin users are restricted to standard operational tasks.
  - Superadmin users have full privilege without access denials.

### Test 2: Activity Log Format & Separators (P2-1B)
- **Goal:** Verify activity log entries render clean pipe-separated details.
- **Steps:**
  1. In the CRM, navigate to **Logs ➔ Activity Logs** (`/logs` or `/activity`).
  2. Perform an action that logs an event (e.g., update an item or adjust inventory).
  3. Refresh the Activity Log table.
  4. Inspect the text format of the newest entry.
- **Expected Result:**
  - Log details use clean pipe separators (e.g., `ACTION: ITEM_UPDATE | ITEM_ID: 101 | USER: admin@ficcado.com`).
  - No malformed delimiters, commas where pipes are required, or unescaped characters.

### Test 3: CRM Sale Source & Remarks (P2-1C, P2-7)
- **Goal:** Verify orders originating from CRM vs Website are clearly distinguished.
- **Steps:**
  1. In the CRM, create a manual sale via **Sales ➔ New Sale** (`/sales/new`).
  2. View the created sale in the Sales list (`/sales`).
  3. Inspect the `remarks` column.
  4. Check an order placed through the customer storefront (from Test 14).
- **Expected Result:**
  - Manual sales created in CRM display remark: `CRM SALE`.
  - Orders placed via the website storefront display remark: `WEBSITE SALE`.

### Test 4: Item Colors, Plain-Text Description & Tags Management (P2-2)
- **Goal:** Verify rich item attributes in the CRM Item Form.
- **Steps:**
  1. Navigate to **Catalog ➔ Items** (`/items`).
  2. Click **Add New Item** or edit an existing item (`/items/[id]`).
  3. Enter values in the new fields:
     - **Colors:** Select or input hexadecimal colors (e.g., `#000000`, `#FFFFFF`, `#1E3A8A`).
     - **Description:** Enter a multi-line plain text description (include special characters `< > & "` to verify sanitization).
     - **Tags:** Enter comma-separated tags (e.g., `oversized, summer-collection, 100-cotton`).
  4. Save the item.
  5. Reload the item edit page.
- **Expected Result:**
  - Color swatches display the exact hex codes.
  - Description preserves line breaks and displays raw text safely without HTML injection.
  - Tags render as clean badge chips.

### Test 5: Item Optimistic Locking Race Condition (AUD-09)
- **Goal:** Verify that two admins saving the same item concurrently cannot silently overwrite each other.
- **Steps:**
  1. Open two separate browser tabs (Tab A and Tab B) to the same item edit page (`http://localhost:3001/items/1`).
  2. In Tab A, change the price to `₹1,299` and click **Save**. Tab A succeeds.
  3. Immediately switch to Tab B (without reloading). Change the price to `₹1,499` and click **Save**.
- **Expected Result:**
  - Tab B fails with HTTP 409 Conflict.
  - An alert/toast modal appears: **"This item was changed by another admin. Reload to see the latest version."**
  - A **Reload** button is offered to fetch the latest state without corrupting data.

---

## Part 2: Website Storefront Manual Tests (`http://localhost:3000`)

### Test 6: Custom T-Shirt Coming Soon Notice Page (P2-3B)
- **Goal:** Verify the dedicated notice page renders without interactive forms or pricing.
- **Steps:**
  1. Open `http://localhost:3000`.
  2. Locate the navigation header or footer link: **"Design your own T-shirt"** / **"Custom T-Shirt"**.
  3. Click the link to navigate to `/custom-tshirt`.
  4. Inspect the page content.
- **Expected Result:**
  - The page displays: **"Design your own T-shirt" — Coming Soon**.
  - Notice text explains that custom printing is launching soon.
  - **Zero** file upload buttons, customizer canvas tools, input forms, or pricing elements exist on the page.

### Test 7: Catalog Empty State & Backend Error State (P2-3A)
- **Goal:** Verify fallback/sample data is completely eliminated.
- **Steps:**
  1. Open the website product catalog (`http://localhost:3000/shop` or `/products`).
  2. **Scenario A (Normal):** Active items from Ficcado-Data display.
  3. **Scenario B (Error State):** Temporarily stop Ficcado-Data (Port 8081) in the terminal.
  4. Refresh the storefront catalog page.
- **Expected Result:**
  - The page cleanly displays the error container (`#catalog-error-state`) with a friendly retry message.
  - **No fake products, mock orders, or sample shirts from `products-snapshot.json` ever appear.**
  - Restart Ficcado-Data once confirmed.

### Test 8: Guest Wishlist Modal Prompt & Automatic Add (P2-5)
- **Goal:** Verify unauthenticated guests cannot save items but are guided to sign in.
- **Steps:**
  1. Open an Incognito / private browsing window to `http://localhost:3000`.
  2. Ensure you are logged out (guest state).
  3. On any product card or product detail page, click the **Heart / Wishlist** icon.
  4. Inspect the modal that appears.
  5. Click **"Log in"** in the modal.
  6. Log in with a valid customer account.
- **Expected Result:**
  - Clicking the heart opens a modal: **"Log in or create an account to save items to your wishlist"** with **Log in** and **Sign up** buttons.
  - After completing login, the user is automatically redirected back to the product page.
  - The item clicked as a guest is **automatically added** to their wishlist, and the heart turns active/filled.

### Test 9: Logged-in Customer Wishlist Persistence & Isolation (P2-5)
- **Goal:** Verify wishlist items are stored in `ficcado_website_data` and isolated per customer.
- **Steps:**
  1. Log in as Customer A (`customerA@example.com`).
  2. Add Item 1 and Item 2 to your wishlist.
  3. Navigate to `/wishlist`. Confirm both items appear with current pricing and image.
  4. Open a different browser profile and log in as Customer B (`customerB@example.com`).
  5. Navigate to `/wishlist`.
- **Expected Result:**
  - Customer B's wishlist is empty (or contains only Customer B's saved items).
  - Customer B cannot see or delete Customer A's wishlist items.
  - Items deleted from Customer A's wishlist update instantly in the database.

### Test 10: Customer Session Persistence Across Refresh & Navigation (P2-4)
- **Goal:** Verify customer session does NOT get lost on page refresh or client navigation.
- **Steps:**
  1. Log in as a customer on `http://localhost:3000/login`.
  2. Verify the header shows your account name/profile icon.
  3. Press **F5** to hard refresh the page.
  4. Navigate between `/`, `/shop`, `/about`, `/custom-tshirt`.
- **Expected Result:**
  - Customer remains logged in after every refresh and page navigation.
  - No flash of unauthenticated state or premature logout.

### Test 11: 9-Minute Inactivity Prompt & 10-Minute Automatic Logout (P2-4)
- **Goal:** Verify sliding Redis session timeout and user activity tracking.
- **Steps:**
  1. While logged in, leave the browser tab completely idle (do not move mouse, click, or press keys).
  2. At 9 minutes of inactivity, inspect the screen.
  3. A prompt modal appears: **"Still there?"** with options **"Stay logged in"** and **"Log out"**.
  4. **Action A:** Clicking **"Stay logged in"** calls `POST /api/customer/session/touch`, closes the modal, and resets the 10-minute timer.
  5. **Action B:** If no action is taken, at 10 minutes the user is automatically logged out, redirected to `/login`, and shown: **"You were logged out due to inactivity."**
- **Expected Result:**
  - Sliding session extends on genuine user interaction.
  - Inactive sessions terminate cleanly at 10 minutes.

### Test 12: Cross-Tab Session Synchronization (P2-4)
- **Goal:** Verify multi-tab login and logout synchronization via `BroadcastChannel`.
- **Steps:**
  1. Open two browser tabs to `http://localhost:3000` (Tab 1 and Tab 2).
  2. In Tab 1, log in as a customer.
  3. Check Tab 2: it immediately reflects the logged-in state without requiring a manual refresh.
  4. In Tab 2, click **Log out**.
  5. Check Tab 1: it immediately logs out and transitions to guest state.
- **Expected Result:**
  - Authentication state changes in one tab immediately synchronize across all open tabs.

### Test 13: Checkout Flow & "Add New" Address (P2-6)
- **Goal:** Verify saved address selector, inline address addition, and courier option.
- **Steps:**
  1. Log in as a customer and add an item to your cart.
  2. Proceed to checkout (`/checkout`).
  3. Customer details (name, email, phone) load automatically from the server and are displayed read-only.
  4. Under **Shipping Address**, click **"Add new address"**.
  5. Fill in address details and click **Save Address**.
  6. Verify the new address appears in the radio list and is selected.
  7. Select courier option (e.g., *Express Surface Logistics* ₹0 vs *Priority Air Courier* ₹99).
- **Expected Result:**
  - New address is persisted to the customer account in Ficcado-Data.
  - Order summary computes server-side unit prices, subtotal, and delivery charges dynamically.

### Test 14: Successful Verified Payment & Order Creation (P2-7)
- **Goal:** Verify that a sale is created ONLY after verified payment.
- **Steps:**
  1. On the checkout page, click **Proceed to Payment**.
  2. The Razorpay Checkout modal opens (test mode).
  3. Complete payment using Razorpay test credentials (success card: `4111 1111 1111 1111`, any future expiry, OTP `123456`).
  4. Wait for redirection to `/checkout/success`.
  5. Note the generated invoice number (e.g., `FIC-20261026-XXXX`).
  6. Switch to the CRM Admin Panel (`http://localhost:3001/sales`).
  7. Locate the newest sale.
- **Expected Result:**
  - Order status on the website transitions from `PROCESSING` to `COMPLETED`.
  - In CRM, a sale row exists with the exact customer details, ordered lines, amount paid, and remark **`WEBSITE SALE`**.
  - Inventory count in CRM is decremented by the purchased quantity.

### Test 15: Failed / Abandoned Payment Safety Guard (P2-7)
- **Goal:** Verify that failed or abandoned payments create ZERO sales and ZERO stock changes.
- **Steps:**
  1. Note the current stock count of an item in the CRM (e.g., Item #101 stock = 25).
  2. On the website, add Item #101 to cart and proceed to checkout.
  3. In the Razorpay modal, select **Failure** or simply close the modal (simulate abandonment).
  4. The website displays an error: **"Payment was cancelled or unsuccessful. No charges were made."**
  5. Refresh the CRM Sales list (`http://localhost:3001/sales`).
  6. Check Item #101 inventory count in CRM (`http://localhost:3001/inventory`).
- **Expected Result:**
  - **No sale record is created** in Ficcado-Data.
  - **Inventory count remains exactly 25** (no stock reservation or leakage).
  - The payment attempt in `ficcado_payment_gateway_data` is marked `FAILED`.

### Test 16: Reconciliation Recovery for Interrupted Payment (P2-8)
- **Goal:** Verify the 10-minute ShedLock reconciliation job recovers captured orders if the browser crashed before verify.
- **Steps:**
  1. Simulate an interrupted payment: initiate a payment attempt against the payment gateway where Razorpay captures the payment, but the browser window is forcibly closed before `POST /api/payments/verify` can run.
  2. Wait for the scheduled reconciliation job (runs every 10 minutes; or trigger test execution).
  3. Inspect logs: `PaymentReconciliationScheduler` identifies the orphan attempt.
- **Expected Result:**
  - Reconciliation detects the captured Razorpay payment.
  - Automatically invokes `POST /api/internal/website-orders` in Ficcado-Data.
  - Creates the sale with remark `WEBSITE SALE`, deducts stock, and marks attempt `COMPLETED`.
  - Dispatches an order confirmation notification to the customer.

### Test 17: Business Failure Refund Handling (P2-8)
- **Goal:** Verify automatic refund initiation if stock became unavailable between order creation and payment capture.
- **Steps:**
  1. Simulate an out-of-stock condition on an order whose payment was captured in Razorpay.
  2. Trigger the reconciliation scheduler.
- **Expected Result:**
  - Sale creation in Ficcado-Data is rejected due to insufficient stock.
  - The scheduler initiates a full refund through the Razorpay Refund API.
  - The attempt transitions to `REFUND_PENDING` (and subsequently `REFUNDED`).
  - An email notification is sent to the customer explaining that the item was out of stock and a refund has been initiated, inviting them to try again.
  - **No partial database rows or incorrect sales are written.**
