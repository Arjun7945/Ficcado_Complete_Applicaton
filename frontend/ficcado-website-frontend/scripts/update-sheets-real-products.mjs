import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sheetId = process.env.GOOGLE_SHEET_ID || '1U1bdFZH68Seg3OcV3Wtucmsqg8JL5i3MIGECglu_hfs';
const keyFile = path.resolve('../credentials/ficcado-quick-website-5fc91a2f02ba.json');

if (!fs.existsSync(keyFile)) {
  console.error('Credentials file not found:', keyFile);
  process.exit(1);
}

const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
const now = Math.floor(Date.now() / 1000);
const claim = {
  iss: key.client_email,
  scope: 'https://www.googleapis.com/auth/spreadsheets',
  aud: 'https://oauth2.googleapis.com/token',
  exp: now + 3600,
  iat: now,
};

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claim)}`;
const signer = crypto.createSign('RSA-SHA256');
signer.update(unsigned);
signer.end();
const assertion = `${unsigned}.${signer.sign(key.private_key, 'base64url')}`;

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }),
});

const token = (await tokenRes.json()).access_token;
if (!token) {
  console.error('Failed to get Google token');
  process.exit(1);
}

// 1. Clear old data from A2:Z100 in Item Management
const clearRange = encodeURIComponent("'Item Management'!A2:Z100");
const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${clearRange}:clear`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

console.log('Cleared old items in Item Management:', clearRes.status);

// 2. Put real products into Item Management A2:N9
const realRows = [
  // --- New Launch Drops (Priority Top) ---
  [
    '1',
    'Chosen',
    'T-Shirts',
    '699',
    'XS,S,M,L,XL',
    '4.9',
    '19',
    '#DC2626',
    'Different by choice not by chance. Made for those who embrace their individuality. Be whoever you choose to be.',
    'chosen',
    'TRUE',
    'TRUE',
    'TRUE',
    '1',
  ],
  [
    '2',
    'Grounded',
    'T-Shirts',
    '799',
    'XS,S,M,L,XL',
    '5.0',
    '27',
    '#111827',
    'Inspired by the strength of staying rooted through every change. A minimal design that represents resilience, growth, and new beginnings. No matter how far you grow, never forget your roots.',
    'grounded',
    'TRUE',
    'TRUE',
    'TRUE',
    '2',
  ],
  [
    '3',
    'Remember',
    'T-Shirts',
    '599',
    'XS,S,M,L,XL',
    '4.9',
    '23',
    '#1E3A8A',
    'A quiet reminder to come back to the present. Yesterday is gone. Tomorrow can wait. Be here. Be now.',
    'remember',
    'TRUE',
    'TRUE',
    'TRUE',
    '3',
  ],
  [
    '4',
    'Reminder',
    'T-Shirts',
    '599',
    'XS,S,M,L,XL',
    '4.8',
    '16',
    '#15803D',
    'Minimal on the front. A statement on the back. “Something is better than nothing.” An oversized everyday essential made for quiet confidence.',
    'reminder',
    'TRUE',
    'TRUE',
    'TRUE',
    '4',
  ],
  // --- Existing Priority Catalog Drops ---
  [
    '5',
    'Echoes of the empire',
    'T-Shirts',
    '499',
    'XS,S,M,L,XL',
    '4.9',
    '24',
    '#111827,#FFFFFF,#7B1113',
    "Echoes of the empire captures the grandeur of India's regal past, a moment frozen in time where tradition parades with pride. This t-shirt isn't just apparel, it's an artwork. The vivid illustration celebrates royal possession that once marked power, celebration and legacy.",
    'echoes-of-the-empire',
    'TRUE',
    'FALSE',
    'TRUE',
    '5',
  ],
  [
    '6',
    'Frame The Bloom',
    'T-Shirts',
    '699',
    'XS,S,M,L,XL',
    '4.9',
    '31',
    '#FFFFFF,#D4C4A8,#99BADD',
    "Frame the bloom tee is inspired by analog nostalgia, a time when every photo had meaning and every frame was a keepsake. Surrounded by bold blossoms and natural motifs, the camera symbolizes not just memory-keeping but creative expression. It's a celebration of growth, reflection, and capturing beauty in everyday life.",
    'frame-the-bloom',
    'TRUE',
    'FALSE',
    'TRUE',
    '6',
  ],
  [
    '7',
    'Silent Sentinel',
    'T-Shirts',
    '499',
    'XS,S,M,L,XL',
    '4.8',
    '18',
    '#111827,#FFFFFF',
    "Inspired by the myth of the eternal guardian who watches over sacred grounds, this tee represents the energy of protectiveness and silent strength. The fiery red design evokes ancient legends where dragons were not just feared but revered as symbols of endurance, power, and wisdom. This tee is for the ones who lead from the shadows, whose energy is felt before their words are heard.",
    'silent-sentinel',
    'TRUE',
    'FALSE',
    'TRUE',
    '7',
  ],
  [
    '8',
    'The watchers',
    'T-Shirts',
    '499',
    'XS,S,M,L,XL',
    '4.8',
    '15',
    '#111827',
    "In the world where many watch but few understand, this tee is for those who walk silently under the moonlight, carrying fire within. The watchers is more than a design, it's a reminder that someone always sees strength even in your silence.",
    'the-watchers',
    'TRUE',
    'FALSE',
    'TRUE',
    '8',
  ],
];

const updateRange = encodeURIComponent("'Item Management'!A2:N9");
const updateRes = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`,
  {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: "'Item Management'!A2:N9",
      majorDimension: 'ROWS',
      values: realRows,
    }),
  }
);

const updateData = await updateRes.json();
console.log('Updated real products into Google Sheets:', updateData);
