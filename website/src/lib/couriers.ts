import { getSheetValues } from '@/lib/sheets/client';

export interface CourierOption {
  id: string; // partner_id
  name: string; // partner_name
  rate: number; // rate_per_delivery (0 means Free)
  deliveryTime?: string; // delivery_time (if present in sheet)
  status: 'ACTIVE' | 'INACTIVE';
}

// In-memory fallback only in case of Google Sheets API network outage
let couriersFallbackCache: CourierOption[] | null = null;

function parseRate(val: unknown): number | null {
  if (typeof val === 'number') {
    return isNaN(val) || val < 0 ? null : Math.round(val);
  }
  if (!val && val !== 0) return null;
  const str = String(val).replace(/[^0-9.]/g, '').trim();
  if (str === '') return null;
  const num = parseFloat(str);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num);
}

/**
 * Fetches active courier partners directly from Google Sheets 'Courier Partners' tab per Section R4.
 *
 * Rules:
 * - Each active row = one delivery option
 * - Option label = partner_name, charge = rate_per_delivery
 * - rate_per_delivery = 0 means free delivery
 * - delivery_time is included only if present in sheet; never invented
 * - Rows with missing/invalid rate or missing name/id are skipped with warnings logged
 * - Options are sorted by charge ascending, then name
 */
export async function getCourierPartners(): Promise<CourierOption[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    console.warn('[Couriers] GOOGLE_SHEET_ID not configured.');
    return [];
  }

  try {
    const rows = await getSheetValues(sheetId, "'Courier Partners'!A1:Z100", {
      revalidate: 60,
      tags: ['couriers'],
    });
    if (!rows || rows.length <= 1) {
      console.warn('[Couriers] "Courier Partners" tab is empty or missing data rows.');
      return [];
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const idIdx = headers.indexOf('partner_id');
    const nameIdx = headers.indexOf('partner_name');
    const rateIdx = headers.indexOf('rate_per_delivery');
    const statusIdx = headers.indexOf('status');
    const timeIdx = headers.indexOf('delivery_time');

    if (nameIdx === -1 || rateIdx === -1) {
      console.warn('[Couriers] Required headers (partner_name, rate_per_delivery) not found in "Courier Partners" tab.');
      return [];
    }

    const options: CourierOption[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawId = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : '';
      const rawName = String(row[nameIdx] || '').trim();
      const rawStatus = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim().toUpperCase() : 'ACTIVE';
      const rawRate = row[rateIdx];
      const rawTime = timeIdx !== -1 && row[timeIdx] ? String(row[timeIdx]).trim() : undefined;

      if (!rawName) {
        console.warn(`[Couriers] Skipping row ${i + 1}: missing partner_name.`);
        continue;
      }

      const partnerId = rawId || rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      // Check status (only ACTIVE rows considered)
      if (rawStatus && rawStatus !== 'ACTIVE') {
        continue;
      }

      const parsedRate = parseRate(rawRate);
      if (parsedRate === null) {
        console.warn(`[Couriers] Skipping row ${i + 1} (${rawName}): invalid or missing rate_per_delivery "${rawRate}".`);
        continue;
      }

      options.push({
        id: partnerId,
        name: rawName,
        rate: parsedRate,
        deliveryTime: rawTime && rawTime !== '' ? rawTime : undefined,
        status: 'ACTIVE',
      });
    }

    // Sort by charge ascending, then name ascending
    options.sort((a, b) => {
      if (a.rate !== b.rate) {
        return a.rate - b.rate;
      }
      return a.name.localeCompare(b.name);
    });

    couriersFallbackCache = options;

    return options;
  } catch (err) {
    console.error('[Couriers] Error fetching courier partners from Google Sheets:', (err as Error).message);
    if (couriersFallbackCache && couriersFallbackCache.length > 0) {
      return couriersFallbackCache;
    }
    return [];
  }
}

/**
 * Looks up an active courier partner by ID on the server.
 */
export async function getCourierPartnerById(id: string): Promise<CourierOption | undefined> {
  const partners = await getCourierPartners();
  return partners.find((p) => p.id === id);
}
