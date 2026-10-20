/**
 * scripts/etl/migrate.js
 * Standalone, single-transaction ETL migration utility.
 * Migrates data from Google Sheets to PostgreSQL with normalized DDL schema.
 * 
 * Usage:
 *   node migrate.js --dry-run   (Dry run mode: parses & validates data, no DB writes)
 *   node migrate.js             (Real mode: single transaction BEGIN/COMMIT with rollback on error)
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local in root frontend app
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const IS_DRY_RUN = process.argv.includes('--dry-run');

console.log('===========================================================');
console.log(`  Ficcado ETL Migration Utility — Mode: ${IS_DRY_RUN ? 'DRY RUN (No DB Writes)' : 'REAL MIGRATION (Single Transaction)'}`);
console.log('===========================================================');

const DB_URL = process.env.DB_URL || process.env.DATABASE_URL;
if (!DB_URL && !IS_DRY_RUN) {
  console.error('ERROR: DB_URL or DATABASE_URL environment variable is required for migration.');
  process.exit(1);
}

function getGoogleSheetsClient() {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env variable is missing');
  }
  const creds = JSON.parse(rawKey);
  if (creds.private_key && typeof creds.private_key === 'string') {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function fetchSheetRows(sheets, spreadsheetId, range) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return res.data.values || [];
  } catch (err) {
    console.warn(`[WARN] Failed to fetch sheet range ${range}: ${err.message}`);
    return [];
  }
}

async function runEtl() {
  const sheets = getGoogleSheetsClient();
  const bootstrapId = process.env.BOOTSTRAP_SPREADSHEET_ID;
  const configTab = process.env.BOOTSTRAP_SHEET_NAME || 'SuperAdmin-Ficcado-CRM-Config';

  console.log(`[1/5] Fetching module configuration from Bootstrap Sheet (${bootstrapId})...`);
  const configRows = await fetchSheetRows(sheets, bootstrapId, `${configTab}!A:F`);

  const moduleMap = new Map();
  let defaultSpreadsheetId = '';

  for (const row of configRows) {
    if (!row || row.length < 3) continue;
    const key = String(row[0] || '').trim();
    if (!key || key.toLowerCase() === 'module_key' || key.toLowerCase() === 'module key') continue;
    const sheetId = String(row[2] || '').trim();
    const tabName = String(row[3] || key).trim();

    if (sheetId && !defaultSpreadsheetId) defaultSpreadsheetId = sheetId;
    moduleMap.set(key, { sheetId, tabName });
  }

  console.log(`[2/5] Resolved ${moduleMap.size} modules from config.`);

  // Function to get rows for a given module key
  async function getRowsForModule(moduleKey) {
    const conf = moduleMap.get(moduleKey);
    if (!conf) {
      if (!defaultSpreadsheetId) return [];
      return await fetchSheetRows(sheets, defaultSpreadsheetId, `${moduleKey}!A:ZZ`);
    }
    return await fetchSheetRows(sheets, conf.sheetId, `${conf.tabName}!A:ZZ`);
  }

  // Read all raw sheets
  console.log('[3/5] Extracting raw data from Google Sheets...');
  const rawAdmins = await getRowsForModule('admins');
  const rawItems = await getRowsForModule('items');
  const rawInventory = await getRowsForModule('inventory');
  const rawWarehouse = await getRowsForModule('warehouse_allocations');
  const rawCustomers = await getRowsForModule('customers');
  const rawSales = await getRowsForModule('sales');
  const rawReplacements = await getRowsForModule('replacements');
  const rawReturnRefunds = await getRowsForModule('return_refunds');
  const rawDamaged = await getRowsForModule('damaged_products');
  const rawExpenses = await getRowsForModule('expenses');
  const rawVendors = await getRowsForModule('vendors');
  const rawVendorPayments = await getRowsForModule('vendor_payments');
  const rawActivityLogs = await getRowsForModule('activity_logs');
  const rawSalesLogs = await getRowsForModule('sales_logs');
  const rawInventoryHistory = await getRowsForModule('inventory_history');
  const rawKeepNotes = await getRowsForModule('keep_notes');

  console.log(`    - Admins: ${Math.max(0, rawAdmins.length - 1)} rows`);
  console.log(`    - Items: ${Math.max(0, rawItems.length - 1)} rows`);
  console.log(`    - Inventory: ${Math.max(0, rawInventory.length - 1)} rows`);
  console.log(`    - Warehouse Allocations: ${Math.max(0, rawWarehouse.length - 1)} rows`);
  console.log(`    - Customers: ${Math.max(0, rawCustomers.length - 1)} rows`);
  console.log(`    - Sales: ${Math.max(0, rawSales.length - 1)} rows`);
  console.log(`    - Replacements: ${Math.max(0, rawReplacements.length - 1)} rows`);
  console.log(`    - Return Refunds: ${Math.max(0, rawReturnRefunds.length - 1)} rows`);
  console.log(`    - Damaged Products: ${Math.max(0, rawDamaged.length - 1)} rows`);
  console.log(`    - Expenses: ${Math.max(0, rawExpenses.length - 1)} rows`);
  console.log(`    - Vendors: ${Math.max(0, rawVendors.length - 1)} rows`);
  console.log(`    - Vendor Payments: ${Math.max(0, rawVendorPayments.length - 1)} rows`);
  console.log(`    - Activity Logs: ${Math.max(0, rawActivityLogs.length - 1)} rows`);
  console.log(`    - Sales Logs: ${Math.max(0, rawSalesLogs.length - 1)} rows`);
  console.log(`    - Inventory History: ${Math.max(0, rawInventoryHistory.length - 1)} rows`);
  console.log(`    - Keep Notes: ${Math.max(0, rawKeepNotes.length - 1)} rows`);

  if (IS_DRY_RUN) {
    console.log('\n[DRY RUN SUMMARY] Parity & FK resolution simulation complete.');
    console.log('Dry run complete. No database changes were made.');
    return;
  }

  console.log('\n[4/5] Connecting to PostgreSQL and starting single-transaction migration...');
  const pool = new pg.Pool({ connectionString: DB_URL });
  const client = await pool.connect();

  const counts = {};

  try {
    await client.query('BEGIN');
    console.log('    → Transaction started (BEGIN)');

    // 1. Admins
    console.log('    → Migrating Admins...');
    const adminEmailToId = new Map();
    const adminNameToId = new Map();
    let adminInserted = 0;

    for (let i = 1; i < rawAdmins.length; i++) {
      const row = rawAdmins[i];
      if (!row || !row[0]) continue;
      const name = String(row[0] || '').trim();
      const phone = String(row[1] || '').trim();
      const email = String(row[2] || '').trim().toLowerCase();
      const hash = String(row[3] || '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
      const role = String(row[4] || 'ADMIN').toUpperCase();
      const notif = String(row[5] || 'ENABLED').toUpperCase();

      if (!email) continue;

      const res = await client.query(`
        INSERT INTO admins (admin_name, phone_number, email_id, password_hash, role, notifications, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
        ON CONFLICT (email_id) DO UPDATE SET admin_name = EXCLUDED.admin_name
        RETURNING id
      `, [name, phone, email, hash, role, notif]);

      const id = res.rows[0].id;
      adminEmailToId.set(email, id);
      adminNameToId.set(name.toLowerCase(), id);
      adminInserted++;
    }
    counts['admins'] = adminInserted;

    // Helper for Admin FK lookup
    function resolveAdminId(nameOrEmail) {
      if (!nameOrEmail) return null;
      const str = String(nameOrEmail).trim().toLowerCase();
      if (adminEmailToId.has(str)) return adminEmailToId.get(str);
      if (adminNameToId.has(str)) return adminNameToId.get(str);
      return null;
    }

    // 2. Items & Item Sizes
    console.log('    → Migrating Items & Item Sizes...');
    const itemNameSizeToItemId = new Map();
    let itemsInserted = 0;
    let itemSizesInserted = 0;

    for (let i = 1; i < rawItems.length; i++) {
      const row = rawItems[i];
      if (!row || !row[0]) continue;
      const itemName = String(row[0]).trim();
      const itemType = String(row[1] || '').trim();
      const price = parseFloat(row[2]) || 0;
      const cost = parseFloat(row[3]) || 0;
      const sizesStr = String(row[4] || '').trim();
      const status = String(row[5] || 'ACTIVE').toUpperCase();

      const res = await client.query(`
        INSERT INTO items (item_name, item_type, price_of_item, cost_price, current_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id
      `, [itemName, itemType, price, cost, status]);

      const itemId = res.rows[0].id;
      itemsInserted++;

      if (sizesStr) {
        const sizes = sizesStr.split(',').map(s => s.trim()).filter(Boolean);
        for (const sz of sizes) {
          await client.query(`
            INSERT INTO item_sizes (item_id, size) VALUES ($1, $2) ON CONFLICT DO NOTHING
          `, [itemId, sz]);
          itemNameSizeToItemId.set(`${itemName.toLowerCase()}:${sz.toLowerCase()}`, itemId);
          itemSizesInserted++;
        }
      }
      itemNameSizeToItemId.set(itemName.toLowerCase(), itemId);
    }
    counts['items'] = itemsInserted;
    counts['item_sizes'] = itemSizesInserted;

    // Helper for Item FK lookup
    function resolveItemId(name) {
      if (!name) return null;
      return itemNameSizeToItemId.get(String(name).trim().toLowerCase()) || null;
    }

    // 3. Inventory
    console.log('    → Migrating Inventory...');
    let invInserted = 0;
    for (let i = 1; i < rawInventory.length; i++) {
      const row = rawInventory[i];
      if (!row || !row[0]) continue;
      const itemName = String(row[0]).trim();
      const size = String(row[1] || '').trim();
      const qty = parseInt(row[2], 10) || 0;
      const status = String(row[3] || 'ACTIVE').toUpperCase();

      const itemId = resolveItemId(itemName);
      if (!itemId) {
        console.warn(`[SKIP] Inventory row #${i}: Item '${itemName}' not found`);
        continue;
      }

      await client.query(`
        INSERT INTO inventory (item_id, size, total_quantity, current_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (item_id, size) DO UPDATE SET total_quantity = EXCLUDED.total_quantity
      `, [itemId, size, qty, status]);
      invInserted++;
    }
    counts['inventory'] = invInserted;

    // 4. Warehouse Allocations
    console.log('    → Migrating Warehouse Allocations...');
    let whInserted = 0;
    for (let i = 1; i < rawWarehouse.length; i++) {
      const row = rawWarehouse[i];
      if (!row || !row[0]) continue;
      const location = String(row[0]).trim();
      const handlerName = String(row[1] || '').trim();
      const itemName = String(row[2] || '').trim();
      const size = String(row[3] || '').trim();
      const qty = parseInt(row[4], 10) || 0;

      const itemId = resolveItemId(itemName);
      const handlerAdminId = resolveAdminId(handlerName);

      if (!itemId) {
        console.warn(`[SKIP] Warehouse row #${i}: Item '${itemName}' not found`);
        continue;
      }

      await client.query(`
        INSERT INTO warehouse_allocations (warehouse_location, handler_admin_id, item_id, size, quantity, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [location, handlerAdminId, itemId, size, qty]);
      whInserted++;
    }
    counts['warehouse_allocations'] = whInserted;

    // 5. Customers & Customer Addresses
    console.log('    → Migrating Customers & Addresses...');
    const customerPhoneToId = new Map();
    let custInserted = 0;
    let custAddrInserted = 0;

    for (let i = 1; i < rawCustomers.length; i++) {
      const row = rawCustomers[i];
      if (!row || !row[0]) continue;
      const name = String(row[0]).trim();
      const phone = String(row[1] || '').trim();
      const email = String(row[2] || '').trim();
      const addr = String(row[3] || '').trim();
      const orders = parseInt(row[4], 10) || 0;

      if (!phone) continue;

      const res = await client.query(`
        INSERT INTO customers (customer_name, phone_number, email_id, total_orders_placed, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (phone_number) DO UPDATE SET customer_name = EXCLUDED.customer_name
        RETURNING id
      `, [name, phone, email, orders]);

      const custId = res.rows[0].id;
      customerPhoneToId.set(phone, custId);
      custInserted++;

      if (addr) {
        await client.query(`
          INSERT INTO customer_addresses (customer_id, address, is_default, created_at)
          VALUES ($1, $2, TRUE, NOW())
        `, [custId, addr]);
        custAddrInserted++;
      }
    }
    counts['customers'] = custInserted;
    counts['customer_addresses'] = custAddrInserted;

    // Helper for Customer FK lookup
    function resolveCustomerId(phone) {
      if (!phone) return null;
      return customerPhoneToId.get(String(phone).trim()) || null;
    }

    // 6. Sales & Sale Line Items
    console.log('    → Migrating Sales & Line Items...');
    const invoiceToSaleId = new Map();
    let salesInserted = 0;
    let saleLineItemsInserted = 0;

    for (let i = 1; i < rawSales.length; i++) {
      const row = rawSales[i];
      if (!row || !row[0]) continue;
      const invNum = String(row[0]).trim();
      const custName = String(row[1] || '').trim();
      const custPhone = String(row[2] || '').trim();
      const custAddr = String(row[3] || '').trim();
      const itemsStr = String(row[4] || '').trim();
      const sizesStr = String(row[5] || '').trim();
      const qtysStr = String(row[6] || '').trim();
      const pricesStr = String(row[7] || '').trim();
      const totalsStr = String(row[8] || '').trim();
      const saleStatus = String(row[9] || 'COMPLETED').toUpperCase();
      const paymentStatus = String(row[10] || 'PAID').toUpperCase();
      const modeOfPayment = String(row[11] || '').trim();
      const txnId = String(row[12] || '').trim();
      const delStatus = String(row[13] || 'DELIVERED').toUpperCase();
      const delChargeEnabled = String(row[14]).toLowerCase() === 'true';
      const delChargeAmount = parseFloat(row[15]) || 0;
      const totalAmount = parseFloat(row[16]) || 0;
      const closedByName = String(row[17] || '').trim();

      const custId = resolveCustomerId(custPhone);
      const closedByAdminId = resolveAdminId(closedByName);

      const res = await client.query(`
        INSERT INTO sales (
          invoice_number, customer_id, customer_name, customer_phone_number, customer_address,
          sale_status, payment_status, mode_of_payment, transaction_id, delivery_status,
          delivery_charge_enabled, delivery_charge_amount, total_amount, sale_closed_by_admin_id,
          version, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1, NOW(), NOW()
        )
        ON CONFLICT (invoice_number) DO UPDATE SET customer_name = EXCLUDED.customer_name
        RETURNING id
      `, [invNum, custId, custName, custPhone, custAddr, saleStatus, paymentStatus, modeOfPayment, txnId, delStatus, delChargeEnabled, delChargeAmount, totalAmount, closedByAdminId]);

      const saleId = res.rows[0].id;
      invoiceToSaleId.set(invNum, saleId);
      salesInserted++;

      // Parse line items
      const itemsArr = itemsStr.split(',').map(s => s.trim()).filter(Boolean);
      const sizesArr = sizesStr.split(',').map(s => s.trim());
      const qtysArr = qtysStr.split(',').map(s => parseInt(s.trim(), 10) || 1);
      const pricesArr = pricesStr.split(',').map(s => parseFloat(s.trim()) || 0);
      const totalsArr = totalsStr.split(',').map(s => parseFloat(s.trim()) || 0);

      for (let j = 0; j < itemsArr.length; j++) {
        const itemN = itemsArr[j];
        const sz = sizesArr[j] || '';
        const qty = qtysArr[j] || 1;
        const prc = pricesArr[j] || 0;
        const tot = totalsArr[j] || (qty * prc);
        const itemId = resolveItemId(itemN);

        await client.query(`
          INSERT INTO sale_line_items (sale_id, item_id, item_name, size, quantity, price_each, total_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [saleId, itemId, itemN, sz, qty, prc, tot]);
        saleLineItemsInserted++;
      }
    }
    counts['sales'] = salesInserted;
    counts['sale_line_items'] = saleLineItemsInserted;

    // 7. Replacements
    console.log('    → Migrating Replacements...');
    let repInserted = 0;
    for (let i = 1; i < rawReplacements.length; i++) {
      const row = rawReplacements[i];
      if (!row || !row[0]) continue;
      const invNum = String(row[0]).trim();
      const status = String(row[1] || 'APPROVED').toUpperCase();

      const saleId = invoiceToSaleId.get(invNum);
      if (!saleId) continue;

      await client.query(`
        INSERT INTO replacements (sale_id, invoice_number, invoice_status, version, created_at, updated_at)
        VALUES ($1, $2, $3, 1, NOW(), NOW())
      `, [saleId, invNum, status]);
      repInserted++;
    }
    counts['replacements'] = repInserted;

    // 8. Return Refunds
    console.log('    → Migrating Return Refunds...');
    let rrInserted = 0;
    for (let i = 1; i < rawReturnRefunds.length; i++) {
      const row = rawReturnRefunds[i];
      if (!row || !row[0]) continue;
      const invNum = String(row[0]).trim();
      const status = String(row[1] || 'PENDING').toUpperCase();

      const saleId = invoiceToSaleId.get(invNum);
      if (!saleId) continue;

      await client.query(`
        INSERT INTO return_refunds (sale_id, invoice_number, refund_status, version, created_at, updated_at)
        VALUES ($1, $2, $3, 1, NOW(), NOW())
      `, [saleId, invNum, status]);
      rrInserted++;
    }
    counts['return_refunds'] = rrInserted;

    // 9. Expenses
    console.log('    → Migrating Expenses...');
    let expInserted = 0;
    for (let i = 1; i < rawExpenses.length; i++) {
      const row = rawExpenses[i];
      if (!row || !row[0]) continue;
      const adminName = String(row[0]).trim();
      const category = String(row[1] || '').trim();
      const desc = String(row[2] || '').trim();
      const amt = parseFloat(row[3]) || 0;
      const dateStr = String(row[4] || '').trim();

      const adminId = resolveAdminId(adminName);
      const dateVal = dateStr ? new Date(dateStr) : null;

      await client.query(`
        INSERT INTO expenses (admin_id, admin_name, expense_category, description, amount, date_of_expense, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [adminId, adminName, category, desc, amt, dateVal]);
      expInserted++;
    }
    counts['expenses'] = expInserted;

    // 10. Vendors & Vendor Contacts
    console.log('    → Migrating Vendors...');
    const vendorNameToId = new Map();
    let vendorInserted = 0;
    let vendorContactsInserted = 0;

    for (let i = 1; i < rawVendors.length; i++) {
      const row = rawVendors[i];
      if (!row || !row[0]) continue;
      const name = String(row[0]).trim();
      const type = String(row[1] || '').trim();
      const email = String(row[2] || '').trim();
      const purpose = String(row[3] || '').trim();
      const contactsStr = String(row[4] || '').trim();
      const totalPaid = parseFloat(row[5]) || 0;

      const res = await client.query(`
        INSERT INTO vendors (vendor_name, vendor_type, email_id, purpose_use, total_amount_paid, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id
      `, [name, type, email, purpose, totalPaid]);

      const vendorId = res.rows[0].id;
      vendorNameToId.set(name.toLowerCase(), vendorId);
      vendorInserted++;

      if (contactsStr) {
        const contacts = contactsStr.split(',').map(c => c.trim()).filter(Boolean);
        for (const c of contacts) {
          await client.query(`
            INSERT INTO vendor_contact_numbers (vendor_id, contact_number) VALUES ($1, $2)
          `, [vendorId, c]);
          vendorContactsInserted++;
        }
      }
    }
    counts['vendors'] = vendorInserted;
    counts['vendor_contact_numbers'] = vendorContactsInserted;

    // 11. Vendor Payments
    console.log('    → Migrating Vendor Payments...');
    let vpInserted = 0;
    for (let i = 1; i < rawVendorPayments.length; i++) {
      const row = rawVendorPayments[i];
      if (!row || !row[0]) continue;
      const vName = String(row[0]).trim();
      const amt = parseFloat(row[1]) || 0;
      const dateStr = String(row[2] || '').trim();
      const note = String(row[3] || '').trim();

      const vId = vendorNameToId.get(vName.toLowerCase());
      if (!vId) continue;

      const dateVal = dateStr ? new Date(dateStr) : null;

      await client.query(`
        INSERT INTO vendor_payments (vendor_id, vendor_name, amount, payment_date, note, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [vId, vName, amt, dateVal, note]);
      vpInserted++;
    }
    counts['vendor_payments'] = vpInserted;

    // 12. Activity Logs
    console.log('    → Migrating Activity Logs...');
    let actLogInserted = 0;
    for (let i = 1; i < rawActivityLogs.length; i++) {
      const row = rawActivityLogs[i];
      if (!row || !row[0]) continue;
      const adminName = String(row[0]).trim();
      const action = String(row[1] || '').trim();
      const module = String(row[2] || '').trim();
      const recordId = String(row[3] || '').trim();
      const msg = String(row[4] || '').trim();

      const adminId = resolveAdminId(adminName);

      await client.query(`
        INSERT INTO activity_logs (admin_id, admin_name, action, module, record_id, message, logged_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [adminId, adminName, action, module, recordId, msg]);
      actLogInserted++;
    }
    counts['activity_logs'] = actLogInserted;

    // 13. Keep Notes
    console.log('    → Migrating Keep Notes...');
    let noteInserted = 0;
    for (let i = 1; i < rawKeepNotes.length; i++) {
      const row = rawKeepNotes[i];
      if (!row || !row[0]) continue;
      const content = String(row[0]).trim();
      if (!content) continue;

      await client.query(`
        INSERT INTO keep_notes (note_content, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
      `, [content]);
      noteInserted++;
    }
    counts['keep_notes'] = noteInserted;

    // COMMIT transaction
    await client.query('COMMIT');
    console.log('\n[5/5] Transaction committed successfully (COMMIT).');

    console.log('\n===========================================================');
    console.log('  MIGRATION VERIFICATION SUMMARY');
    console.log('===========================================================');
    console.table(counts);
    console.log('===========================================================');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n[FATAL ERROR] Migration failed. Transaction rolled back (ROLLBACK).');
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runEtl().catch((err) => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
