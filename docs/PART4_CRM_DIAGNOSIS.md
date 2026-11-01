# Part 4 CRM Diagnosis Report (GATE A)

**Date**: 2026-11-01  
**Target Environment**: Ficcado CRM Backend (Port 8081) & CRM Frontend (Port 3001)  
**Database**: PostgreSQL (`ficcado_data` on 5432 / test DB `ficcado_data_test` on 5433)  
**Status**: REPRODUCED & PROVEN

---

## 1. Test Suite Baselines (Phase P4C-0)

- **Rule R9 Database Safety Check**:
  - Test profile configuration in `crm/backend/ficcado_crm_backend/src/test/resources/application.yaml` was verified.
  - Test database `ficcado_data_test` on Docker PostgreSQL port 5433 was migrated to version v4 (`V1__create_schema.sql` through `V4__foreign_key_indexes.sql`).
  - CRM Backend Test Suite executed strictly against `jdbc:postgresql://localhost:5433/ficcado_data_test`:
    - **172 tests run, 0 failures, 0 errors, 0 skipped** (BUILD SUCCESS in 28.1s).
  - CRM Frontend Vitest Suite:
    - **5 tests run across 2 test files, 5 passed, 0 failed, 0 skipped** (Duration: 1.99s).

---

## 2. CRM-1: `@version` Failing in Item Updates

### 2.1 Developer Symptom
> "When an admin updates something and comes back to update again, the version error appears and asks the same admin to reload. After reload the error still occurs. Items can no longer be updated."

### 2.2 Live Reproduction
- **Test Item**: Created dedicated test item `id=3`, `itemName="FIC-TEST-P4C-ITEM"`, `version=0`, with colors `["#000000"]` and tags `["test"]`.
- **HTTP PUT `/api/items/3`** with `version: 0`:
  - **HTTP Status**: `409 Conflict`.
  - **Backend Log Output**:
    ```text
    ERROR: duplicate key value violates unique constraint "uq_item_colors_item_color"
    Detail: Key (item_id, color_hex)=(3, #000000) already exists.
    insert into item_colors (color_hex,display_order,item_id) values (?,?,?);
    Resolved [org.springframework.dao.DataIntegrityViolationException: duplicate key value violates unique constraint "uq_item_colors_item_color"]
    ```
  - **Frontend UI Behavior**:
    `crm/ficcado_crm_app/app/(app)/dashboard/items/page.tsx:383`:
    ```tsx
    if (res.status === 409 || data.code === 'ITEM_VERSION_CONFLICT') {
      setIsConflict(true);
      setEditError("This item was changed by another admin. Reload to see the latest version.");
    }
    ```
    Because `res.status === 409`, the frontend displayed the optimistic lock version banner:
    `⚠️ This item was changed by another admin. Reload to see the latest version.`
  - When the admin clicked **"Reload Item"**:
    `setEditItem(null)` closed the modal and re-fetched the list. Because the item still retained its colors, the next update attempted to insert the existing color again, triggering the exact same 409 duplicate key error. The admin was permanently blocked from updating.
  - When tested with empty colors `colors: []` and empty tags `tags: []`, the update succeeded immediately with HTTP 200 and version incremented from 0 to 1.

### 2.3 Answers to P4C-0 Hypotheses
- **CH1 (Stale version in PUT response)**: **PROVEN IN COMBINATION WITH CH8**. In `ItemService.java`, `itemRepository.save(item)` does not flush changes before mapping to DTO. While Hibernate updates `@Version` upon transaction commit, calling `saveAndFlush(item)` ensures the entity's version is incremented in memory before `ItemMapper.toResponse` constructs the response.
- **CH2 (More than one version bump per save)**: **UNPROVEN / NOT THE CAUSE**. Version increments by exactly 1 when an update succeeds.
- **CH3 (Stale list after Reload due to caching)**: **PROVEN AS CONTRIBUTING FACTOR**. `api/items/route.ts` and `api/items/[id]/route.ts` lacked `Cache-Control: no-store` headers, allowing Next.js / browser client cache to serve cached GET responses during `loadItems()`.
- **CH4 (Frontend does not take new version & Reload behavior)**: **PROVEN**.
  1. `handleEdit` closed the modal on success (`setEditItem(null)`) instead of updating the open form state.
  2. "Reload Item" closed the edit modal instead of fetching that specific item fresh (`/api/items/${id}` with `no-store`) and refreshing the edit form with the fresh version.
