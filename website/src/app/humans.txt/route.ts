// =============================================================================
// Humans.txt Route Handler — /humans.txt
// Credits, team and developer fingerprint per Section 10.3 & owner instructions
// =============================================================================

export const dynamic = 'force-dynamic';

export async function GET() {
  const content = `/* TEAM & FOUNDERS */
Co-Founder & CEO: Sinan MS
Co-Founder & Operations & Creative Officer: Ganga Lakshmi
Co-Founder & CFO: Rohith Murali
Brand: Ficcado
Legal Name: Ficcado Clothing
Genesis: 2024
Ethos: People's Own Brand — Timeless clothing & honest 240 GSM design
Location: India

/* DEVELOPER & ARCHITECT */
Lead Full-Stack Architect & Developer: Arjun PS
Fingerprint: Arjun PS
Role: Frontend & Backend Systems Engineering, Next.js App Router Architecture, Google Sheets Real-time Engine, SEO & Structured Data Engineering

/* SITE & TECHNOLOGY */
Standards: HTML5, CSS3, Schema.org JSON-LD
Framework: Next.js 16 (App Router, Turbopack)
Library: React 19
Language: TypeScript
Data Layer: Real-time Google Sheets API with Resilient Local Caching
Fonts: Plus Jakarta Sans
Icons: Lucide React
Last Update: October 2026
`;

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
