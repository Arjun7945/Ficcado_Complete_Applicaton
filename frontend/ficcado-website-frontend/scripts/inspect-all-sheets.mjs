import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const envLocal = fs.readFileSync('.env.local', 'utf8');
for (const line of envLocal.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > 0) process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const credPath = path.resolve('../credentials/ficcado-quick-website-5fc91a2f02ba.json');
const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));

function createJwt(email, privateKey) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(claim)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  return `${unsigned}.${sign.sign(privateKey, 'base64url')}`;
}

async function inspect() {
  const jwt = createJwt(creds.client_email, creds.private_key);
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  const { access_token } = await tokenRes.json();
  const sheetId = process.env.GOOGLE_SHEET_ID || '1U1bdFZH68Seg3OcV3Wtucmsqg8JL5i3MIGECglu_hfs';
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const meta = await metaRes.json();
  console.log('Title:', meta.properties.title);
  for (const s of meta.sheets) {
    const title = s.properties.title;
    const range = `'${title}'!A1:Z50`;
    const vRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const vData = await vRes.json();
    console.log(`\nSheet [${title}] (ID: ${s.properties.sheetId}): ${(vData.values || []).length} rows`);
    if (vData.values && vData.values.length > 0) {
      console.log('  Headers:', JSON.stringify(vData.values[0]));
      for (let i = 1; i < vData.values.length; i++) {
        console.log(`  Row ${i}:`, JSON.stringify(vData.values[i]));
      }
    }
  }
}

inspect().catch(console.error);
