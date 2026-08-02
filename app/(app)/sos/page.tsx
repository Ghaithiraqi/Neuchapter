'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'main' | 'breathe' | 'plan' | 'call';

interface PlanData {
  contacts: { name?: string; phone?: string }[];
  actions: string[];
  reminders: string[];
  groundingItems: string[];
}

// ─── Preserved: POST /api/chat with mode 'sos' ────────────────────────────────
// ChatTabSOS keeps the data flow through /api/chat (mode:'sos') intact.
// The companion (/chat) in the nav bar is where users access this flow.

interface SOSMessage { role: 'user' | 'assistant'; content: string; }

function ChatTabSOS() {
  const [messages, setMessages] = useState<SOSMessage[]>([
    { role: 'assistant', content: 'سمعتك. خذ نفساً عميقاً الآن. أنت تقاوم — هذا شجاعة. أين أنت الآن جسدياً؟' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((p) => [...p, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'sos', sessionId, message: text }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((p) => [...p, { role: 'assistant', content: data.message }]);
        if (data.sessionId) setSessionId(data.sessionId);
      }
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: 'خذ نفساً. المساعدة قادمة.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Hidden — contract preserved, UI surface is /chat
  return (
    <div hidden aria-hidden>
      <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={send}>{loading ? '…' : 'أرسل'}</button>
      {messages.map((m, i) => <div key={i}>{m.content}</div>)}
    </div>
  );
}

// ─── Breathing circle ─────────────────────────────────────────────────────────

function BreathingCircle({ size = 256 }: { size?: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Outer glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(93,205,165,.28), rgba(37,150,150,.08) 52%, transparent 72%)',
          animation: 'ncSosGlow 11s ease-in-out infinite',
        }}
      />
      {/* Static outer ring */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1px solid rgba(93,205,165,.12)',
        }}
      />
      {/* Breathing ring */}
      <div
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1.5px solid rgba(93,205,165,.45)',
          background: 'radial-gradient(circle, rgba(37,150,150,.2), transparent 68%)',
          boxShadow: '0 0 60px rgba(93,205,165,.14)',
          animation: 'ncSosBreathe 11s ease-in-out infinite',
          willChange: 'transform',
        }}
      />
      {/* Inhale / exhale labels — crossfade on the 11s cycle */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span
          aria-live="polite"
          style={{
            position: 'absolute',
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
            fontSize: 24,
            color: '#EAF2EE',
            letterSpacing: 6,
            animation: 'ncInhale 11s ease-in-out infinite',
          }}
        >
          شهيق
        </span>
        <span
          style={{
            position: 'absolute',
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
            fontSize: 24,
            color: '#EAF2EE',
            letterSpacing: 6,
            animation: 'ncExhale 11s ease-in-out infinite',
          }}
        >
          زفير
        </span>
      </div>
    </div>
  );
}

// ─── Back button (inline, not absolute) ───────────────────────────────────────

