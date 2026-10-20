#!/usr/bin/env node
// =============================================================================
// Build-time Product Snapshot Generator
// Pre-bakes Google Sheets catalog into read-only, gitignored src/generated/products-snapshot.json
// Replaces fragile runtime disk writes on serverless environments per R5.2 / B-04.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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

const targetDir = path.resolve(process.cwd(), 'src/generated');
const targetFile = path.resolve(targetDir, 'products-snapshot.json');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const sheetId = process.env.GOOGLE_SHEET_ID || '1U1bdFZH68Seg3OcV3Wtucmsqg8JL5i3MIGECglu_hfs';
const keyFileCandidate = [
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
  path.resolve(process.cwd(), '../credentials/ficcado-quick-website-5fc91a2f02ba.json'),
  path.resolve(process.cwd(), 'credentials/ficcado-quick-website-5fc91a2f02ba.json'),
].find((p) => p && fs.existsSync(p));

let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let privateKey = process.env.GOOGLE_PRIVATE_KEY;

if (keyFileCandidate) {
  try {
    const raw = fs.readFileSync(keyFileCandidate, 'utf8');
    const json = JSON.parse(raw);
    clientEmail = json.client_email;
    privateKey = json.private_key;
  } catch (err) {
    console.warn('[Build Snapshot] Failed to read key file:', err.message);
  }
}

if (privateKey && !privateKey.includes('\n') && privateKey.includes('\\n')) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

function parsePrice(val) {
  if (typeof val === 'number') return Math.max(0, Math.round(val));
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.max(0, Math.round(num));
}

function parseBoolean(val, defaultVal = true) {
  if (typeof val === 'boolean') return val;
  if (!val) return defaultVal;
  const str = String(val).trim().toUpperCase();
  if (str === 'TRUE' || str === '1' || str === 'YES') return true;
  if (str === 'FALSE' || str === '0' || str === 'NO') return false;
  return defaultVal;
}

