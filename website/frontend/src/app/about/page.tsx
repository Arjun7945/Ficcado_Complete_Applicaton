'use client';

// =============================================================================
// About Us — /about
// The 2024 Founding Story of Ficcado by 3 Friends
// Founders: Sinan MS, Ganga, Rohith Murali
// Inspiring customer trust, craftsmanship transparency & first-order confidence
// =============================================================================

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Truck,
  HeartHandshake,
  Award,
  CheckCircle2,
  Quote,
  Menu,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';

const FOUNDERS = [
  {
    name: 'Sinan MS',
    role: 'CEO',
    designation: 'Co-Founder & Chief Executive Officer',
    image: '/images/founders/Sinan.jpeg',
    bio: 'The ultimate decision-maker of the team. Hyperactive, constantly brainstorming, and occasionally takes approximately 47 business days to make one decision',
    highlights: ['Chief Executive', 'Hyperactive Brainstorming', 'Strategic Direction'],
  },
  {
    name: 'Ganga Lakshmi',
    role: 'Operations & Creative officer',
    designation: 'Co-Founder & Operations & Creative Officer',
    image: '/images/founders/Ganga Lakshmi.jpeg',
    bio: 'Turns random thoughts into designs, concepts and campaigns, connects all the dots, and somehow knows what needs to happen next. Basically, where “let’s actually do this” begins.',
    highlights: ['Creative Direction', 'Operations & Concepts', 'Campaigns & Design'],
  },
  {
    name: 'Rohith Murali',
    role: 'CFO',
    designation: 'Co-Founder & Chief Financial Officer',
    image: '/images/founders/Rohith Murali.jpeg',
    bio: 'Manages FICCADO’s finances, budgets and expenses, while keeping the team financially grounded and occasionally asking, “Do we really need this?”',
    highlights: ['Financial Strategy', 'Budgets & Expenses', 'Team Grounding'],
  },
];

const TRUST_METRICS = [
  {
    icon: Award,
    title: '240 GSM High Quality',
    desc: 'Dense custom combed cotton weaves that keep structure wash after wash.',
  },
  {
    icon: ShieldCheck,
    title: '100% Quality Inspected',
    desc: 'Every garment is hand-verified before dispatch from our cleanroom facility.',
  },
  {
    icon: HeartHandshake,
    title: '7-Day Transparent Returns',
    desc: 'Try it on at home. If the drape or fit isn’t perfect, doorstep pickup is on us.',
  },
  {
    icon: Truck,
    title: 'WhatsApp Dispatch Updates',
    desc: 'Direct dispatch alerts and courier AWB tracking links sent to your WhatsApp.',
  },
];

