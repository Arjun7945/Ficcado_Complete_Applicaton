'use client';

// =============================================================================
// RatingStars — Interactive & static star rating component
// =============================================================================

import { Star } from 'lucide-react';

interface RatingStarsProps {
  /** Current rating value (0–5) */
  rating: number;
  /** Max stars (default: 5) */
  max?: number;
  /** Icon size in px (default: 16) */
  size?: number;
  /** If true, stars are clickable */
  interactive?: boolean;
  /** Callback when a star is clicked (requires interactive=true) */
  onRate?: (rating: number) => void;
  /** Accessible label prefix */
  ariaLabel?: string;
}

export function RatingStars({
  rating,
  max = 5,
  size = 16,
  interactive = false,
  onRate,
  ariaLabel = 'Rating',
}: RatingStarsProps) {
  return (
    <div
      className="flex items-center gap-0.5"
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`${ariaLabel}: ${rating} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= Math.round(rating);
        const isHalf = !isFilled && starValue - 0.5 <= rating;

        if (!interactive) {
          return (
            <span
              key={i}
              className="inline-flex items-center justify-center select-none"
              style={{ padding: 0, lineHeight: 1 }}
              aria-hidden="true"
            >
              <Star
                size={size}
                strokeWidth={1.5}
                fill={isFilled ? '#F59E0B' : isHalf ? '#F59E0B' : 'none'}
                style={{
                  color: isFilled || isHalf ? '#F59E0B' : 'var(--border-medium)',
                  display: 'block',
                }}
              />
            </span>
          );
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => onRate?.(starValue)}
            className="cursor-pointer transition-transform active:scale-90 hover:scale-110"
            style={{ background: 'none', border: 'none', padding: 0, lineHeight: 1 }}
            aria-label={`Rate ${starValue} out of ${max}`}
            role="radio"
            aria-checked={starValue === rating}
          >
            <Star
              size={size}
              strokeWidth={1.5}
              fill={isFilled ? '#F59E0B' : isHalf ? '#F59E0B' : 'none'}
              style={{
                color: isFilled || isHalf ? '#F59E0B' : 'var(--border-medium)',
                display: 'block',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
