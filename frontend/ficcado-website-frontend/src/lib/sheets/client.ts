import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

let cachedToken: { token: string; expiresAt: number } | null = null;

export interface SheetCredentials {
  clientEmail: string;
  privateKey: string;
}

/**
 * Resolves Google Service Account credentials from environment variables or credentials JSON file.
 */
export function getCredentials(): SheetCredentials | null {
  // 1. Explicit private key & email in env
  const envEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let envKey = process.env.GOOGLE_PRIVATE_KEY;

  if (envEmail && envKey) {
    if (!envKey.includes('\n') && envKey.includes('\\n')) {
      envKey = envKey.replace(/\\n/g, '\n');
    }
    return { clientEmail: envEmail, privateKey: envKey };
  }

  // 2. File path in env or default local paths
  const fileCandidates = [
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    path.resolve(process.cwd(), '../credentials/ficcado-quick-website-5fc91a2f02ba.json'),
    path.resolve(process.cwd(), 'credentials/ficcado-quick-website-5fc91a2f02ba.json'),
    path.resolve(process.cwd(), '../../credentials/ficcado-quick-website-5fc91a2f02ba.json'),
  ].filter(Boolean) as string[];

  for (const candidate of fileCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, 'utf8');
        const json = JSON.parse(raw);
        if (json.client_email && json.private_key) {
          return {
            clientEmail: json.client_email,
            privateKey: json.private_key,
          };
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Generates an RS256 signed JWT for Google OAuth2 token exchange.
 * Pure Node.js crypto, no heavy dependencies.
 */
function createJwt(email: string, privateKey: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(claim)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(privateKey, 'base64url');
  return `${unsigned}.${signature}`;
}

/**
 * Retrieves a valid Google OAuth2 access token with automatic caching & renewal.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 300000) {
    return cachedToken.token;
  }

  const creds = getCredentials();
  if (!creds) {
    throw new Error('Google Sheets credentials not configured. Please supply GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_PRIVATE_KEY or credentials JSON file.');
  }

  const jwt = createJwt(creds.clientEmail, creds.privateKey);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google OAuth2 token exchange failed [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  const token = data.access_token as string;
  const expiresIn = (data.expires_in || 3600) as number;
  cachedToken = {
    token,
    expiresAt: now + expiresIn * 1000,
  };

  return token;
}

/**
 * Sanitizes any cell input against spreadsheet formula injection.
 * Prefixes cells beginning with =, +, -, @ with a single quote.
 */
export function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export interface SheetMetadata {
  properties: {
    title: string;
  };
  sheets: Array<{
    properties: {
      sheetId: number;
      title: string;
      gridProperties?: {
        rowCount: number;
        columnCount: number;
        frozenRowCount?: number;
      };
    };
  }>;
}

/**
 * Fetches spreadsheet metadata (sheets/tabs list, dimensions).
 */
export async function getSpreadsheetMetadata(sheetId: string): Promise<SheetMetadata> {
  const token = await getAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch spreadsheet metadata [${res.status}]: ${errorText}`);
  }

  return res.json();
}

/**
 * Executes a batchUpdate on the spreadsheet.
 */
export async function batchUpdateSpreadsheet(sheetId: string, requests: unknown[]): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`batchUpdate failed [${res.status}]: ${errorText}`);
  }

  return res.json();
}

export interface SheetReadOptions {
  revalidate?: number | false;
  tags?: string[];
  timeoutMs?: number;
  retries?: number;
  cache?: RequestCache;
}

/**
 * Reads row values from a specific tab and range.
 * Supports Next.js ISR cache controls (defaults to 60s revalidation) and resilient retries.
 */
export async function getSheetValues(
  sheetId: string,
  range: string,
  options?: SheetReadOptions
): Promise<string[][]> {
  const revalidate = options?.revalidate ?? 60;
  const tags = options?.tags ?? ['sheets'];
  const timeoutMs = options?.timeoutMs ?? 6000;
  const maxRetries = options?.retries ?? 2;

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const token = await getAccessToken();
      const encodedRange = encodeURIComponent(range);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const fetchInit: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      };

      if (options?.cache) {
        fetchInit.cache = options.cache;
      } else if (typeof revalidate === 'number' || revalidate === false) {
        fetchInit.next = { revalidate, tags };
      }

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`,
        fetchInit
      );
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 404) return [];
        const errorText = await res.text();
        // Retry on 5xx server errors or 429 quota throttle
        if ((res.status >= 500 || res.status === 429) && attempt < maxRetries) {
          attempt++;
          const jitter = crypto.randomInt(0, 100);
          const backoff = Math.min(2000, 250 * Math.pow(2, attempt) + jitter);
          console.warn(`[Sheets] Read for ${range} failed [${res.status}]. Retrying in ${backoff}ms (attempt ${attempt}/${maxRetries})...`);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        throw new Error(`Failed to get sheet values for ${range} [${res.status}]: ${errorText}`);
      }

      const data = await res.json();
      return (data.values as string[][]) || [];
    } catch (err) {
      if (attempt < maxRetries) {
        attempt++;
        const jitter = crypto.randomInt(0, 100);
        const backoff = Math.min(2000, 250 * Math.pow(2, attempt) + jitter);
        console.warn(`[Sheets] Read error for ${range}: ${(err as Error).message}. Retrying in ${backoff}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw err;
    }
  }
  return [];
}

/**
 * Appends row values to a specific tab.
 */
export async function appendSheetValues(
  sheetId: string,
  range: string,
  values: unknown[][],
  valueInputOption = 'USER_ENTERED'
): Promise<unknown> {
  const token = await getAccessToken();
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}:append?valueInputOption=${valueInputOption}&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to append sheet values to ${range} [${res.status}]: ${errorText}`);
  }

  return res.json();
}

/**
 * Updates row values for a specific tab and range.
 */
export async function updateSheetValues(
  sheetId: string,
  range: string,
  values: unknown[][],
  valueInputOption = 'USER_ENTERED'
): Promise<unknown> {
  const token = await getAccessToken();
  const encodedRange = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?valueInputOption=${valueInputOption}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update sheet values for ${range} [${res.status}]: ${errorText}`);
  }

  return res.json();
}
