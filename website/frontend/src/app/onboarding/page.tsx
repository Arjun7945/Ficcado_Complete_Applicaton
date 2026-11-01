'use client';

// =============================================================================
// Onboarding Walkthrough — /onboarding
// 3-slide brand carousel with pagination dots, Skip, and Next/Get Started CTA
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { WALKTHROUGH_DATA } from '@/config/site';

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const total = WALKTHROUGH_DATA.length;
  const slide = WALKTHROUGH_DATA[currentSlide];
  const isLast = currentSlide === total - 1;

  function finish() {
    try {
      sessionStorage.setItem('ficcado_brand_intro_seen', '1');
    } catch {}
    router.push('/');
  }

  function next() {
    if (isLast) {
      finish();
    } else {
      setCurrentSlide((s) => s + 1);
    }
  }

  return (
    <div className="w-full min-h-full md:min-h-[calc(100vh-14rem)] flex items-center justify-center py-0 md:py-8">
      <div
        id="walkthrough-page"
        className="flex flex-col max-w-md mx-auto w-full md:rounded-3xl md:overflow-hidden md:shadow-2xl"
        style={{ minHeight: '640px', height: '100%', background: 'var(--text-main)', position: 'relative', overflow: 'hidden' }}
      >
      {/* Full bleed hero image */}
      <div className="absolute inset-0">
        <Image
          src={slide.img}
          alt={slide.title}
          fill
          sizes="390px"
          className="object-cover object-center transition-opacity duration-500"
          priority
          key={slide.img}
        />
        {/* Gradient scrim — stronger at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--text-main)] via-[var(--text-main)]/40 to-transparent" />
      </div>

      {/* Top Header with Brand Emblem & Skip Button */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--text-inverse)]/10 backdrop-blur-md border border-[var(--text-inverse)]/10">
          <Image
            src="/images/brand_logo/favicon-rounded.png"
            alt="Ficcado Clothing Emblem"
            width={20}
            height={20}
            className="rounded-full"
          />
          <span className="text-xs font-bold text-[var(--text-inverse)] tracking-wider">Ficcado Clothing</span>
        </div>
        {!isLast ? (
          <button
            id="walkthrough-skip"
            onClick={finish}
            className="rounded-full px-4 py-1.5 text-xs font-semibold text-[var(--text-inverse)] bg-[var(--text-inverse)]/15 border border-[var(--text-inverse)]/10 backdrop-blur-md transition-opacity hover:opacity-70 cursor-pointer"
          >
            Skip
          </button>
        ) : <div />}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-10 pt-8">
        {/* Brand category pill */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--primary)] text-[var(--text-inverse)] text-[10px] font-bold uppercase tracking-widest mb-2.5">
          <span>High Quality Unisex Wears</span>
        </div>

        {/* Title */}
        <h1
          className="text-2xl sm:text-3xl font-800 leading-tight text-[var(--text-inverse)] mb-2.5"
          style={{ fontWeight: 800 }}
          key={`title-${currentSlide}`}
        >
          {slide.title}
        </h1>

        {/* Subtitle */}
        <p
          className="text-sm leading-relaxed mb-6 text-[var(--text-inverse)]/75"
          key={`sub-${currentSlide}`}
        >
          {slide.subtitle}
        </p>

        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-2 mb-6" role="tablist" aria-label="Slide navigation">
          {WALKTHROUGH_DATA.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === currentSlide}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setCurrentSlide(i)}
              className="transition-all duration-300"
              style={{
                width: i === currentSlide ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === currentSlide ? 'var(--text-inverse)' : 'var(--border-medium)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          id={isLast ? 'walkthrough-get-started' : 'walkthrough-next'}
          onClick={next}
          className="btn-primary w-full text-base"
          style={{ fontSize: '16px', padding: '14px' }}
        >
          {isLast ? 'Get Started 🚀' : 'Next →'}
        </button>
      </div>
    </div>
  </div>
  );
}
