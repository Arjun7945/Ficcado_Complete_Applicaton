import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Shirt, Paintbrush, Truck, ShieldCheck, HeartHandshake } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Custom T-Shirt | Design Your Own | Ficcado',
  description:
    'Design your own T-shirt is coming soon at Ficcado. Customers will soon be able to submit their own design, and the Ficcado team will print it and deliver the custom T-shirt.',
};

export default function CustomTShirtPage() {
  return (
    <div id="custom-tshirt-page" className="min-h-full py-6 md:py-10 px-4 md:px-8 max-w-4xl mx-auto animate-fade-in space-y-8">
      {/* Top Breadcrumb / Return Link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Drops</span>
        </Link>
      </div>

      {/* Main Notice Hero Card */}
      <div className="card p-6 sm:p-10 md:p-14 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-md space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
          <Shirt size={32} />
        </div>

        <div className="space-y-3 max-w-xl mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-800 uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
              <Sparkles size={12} />
              <span>Coming Soon</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-900 text-[var(--text-main)] tracking-tight">
            Design Your Own T-Shirt
          </h1>

          <p className="text-sm md:text-base text-[var(--text-muted)] leading-relaxed pt-1">
            Design your own T-shirt is coming soon! Customers will soon be able to submit their own design, and the Ficcado team will print it and deliver the T-shirt directly to your doorstep.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left">
          <div className="p-5 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
              <Paintbrush size={20} />
            </div>
            <h2 className="text-sm font-bold text-[var(--text-main)]">1. Submit Your Design</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Customers will soon be able to submit their custom graphics, typography, or illustrations directly to our design team.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center">
              <Shirt size={20} />
            </div>
            <h2 className="text-sm font-bold text-[var(--text-main)]">2. Premium 240 GSM Blanks</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Every custom piece is printed on our signature heavyweight unisex blanks crafted with pure combed cotton and precision tailored drape.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
              <Truck size={20} />
            </div>
            <h2 className="text-sm font-bold text-[var(--text-main)]">3. Printed & Delivered</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              The Ficcado team will print it with museum-grade precision and deliver the finished T-shirt pan-India with quality inspection.
            </p>
          </div>
        </div>

        {/* Action CTAs leading back to Live Drops and WhatsApp Inquiry */}
        <div className="pt-6 border-t border-[var(--border-light)] flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="btn-primary py-3 px-6 text-xs md:text-sm font-bold rounded-xl shadow-xs"
          >
            Explore Live Wear Drops &rarr;
          </Link>
          <a
            href="https://wa.me/916282000729"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary py-3 px-6 text-xs md:text-sm font-bold rounded-xl border border-[var(--border-light)]"
          >
            Chat with Team on WhatsApp
          </a>
        </div>
      </div>

      {/* Trust & Craft Standards Banner */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-[var(--primary)] shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-[var(--text-main)]">Bespoke Printing Standards</h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              High-resolution DTG & screen printing, wash-resistant pigments, and 100% unisex sizing.
            </p>
          </div>
        </div>
        <Link
          href="/support"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline shrink-0"
        >
          <HeartHandshake size={14} />
          <span>Have an urgent custom inquiry?</span>
        </Link>
      </div>
    </div>
  );
}