export default function AboutPage() {
  const router = useRouter();
  const { openModal } = useModal();

  return (
    <div id="about-page" className="min-h-full pb-16 animate-fade-in" style={{ background: 'var(--bg-app)' }}>
      {/* Mobile Top Header (Hidden on Tablet & Desktop) */}
      <header
        className="flex md:hidden items-center justify-between px-4 py-3 sticky top-0 z-30"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-icon" aria-label="Go back">
            <ArrowLeft size={20} style={{ color: 'var(--text-main)' }} />
          </button>
          <h1 className="text-base font-800 tracking-tight" style={{ color: 'var(--text-main)' }}>
            About Ficcado
          </h1>
        </div>
        <button
          onClick={() => openModal('mobileMenuDrawer')}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-[var(--text-main)] active:scale-95"
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 md:pt-14 pb-12 md:pb-16 px-4 md:px-8 border-b border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-app)]">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--accent-ice)]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-800 tracking-wider uppercase border border-[var(--primary)]/20 shadow-xs">
            <Sparkles size={14} />
            <span>The Ficcado Story • Launched in 2024</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-900 tracking-tight text-[var(--text-main)] leading-tight">
            Born From A Passion For Timeless Clothing & Honest Design.
          </h1>

          <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Ficcado was founded in 2024 by three close friends who refused to accept paper-thin fast fashion and overpriced synthetic apparel. We set out to build the clothing brand we always wished existed — starting with the perfect high quality T-shirt.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/categories/t-shirts"
              className="btn-primary text-sm px-6 py-3 rounded-xl shadow-md font-bold hover:scale-105 transition-transform"
            >
              Explore T-Shirt Drops 🔥
            </Link>
            <Link
              href="/support"
              className="px-6 py-3 rounded-xl text-sm font-bold text-[var(--text-main)] bg-[var(--bg-surface)] border border-[var(--border-light)] hover:bg-[var(--bg-surface-alt)] transition-colors shadow-xs"
            >
              Reach Out To The Team
            </Link>
          </div>
        </div>
      </section>

      {/* The 2024 Genesis Story */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-800 uppercase tracking-widest text-[var(--primary)]">
                Our Genesis
              </span>
              <h2 className="text-2xl md:text-3xl font-900 text-[var(--text-main)] leading-tight">
                3 Friends. 1 Shared Obsession. Zero Shortcuts.
              </h2>
            </div>

            <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
              In 2024, three friends — <strong>Sinan MS</strong>, <strong>Ganga Lakshmi</strong>, and <strong>Rohith Murali</strong> — found themselves repeatedly having the same conversation: why was it so hard to find high quality t-shirts that possessed true structural weight, rich tailored colors, and durability without a 400% designer markup?
            </p>

            <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
              We decided to stop searching and start building. We pooled our savings, visited spinning mills across the subcontinent, and spent months prototyping custom 240 GSM combed cotton and relaxed drop-shoulder patterns.
            </p>

            <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
              Ficcado was officially unveiled in <strong>2024</strong> with a singular ethos: <em>Peoples’ own brand</em> — transparent materials, limited capsule drops, and garments engineered to become the favorite piece in your wardrobe.
            </p>

            <div
              className="p-5 rounded-2xl border space-y-2 shadow-xs transition-all"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border-light)',
              }}
            >
              <div className="flex items-center gap-2 text-xs font-800" style={{ color: 'var(--primary)' }}>
                <CheckCircle2 size={16} />
                <span>Our Founding Commitment to Every Customer</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                We never cut corners on yarn weight, stitch density, or ethical wages. When you wear Ficcado, you wear our personal guarantee of quality.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div
              className="p-7 md:p-9 text-white rounded-3xl relative overflow-hidden border border-[#334155]/60"
              style={{
                background: 'linear-gradient(145deg, #131D2E 0%, #0B111E 100%)',
                boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.45)',
              }}
            >
              <Quote className="absolute -bottom-6 -right-6 w-36 h-36 text-white/5 pointer-events-none" />
              <div className="space-y-6 relative z-10">
                <div
                  className="relative w-12 h-12 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-md overflow-hidden"
                >
                  <Image
                    src="/images/brand_logo/Ficcado Brand Logo.jpeg"
                    alt="Ficcado Brand Emblem"
                    fill
                    sizes="48px"
                    className="object-contain p-1"
                    priority
                    loading="eager"
                  />
                </div>

                <p className="text-lg md:text-xl font-medium leading-relaxed italic text-slate-100">
                  “We built Ficcado because clothing shouldn’t be disposable. It should feel reassuringly heavy when you put it on, look effortless on the street, and stay just as vibrant years later.”
                </p>

                <div
                  className="pt-4 flex items-center justify-between text-xs"
                  style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}
                >
                  <div>
                    <span className="font-800 block text-white text-sm">The Founding Trio</span>
                    <span className="text-slate-300 text-xs">Sinan MS, Ganga &amp; Rohith Murali • Ficcado 2024</span>
                  </div>
                  <span
                    className="px-3.5 py-1 rounded-full font-bold text-xs"
                    style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#93C5FD' }}
                  >
                    Est. 2024
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 3 Founders Section (Sinan MS, Ganga, Rohith Murali) */}
      <section className="py-14 md:py-20 border-y" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-light)' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-800 uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
              Leadership & Craft
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-900" style={{ color: 'var(--text-main)' }}>
              Meet The Partners Behind Ficcado
            </h2>
            <p className="text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>
              Three friends combining executive vision, creative design &amp; operations, and grounded financial leadership.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {FOUNDERS.map((founder) => (
              <div
                key={founder.name}
                className="group flex flex-col transition-all duration-300 rounded-3xl overflow-hidden border"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-light)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Image Container with aspect ratio and smooth zoom on hover */}
                <div className="relative w-full aspect-[4/5] bg-gray-100 overflow-hidden">
                  <Image
                    src={founder.image}
                    alt={founder.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    priority
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div className="absolute bottom-3.5 left-4 right-4 text-white">
                    <span className="text-xs font-bold text-[#93C5FD] block uppercase tracking-wider">
                      {founder.role}
                    </span>
                    <h3 className="text-xl font-900 leading-tight drop-shadow-sm text-white">
                      {founder.name}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 md:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
                      {founder.designation}
                    </p>
                    <p className="text-xs md:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {founder.bio}
                    </p>
                  </div>

                  {/* Highlights Tags */}
                  <div
                    className="pt-3 flex flex-wrap gap-1.5"
                    style={{ borderTop: '1px solid var(--border-light)' }}
                  >
                    {founder.highlights.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border"
                        style={{
                          background: 'var(--bg-surface-alt)',
                          color: 'var(--text-muted)',
                          borderColor: 'var(--border-light)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Transparency Pillars (Inspiring First Orders) */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-14 md:py-20 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-800 uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
            Built For Trust
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-900" style={{ color: 'var(--text-main)' }}>
            Why You Can Order With Absolute Confidence
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Every order is backed by direct founder accountability and people-first transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUST_METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.title}
                className="p-6 rounded-2xl space-y-3 transition-all border shadow-xs hover:shadow-card"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-light)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold"
                  style={{
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                  }}
                >
                  <Icon size={22} />
                </div>
                <h4 className="text-base font-800" style={{ color: 'var(--text-main)' }}>
                  {metric.title}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {metric.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* First Order Callout Card */}
        <div
          className="p-8 md:p-10 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #2B62C6 0%, #163888 100%)',
            boxShadow: '0 20px 45px -10px rgba(43, 98, 198, 0.4)',
          }}
        >
          <div className="space-y-2 text-center md:text-left">
            <span
              className="text-xs font-800 uppercase tracking-wider px-3 py-1 rounded-full inline-block"
              style={{ background: 'rgba(255, 255, 255, 0.18)', color: '#FFD700' }}
            >
              Risk-Free Shopping Experience
            </span>
            <h3 className="text-xl md:text-2xl font-900 text-white">
              Ready to feel the difference of authentic 240 GSM high quality cotton?
            </h3>
            <p className="text-xs md:text-sm text-blue-100 max-w-xl leading-relaxed">
              Experience our signature quality, custom knit fabrics, and relaxed unisex silhouettes. Fully covered by our 7-day hassle-free doorstep return policy.
            </p>
          </div>

          <Link
            href="/categories"
            className="shrink-0 px-7 py-3.5 rounded-xl font-bold text-sm shadow-md hover:bg-white/95 transition-all hover:scale-105"
            style={{
              background: '#FFFFFF',
              color: '#163888',
            }}
          >
            Shop Current Drops 🛍️
          </Link>
        </div>
      </section>
    </div>
  );
}
