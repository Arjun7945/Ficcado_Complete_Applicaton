import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

// =============================================================================
// Download API Route — /api/download
// Delivers full-resolution product images with Content-Disposition: attachment
// Ensures universal download capability across Desktop, Tablet, and Mobile devices.
// =============================================================================

const MIME_MAP: Record<string, string> = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileParam = searchParams.get('file');
  const nameParam = searchParams.get('name');

  if (!fileParam) {
    return NextResponse.json(
      { error: 'Missing file parameter' },
      { status: 400 }
    );
  }

  // Sanitize file path
  let cleanPath = decodeURIComponent(fileParam).trim().replace(/\\/g, '/');

  // Strip origin if full URL was provided
  try {
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      const parsed = new URL(cleanPath);
      cleanPath = parsed.pathname;
    }
  } catch {
    // continue
  }

  // Strip leading slashes
  cleanPath = cleanPath.replace(/^\/+/, '');

  // Guard against directory traversal
  if (cleanPath.includes('..') || cleanPath.includes('\0')) {
    return NextResponse.json(
      { error: 'Forbidden file path' },
      { status: 403 }
    );
  }

  // Must reside in public/images/
  if (!cleanPath.startsWith('images/')) {
    return NextResponse.json(
      { error: 'Path must be within images directory' },
      { status: 403 }
    );
  }

  const publicDir = path.resolve(process.cwd(), 'public');
  const absolutePath = path.resolve(publicDir, cleanPath);
  const allowedDir = path.resolve(publicDir, 'images');

  // Verify resolved path stays strictly within public/images
  if (!absolutePath.startsWith(allowedDir)) {
    return NextResponse.json(
      { error: 'Forbidden file path' },
      { status: 403 }
    );
  }

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json(
      { error: 'Image file not found on disk' },
      { status: 404 }
    );
  }

  try {
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      return NextResponse.json(
        { error: 'Target is not a valid file' },
        { status: 400 }
      );
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const fallbackName = path.basename(absolutePath);
    const downloadName = (nameParam || fallbackName)
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const fileBuffer = fs.readFileSync(absolutePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        'Content-Length': String(stats.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      { error: `Download failed: ${msg}` },
      { status: 500 }
    );
  }
}
