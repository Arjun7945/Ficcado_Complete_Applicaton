'use client';

// =============================================================================
// The Ficcado Journal & Chronicles — /journal (also /blog & /blob)
// Organic morphing aura canvas, textile lab science, and editorial drop stories.
// =============================================================================

import { useState, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
import {
  ArrowLeft,
  Sparkles,
  ArrowRight,
  Clock,
  Menu,
  X,
  BookOpen,
  Share2,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { copyToClipboard } from '@/lib/clipboard';

interface Article {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  author: string;
  image: string;
  excerpt: string;
  sections: {
    heading: string;
    body: string;
  }[];
}

const JOURNAL_ARTICLES: Article[] = [
  {
    slug: 'the-2024-founding-story',
    title: 'How 3 Friends Reimagined High Quality T-Shirts in 2024',
    category: "Founders' Log",
    readTime: '4 min read',
    date: 'Sep 2026',
    author: 'Sinan MS, Ganga Lakshmi & Rohith Murali',
    image: '/images/journal/FiccadoClothing_3_Friends.jpg',
    excerpt:
      'Tired of paper-thin high-street drops, we set out to build high quality apparel with uncompromising textile honesty. Here is the untold story of late nights, mill visits, and the birth of Ficcado.',
    sections: [
      {
        heading: 'The Late-Night Frustration',
        body: 'In 2024, three friends — Sinan MS, Ganga Lakshmi, and Rohith Murali — found themselves having the same recurring conversation: why was it nearly impossible to find streetwear that possessed genuine structural weight, rich tailored colors, and real durability without an exorbitant 400% designer markup? Fast-fashion had flooded the market with paper-thin polyester-heavy tees that lost their shape and curled at the collar after two washes.',
      },
      {
        heading: 'Sourcing From Ground Zero',
        body: 'We refused to buy white-label blanks off the shelf. We pooled our personal savings, visited textile and spinning mills directly across the subcontinent, and tested dozens of yarn counts. Rohith took charge of textile engineering, insisting on 240 GSM ring-spun combed cotton with dense gauge knitting that breathes naturally while hanging with undeniable presence.',
      },
      {
        heading: 'Architectural Silhouettes & Direct Community Care',
        body: 'Ganga Lakshmi directed the silhouette geometry and creative operations — crafting our signature drop-shoulder proportions, high-density 1x1 ribbed collar that refuses to sag, and unisex drape. Meanwhile, Sinan MS led strategic operations, executive decision-making, and direct customer care where real humans answer queries and confirm orders.',
      },
      {
        heading: 'Our Current Focus: T-Shirts First',
        body: 'Ficcado currently sells T-Shirts ONLY. We believe in mastering one silhouette completely before expanding. While upcoming drops on our roadmap will introduce apparel combos, structured overshirts, hoodies, and bottoms, our current catalog is 100% dedicated to perfecting the high quality t-shirt.',
      },
    ],
  },
  {
    slug: 'anatomy-of-240-gsm-cotton',
    title: '240 GSM High Quality Cotton: The Anatomy of Our Colorado Cut',
    category: 'Textile Lab',
    readTime: '6 min read',
    date: 'Aug 2026',
    author: 'Rohith Murali',
    image: '/images/journal/FiccadoColorado_240 GSM_Cotton.jpg',
    excerpt:
      'Why does fabric weight matter? We break down yarn count, combed ring-spun cotton jersey, and why structural drape outlasts fast-fashion trends.',
    sections: [
      {
        heading: 'The 240 GSM Difference',
        body: 'Most mass-market t-shirts sit between 140 and 180 GSM (grams per square meter). At 240 GSM, our cotton jersey provides balanced, substantial weight. This creates an architectural drape that stays away from the body, providing exceptional airflow and a bold, sculpted silhouette.',
      },
      {
        heading: 'The Anti-Bacon Ribbed Collar',
        body: 'Nothing ruins a premium tee faster than a stretched-out, wavy neckline. We engineered our collars using a dense 1x1 double-rib weave infused with high-recovery Lycra threading. It sits flat, holds its shape, and survives dozens of machine wash cycles without baconing.',
      },
      {
        heading: 'Pre-Shrunk & Colorfast',
        body: 'Every yard of our fabric is bio-washed, enzyme-softened, and controlled pre-shrunk before cutting. The fit you receive on day one remains the exact fit after six months of regular wear. Our deep reactive dyeing ensures colors stay rich and vibrant.',
      },
      {
        heading: 'Double-Needle Reinforcements',
        body: 'We reinforce our sleeve hems, shoulder seams, and bottom edges with high-density double-needle stitching. Built for daily wear, skate culture, and real-life durability.',
      },
    ],
  },
  {
    slug: 'capsule-philosophy-limited-runs',
    title: 'Capsule Philosophy: Why Scarcity and Small Batches Beat Mass Production',
    category: 'Design Philosophy',
    readTime: '3 min read',
    date: 'Aug 2026',
    author: 'Ganga Lakshmi',
    image: '/images/journal/FiccadoClothing_Capsule_Philosophy.jpg',
    excerpt:
      'We never mass-produce thousands of identical items. Every season is designed in numbered batches, preserving uniqueness for our community.',
    sections: [
      {
        heading: 'Rejecting Disposable Fashion',
        body: 'Fast fashion produces hundreds of thousands of identical garments every week, resulting in catastrophic textile waste and compromised quality. At Ficcado, we deliberately take the opposite approach by releasing limited capsule batches.',
      },
      {
        heading: 'Numbered Batches & Rigorous Quality Control',
        body: 'Each production run is strictly capped. Every single t-shirt is hand-inspected for stitch consistency, fabric tension, and color fidelity before being approved for packaging.',
      },
      {
        heading: 'Preserving Community Exclusivity',
        body: 'When you wear Ficcado, you are wearing a garment that only a small, dedicated community across the country owns. Once a limited drop colorway sells out, it enters the vault.',
      },
      {
        heading: 'Roadmap Ahead',
        body: 'As we expand our universe into future categories — combos, overshirts, boxy hoodies, and relaxed bottoms — each new release will maintain this strict small-batch capsule discipline.',
      },
    ],
  },
];

const COLOR_MOODS = [
  { name: 'Royal Ficcado', hex: '#2B62C6', secondary: '#B4D1EF', vibe: 'Signature High Quality T-Shirt Energy' },
  { name: 'Citrus Dawn', hex: '#FF6B00', secondary: '#FDBA74', vibe: 'Bold High-Contrast Drop' },
  { name: 'Sage Mint', hex: '#9FD2C7', secondary: '#E6F4F1', vibe: 'Understated Architectural Minimal' },
  { name: 'Nocturne Black', hex: '#111827', secondary: '#374151', vibe: 'High Quality Midnight Silhouette' },
];

export default function JournalPage() {
  const router = useRouter();
  const mounted = useMounted();
  const { openModal } = useModal();
  const { showToast } = useToast();
  const [activeMood, setActiveMood] = useState(COLOR_MOODS[0]);
  const [blobSpeed, setBlobSpeed] = useState<'gentle' | 'pulse'>('gentle');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');

  // Lock background body scroll and listen for Escape key when article modal is open
  useEffect(() => {
    if (!selectedArticle) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedArticle(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedArticle]);

  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setIsSubscribing(true);
    try {
      const res = await fetch('/api/drop-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newsletterEmail.trim(),
          source: 'Journal — The Drop Notification List',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to join list');
      }
      showToast(
        `You're on the list! (ID: ${data.data?.subscriberId || 'Registered'}) Ficcado will connect via email. 🎉`,
        'success'
      );
      setNewsletterEmail('');
    } catch (err: unknown) {
      showToast((err as Error).message || 'Unable to register. Please try again.', 'error');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleShare = async (article: Article) => {
    const ok = await copyToClipboard(typeof window !== 'undefined' ? window.location.href : '');
    if (ok) {
      showToast(`Link copied for "${article.title}"`, 'success');
    } else {
      showToast('Link ready to share!', 'info');
    }
  };

  return (
    <div
      id="journal-page"
      className="min-h-full pb-16 animate-fade-in relative overflow-hidden"
      style={{ background: 'var(--bg-app)' }}
    >
      {/* Dynamic Aura Ambient Glows in Background */}
      <div
        className="absolute top-10 left-1/2 -translate-x-1/2 w-[350px] md:w-[600px] h-[350px] md:h-[600px] rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${activeMood.hex} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute bottom-20 right-10 w-[300px] md:w-[450px] h-[300px] md:h-[450px] rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${activeMood.secondary} 0%, transparent 70%)`,
        }}
      />

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
            The Ficcado Journal
          </h1>
        </div>
        <button
          onClick={() => openModal('mobileMenuDrawer')}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-[var(--text-main)] active:scale-95 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative pt-8 md:pt-14 pb-12 px-4 md:px-8 border-b border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-surface)] to-transparent">
        <div className="max-w-5xl mx-auto space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-800 uppercase tracking-wider border border-[var(--primary)]/20 shadow-xs">
            <Sparkles size={14} />
            <span>Ficcado Design Chronicles & 240 GSM Cotton Science</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-900 text-[var(--text-main)] tracking-tight">
            The Shape of Apparel: Art, Color & Fabric
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Welcome to the aesthetic core of Ficcado. Explore our interactive color palettes, organic silhouettes, and deep-dive chronicles into 240 GSM cotton engineering and our founding ethos.
          </p>

          {/* Interactive Mood Selector */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-bold text-[var(--text-muted)] w-full">
              Select Aesthetic Aura:
            </span>
            {COLOR_MOODS.map((mood) => {
              const isSelected = activeMood.name === mood.name;
              return (
                <button
                  key={mood.name}
                  onClick={() => setActiveMood(mood)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${isSelected
                      ? 'bg-white shadow-md border-gray-400 scale-105'
                      : 'bg-[var(--bg-surface)] border-[var(--border-light)] hover:border-gray-300'
                    }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ background: mood.hex }}
                  />
                  <span style={{ color: 'var(--text-main)' }}>{mood.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Morphing Blob Visual Showcase Card */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 py-10">
        <div className="card p-6 md:p-10 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-800 uppercase tracking-widest text-[var(--primary)]">
                Interactive Aura Canvas
              </span>
              <h2 className="text-xl md:text-2xl font-900 text-[var(--text-main)]">
                {activeMood.name} — {activeMood.vibe}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[var(--text-muted)]">Morph Intensity:</span>
              <button
                onClick={() => setBlobSpeed(blobSpeed === 'gentle' ? 'pulse' : 'gentle')}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface-alt)] font-bold text-[var(--primary)] border border-[var(--border-light)] hover:bg-[var(--border-light)] transition-colors cursor-pointer"
              >
                {blobSpeed === 'gentle' ? '🌿 Gentle Float' : '⚡ Dynamic Pulse'}
              </button>
            </div>
          </div>

          {/* Morphing Blob Display */}
          <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
            {/* SVG Organic Morphing Blob */}
            <div
              className={`w-48 h-48 sm:w-64 sm:h-64 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] transition-all duration-1000 ${blobSpeed === 'pulse' ? 'animate-pulse' : 'animate-spin-smooth'
                }`}
              style={{
                background: `linear-gradient(135deg, ${activeMood.hex} 0%, ${activeMood.secondary} 100%)`,
                boxShadow: `0 0 80px ${activeMood.hex}88`,
                animationDuration: blobSpeed === 'pulse' ? '2s' : '18s',
              }}
            />

            {/* Central Overlay Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/25 backdrop-blur-[2px]">
              <span className="text-[10px] font-900 tracking-[0.3em] uppercase text-white/80 mb-1">
                FICCADO ORGANIC DNA
              </span>
              <h3 className="text-2xl sm:text-3xl font-900 text-white tracking-tight">
                Designed for Movement
              </h3>
              <p className="text-xs text-gray-200 max-w-sm mt-1">
                High Quality 240 GSM combed cotton cut with architectural drape and effortless street presence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Journal Articles / Chronicles */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-800 uppercase tracking-widest text-[var(--primary)]">
              The Ficcado Journal
            </span>
            <h2 className="text-2xl md:text-3xl font-900 text-[var(--text-main)]">
              Stories From The Ficcado Studio
            </h2>
          </div>
          <Link
            href="/about"
            className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            <span>Founders&apos; Story</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {JOURNAL_ARTICLES.map((article) => (
            <article
              key={article.slug}
              className="card group flex flex-col bg-[var(--bg-surface)] border border-[var(--border-light)] hover:border-[var(--primary)]/30 transition-all rounded-3xl overflow-hidden shadow-xs hover:shadow-hover"
            >
              <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                  {article.category}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                    <Clock size={12} />
                    <span>{article.readTime}</span>
                    <span>•</span>
                    <span>{article.date}</span>
                  </div>

                  <h3 className="text-base font-800 text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors leading-snug">
                    {article.title}
                  </h3>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-muted)] text-[11px]">
                    By {article.author}
                  </span>
                  <button
                    onClick={() => setSelectedArticle(article)}
                    className="font-bold text-[var(--primary)] flex items-center gap-0.5 hover:gap-1.5 transition-all text-xs cursor-pointer"
                  >
                    <span>Read Story</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Apparel Community Newsletter Card */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 pt-6">
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
              The Drop Notification List
            </span>
            <h3 className="text-xl md:text-2xl font-900 text-white">
              Never Miss A Limited T-Shirt & Future Wear Capsule
            </h3>
            <p className="text-xs md:text-sm text-blue-100 max-w-md leading-relaxed">
              Be the first to access new t-shirt releases, behind-the-scenes textile logs, and upcoming wear drops.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email"
              className="px-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white placeholder-blue-100 text-xs focus:outline-none focus:ring-2 focus:ring-white w-full sm:w-64"
            />
            <button
              type="submit"
              disabled={isSubscribing}
              className="shrink-0 px-6 py-3 rounded-xl font-bold text-xs shadow-md hover:bg-white/95 transition-all hover:scale-105 cursor-pointer whitespace-nowrap disabled:opacity-75"
              style={{
                background: '#FFFFFF',
                color: '#163888',
              }}
            >
              {isSubscribing ? 'Saving to List...' : 'Get Early Access 📬'}
            </button>
          </form>
        </div>
      </section>

      {/* Interactive Full Article Reading Modal mounted via React Portal to document.body */}
      {mounted && selectedArticle && typeof document !== 'undefined' && createPortal(
        <div
          id="article-reading-modal"
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 pointer-events-none"
          style={{ zIndex: 'var(--z-modal)' }}
        >
          {/* Backdrop */}
          <div
            className="overlay animate-backdrop-in pointer-events-auto"
            onClick={() => setSelectedArticle(null)}
            aria-hidden="true"
          />

          {/* Modal Dialog Card */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedArticle.title}
            className="animate-modal-in relative w-full max-w-2xl max-h-[88vh] bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-light)] shadow-2xl flex flex-col overflow-hidden pointer-events-auto my-auto"
            style={{ zIndex: 10 }}
          >
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-surface-alt)]">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-[10px] font-bold uppercase tracking-wider">
                  {selectedArticle.category}
                </span>
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <Clock size={12} />
                  {selectedArticle.readTime}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShare(selectedArticle)}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-white border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                  title="Share article"
                  aria-label="Share article"
                >
                  <Share2 size={14} />
                </button>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-transparent hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-main)] transition-all cursor-pointer active:scale-90"
                  aria-label="Close article"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Article Body */}
            <div className="p-6 sm:p-8 flex-1 min-h-0 overflow-y-auto space-y-6 overscroll-contain">
              <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 shadow-xs shrink-0">
                <Image
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-900 text-[var(--text-main)] leading-snug">
                  {selectedArticle.title}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Written by <span className="font-bold text-[var(--text-main)]">{selectedArticle.author}</span> • {selectedArticle.date}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs sm:text-sm text-[var(--text-secondary)] italic leading-relaxed">
                &ldquo;{selectedArticle.excerpt}&rdquo;
              </div>

              <div className="space-y-5 pt-2">
                {selectedArticle.sections.map((sec, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <h3 className="text-sm font-800 text-[var(--text-main)]">
                      {sec.heading}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {sec.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[var(--border-light)] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/about"
                  onClick={() => setSelectedArticle(null)}
                  className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1.5"
                >
                  <BookOpen size={14} />
                  <span>Learn more about our 3 Founders</span>
                </Link>
                <Link
                  href="/categories/t-shirts"
                  onClick={() => setSelectedArticle(null)}
                  className="btn-primary py-2 px-5 text-xs font-bold rounded-xl"
                >
                  Shop High Quality Tees 🔥
                </Link>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
