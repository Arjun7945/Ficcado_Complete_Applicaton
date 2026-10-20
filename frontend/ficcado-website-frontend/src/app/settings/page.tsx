'use client';

// =============================================================================
// Settings & Brand Hub — /settings
// Brand information, quick navigation links, and app version info.
// =============================================================================

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Info,
  ShoppingBag,
  HelpCircle,
  BookOpen,
  Truck,
  Shield,
  Mail,
  ExternalLink,
  PhoneCall,
  Star,
  Menu,
  AtSign,
  Sparkles,
  Cookie,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { useConsent } from '@/context/ConsentContext';
import { getSiteUrl, getDomainName } from '@/lib/siteUrl';

const QUICK_LINKS = [
  { label: 'Shop T-Shirts', href: '/categories/t-shirts', icon: ShoppingBag, desc: 'Browse available drops' },
  { label: 'Brand Walkthrough', href: '/onboarding', icon: Sparkles, desc: 'Story and design philosophy' },
  { label: 'FAQ', href: '/faq', icon: HelpCircle, desc: 'Frequently asked questions' },
  { label: 'The Journal', href: '/journal', icon: BookOpen, desc: 'Brand story & textile lab' },
  { label: 'About Ficcado', href: '/about', icon: Info, desc: 'Founders & brand mission' },
  { label: 'Delivery Info', href: '/faq#delivery', icon: Truck, desc: 'Shipping & courier options' },
  { label: 'Returns & Refunds', href: '/faq#returns-refunds', icon: Shield, desc: '7-day return policy' },
  { label: 'Support', href: '/support', icon: Mail, desc: 'Reach out to our team' },
];