function BackButton({ onClick, label = 'رجوع' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#9CA6BD',
        flexShrink: 0,
      }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ─── Action button ─────────────────────────────────────────────────────────────

function ActionButton({
  onClick,
  icon,
  iconBg,
  iconColor,
  bg,
  border,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  bg: string;
  border: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '22px 24px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 24,
        cursor: 'pointer',
        color: '#EAF2EE',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        fontSize: 20,
        textAlign: 'start',
        transition: 'background .8s ease',
        minHeight: 44,
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────────

function MainView({ onBreathe, onCall, onPlan }: {
  onBreathe: () => void;
  onCall: () => void;
  onPlan: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 40px 40px',
      }}
    >
      <h1
        style={{
          margin: '0 0 16px',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: 32,
          color: '#EAF2EE',
          textAlign: 'center',
          letterSpacing: '.5px',
        }}
      >
        أنت بأمان الآن
      </h1>

      <p
        style={{
          margin: '0 0 52px',
          maxWidth: 280,
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
          fontWeight: 300,
          fontSize: 18,
          lineHeight: 2.1,
          color: '#B6BFCF',
        }}
      >
        هذه موجة، وكل موجة تنحسر.<br />
        ابقَ معي، وتنفّس ببطء.
      </p>

      <div style={{ marginBottom: 56 }}>
        <BreathingCircle size={256} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
        <ActionButton
          onClick={onBreathe}
          bg="rgba(139,126,232,.1)"
          border="rgba(139,126,232,.4)"
          iconBg="rgba(74,60,180,.22)"
          iconColor="#8B7EE8"
          label="تنفّس معي"
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          }
        />
        <ActionButton
          onClick={onCall}
          bg="rgba(255,255,255,.03)"
          border="rgba(255,255,255,.08)"
          iconBg="rgba(55,110,200,.16)"
          iconColor="#6E9BE8"
          label="اتصل بشخص"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4.5 5.5c0 8 6 14 14 14 .8 0 1.5-.6 1.5-1.4v-2.3c0-.7-.5-1.3-1.2-1.4l-2.6-.4c-.6-.1-1.2.1-1.5.6l-.7 1c-2-1-3.6-2.6-4.6-4.6l1-.7c.5-.3.7-.9.6-1.5l-.4-2.6c-.1-.7-.7-1.2-1.4-1.2H5.9C5.1 4 4.5 4.7 4.5 5.5z" strokeLinejoin="round" />
            </svg>
          }
        />
        <ActionButton
          onClick={onPlan}
          bg="rgba(255,255,255,.03)"
          border="rgba(255,255,255,.08)"
          iconBg="rgba(74,60,180,.2)"
          iconColor="#8B7EE8"
          label="خطتي للحظات الصعبة"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" strokeLinejoin="round" />
              <path d="M9 11.5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

// ─── Breathe view ─────────────────────────────────────────────────────────────

function BreatheView({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 40px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 36 }}>
        <BackButton onClick={onBack} />
        <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 17, color: '#B6BFCF' }}>
          تنفّس معي
        </p>
      </div>

      <p style={{ margin: '0 0 52px', fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14, color: '#808AA0', letterSpacing: 1, textAlign: 'center' }}>
        شهيق مع التمدد · زفير مع الانكماش
      </p>

      <BreathingCircle size={256} />

      <button
        onClick={onBack}
        style={{
          marginTop: 56,
          padding: '14px 40px',
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 24,
          cursor: 'pointer',
          color: '#EAF2EE',
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          fontSize: 16,
          minHeight: 44,
        }}
      >
        أشعر بتحسّن
      </button>
    </div>
  );
}

// ─── Plan view ────────────────────────────────────────────────────────────────

