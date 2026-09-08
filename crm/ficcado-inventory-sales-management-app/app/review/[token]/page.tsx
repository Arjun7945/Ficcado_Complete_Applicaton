'use client';

/**
 * app/review/[token]/page.tsx
 *
 * Public review submission page — no login required.
 * Accessible via the tokenized link emailed after ORDER_DELIVERED_SUCCESSFULLY.
 *
 * Flow:
 *   1. Page loads → validates token with backend
 *   2. Shows star rating UI for the specific item
 *   3. On submit → posts review to backend → shows thank you message
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type TokenInfo = {
  itemName: string;
  itemId: number;
  expiresAt: string;
};

type Phase = 'loading' | 'invalid' | 'form' | 'submitting' | 'done' | 'error';

export default function ReviewPage() {
  const params = useParams();
  const token = params?.token as string;

  const [phase, setPhase] = useState<Phase>('loading');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/reviews/validate/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setTokenInfo(data);
          setPhase('form');
        } else {
          setPhase('invalid');
        }
      })
      .catch(() => setPhase('invalid'));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setErrorMsg('Please select a star rating.'); return; }
    setPhase('submitting');
    try {
      const res = await fetch('/api/public/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, starRating: rating, comment }),
      });
      if (res.ok) {
        setPhase('done');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Submission failed. Please try again.');
        setPhase('form');
      }
    } catch {
      setErrorMsg('Could not connect. Please try again.');
      setPhase('form');
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: '40px 36px',
    maxWidth: 460,
    width: '100%',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(16px)',
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>Validating your review link…</p>
        </div>
      </div>
    );
  }

  // ── Invalid/expired link ───────────────────────────────────────────────────
  if (phase === 'invalid') {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            Link Unavailable
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6 }}>
            This review link has expired, already been used, or is invalid.
            Review links are valid for 30 days after delivery.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 20 }}>
            Ficcado · www.ficcado.store
          </p>
        </div>
      </div>
    );
  }

  // ── Done state ─────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⭐</div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Thank you!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.7 }}>
            Your review has been submitted. We appreciate your feedback!
          </p>
          {'★'.repeat(rating).split('').map((_, i) => (
            <span key={i} style={{ fontSize: 28, color: '#f59e0b' }}>★</span>
          ))}
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 24 }}>
            Ficcado · www.ficcado.store
          </p>
        </div>
      </div>
    );
  }

  // ── Review form ───────────────────────────────────────────────────────────
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
            color: '#a78bfa', textTransform: 'uppercase', marginBottom: 8,
          }}>
            WWW.FICCADO.STORE
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Rate Your Purchase
          </h1>
          {tokenInfo && (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13.5, marginTop: 8 }}>
              {tokenInfo.itemName}
            </p>
          )}
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 20,
            color: '#fca5a5', fontSize: 13.5,
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 12 }}>
              How would you rate this item?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => { setRating(star); setErrorMsg(''); }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 38,
                    color: star <= (hoverRating || rating) ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                    transition: 'color 0.15s, transform 0.1s',
                    transform: star <= (hoverRating || rating) ? 'scale(1.15)' : 'scale(1)',
                    padding: '0 2px',
                  }}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p style={{ color: '#f59e0b', fontSize: 12, marginTop: 8 }}>
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>
              Comment <span style={{ color: 'rgba(255,255,255,0.35)' }}>(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share your experience with this item…"
              rows={4}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
                padding: '12px 14px', color: '#fff', fontSize: 14,
                resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={phase === 'submitting'}
            style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
              border: 'none', borderRadius: 10, color: '#fff',
              fontSize: 15, fontWeight: 600, cursor: phase === 'submitting' ? 'not-allowed' : 'pointer',
              opacity: phase === 'submitting' ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {phase === 'submitting' ? 'Submitting…' : 'Submit Review →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 20 }}>
          Ficcado Inventory &amp; Sales Management · Internal use only
        </p>
      </div>
    </div>
  );
}
