import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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
  const unsigned = b64(header) + '.' + b64(claim);
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(privateKey, 'base64url');
  return unsigned + '.' + signature;
}

async function test() {
  console.log('Testing authentication for:', creds.client_email);
  const jwt = createJwt(creds.client_email, creds.private_key);
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error('Failed to get token:', tokenData);
    process.exit(1);
  }
  console.log('Successfully acquired OAuth2 access token!');

  const sheetId = '1U1bdFZH68Seg3OcV3Wtucmsqg8JL5i3MIGECglu_hfs';
  const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const sheetData = await sheetRes.json();
  if (sheetData.error) {
    console.error('Error fetching sheet:', sheetData.error);
    process.exit(1);
  }

  console.log('Spreadsheet title:', sheetData.properties?.title);
  console.log('Spreadsheet tabs:', sheetData.sheets?.map(s => s.properties.title));
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