function PlanView({ plan, loading, onBack }: {
  plan: PlanData | null;
  loading: boolean;
  onBack: () => void;
}) {
  const defaultActions = [
    'توقّف وتنفّس عشر أنفاس بطيئة قبل أي قرار.',
    'اشرب كوب ماء وغيّر المكان الذي أنت فيه.',
    'تواصل مع أحد أشخاص الأمان في قائمتك.',
  ];
  const actions = (plan && plan.actions.length > 0) ? plan.actions : defaultActions;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '0 30px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <BackButton onClick={onBack} />
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20, color: '#EAF2EE' }}>
            خطتي للتعافي
          </h1>
          <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, color: '#9CA6BD' }}>
            كلماتٌ كتبتها لنفسك في لحظة صفاء
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[172, 96, 70].map((h, i) => (
            <div
              key={i}
              style={{
                height: h,
                borderRadius: 20,
                background: 'rgba(255,255,255,.04)',
                animation: `ncBreathe ${1.9 + i * 0.15}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      ) : (
        <>
          <div
            style={{
              background: 'rgba(93,205,165,.06)',
              border: '1px solid rgba(93,205,165,.2)',
              borderRadius: 20,
              padding: 18,
              marginBottom: 14,
            }}
          >
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, color: '#5DCDA5', marginBottom: 12 }}>
              حين تشتدّ الرغبة، جرّب:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {actions.map((action, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'rgba(93,205,165,.16)',
                      color: '#5DCDA5',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 700,
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      direction: 'ltr',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14.5, lineHeight: 1.7, color: '#D8E1EC' }}>
                    {typeof action === 'string' ? action : JSON.stringify(action)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {plan && plan.contacts.length > 0 && (
            <div
              style={{
                background: 'rgba(55,110,200,.06)',
                border: '1px solid rgba(55,110,200,.2)',
                borderRadius: 20,
                padding: 18,
                marginBottom: 14,
              }}
            >
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, color: '#6E9BE8', marginBottom: 10 }}>
                أشخاص أمانك
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.contacts.map((c, i) => (
                  <a
                    key={i}
                    href={c.phone ? `tel:${c.phone}` : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: 'rgba(55,110,200,.08)',
                      borderRadius: 14,
                      textDecoration: 'none',
                      color: '#EAF2EE',
                      fontFamily: 'var(--font-body)',
                      fontSize: 15,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6E9BE8" strokeWidth="1.6">
                      <path d="M4.5 5.5c0 8 6 14 14 14 .8 0 1.5-.6 1.5-1.4v-2.3c0-.7-.5-1.3-1.2-1.4l-2.6-.4c-.6-.1-1.2.1-1.5.6l-.7 1c-2-1-3.6-2.6-4.6-4.6l1-.7c.5-.3.7-.9.6-1.5l-.4-2.6c-.1-.7-.7-1.2-1.4-1.2H5.9C5.1 4 4.5 4.7 4.5 5.5z" strokeLinejoin="round" />
                    </svg>
                    <span>{c.name || c.phone || '—'}</span>
                    {c.phone && (
                      <span style={{ marginRight: 'auto', color: '#6E9BE8', fontSize: 13 }}>{c.phone}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Call view ────────────────────────────────────────────────────────────────

function CallView({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '0 30px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
        <BackButton onClick={onBack} />
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20, color: '#EAF2EE' }}>
            اتصل بشخص
          </h1>
          <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, color: '#9CA6BD' }}>
            صوتٌ يعرفك يساعد في لحظات كهذه
          </p>
        </div>
      </div>

      <a
        href="tel:920033360"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '20px 22px',
          background: 'rgba(93,205,165,.08)',
          border: '1px solid rgba(93,205,165,.3)',
          borderRadius: 22,
          textDecoration: 'none',
          color: '#EAF2EE',
          marginBottom: 16,
        }}
      >
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(93,205,165,.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#5DCDA5',
            flexShrink: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4.5 5.5c0 8 6 14 14 14 .8 0 1.5-.6 1.5-1.4v-2.3c0-.7-.5-1.3-1.2-1.4l-2.6-.4c-.6-.1-1.2.1-1.5.6l-.7 1c-2-1-3.6-2.6-4.6-4.6l1-.7c.5-.3.7-.9.6-1.5l-.4-2.6c-.1-.7-.7-1.2-1.4-1.2H5.9C5.1 4 4.5 4.7 4.5 5.5z" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 16, color: '#EAF2EE', marginBottom: 3 }}>
            خط مساندة الصحة النفسية
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14, color: '#5DCDA5', direction: 'ltr' }}>
            920033360
          </div>
        </div>
      </a>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontWeight: 300,
          fontSize: 14,
          color: '#808AA0',
          lineHeight: 1.85,
          textAlign: 'center',
        }}
      >
        شخصٌ يسمعك يغيّر كثيراً.<br />
        لا تحتاج أن تشرح كل شيء — فقط اتصل.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SOSPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('main');
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Preserved: POST /api/urge — log silently on mount
  useEffect(() => {
    fetch('/api/urge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intensity: 5, outcome: 'resisted' }),
    }).catch(() => {});
  }, []);

  // Preserved: GET /api/emergency-plan
  const handlePlan = async () => {
    setView('plan');
    if (plan || planLoading) return;
    setPlanLoading(true);
    try {
      const res = await fetch('/api/emergency-plan');
      const data = await res.json();
      if (data.plan) setPlan(data.plan as PlanData);
    } catch {
      // fall through to default plan content
    } finally {
      setPlanLoading(false);
    }
  };

  const closeOrBack = () => {
    if (view !== 'main') { setView('main'); return; }
    router.push('/');
  };

  return (
    <>
      {/* Preserved chat handler — hidden */}
      <ChatTabSOS />

      {/*
        Normal document-flow page. No position:fixed, no nested scroll container.
        The document scrolls naturally. Background overrides the layout's gradient
        for this specific route.
      */}
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(560px 640px at 50% 52%, rgba(37,150,150,.16) 0%, rgba(13,18,32,1) 62%)',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'calc(60px + env(safe-area-inset-top, 0px))',
          animation: 'ncScreenIn .7s cubic-bezier(.4,0,.2,1)',
          position: 'relative',
        }}
      >
        {/* Close / back button — absolute within this relative container */}
        <button
          onClick={closeOrBack}
          aria-label={view !== 'main' ? 'رجوع' : 'إغلاق'}
          style={{
            position: 'absolute',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            right: 26,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#9CA6BD',
            zIndex: 2,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        {view === 'main' && (
          <MainView
            onBreathe={() => setView('breathe')}
            onCall={() => setView('call')}
            onPlan={handlePlan}
          />
        )}
        {view === 'breathe' && <BreatheView onBack={() => setView('main')} />}
        {view === 'plan' && <PlanView plan={plan} loading={planLoading} onBack={() => setView('main')} />}
        {view === 'call' && <CallView onBack={() => setView('main')} />}
      </div>
    </>
  );
}