- **CH5 (Type mismatch on version)**: **DISPROVEN**. Both client and backend use numeric `Long`.
- **CH6 (Version overwritten by mapping)**: **DISPROVEN**.
- **CH7 (Other writers bumping row)**: **DISPROVEN**. No background jobs modify item rows during edits.
- **CH8 (Wrong mapping of the exception)**: **PROVEN (ROOT CAUSE OF THE "VERSION ERROR" MESSAGE)**.
  `ItemService.java:162-183` uses:
  ```java
  item.getColors().clear();
  item.getColors().add(...);
  item.getTags().clear();
  item.getTags().add(...);
  ```
  In Hibernate, collection inserts are executed before orphan deletes. PostgreSQL constraint `uq_item_colors_item_color` and index `uq_item_tags_item_lower_tag` reject the insert as duplicate key (23505). `GlobalExceptionHandler` converts `DataIntegrityViolationException` to HTTP 409 Conflict. The frontend naively assumed *any* 409 status was an optimistic locking conflict (`ITEM_VERSION_CONFLICT`), showing the confusing version conflict banner.

### 2.4 Minimal Fix for CRM-1
1. **Backend (`ItemService.java`)**:
   - Refactor `colors` and `tags` update logic to mirror `sizes`: calculate additions and removals in place (or diff existing vs new) instead of `clear()` + `add()`, eliminating duplicate key constraint violations during Hibernate flush.
   - Use `itemRepository.saveAndFlush(item)` to ensure Hibernate flushes and increments `@Version` before `ItemMapper.toResponse` generates the response DTO.
2. **Backend (`GlobalExceptionHandler.java`)**:
   - Differentiate `DataIntegrityViolationException` (return `DATA_CONFLICT` with specific constraint message) from `ItemVersionConflictException` (return explicit `code: "ITEM_VERSION_CONFLICT"`).
3. **Frontend (`items/page.tsx` & `api/items/**`)**:
   - In `items/page.tsx`:
     - Check `data.code === 'ITEM_VERSION_CONFLICT'` specifically rather than generic `res.status === 409`.
     - When an item update succeeds, update the local item and open form state with the committed version.
     - "Reload Item" must fetch that single item fresh (`/api/items/${id}` with `cache: 'no-store'`), keep the modal open, and populate the latest version so the immediate next save succeeds.
   - In `app/api/items/route.ts` and `app/api/items/[id]/route.ts`:
     - Return headers `{ 'Cache-Control': 'no-store, no-cache, must-revalidate' }`.

---

## 3. CRM-2: Customer Section View / Edit Profile & Pagination

### 3.1 Developer Symptom & User Clarification
> Developer's words: "In the customer section, when an admin tries to update customer info from view/edit profile, the button does nothing, no response, no update option."  
> User Clarification (Current Turn): "instead of brining the customer edit profile to the botton , show a proper componets that pops and shows the details of the selected customer. also in the customer information managemtn implement a proper pagination"