const BRAND_PILLARS = [
  { label: 'T-Shirts Live', detail: 'Signature high quality unisex T-shirts (240 GSM)' },
  { label: 'Premium Cotton', detail: '240 GSM ring-spun combed cotton with dense gauge weave' },
  { label: 'Founded 2024', detail: 'By Sinan MS, Ganga Lakshmi & Rohith Murali' },
  { label: 'Pan-India Dispatch', detail: 'Verified courier delivery across all of India' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { openModal } = useModal();
  const { openSettings: openConsentSettings } = useConsent();

  return (
    <div id="settings-page" className="min-h-full pb-16 animate-fade-in" style={{ background: 'var(--bg-app)' }}>
      {/* Mobile Top Header */}
      <header
        className="flex md:hidden items-center justify-between px-4 py-3 sticky top-0 z-30"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-icon" aria-label="Go back">
            <ArrowLeft size={20} style={{ color: 'var(--text-main)' }} />
          </button>
          <h1 className="text-base font-800 tracking-tight" style={{ color: 'var(--text-main)' }}>
            Settings & Brand Hub
          </h1>
        </div>
        <button
          onClick={() => openModal('mobileMenuDrawer')}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-[var(--text-main)] active:scale-95 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu size={16} />
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8">
        {/* Desktop / Tablet Section Breadcrumb Header */}
        <div className="hidden md:flex items-center justify-between pb-3 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <span className="text-[var(--border-medium)]">/</span>
            <span className="text-xs font-bold text-[var(--primary)]">Settings & Brand Hub</span>
          </div>
          <button
            onClick={() => openModal('mobileMenuDrawer')}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)] hover:text-[var(--primary)] px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] border border-[var(--border-light)] cursor-pointer transition-colors shadow-2xs"
          >
            <Menu size={14} />
            <span>Open Slide Menu</span>
          </button>
        </div>

        {/* Brand Identity Card */}
        <section
          className="p-7 md:p-10 text-white rounded-3xl shadow-xl space-y-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #2B62C6 0%, #1D4ED8 60%, #1E40AF 100%)',
            boxShadow: '0 20px 40px -12px rgba(43, 98, 198, 0.35)',
          }}
        >
          {/* Subtle Ambient Decorative Glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="relative w-14 h-14 rounded-2xl bg-white border border-white/40 overflow-hidden p-1 flex items-center justify-center shadow-md shrink-0">
              <Image
                src="/images/brand_logo/Ficcado Brand Logo.jpeg"
                alt="Ficcado Logo"
                fill
                sizes="56px"
                className="object-contain p-1"
                priority
                loading="eager"
              />
            </div>
            <div>
              <h1 className="text-2xl font-900 tracking-tight text-white">Ficcado Clothing</h1>
              <p className="text-sm text-blue-100 font-semibold mt-0.5">
                High Quality Unisex Wears
              </p>
            </div>
          </div>
          <p className="text-xs md:text-sm text-blue-50 leading-relaxed relative z-10 font-normal">
            Ficcado was founded in 2024 by three friends — Sinan MS, Ganga Lakshmi, and Rohith Murali —
            dedicated to crafting high quality, honest apparel. We currently sell signature unisex
            T-shirts crafted with premium 240 GSM combed cotton.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 relative z-10">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/20">
              Est. 2024
            </span>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/20">
              T-Shirts Live 🔥
            </span>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/20">
              240 GSM Cotton
            </span>
          </div>
        </section>

        {/* Brand Pillars */}
        <section className="space-y-3">
          <h2 className="text-xs font-800 uppercase tracking-widest text-[var(--text-muted)]">Brand Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BRAND_PILLARS.map((pillar) => (
              <div
                key={pillar.label}
                className="card p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-start gap-3"
              >
                <div className="w-7 h-7 mt-0.5 rounded-lg bg-[var(--primary-light)] flex items-center justify-center shrink-0">
                  <Star size={14} className="text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-sm font-800 text-[var(--text-main)]">{pillar.label}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{pillar.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="space-y-3">
          <h2 className="text-xs font-800 uppercase tracking-widest text-[var(--text-muted)]">Quick Navigation</h2>
          <div className="card rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] overflow-hidden divide-y divide-[var(--border-light)]">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between p-4 md:p-5 hover:bg-[var(--bg-surface-alt)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--primary-light)] flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-[var(--primary)]" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[var(--text-main)] block">{link.label}</span>
                      <span className="text-xs text-[var(--text-muted)]">{link.desc}</span>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Brand Experience Control */}
        <section className="space-y-3">
          <h2 className="text-xs font-800 uppercase tracking-widest text-[var(--text-muted)]">Brand Experience</h2>
          <div className="card p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary-light)] flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm font-800 text-[var(--text-main)]">Brand Splash Screen</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Experience the official Ficcado Clothing splash screen</p>
              </div>
            </div>
            <button
              id="replay-brand-intro-btn"
              onClick={() => {
                try {
                  localStorage.removeItem('ficcado_first_visit_seen');
                  sessionStorage.removeItem('ficcado_brand_intro_seen');
                } catch {}
                router.push('/?splash=1');
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all cursor-pointer shrink-0"
            >
              Replay Splash &rarr;
            </button>
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <h2 className="text-xs font-800 uppercase tracking-widest text-[var(--text-muted)]">Contact & Socials</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <a
              href="https://wa.me/916282000729"
              target="_blank"
              rel="noopener noreferrer"
              id="settings-whatsapp-btn"
              className="card p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center gap-3 hover:border-[var(--primary)]/40 transition-all group"
            >
              <PhoneCall size={18} className="text-green-500 shrink-0" />
              <div>
                <p className="text-xs font-800 text-[var(--text-main)]">WhatsApp</p>
                <p className="text-[11px] text-[var(--text-muted)]">+91 6282 000 729</p>
              </div>
            </a>
            <a
              href="mailto:ficcado.clothing@gmail.com"
              id="settings-email-btn"
              className="card p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center gap-3 hover:border-[var(--primary)]/40 transition-all group"
            >
              <Mail size={18} className="text-[var(--primary)] shrink-0" />
              <div>
                <p className="text-xs font-800 text-[var(--text-main)]">Email</p>
                <p className="text-[11px] text-[var(--text-muted)]">ficcado.clothing@gmail.com</p>
              </div>
            </a>
            <a
              href="https://www.instagram.com/ficcado.clothing"
              target="_blank"
              rel="noopener noreferrer"
              id="settings-instagram-btn"
              className="card p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center gap-3 hover:border-[var(--primary)]/40 transition-all group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500 shrink-0"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              <div>
                <p className="text-xs font-800 text-[var(--text-main)]">Instagram</p>
                <p className="text-[11px] text-[var(--text-muted)]">@ficcado.clothing</p>
              </div>
            </a>
            <a
              href="https://www.threads.com/@ficcado.clothing"
              target="_blank"
              rel="noopener noreferrer"
              id="settings-threads-btn"
              className="card p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center gap-3 hover:border-[var(--primary)]/40 transition-all group"
            >
              <AtSign size={18} className="text-[var(--text-main)] shrink-0" />
              <div>
                <p className="text-xs font-800 text-[var(--text-main)]">Threads</p>
                <p className="text-[11px] text-[var(--text-muted)]">@ficcado.clothing</p>
              </div>
            </a>
          </div>
          <div className="card p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-xs text-[var(--text-muted)] space-y-1">
            <p><strong className="text-[var(--text-main)]">Business Identity:</strong> Ficcado Clothing • <strong>GSTIN:</strong> 32CVNPR0498H1Z5</p>
            <p><strong>Support Hours:</strong> 7:00 AM to 7:00 PM IST • <strong>Live Chat:</strong> Mon–Fri, 10:00 AM – 6:00 PM IST</p>
            <p><strong>Registered Address:</strong> Manadath House, Thaikkattukara P O, Aluva 6, Pin: 683106 (Opposite metro pillar 116)</p>
          </div>
        </section>

        {/* Privacy & Cookie Preferences */}
        <section className="space-y-3">
          <h2 className="text-xs font-800 uppercase tracking-widest text-[var(--text-muted)]">Privacy & Transparency</h2>
          <div className="card p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Cookie size={18} className="text-[var(--primary)]" />
                <p className="text-sm font-800 text-[var(--text-main)]">Cookie & Storage Preferences</p>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Manage your storage choices, review our zero-tracker privacy policy, or customize non-essential preferences.
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px]">
                <Link href="/cookies" className="text-[var(--primary)] hover:underline font-semibold">
                  Cookie Policy
                </Link>
                <span className="text-[var(--text-muted)]">•</span>
                <Link href="/privacy" className="text-[var(--primary)] hover:underline font-semibold">
                  Privacy Policy
                </Link>
              </div>
            </div>
            <button
              onClick={openConsentSettings}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 transition-all cursor-pointer shrink-0"
            >
              Manage Cookies
            </button>
          </div>
        </section>

        {/* App Info */}
        <footer className="text-center space-y-1 pt-4">
          <p className="text-xs text-[var(--text-muted)] font-medium">
            Ficcado Clothing · Est. 2024 · High Quality Unisex Wears
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Official Store ·{' '}
            <a
              href={getSiteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--primary)] transition-colors"
            >
              {getDomainName()}
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
