import sharp from 'sharp';
import fs from 'fs';

async function generateRoundedFavicon() {
  const size = 512;

  // 1. Trim the emblem of extra white space
  const trimmed = await sharp('public/images/brand_logo/Ficcado Brand Logo.jpeg')
    .trim({ background: { r: 255, g: 255, b: 255 }, threshold: 20 })
    .toBuffer();

  // 2. Resize trimmed emblem to fit comfortably inside a 512x512 circle (approx 380px tall)
  const emblemResized = await sharp(trimmed)
    .resize({ height: 380, fit: 'inside' })
    .toBuffer();

  const emblemMeta = await sharp(emblemResized).metadata();
  const left = Math.round((size - (emblemMeta.width || 0)) / 2);
  const top = Math.round((size - (emblemMeta.height || 0)) / 2);

  // 3. Create a circular badge with clean white background and subtle elegant brand-blue accent ring
  const circleSvg = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#FFFFFF" stroke="#2B62C6" stroke-width="8" stroke-opacity="0.25" />
    </svg>
  `);

  // 4. Composite the white circle and the resized emblem onto a transparent canvas
  const compositeImage = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: circleSvg, top: 0, left: 0 },
      { input: emblemResized, top, left },
    ])
    .png()
    .toBuffer();

  // 5. Apply circular mask to ensure any edge pixel outside the circle is 100% transparent
  const maskSvg = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#FFFFFF" />
    </svg>
  `);

  const finalRounded = await sharp(compositeImage)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Ensure directories exist
  if (!fs.existsSync('public/images/brand_logo')) {
    fs.mkdirSync('public/images/brand_logo', { recursive: true });
  }

  // Save full-res master rounded logo
  fs.writeFileSync('public/images/brand_logo/favicon-rounded.png', finalRounded);

  // Resize to 64x64 for favicon.ico
  const favicon64 = await sharp(finalRounded).resize(64, 64).png().toBuffer();
  fs.writeFileSync('src/app/favicon.ico', favicon64);
  fs.writeFileSync('public/favicon.ico', favicon64);

  // High-res icon.png for Next.js app router metadata (32x32 and 192x192)
  const icon32 = await sharp(finalRounded).resize(32, 32).png().toBuffer();
  fs.writeFileSync('public/images/brand_logo/favicon-32x32.png', icon32);

  const iconPng = await sharp(finalRounded).resize(192, 192).png().toBuffer();
  fs.writeFileSync('src/app/icon.png', iconPng);
  fs.writeFileSync('public/images/brand_logo/icon-192.png', iconPng);

  // Apple touch icon 180x180
  const appleIconPng = await sharp(finalRounded).resize(180, 180).png().toBuffer();
  fs.writeFileSync('src/app/apple-icon.png', appleIconPng);
  fs.writeFileSync('public/images/brand_logo/apple-touch-icon.png', appleIconPng);

  console.log('Successfully generated rounded professional favicons!');
}

generateRoundedFavicon().catch(console.error);
