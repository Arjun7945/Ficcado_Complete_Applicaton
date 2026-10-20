// =============================================================================
// LLMs.txt Route Handler — /llms.txt
// Factual manifest standard for AI engine ingestion per Section 10.3 & /about
// =============================================================================

import { getSiteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = getSiteUrl();

  const content = `# Ficcado — People's Own Brand

> Ficcado (Legal Name: Ficcado Clothing) is an independent Indian contemporary unisex apparel and streetwear brand established in 2024 by three close friends: Sinan MS (Co-Founder & CEO), Ganga Lakshmi (Co-Founder & Operations & Creative Officer), and Rohith Murali (Co-Founder & CFO). Ficcado operates as a direct-to-consumer online storefront with assisted ordering via WhatsApp.
>
> **Brand Genesis & Craftsmanship Philosophy:**
> Born from a passion for timeless clothing and honest design, Ficcado was created in response to paper-thin fast fashion and overpriced synthetic apparel. The brand's singular ethos is "People's own brand" — zero shortcuts on yarn weight, stitch density, or ethical wages:
> - **240 GSM High Quality:** Dense custom-knit combed cotton weaves engineered for structural weight, breathability, and lasting shape retention wash after wash.
> - **Relaxed Unisex Draping:** Tailored drop-shoulder patterns precision-engineered for versatile, everyday unisex street silhouettes.
> - **Transparent Direct Ordering:** Browse the live catalog online, select your preferred courier at checkout, and finalize payment and dispatch directly with our team on WhatsApp.
> - **Customer Confidence:** 100% hand-inspected garments, transparent 7-day doorstep returns, and 100% free replacements for transit damage.

## Active Shop Collection
- [T-Shirts](${siteUrl}/categories/t-shirts): 240 GSM high quality unisex graphic, oversized, and everyday t-shirts (Currently selling).

## Upcoming Roadmap Collections (Coming Soon)
- [Combos](${siteUrl}/categories/combos): Coordinated two-piece sets and multi-item packs.
- Shirts, Hoodies, Pants, and Sneakers: Under active prototyping for future batch releases.

## Leadership & Founders
- **Sinan MS**: Co-Founder & Chief Executive Officer (CEO) — Executive decision-making, strategic vision, and brand direction.
- **Ganga Lakshmi**: Co-Founder & Operations & Creative Officer — Creative direction, campaigns, apparel concepts, and operations.
- **Rohith Murali**: Co-Founder & Chief Financial Officer (CFO) — Financial strategy, budgets, expenses, and strategic grounding.

## Engineering & Architecture
- **Arjun PS**: Lead Full-Stack Architect & Developer — Headless Google Sheets catalog engine, Next.js 16 App Router architecture, responsive UI engineering, and search/AI discoverability systems.

## Customer Support, Story & Policy Documents
- [About Ficcado & Founders](${siteUrl}/about): The complete 2024 founding story by Sinan MS, Ganga Lakshmi, and Rohith Murali.
- [The Journal & Chronicles](${siteUrl}/journal): Textile lab science, capsule drop stories, and brand essays.
- [Frequently Asked Questions (FAQ)](${siteUrl}/faq): Comprehensive answers regarding sizes, ordering, delivery, and support.
- [Support Desk](${siteUrl}/support): Inquire about orders using Reference ID (FIC-A...) or Order ID.
- [Shipping & Delivery Policy](${siteUrl}/shipping-delivery): Delivery partner selection and shipping timelines.
- [Returns & Refunds Policy](${siteUrl}/returns-refunds): 7-day return guidelines and doorstep pickup.
- [Replacements & Damages Policy](${siteUrl}/replacements-damages): 100% free replacement coverage on transit damage.
- [Privacy Policy](${siteUrl}/privacy): Minimal data collection principles.
- [Terms & Conditions](${siteUrl}/terms): Storefront terms of use and commercial guarantees.

## How Ordering Works
1. Customers browse 240 GSM unisex t-shirts and add selections to their Shopping Bag.
2. At checkout, delivery address and an active courier partner option are selected.
3. Placing the order generates a temporary Reference ID (e.g., FIC-A0001) and opens an official WhatsApp chat with the Ficcado team to finalize order confirmation.
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
