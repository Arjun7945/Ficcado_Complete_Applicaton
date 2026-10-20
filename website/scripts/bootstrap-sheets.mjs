#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Load .env.local if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const sheetId = process.env.GOOGLE_SHEET_ID || '1U1bdFZH68Seg3OcV3Wtucmsqg8JL5i3MIGECglu_hfs';
const keyFileCandidate = [
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
  path.resolve(process.cwd(), '../credentials/ficcado-quick-website-5fc91a2f02ba.json'),
  path.resolve(process.cwd(), 'credentials/ficcado-quick-website-5fc91a2f02ba.json'),
].find(p => p && fs.existsSync(p));

if (!keyFileCandidate && !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
  console.error('❌ No service account credentials found.');
  process.exit(process.env.SHEETS_STRICT === 'true' ? 1 : 0);
}

let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let privateKey = process.env.GOOGLE_PRIVATE_KEY;

if (keyFileCandidate) {
  const raw = fs.readFileSync(keyFileCandidate, 'utf8');
  const json = JSON.parse(raw);
  clientEmail = json.client_email;
  privateKey = json.private_key;
}

if (!clientEmail || !privateKey) {
  console.error('❌ Incomplete service account credentials.');
  process.exit(process.env.SHEETS_STRICT === 'true' ? 1 : 0);
}

if (privateKey && !privateKey.includes('\n') && privateKey.includes('\\n')) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

function createJwt(email, key) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(claim)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(key, 'base64url');
  return `${unsigned}.${signature}`;
}

async function getAccessToken() {
  const jwt = createJwt(clientEmail, privateKey);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

const REQUIRED_TABS = {
  'Item Management': [
    'id', 'item_name', 'type', 'price', 'sizes', 'average_rating', 'review_count',
    'colors', 'description', 'slug', 'in_stock', 'featured', 'active', 'sort_order'
  ],
  'Courier Partners': [
    'partner_id', 'partner_name', 'partner_phone', 'partner_address',
    'rate_per_delivery', 'created_at', 'updated_at', 'status', 'delivery_time'
  ],
  'New Sale Request': [
    'reference_id', 'created_at', 'status', 'final_order_id', 'customer_name',
    'customer_email', 'customer_phone', 'address_line1', 'address_line2',
    'city', 'state', 'pincode', 'landmark', 'courier_partner_id', 'courier_partner_name',
    'delivery_charge', 'subtotal', 'total_amount', 'item_count', 'items_summary', 'items_json', 'submission_id'
  ],
  'Support Requests': [
    'timestamp', 'inquiry_id', 'type', 'order_id', 'name', 'email', 'phone',
    'category', 'message', 'status'
  ],
  'Drop Notification List': [
    'subscriber_id', 'created_at', 'email', 'status', 'source'
  ]
};


async function runBootstrap() {
  console.log('====================================================');
  console.log('📊 Ficcado Google Sheets Database Bootstrapper');
  console.log(`Target Spreadsheet ID: ${sheetId}`);
  console.log(`Service Account:       ${clientEmail}`);
  console.log('====================================================');

  const token = await getAccessToken();
  console.log('✓ Google OAuth2 Token acquired successfully.');

  // 1. Fetch metadata
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Failed to read spreadsheet [${metaRes.status}]: ${errText}`);
  }
  const metadata = await metaRes.json();
  console.log(`✓ Connected to spreadsheet: "${metadata.properties?.title}"`);

  const existingSheetMap = new Map();
  for (const s of metadata.sheets || []) {
    existingSheetMap.set(s.properties.title, s.properties.sheetId);
  }

  // 2. Create missing tabs
  const missingTabs = Object.keys(REQUIRED_TABS).filter(t => !existingSheetMap.has(t));
  if (missingTabs.length > 0) {
    console.log(`Creating missing tabs: ${missingTabs.join(', ')}...`);
    const addRequests = missingTabs.map(title => ({
      addSheet: {
        properties: {
          title,
          gridProperties: { frozenRowCount: 1 }
        }
      }
    }));
    const addRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: addRequests })
    });
    if (!addRes.ok) {
      throw new Error(`Failed to create tabs: ${await addRes.text()}`);
    }
    console.log('✓ Successfully created tabs.');

    // Refresh metadata
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const updated = await r.json();
    for (const s of updated.sheets || []) {
      existingSheetMap.set(s.properties.title, s.properties.sheetId);
    }
  } else {
    console.log('✓ All 4 required tabs already exist.');
  }

  // 3. Sync headers and formatting
  const formattingRequests = [];

  for (const [tabTitle, requiredCols] of Object.entries(REQUIRED_TABS)) {
    const sheetTabId = existingSheetMap.get(tabTitle);
    const range = `'${tabTitle}'!1:1`;
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const getData = await getRes.json();
    const existingHeaders = (getData.values && getData.values[0]) || [];

    if (existingHeaders.length === 0) {
      console.log(`Writing initial headers for tab [${tabTitle}] (${requiredCols.length} columns)...`);
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [requiredCols] })
      });
      console.log(`✓ Headers written for [${tabTitle}].`);
    } else {
      const missing = requiredCols.filter(c => !existingHeaders.includes(c));
      if (missing.length > 0) {
        console.log(`Appending ${missing.length} missing columns to [${tabTitle}]: ${missing.join(', ')}...`);
        let temp = existingHeaders.length;
        let colLetter = '';
        while (temp >= 0) {
          colLetter = String.fromCharCode((temp % 26) + 65) + colLetter;
          temp = Math.floor(temp / 26) - 1;
        }
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`'${tabTitle}'!${colLetter}1`)}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [missing] })
        });
        console.log(`✓ Missing columns appended to [${tabTitle}].`);
      } else {
        console.log(`✓ Headers for [${tabTitle}] are complete and verified.`);
      }
    }

    if (sheetTabId !== undefined) {
      formattingRequests.push({
        repeatCell: {
          range: { sheetId: sheetTabId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.94, green: 0.95, blue: 0.96 }
            }
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)'
        }
      });
      formattingRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheetTabId,
            gridProperties: { frozenRowCount: 1 }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      });
    }
  }

  if (formattingRequests.length > 0) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: formattingRequests })
      });
      console.log('✓ Header row formatting and freezing applied to all tabs.');
    } catch (e) {
      console.warn('Note: formatting request completed with warning:', e.message);
    }
  }

  // 4. Sample seeding code path removed per PART 2 Section R1.1 & R5.2 (Google Sheets Only)


  // 5. Clean up initial Sheet1 if empty
  const sheet1Id = existingSheetMap.get('Sheet1');
  if (sheet1Id !== undefined && existingSheetMap.size > 1) {
    try {
      const s1Res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("'Sheet1'!A1:B2")}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const s1Data = await s1Res.json();
      if (!s1Data.values || s1Data.values.length === 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: [{ deleteSheet: { sheetId: sheet1Id } }] })
        });
        console.log('✓ Removed empty default "Sheet1".');
      }
    } catch {
      // Non-fatal
    }
  }

  console.log('====================================================');
  console.log('🎉 Google Sheets Schema Bootstrap COMPLETED successfully!');
  console.log('====================================================');
}

runBootstrap().catch(err => {
  console.error('❌ Bootstrap encountered error:', err.message);
  process.exit(process.env.SHEETS_STRICT === 'true' ? 1 : 0);
});
