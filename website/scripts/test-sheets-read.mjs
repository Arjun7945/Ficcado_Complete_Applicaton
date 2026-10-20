import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Load .env.local
const envLocal = fs.readFileSync('.env.local', 'utf8');
for (const line of envLocal.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > 0) {
    process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
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
  const signature = sign.sign(privateKey, 'base64url');
  return `${unsigned}.${signature}`;
}

async function run() {
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
  const sheetId = '1U1bdFZH68Seg3OcV3Wtucmsqg8JL5i3MIGECglu_hfs';
  const range = encodeURIComponent("'Item Management'!A1:Z20");
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const data = await res.json();
  console.log('Headers:', data.values[0]);
  console.log('First Item Row:', data.values[1]);
  console.log('Total Rows:', data.values.length);
}

run().catch(console.error);
