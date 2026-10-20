import {
  getSpreadsheetMetadata,
  batchUpdateSpreadsheet,
  getSheetValues,
  updateSheetValues,
  getCredentials,
} from './client.ts';

export interface TabDefinition {
  name: string;
  columns: string[];
  description: string;
}

export const REQUIRED_TABS: Record<string, TabDefinition> = {
  ITEM_MANAGEMENT: {
    name: 'Item Management',
    columns: [
      'id',
      'item_name',
      'type',
      'price',
      'sizes',
      'average_rating',
      'review_count',
      'colors',
      'description',
      'slug',
      'in_stock',
      'featured',
      'active',
      'sort_order',
    ],
    description: 'Catalog products, pricing, sizes, ratings, and inventory status.',
  },
  COURIER_PARTNERS: {
    name: 'Courier Partners',
    columns: [
      'partner_id',
      'partner_name',
      'partner_phone',
      'partner_address',
      'rate_per_delivery',
      'created_at',
      'updated_at',
      'status',
      'delivery_time',
    ],
    description: 'Third-party delivery partners, rates, and delivery timeframes.',
  },
  NEW_SALE_REQUEST: {
    name: 'New Sale Request',
    columns: [
      'reference_id',
      'created_at',
      'status',
      'final_order_id',
      'customer_name',
      'customer_email',
      'customer_phone',
      'address_line1',
      'address_line2',
      'city',
      'state',
      'pincode',
      'landmark',
      'courier_partner_id',
      'courier_partner_name',
      'delivery_charge',
      'subtotal',
      'total_amount',
      'item_count',
      'items_summary',
      'items_json',
      'submission_id',
    ],
    description: 'Incoming customer orders submitted from checkout with server-verified totals.',
  },
  SUPPORT_REQUESTS: {
    name: 'Support Requests',
    columns: [
      'timestamp',
      'inquiry_id',
      'type',
      'order_id',
      'name',
      'email',
      'phone',
      'category',
      'message',
      'status',
    ],
    description: 'Customer contact inquiries, order support tickets, and feedback.',
  },
};

export interface BootstrapResult {
  ok: boolean;
  spreadsheetId: string;
  spreadsheetTitle: string;
  createdTabs: string[];
  addedColumns: Record<string, string[]>;
  seededTabs: string[];
  warnings: string[];
}

let memoizedBootstrap: Promise<BootstrapResult> | null = null;

/**
 * Idempotently ensures that the target spreadsheet contains all required tabs,
 * row-1 headers, frozen rows, and initial catalog seed data.
 * Safe to call multiple times; never deletes or overwrites existing data.
 */
