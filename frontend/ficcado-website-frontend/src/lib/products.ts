// =============================================================================
// Product & Catalog Data Layer — /src/lib/products.ts
// Single source of truth for items is Google Sheets 'Item Management'.
// Dynamic header resolution, no dummy fallbacks, and resilient cache per R5.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { isCategoryLive } from '@/config/categories';
import { slugify } from '@/lib/slugify';
import {
  getItemImages,
  getPrimaryItemImage,
  getSecondaryItemImage,
} from '@/lib/itemImages';
import { getSheetValues } from '@/lib/sheets/client';
import type { ClothingCategory, Product, SizeOption } from '@/types';

const SNAPSHOT_FILE = path.join(process.cwd(), 'src', 'generated', 'products-snapshot.json');

function parsePrice(val: unknown): number {
  if (typeof val === 'number') return Math.max(0, Math.round(val));
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.max(0, Math.round(num));
}

function parseBoolean(val: unknown, defaultVal = true): boolean {
  if (typeof val === 'boolean') return val;
  if (!val) return defaultVal;
  const str = String(val).trim().toUpperCase();
  if (str === 'TRUE' || str === '1' || str === 'YES') return true;
  if (str === 'FALSE' || str === '0' || str === 'NO') return false;
  return defaultVal;
}

function typeToCategorySlug(typeStr: string): ClothingCategory | null {
  const normalized = (typeStr || '').trim().toLowerCase();
  if (normalized.includes('combo')) return 'combos';
  if (normalized.includes('t-shirt') || normalized === 'tshirts') return 't-shirts';
  if (normalized.includes('shirt')) return 'shirts';
  if (normalized.includes('hoodie')) return 'hoodies';
  if (normalized.includes('pant') || normalized.includes('jean')) return 'pants';
  if (normalized.includes('sneaker') || normalized.includes('shoe')) return 'sneakers';
  return null;
}

function parseSizes(sizesStr?: string): SizeOption[] {
  if (!sizesStr) return ['S', 'M', 'L', 'XL'];
  const split = sizesStr
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(split)) as SizeOption[];
}

function parseColors(colorsStr?: string): string[] {
  if (!colorsStr) return [];
  const split = colorsStr
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  return Array.from(new Set(split));
}

function normalizeProductDescription(desc: string): string {
  if (!desc) return '';
  return desc
    .replace(/380\s*gsm/gi, '240 GSM')
    .replace(/380/g, '240')
    .replace(/240\s*gsm/gi, '240 GSM')
    .replace(/240/g, '240')
    .replace(/heavyweight/gi, 'high quality');
}

/**
 * Reads read-only build-time snapshot when Google Sheets API is unreachable.
 * Never performs runtime disk writes on serverless environments.
 */
function readSnapshot(includeOutOfStock = false): Product[] {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const data = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as Product[])
          .filter((p) => includeOutOfStock || (p.inStock && isCategoryLive(p.category)))
          .map((p) => {
            const d = normalizeProductDescription(p.desc || p.description || '');
            return { ...p, desc: d, description: d };
          });
      }
    }
  } catch (err) {
    console.warn('[Catalog] Error reading product build snapshot:', (err as Error).message);
  }
  return [];
}

/**
 * Fetches catalog products directly from the Google Sheets 'Item Management' tab.
 * Dynamically resolves columns by header name to allow safe column reordering.
 * Skips rows with invalid prices, missing names, unapproved types, or out-of-stock items.
 *
 * Directive: "unavailable or outofstock items should not be displayed in the website."
 */
export async function getProducts(options?: { includeOutOfStock?: boolean }): Promise<Product[]> {
  const includeOutOfStock = options?.includeOutOfStock ?? false;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (sheetId) {
    try {
      const rows = await getSheetValues(sheetId, "'Item Management'!A1:Z100", {
        revalidate: 60,
        tags: ['products'],
      });
      if (rows && rows.length > 1) {
        const headers = rows[0].map((h) => h.trim().toLowerCase());
        const getColIdx = (name: string) => headers.indexOf(name.toLowerCase());

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

        const products: Product[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Must be active
          const rawActive = activeIdx !== -1 ? row[activeIdx] : 'TRUE';
          if (!parseBoolean(rawActive, true)) continue;

          // Must have valid item name
          const rawName = nameIdx !== -1 ? (row[nameIdx] || '').trim() : '';
          if (!rawName) continue;

          // Must have valid category type
          const rawType = typeIdx !== -1 ? (row[typeIdx] || '').trim() : '';
          const category = typeToCategorySlug(rawType);
          if (!category) {
            console.warn(`[Catalog] Row ${i} (${rawName}) skipped: unknown type "${rawType}"`);
            continue;
          }

          // Must have valid positive price
          const price = priceIdx !== -1 ? parsePrice(row[priceIdx]) : 0;
          if (price <= 0) {
            console.warn(`[Catalog] Row ${i} (${rawName}) skipped: invalid price "${row[priceIdx]}"`);
            continue;
          }

          const rawId = idIdx !== -1 && row[idIdx] ? row[idIdx].trim() : String(i);
          const rawSlug = slugIdx !== -1 && row[slugIdx] && row[slugIdx].trim()
            ? slugify(row[slugIdx].trim())
            : slugify(rawName);

          const isLive = isCategoryLive(category);
          const inStock = isLive && (inStockIdx !== -1 ? parseBoolean(row[inStockIdx], true) : true);

          // Ratings only set if positive numbers exist in sheet, never defaulted to fake values
          const rawRating = ratingIdx !== -1 && row[ratingIdx] ? parseFloat(row[ratingIdx]) : 0;
          const rawReviews = reviewCountIdx !== -1 && row[reviewCountIdx] ? parseInt(row[reviewCountIdx], 10) : 0;
          const rating = isNaN(rawRating) || rawRating <= 0 ? 0 : Math.min(5, Math.max(0, rawRating));
          const reviews = isNaN(rawReviews) || rawReviews <= 0 ? 0 : rawReviews;

          const sizes = sizesIdx !== -1 ? parseSizes(row[sizesIdx]) : ['S', 'M', 'L', 'XL'];
          const colors = colorsIdx !== -1 ? parseColors(row[colorsIdx]) : [];
          const desc = normalizeProductDescription(descIdx !== -1 ? row[descIdx] || '' : '');
          const featured = featuredIdx !== -1 ? parseBoolean(row[featuredIdx], false) : false;
          const sortOrder = sortOrderIdx !== -1 ? parseInt(row[sortOrderIdx], 10) || i : i;

          const images = getItemImages(rawSlug);
          const primaryImg = getPrimaryItemImage(rawSlug);
          const secondaryImg = getSecondaryItemImage(rawSlug);

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

        if (products.length > 0) {
          const sorted = products.sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99));
          return sorted.filter((p) => includeOutOfStock || (p.inStock && isCategoryLive(p.category)));
        }
      }
    } catch (err) {
      console.warn('[Catalog] Google Sheets catalog read failed, falling back to build snapshot:', (err as Error).message);
    }
  }

  // Fallback: serve read-only build-time snapshot (no dummy/handcrafted products)
  const snapshot = readSnapshot(includeOutOfStock);
  if (snapshot.length > 0) {
    return snapshot;
  }

  // Return empty array if unreachable and no snapshot exists
  return [];
}

/**
 * Returns single product by id.
 */
export async function getProductById(id: number | string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => String(p.id) === String(id));
}

/**
 * Returns single product by slug.
 */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.slug === slug);
}
