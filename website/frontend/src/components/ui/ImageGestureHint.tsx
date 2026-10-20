'use client';

// =============================================================================
// ImageGestureHint — Hand gesture hint on item images for zoom/close look
// Displays an animated hand gesture indicating zoom/inspect capability.
// Appears on all images every time user opens, displays for 2 seconds,
// and smoothly fades out. No persistent storage gating per client instruction.
// =============================================================================

import React, { useEffect, useState, useCallback } from 'react';

interface ImageGestureHintProps {
  onDismiss?: () => void;
}

export function ImageGestureHint({ onDismiss }: ImageGestureHintProps) {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  const handleDismiss = useCallback(() => {
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 400);
  }, [onDismiss]);

  // Auto-dismiss after 2 seconds then fade out smoothly
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, 2000);
    return () => clearTimeout(timer);
  }, [visible, handleDismiss]);

  if (!visible) return null;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        handleDismiss();
      }}
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto cursor-pointer transition-opacity duration-400 ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      aria-label="Tap or click image for a close-up high-resolution view"
      role="tooltip"
    >
      {/* Background scrim for contrast */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px] transition-opacity duration-300" />

      {/* Floating gesture badge */}
      <div
        className="relative z-10 flex flex-col items-center gap-2 px-4 py-3 rounded-2xl bg-neutral-950/85 border border-white/20 text-white shadow-2xl backdrop-blur-md transform transition-transform hover:scale-105 active:scale-95"
        style={{
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.15)',
        }}
      >
        {/* Animated Tap Ripple & Hand Icon */}
        <div className="relative w-11 h-11 flex items-center justify-center">
          {/* Pulsing ripple ring */}
          <span
            className="absolute inset-0 rounded-full bg-white/20 animate-ping"
            style={{ animationDuration: '1.6s' }}
          />
          <span className="absolute inset-1 rounded-full bg-white/15 animate-pulse" />

          {/* SVG Hand Tap Gesture */}
          <svg
            className="w-7 h-7 text-white relative z-10 animate-bounce"
            style={{ animationDuration: '1.2s' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Hand with pointing index finger tapping */}
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.83L7 15" />
          </svg>
        </div>

        {/* Informative Label */}
        <div className="text-center space-y-0.5">
          <p className="text-xs font-800 tracking-wide uppercase text-white font-mono">
            Tap Image for Close Look
          </p>
          <p className="text-[11px] text-white/75 font-medium">
            Inspect fabric weave & high-res details
          </p>
        </div>

        {/* Micro Dismiss Pill */}
        <span className="mt-0.5 inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-white/90 border border-white/10">
          Got it
        </span>
      </div>
    </div>
  );
}
