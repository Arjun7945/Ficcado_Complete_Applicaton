// =============================================================================
// LLMs Full Context Route Handler — /llms-full.txt
// Comprehensive plain-text catalog & complete FAQ corpus per Section 10.3 & /about
// =============================================================================

import { getProducts } from '@/lib/products';
import { FAQ_GROUPS, FAQ_ITEMS } from '@/content/faq';
import { getSiteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = getSiteUrl();
  const products = await getProducts();

  let text = `# Ficcado — Complete Brand Knowledge Base & Catalog Context

> Brand: Ficcado (F-I-C-C-A-D-O)
> Legal Name: Ficcado Clothing
> Tagline: People's Own Brand — Born From A Passion For Timeless Clothing & Honest Design
> Genesis: Established in 2024 by Sinan MS, Ganga Lakshmi, and Rohith Murali
> Storefront: ${siteUrl}
> Official WhatsApp Ordering Line: +91 6282000729

---

## 1. Brand Story, Ethos & Craftsmanship

Ficcado was founded in 2024 by three close friends who refused to accept paper-thin fast fashion and overpriced synthetic apparel. Frustrated by the lack of high-quality streetwear that balanced true structural weight, rich tailored colors, and durability without a 400% markup, they pooled their resources, visited spinning mills across the subcontinent, and developed custom 240 GSM combed cotton weaves with relaxed drop-shoulder unisex cuts.

### Core Philosophy
- "People's own brand" — transparent materials, limited capsule drops, and garments engineered to become the favorite staple in your wardrobe.
- Zero shortcuts on yarn weight, stitch density, or ethical wages.
- "Clothing shouldn't be disposable. It should feel reassuringly heavy when you put it on, look effortless on the street, and stay just as vibrant years later."

### Trust & Quality Pillars
1. **240 GSM High Quality:** Dense custom combed cotton weaves that keep structure wash after wash.
2. **100% Quality Inspected:** Every garment is hand-verified before dispatch from our facility.
3. **7-Day Transparent Returns:** Risk-free home try-on. If the drape or fit isn't right, doorstep pickup is provided.
4. **WhatsApp Dispatch Updates:** Direct dispatch alerts and courier AWB tracking links sent directly to your WhatsApp.

### Leadership & Founding Team
- **Sinan MS**: Co-Founder & Chief Executive Officer (CEO) — Executive decision-maker, strategic vision, and brand direction.
- **Ganga Lakshmi**: Co-Founder & Operations & Creative Officer — Creative direction, campaigns, apparel concepts, and operations.
- **Rohith Murali**: Co-Founder & Chief Financial Officer (CFO) — Financial strategy, budgets, expenses, and strategic grounding.

### Engineering & Technical Architecture
- **Arjun PS**: Lead Full-Stack Architect & Developer — Engineered the headless Google Sheets database integration, Next.js 16 App Router architecture, responsive UI, search engine optimization, and AI discoverability frameworks.

---

## 2. Product Catalog (Google Sheets Source of Truth)

`;

  if (products.length === 0) {
    text += `Catalog is currently updating from Google Sheets.\n\n`;
  } else {
    products.forEach((p) => {
      text += `### ${p.name}
- ID: ${p.id}
- Category: ${p.category} (${p.type || 'Apparel'})
- Price: INR ${p.price}
- Availability: ${p.inStock ? 'In Stock (Live Drop)' : 'Coming Soon / Prototyping'}
- Available Sizes: ${p.sizes ? p.sizes.join(', ') : 'Standard'}
- Colors: ${p.colors ? p.colors.join(', ') : 'Standard'}
- Rating: ${p.rating || 0}/5 (${p.reviews || 0} reviews)
- Description: ${p.desc || p.description || 'Signature unisex streetwear.'}
- Storefront Link: ${siteUrl}/categories/${p.category}

`;
    });
  }

  text += `---

## 3. Frequently Asked Questions & Store Knowledge Base

`;

  FAQ_GROUPS.forEach((group) => {
    const items = FAQ_ITEMS.filter((i) => i.group === group.id);
    if (items.length > 0) {
      text += `### Group: ${group.name}
${group.description}

`;
      items.forEach((item) => {
        text += `#### Q: ${item.question}
A: ${item.answer}

`;
      });
    }
  });

  text += `---

## 4. Store Operating Policies & Ordering Workflow

### Ordering via WhatsApp
Customers select items on the website, pick an active courier partner at checkout, and initiate a WhatsApp conversation. The Ficcado order bot generates a Reference ID (e.g., FIC-A0001) for payment and address confirmation.

### Shipping & Delivery
All deliveries are handled through verified pan-India courier partners dynamically loaded from our logistics operations sheet. ₹0 rate signifies Free Shipping.

### Doorstep Returns & Replacements
- 7-Day Return Window for unworn, unwashed garments with tags intact.
- 100% Free Replacement coverage on items damaged during transit.
`;

  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