function typeToCategorySlug(typeStr) {
  const normalized = (typeStr || '').trim().toLowerCase();
  if (normalized.includes('combo')) return 'combos';
  if (normalized.includes('t-shirt') || normalized === 'tshirts') return 't-shirts';
  if (normalized.includes('shirt')) return 'shirts';
  if (normalized.includes('hoodie')) return 'hoodies';
  if (normalized.includes('pant') || normalized.includes('jean')) return 'pants';
  if (normalized.includes('sneaker') || normalized.includes('shoe')) return 'sneakers';
  return null;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function run() {
  console.log('====================================================');
  console.log('📦 Ficcado Build-Time Product Snapshot Generator');
  console.log('====================================================');

  if (!clientEmail || !privateKey) {
    console.warn('⚠️ No credentials available for build snapshot. Keeping existing snapshot if present.');
    if (!fs.existsSync(targetFile)) {
      fs.writeFileSync(targetFile, '[]\n', 'utf8');
    }
    return;
  }

  try {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsignedJwt = `${b64(header)}.${b64(claim)}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedJwt);
    signer.end();
    const signature = signer.sign(privateKey, 'base64url');
    const assertion = `${unsignedJwt}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`OAuth token failed: ${await tokenRes.text()}`);
    }

    const tokenData = await tokenRes.json();
    const range = encodeURIComponent("'Item Management'!A1:Z100");
    const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!sheetRes.ok) {
      throw new Error(`Sheets fetch failed: ${await sheetRes.text()}`);
    }

    const sheetData = await sheetRes.json();
    const rows = sheetData.values || [];

    if (rows.length <= 1) {
      console.warn('⚠️ No product rows in Item Management tab.');
      return;
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const getColIdx = (name) => headers.indexOf(name.toLowerCase());

    const idIdx = getColIdx('id');
    const nameIdx = getColIdx('item_name');
    const typeIdx = getColIdx('type');
    const priceIdx = getColIdx('price');
    const sizesIdx = getColIdx('sizes');
    const ratingIdx = getColIdx('average_rating');
    const reviewCountIdx = getColIdx('review_count');
    const colorsIdx = getColIdx('colors');
    const descIdx = getColIdx('description');
    const slugIdx = getColIdx('slug');
    const inStockIdx = getColIdx('in_stock');
    const featuredIdx = getColIdx('featured');
    const activeIdx = getColIdx('active');
    const sortOrderIdx = getColIdx('sort_order');

    let manifest = {};
    const manifestPath = path.resolve(targetDir, 'item-images.json');
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch {}
    }

    const products = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawActive = activeIdx !== -1 ? row[activeIdx] : 'TRUE';
      if (!parseBoolean(rawActive, true)) continue;

      const rawName = nameIdx !== -1 ? (row[nameIdx] || '').trim() : '';
      if (!rawName) continue;

      const rawType = typeIdx !== -1 ? (row[typeIdx] || '').trim() : '';
      const category = typeToCategorySlug(rawType);
      if (!category) continue;

      const price = priceIdx !== -1 ? parsePrice(row[priceIdx]) : 0;
      if (price <= 0) continue;

      const rawId = idIdx !== -1 && row[idIdx] ? row[idIdx].trim() : String(i);
      const rawSlug = slugIdx !== -1 && row[slugIdx] && row[slugIdx].trim()
        ? slugify(row[slugIdx].trim())
        : slugify(rawName);

      const inStock = inStockIdx !== -1 ? parseBoolean(row[inStockIdx], true) : true;
      const rawRating = ratingIdx !== -1 && row[ratingIdx] ? parseFloat(row[ratingIdx]) : 0;
      const rawReviews = reviewCountIdx !== -1 && row[reviewCountIdx] ? parseInt(row[reviewCountIdx], 10) : 0;
      const rating = isNaN(rawRating) || rawRating <= 0 ? 0 : Math.min(5, Math.max(0, rawRating));
      const reviews = isNaN(rawReviews) || rawReviews <= 0 ? 0 : rawReviews;

      const sizes = sizesIdx !== -1 && row[sizesIdx]
        ? Array.from(new Set(row[sizesIdx].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)))
        : ['S', 'M', 'L', 'XL'];
      const colors = colorsIdx !== -1 && row[colorsIdx]
        ? Array.from(new Set(row[colorsIdx].split(',').map((c) => c.trim()).filter(Boolean)))
        : [];
      const desc = descIdx !== -1 ? (row[descIdx] || '').trim() : '';
      const featured = featuredIdx !== -1 ? parseBoolean(row[featuredIdx], false) : false;
      const sortOrder = sortOrderIdx !== -1 ? parseInt(row[sortOrderIdx], 10) || i : i;

      const rawImages = manifest[rawSlug] || [];
      const images = rawImages.map((f) => `/images/items/${rawSlug}/${f}`);
      const primaryImg = images.length > 0 ? images[0] : null;
      const secondaryImg = images.length > 1 ? images[1] : images[0] || null;

      products.push({
        id: isNaN(Number(rawId)) ? rawId : Number(rawId),
        name: rawName,
        slug: rawSlug,
        type: rawType,
        category,
        price,
        rating,
        reviews,
        sizes,
        colors,
        desc,
        description: desc,
        img: primaryImg,
        flatImg: secondaryImg,
        images,
        inStock,
        featured,
        active: true,
        sort_order: sortOrder,
      });
    }

    products.sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));
    fs.writeFileSync(targetFile, JSON.stringify(products, null, 2), 'utf8');
    console.log(`✓ Successfully baked ${products.length} products to: src/generated/products-snapshot.json`);
    console.log('====================================================');
  } catch (err) {
    console.warn(`[Build Snapshot] Error generating snapshot: ${err.message}. Preserving existing fallback.`);
    if (!fs.existsSync(targetFile)) {
      fs.writeFileSync(targetFile, '[]\n', 'utf8');
    }
  }
}

run();
