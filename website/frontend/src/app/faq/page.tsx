// =============================================================================
// FAQ Page — /faq
// Static Server Component with native details/summary, jump links & stable anchors
// Implemented per REQUIREMENT_AND_REFACTOR_PART_2.md Section R6
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { FAQ_GROUPS, FAQ_ITEMS, FAQ_LAST_UPDATED } from '@/content/faq';
import { getSiteUrl } from '@/lib/siteUrl';

export const metadata: Metadata = {
  title: "FAQ's",
  description:
    'Comprehensive answers to frequently asked questions about Ficcado. Covers our high quality 240 GSM unisex T-shirts, ordering via WhatsApp, sizing, delivery, returns, and customer support.',
};

export default function FAQPage() {
  const siteUrl = getSiteUrl();

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${siteUrl}/faq#faqpage`,
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div id="faq-page" className="min-h-full py-8 md:py-14 px-4 md:px-8 max-w-5xl mx-auto space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Top Header */}
      <header className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Storefront</span>
        </Link>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-800 tracking-wider uppercase border border-[var(--primary)]/20 shadow-xs">
            <HelpCircle size={14} />
            <span>Customer Knowledge Base</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-900 tracking-tight text-[var(--text-main)]">
            Frequently Asked Questions
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            Find clear answers about Ficcado — our high quality 240 GSM unisex T-shirts, our WhatsApp ordering workflow, size guidance, delivery times, and store policies.
          </p>

          <p className="text-xs text-[var(--text-muted)] pt-1">
            Last updated: <span className="font-semibold text-[var(--text-secondary)]">{FAQ_LAST_UPDATED}</span>
          </p>
        </div>
      </header>

      {/* Jump To Group Index */}
      <nav
        aria-label="FAQ Topic Groups"
        className="card p-5 md:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs space-y-3"
      >
        <p className="text-xs font-800 uppercase tracking-widest text-[var(--text-muted)]">
          Jump to Topic
        </p>
        <div className="flex flex-wrap gap-2">
          {FAQ_GROUPS.map((group) => (
            <a
              key={group.id}
              href={`#${group.id}`}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--bg-surface-alt)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] text-[var(--text-main)] border border-[var(--border-light)] transition-all"
            >
              {group.name}
            </a>
          ))}
        </div>
      </nav>

      {/* FAQ Groups & Questions */}
      <div className="space-y-12">
        {FAQ_GROUPS.map((group) => {
          const groupQuestions = FAQ_ITEMS.filter((item) => item.group === group.id);
          if (groupQuestions.length === 0) return null;

          return (
            <section
              key={group.id}
              id={group.id}
              className="space-y-4 scroll-mt-24"
            >
              {/* Group Heading */}
              <div className="space-y-1 border-b border-[var(--border-light)] pb-3">
                <h2 className="text-xl md:text-2xl font-800 text-[var(--text-main)]">
                  {group.name}
                </h2>
                <p className="text-xs md:text-sm text-[var(--text-muted)]">
                  {group.description}
                </p>
              </div>

              {/* Questions List with native details/summary */}
              <div className="space-y-3">
                {groupQuestions.map((item) => (
                  <details
                    key={item.id}
                    id={item.id}
                    className="group card rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs overflow-hidden transition-all scroll-mt-28"
                  >
                    <summary className="flex items-center justify-between p-4 md:p-5 cursor-pointer select-none text-left font-bold text-sm md:text-base text-[var(--text-main)] hover:text-[var(--primary)] transition-colors list-none">
                      <span className="pr-4">{item.question}</span>
                      <ChevronRight
                        size={18}
                        className="shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-90"
                      />
                    </summary>

                    <div className="px-4 pb-5 pt-1 md:px-5 border-t border-[var(--border-light)]/60 text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed space-y-2">
                      <p>{item.answer}</p>
                      <div className="pt-2 text-right">
                        <a
                          href={`#${item.id}`}
                          className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                        >
                          <span>Direct link to this answer</span>
                          <span>#</span>
                        </a>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Still Have Questions CTA */}
      <div className="card p-8 md:p-10 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-center space-y-4 shadow-sm">
        <h3 className="text-xl md:text-2xl font-900 text-[var(--text-main)]">
          Still Have a Question?
        </h3>
        <p className="text-xs md:text-sm text-[var(--text-muted)] max-w-lg mx-auto">
          Can&apos;t find what you&apos;re looking for? Reach out directly to our team on WhatsApp or send a message through our support portal.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href="https://wa.me/916282000729"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs md:text-sm py-3 px-6 rounded-xl font-bold shadow-md"
          >
            Chat on WhatsApp 💬
          </a>
          <Link
            href="/support"
            className="px-6 py-3 rounded-xl text-xs md:text-sm font-bold text-[var(--text-main)] bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] border border-[var(--border-light)] transition-colors"
          >
            Submit Support Inquiry
          </Link>
        </div>
      </div>
    </div>
  );
}