### 3.2 Live Reproduction & Visual Evidence
- **Reproduced**: Yes.
- **Evidence**:
  1. The browser subagent took screenshots of `http://localhost:3001/dashboard/customers` (viewport 1707x811, page height 3128px across 30+ customers).
  2. When clicking "View / Edit Profile" on a customer row:
     - The modal container was rendered at the bottom of the DOM (`customers/page.tsx:381-604`).
     - Because the page was 3128px tall and the user remained scrolled at the top of the table, the modal appeared off-screen below the fold.
     - From the admin's viewport, clicking "View / Edit Profile" gave zero visual feedback—it appeared that "the button does nothing, no response, no update option".
  3. When the browser was scrolled down 3000px, the modal was indeed present at the bottom of the page.
  4. The customer directory has no pagination—all records render on a single massive continuous table.

### 3.3 Answers to P4C-0 Hypotheses
- **CC1 (Button disabled by form state)**: **DISPROVEN**.
- **CC2 (No handler)**: **DISPROVEN**. `openCustomerDetailModal` was connected.
- **CC3 (Missing proxy route)**: **DISPROVEN**. `app/api/customer-info/route.ts` handles `GET` and `PUT`.
- **CC4 (Backend refuses / role check)**: **DISPROVEN**. Backend accepts `PUT /api/customers` with Superadmin/Admin token.
- **CC5 (Backend validation rejects payload)**: **PARTIALLY CONTRIBUTING**. If email is blank or phone format differs, validation needs clean inline error display.
- **CC6 (Modal layering & Positioning)**: **PROVEN ROOT CAUSE**. The modal did not use a fixed centered overlay (`position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px)`). Instead, it rendered at the bottom of the page container.

### 3.4 Minimal Fix for CRM-2
1. **Proper Centered Pop-Up Component (`customers/page.tsx`)**:
   - Replace the bottom-rendered modal with a fixed viewport-centered pop-up dialog using standard CRM design tokens (`bg: var(--color-surface)`, ink `#22261E`, brand `#2B62C6`, radii 10px, overlay `background: rgba(0,0,0,0.5); backdrop-filter: blur(4px)`).
   - Ensure the dialog is immediately visible in the active viewport upon clicking "View / Edit Profile", with smooth entrance and ESC / overlay click-to-dismiss.
   - Provide clear, prominent "Save Customer Changes" button with loading indicator (`LoadingGecko`), inline success toast, and error message rendering.
2. **Proper Pagination in Customer Management**:
   - Implement clean client-side pagination with configurable page size (10, 20, 50 records per page).
   - Add pagination controls: "Showing X to Y of Z customers", Previous / Next buttons, and active page indicator, styled with CRM buttons and badges.
   - Filter and search operations correctly reset to Page 1.
3. **Backend & Route Cleanliness**:
   - Ensure `app/api/customer-info/route.ts` and `CustomerService.java` handle empty email cleanly without duplicate key or regex issues.

---

## 4. Proposed Implementation Plan

- **Phase P4C-1: Fix CRM-1 (Item Version Loop & Constraint Conflict)**:
  1. `ItemService.java`: Diff/update colors and tags in-place without triggering unique constraint violation; use `saveAndFlush`.
  2. `GlobalExceptionHandler.java`: Return explicit error code for `ItemVersionConflictException`.
  3. `items/page.tsx`: Fix conflict check, in-place version update, and fresh single-item fetch on Reload.
  4. Backend + Vitest tests for sequential item saves and conflict handling.
  5. Commit `P4C-1: Fix item version optimistic locking and child collections update`.

- **Phase P4C-2: Fix CRM-2 (Customer Centered Pop-Up Modal & Pagination)**:
  1. `customers/page.tsx`: Refactor modal into a fixed centered pop-up dialog; add 10/20/50 customer pagination controls.
  2. Verify customer update works end-to-end with visual confirmation.
  3. Commit `P4C-2: Implement centered customer detail modal and directory pagination`.

- **Phase P4C-3: Regression & Documentation**:
  1. Run full CRM backend and frontend test suites.
  2. Update `docs/MANUAL_TEST_CHECKLIST.md` and `docs/PART4_CRM_REPORT.md`.
  3. Update `docs/FICCADO_DATA_CHANGELOG.md`.