export async function ensureSheetSchema(targetSheetId?: string): Promise<BootstrapResult> {
  const sheetId = targetSheetId || process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return {
      ok: false,
      spreadsheetId: '',
      spreadsheetTitle: '',
      createdTabs: [],
      addedColumns: {},
      seededTabs: [],
      warnings: ['GOOGLE_SHEET_ID is not configured. Running in snapshot mode.'],
    };
  }

  const creds = getCredentials();
  if (!creds) {
    return {
      ok: false,
      spreadsheetId: sheetId,
      spreadsheetTitle: '',
      createdTabs: [],
      addedColumns: {},
      seededTabs: [],
      warnings: ['Google service account credentials not found. Running in snapshot mode.'],
    };
  }

  const result: BootstrapResult = {
    ok: true,
    spreadsheetId: sheetId,
    spreadsheetTitle: '',
    createdTabs: [],
    addedColumns: {},
    seededTabs: [],
    warnings: [],
  };

  try {
    // 1. Fetch spreadsheet metadata
    const metadata = await getSpreadsheetMetadata(sheetId);
    result.spreadsheetTitle = metadata.properties?.title || 'Ficcado Spreadsheet';
    const existingSheets = metadata.sheets || [];
    const existingSheetMap = new Map<string, number>();
    for (const sheet of existingSheets) {
      existingSheetMap.set(sheet.properties.title, sheet.properties.sheetId);
    }

    // 2. Create missing tabs
    const tabsToCreate: string[] = [];
    for (const tabKey of Object.keys(REQUIRED_TABS)) {
      const tabDef = REQUIRED_TABS[tabKey];
      if (!existingSheetMap.has(tabDef.name)) {
        tabsToCreate.push(tabDef.name);
      }
    }

    if (tabsToCreate.length > 0) {
      const addRequests = tabsToCreate.map(title => ({
        addSheet: {
          properties: {
            title,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      }));
      await batchUpdateSpreadsheet(sheetId, addRequests);
      result.createdTabs.push(...tabsToCreate);

      // Refresh metadata to get sheet IDs of newly created tabs
      const updatedMetadata = await getSpreadsheetMetadata(sheetId);
      for (const sheet of updatedMetadata.sheets || []) {
        existingSheetMap.set(sheet.properties.title, sheet.properties.sheetId);
      }
    }

    // 3. Verify & sync headers for each tab
    const formattingRequests: unknown[] = [];

    for (const tabKey of Object.keys(REQUIRED_TABS)) {
      const tabDef = REQUIRED_TABS[tabKey];
      const sheetTabId = existingSheetMap.get(tabDef.name);
      if (sheetTabId === undefined) continue;

      // Read current row 1
      const headerRows = await getSheetValues(sheetId, `'${tabDef.name}'!1:1`);
      const existingHeaders = headerRows[0] || [];

      if (existingHeaders.length === 0) {
        // Tab is completely empty -> write all headers
        await updateSheetValues(sheetId, `'${tabDef.name}'!1:1`, [tabDef.columns]);
        result.addedColumns[tabDef.name] = [...tabDef.columns];
      } else {
        // Find any missing headers to append at the end (never reorder or remove existing)
        const missing = tabDef.columns.filter(col => !existingHeaders.includes(col));
        if (missing.length > 0) {
          const startColIndex = existingHeaders.length;
          // Calculate A1 notation column letter (e.g., A, B, ..., Z, AA, AB)
          const getColLetter = (colIdx: number) => {
            let temp = colIdx;
            let letter = '';
            while (temp >= 0) {
              letter = String.fromCharCode((temp % 26) + 65) + letter;
              temp = Math.floor(temp / 26) - 1;
            }
            return letter;
          };
          const startCol = getColLetter(startColIndex);
          const range = `'${tabDef.name}'!${startCol}1`;
          await updateSheetValues(sheetId, range, [missing]);
          result.addedColumns[tabDef.name] = missing;
        }
      }

      // Add format request: Bold row 1 + freeze row 1
      formattingRequests.push({
        repeatCell: {
          range: {
            sheetId: sheetTabId,
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.94, green: 0.95, blue: 0.96 },
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      });

      formattingRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheetTabId,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          fields: 'gridProperties.frozenRowCount',
        },
      });
    }

    if (formattingRequests.length > 0) {
      try {
        await batchUpdateSpreadsheet(sheetId, formattingRequests);
      } catch (err) {
        result.warnings.push(`Formatting batchUpdate non-fatal warning: ${(err as Error).message}`);
      }
    }

    // 4. Sample seeding code path removed per PART 2 Section R1.1 & R5.2 (Google Sheets Only)


    // If default "Sheet1" is empty and our 4 tabs are present, we can leave or safely delete it if it is unused
    const sheet1 = existingSheets.find(s => s.properties.title === 'Sheet1');
    if (sheet1 && result.createdTabs.length > 0) {
      try {
        const sheet1Values = await getSheetValues(sheetId, "'Sheet1'!A1:B2");
        if (sheet1Values.length === 0) {
          await batchUpdateSpreadsheet(sheetId, [{ deleteSheet: { sheetId: sheet1.properties.sheetId } }]);
        }
      } catch {
        // Non-fatal if Sheet1 cannot be deleted
      }
    }

    return result;
  } catch (err) {
    result.ok = false;
    result.warnings.push(`Bootstrap failed: ${(err as Error).message}`);
    return result;
  }
}

/**
 * Cached singleton execution for server lifecycle.
 */
export function getEnsuredSheetSchema(): Promise<BootstrapResult> {
  if (!memoizedBootstrap) {
    memoizedBootstrap = ensureSheetSchema();
  }
  return memoizedBootstrap;
}
