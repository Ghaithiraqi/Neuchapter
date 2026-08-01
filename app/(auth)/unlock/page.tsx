'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NeuchapterLogo from '@/components/shared/NeuchapterLogo';

// keyValues is the source of truth for PIN input (index-aligned with displayed keys)
const keyValues = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'];

export default function UnlockPage() {
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Incrementing key forces the dots shake animation to replay on each wrong attempt
  const [shakeKey, setShakeKey] = useState(0);
  const router = useRouter();

  const addDigit = useCallback(
    async (d: string) => {
      if (passcode.length >= 5 || loading || success) return;
      const newCode = passcode + d;
      setPasscode(newCode);
      setErrorMsg(null);

      if (newCode.length === 5) {
        setLoading(true);
        try {
          const res = await fetch('/api/auth/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: newCode }),
          });
          const data = await res.json();

          if (data.success) {
            setSuccess(true);
            setTimeout(() => router.push('/'), 900);
          } else {
            // Show remaining attempts if available, otherwise a warm fallback
            const remaining: number | undefined = data.attemptsRemaining;
            setAttemptsRemaining(remaining ?? null);
            if (data.retryAfterMinutes) {
              setErrorMsg(`حاول بعد ${data.retryAfterMinutes} ${data.retryAfterMinutes === 1 ? 'دقيقة' : 'دقائق'}`);
            } else if (remaining != null && remaining > 0) {
              setErrorMsg(`حاول مرة أخرى — تبقّى لك ${remaining}`);
            } else {
              setErrorMsg('حاول مرة أخرى، لا بأس');
            }
            setShakeKey((k) => k + 1);
            setTimeout(() => {
              setPasscode('');
              setErrorMsg(null);
              setAttemptsRemaining(null);
            }, 1400);
          }
        } catch {
          setErrorMsg('تعذّر الاتصال، حاول مجدداً');
          setShakeKey((k) => k + 1);
          setTimeout(() => {
            setPasscode('');
            setErrorMsg(null);
          }, 1400);
        } finally {
          setLoading(false);
        }
      }
    },
    [passcode, loading, success, router]
  );

  const removeDigit = useCallback(() => {
    if (loading || success) return;
    setPasscode((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  }, [loading, success]);

  return (
    <>
      <style>{`
        @keyframes ncAura {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.1); }
        }
        @keyframes ncFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes ncDotIn {
          0%   { transform: scale(0.45); opacity: 0; }
          55%  { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes ncFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes ncShake {
          0%   { transform: translateX(0);   }
          18%  { transform: translateX(-9px); }
          36%  { transform: translateX(9px);  }
          54%  { transform: translateX(-5px); }
          72%  { transform: translateX(5px);  }
          88%  { transform: translateX(-2px); }
          100% { transform: translateX(0);   }
        }
        @keyframes ncScreenIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        /* Staggered entrance for direct children */
        .nc-stagger > * {
          opacity: 0;
          animation: ncFadeUp 0.75s cubic-bezier(.4,0,.2,1) forwards;
        }
        .nc-stagger > *:nth-child(1) { animation-delay: 0.05s; }
        .nc-stagger > *:nth-child(2) { animation-delay: 0.14s; }
        .nc-stagger > *:nth-child(3) { animation-delay: 0.23s; }
        .nc-stagger > *:nth-child(4) { animation-delay: 0.32s; }
        .nc-stagger > *:nth-child(5) { animation-delay: 0.41s; }
        .nc-stagger > *:nth-child(6) { animation-delay: 0.50s; }
        /* Circular key press feedback */
        .nc-key:not(:disabled):active {
          transform: scale(0.88);
          background: rgba(93,205,165,.14) !important;
          border-color: rgba(93,205,165,.42) !important;
        }
        /* Honour reduced-motion: skip entrance stagger, show elements immediately */
        @media (prefers-reduced-motion: reduce) {
          .nc-stagger > * {
            animation: none !important;
            opacity: 1 !important;
          }
          .nc-key:not(:disabled):active { transform: none; }
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(1000px 700px at 50% -5%, #141C31 0%, #0B1120 60%, var(--bg-deep) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 24,
          paddingRight: 24,
          animation: 'ncScreenIn 0.5s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div
          className="nc-stagger"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 320,
          }}
        >

          {/* ── Logo with breathing glow ── */}
          <div
            style={{
              position: 'relative',
              width: 120,
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            {/* Aura ring */}
            <div
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(46,190,128,.38) 0%, rgba(37,150,150,.14) 52%, transparent 72%)',
                animation: 'ncAura 7s ease-in-out infinite',
              }}
            />
            {/* Floating logo */}
            <div style={{ position: 'relative', animation: 'ncFloat 8s ease-in-out infinite' }}>
              <NeuchapterLogo size={80} animate={true} />
            </div>
          </div>

          {/* ── Title ── */}
          <h1
            style={{
              margin: '0 0 9px',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: 0.5,
              color: 'var(--text-primary)',
              textAlign: 'center',
            }}
          >
            Neuchapter
          </h1>

          {/* ── Tagline ── */}
          <p
            style={{
              margin: '0 0 48px',
              fontFamily: 'var(--font-body)',
              fontWeight: 400,
              fontSize: 15,
              color: 'var(--text-secondary)',
              textAlign: 'center',
              letterSpacing: 0.3,
            }}
          >
            أدخل رمزك لتكمل رحلتك
          </p>

          {/* ── Passcode dots ──
               Outer div is the .nc-stagger child — owns the entrance reveal,
               no inline animation so the CSS class animation is never overridden.
               Inner div carries key={shakeKey} and the shake animation so it
               remounts independently without touching the outer opacity. ── */}
          <div style={{ marginBottom: 54 }}>
            <div
              key={shakeKey}
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 20,
                animation: shakeKey > 0 ? 'ncShake 0.55s ease' : undefined,
              }}
            >
              {[0, 1, 2, 3, 4].map((i) => {
                const filled = passcode.length > i;
                return (
                  <div
                    key={i}
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: '50%',
                      /* Boosted opacity (.5) for ~4.9:1 contrast on #111626 */
                      border: filled ? 'none' : '1.5px solid rgba(234,242,238,.5)',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    {/* Mounted fresh when filled — triggers spring pop animation */}
                    {filled && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          background: 'linear-gradient(140deg, #5DCDA5, #259696)',
                          boxShadow: '0 0 12px rgba(93,205,165,.6)',
                          animation: 'ncDotIn 0.5s cubic-bezier(.34,1.56,.64,1) forwards',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Circular numpad — forced LTR so 1-2-3 reads left-to-right ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 18,
              width: '100%',
              maxWidth: 280,
              direction: 'ltr',
            }}
          >
            {keyValues.map((val, i) => {
              const isEmpty = val === '';
              const isDelete = val === '←';
              return isEmpty ? (
                <div key={i} />
              ) : (
                <button
                  key={i}
                  className="nc-key"
                  onClick={() => (isDelete ? removeDigit() : addDigit(val))}
                  disabled={loading || success}
                  aria-label={isDelete ? 'حذف رقم' : val}
                  style={{
                    height: 74,
                    borderRadius: '50%',
                    background: isDelete ? 'transparent' : 'rgba(255,255,255,.04)',
                    border: isDelete ? 'none' : '1px solid rgba(255,255,255,.08)',
                    color: isDelete ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 400,
                    fontSize: 30,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.25s ease, border-color 0.25s ease, transform 0.12s ease',
                    minWidth: 44,
                    minHeight: 44,
                  }}
                  onMouseEnter={(e) => {
                    if (!isDelete) {
                      const el = e.currentTarget;
                      el.style.background = 'rgba(93,205,165,.1)';
                      el.style.borderColor = 'rgba(93,205,165,.35)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDelete) {
                      const el = e.currentTarget;
                      el.style.background = 'rgba(255,255,255,.04)';
                      el.style.borderColor = 'rgba(255,255,255,.08)';
                    }
                  }}
                >
                  {isDelete ? (
                    /* Backspace SVG matching design reference */
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path
                        d="M20 6H9l-6 6 6 6h11a1 1 0 001-1V7a1 1 0 00-1-1z"
                        strokeLinejoin="round"
                      />
                      <path d="M15.5 10l-4 4m0-4l4 4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    val
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Status / feedback area ── */}
          <div
            style={{
              height: 28,
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {success && (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  fontSize: 14,
                  color: 'var(--gold-soft)',
                  letterSpacing: 0.4,
                  animation: 'ncFadeUp 0.5s ease',
                }}
              >
                أهلاً بعودتك ✦
              </span>
            )}
            {errorMsg && !success && (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 400,
                  fontSize: 13,
                  color: 'var(--alert-warm)',
                  textAlign: 'center',
                  animation: 'ncFadeUp 0.4s ease',
                }}
              >
                {errorMsg}
              </span>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
