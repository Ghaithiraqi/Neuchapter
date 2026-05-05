'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ChatTab } from '@/components/home/ChatTab';

const PROTOCOL_OPTIONS = [
  {
    step: '٠١',
    title: 'تكلّم معي',
    desc: 'محادثة مفتوحة · بلا حكم',
    action: 'chat',
  },
  {
    step: '٠٢',
    title: 'خطتي للحظات الصعبة',
    desc: '٥ خطوات حضّرتها مسبقاً',
    action: 'plan',
  },
  {
    step: '٠٣',
    title: 'تأريض ٥-٤-٣-٢-١',
    desc: 'إعادة الجهاز العصبي للحاضر',
    action: 'grounding',
  },
  {
    step: '٠٤',
    title: 'سجّل ولا تتحرك',
    desc: 'احفظ اللحظة لتحليلها لاحقاً',
    action: 'log',
  },
];

const GROUNDING_STEPS = [
  { num: '٥', text: 'أشياء تراها الآن' },
  { num: '٤', text: 'أشياء تلمسها' },
  { num: '٣', text: 'أشياء تسمعها' },
  { num: '٢', text: 'أشياء تشمّها' },
  { num: '١', text: 'شيء تتذوقه' },
];

export default function SOSPage() {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [logDone, setLogDone] = useState(false);
  const [logIntensity, setLogIntensity] = useState(5);

  const handleAction = async (action: string) => {
    if (action === 'log') {
      await fetch('/api/urge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intensity: logIntensity, outcome: 'resisted' }),
      });
      setLogDone(true);
      return;
    }
    setActiveAction(action);
  };

  return (
    <div
      style={{
        maxWidth: 420,
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #1A3D3D 0%, rgba(216, 90, 48, 0.04) 100%)',
        padding: '32px 22px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* زر الرجوع */}
      <button
        onClick={() => { setActiveAction(null); router.push('/'); }}
        style={{
          alignSelf: 'flex-start',
          background: 'var(--gold-faint)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--radius-button)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          cursor: 'pointer',
          padding: '7px 16px',
          marginBottom: 20,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ← رجوع
      </button>

      {/* الهيدر */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 28,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--text-primary)',
            marginBottom: 10,
            fontWeight: 700,
          }}
        >
          أنا هنا.
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: 280,
            margin: '0 auto',
          }}
        >
          هذه اللحظة موجة. كل موجة تنحسر.
          <br />
          تنفّس مع الدائرة.
        </p>
      </div>

      {/* دائرة التنفس */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '0 0 28px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: '1.5px solid var(--gold-deep)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            animation: 'breathe 8s ease-in-out infinite',
            boxShadow: '0 0 40px rgba(232, 184, 114, 0.1)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 18,
              borderRadius: '50%',
              border: '1px solid var(--border-mid)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 44,
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--gold-faint), transparent 70%)',
            }}
          />
          <div style={{ textAlign: 'center', zIndex: 2 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                color: 'var(--gold-primary)',
                fontWeight: 500,
              }}
            >
              شهيق · زفير
            </div>
          </div>
        </div>
      </div>

      {/* المحتوى النشط */}
      {activeAction === 'chat' && (
        <div style={{ position: 'relative', zIndex: 2, marginBottom: 20 }}>
          <ChatTabSOS />
        </div>
      )}

      {activeAction === 'grounding' && (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-card)',
            padding: 20,
            marginBottom: 20,
            border: '1px solid var(--border-soft)',
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              color: 'var(--text-primary)',
              marginBottom: 16,
              fontWeight: 700,
            }}
          >
            تأريض ٥-٤-٣-٢-١
          </h3>
          {GROUNDING_STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 0',
                borderBottom: i < 4 ? '1px solid var(--border-soft)' : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  color: 'var(--gold-primary)',
                  fontWeight: 700,
                  width: 36,
                  flexShrink: 0,
                }}
              >
                {s.num}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  color: 'var(--text-primary)',
                }}
              >
                {s.text}
              </span>
            </div>
          ))}
          <button
            onClick={() => setActiveAction(null)}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '11px',
              background: 'var(--gold-primary)',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              color: '#1A3D3D',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            انتهيت
          </button>
        </div>
      )}

      {(activeAction === 'plan' || logDone) && (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-card)',
            padding: 20,
            marginBottom: 20,
            textAlign: 'center',
            border: '1px solid var(--border-soft)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
            }}
          >
            {logDone
              ? 'تم تسجيل اللحظة. أحسنت على المقاومة.'
              : 'خطتك الشخصية ستكون متاحة قريباً. للآن، تنفّس مع الدائرة وانتظر ١٠ دقائق.'}
          </p>
          <button
            onClick={() => { setActiveAction(null); setLogDone(false); }}
            style={{
              marginTop: 16,
              padding: '9px 28px',
              background: 'var(--gold-primary)',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              color: '#1A3D3D',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            حسناً
          </button>
        </div>
      )}

      {/* خيارات البروتوكول */}
      <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 14,
            textAlign: 'center',
          }}
        >
          — اختر مساراً —
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROTOCOL_OPTIONS.map((opt) => (
            <button
              key={opt.step}
              onClick={() => handleAction(opt.action)}
              style={{
                padding: '16px 18px',
                background: activeAction === opt.action ? 'var(--bg-elevated)' : 'var(--bg-card)',
                border: `1px solid ${activeAction === opt.action ? 'var(--border-strong)' : 'var(--border-soft)'}`,
                borderRadius: 'var(--radius-small)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                textAlign: 'right',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  color: 'var(--gold-primary)',
                  fontWeight: 700,
                  width: 32,
                  flexShrink: 0,
                  textAlign: 'center',
                }}
              >
                {opt.step}
              </div>
              <div
                style={{
                  width: 1,
                  height: 30,
                  background: 'var(--border-mid)',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    color: 'var(--text-primary)',
                    marginBottom: 3,
                    fontWeight: 500,
                  }}
                >
                  {opt.title}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}>
                  {opt.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SOSMessage {
  role: 'user' | 'assistant';
  content: string;
}

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

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card)',
        padding: 16,
        border: '1px solid var(--border-mid)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              padding: '10px 13px',
              borderRadius: 16,
              background: m.role === 'assistant' ? 'var(--bg-elevated)' : 'var(--gold-faint)',
              border: m.role === 'assistant' ? '1px solid var(--border-soft)' : '1px solid var(--border-mid)',
              fontSize: 13,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.7,
              alignSelf: m.role === 'assistant' ? 'flex-start' : 'flex-end',
              maxWidth: '90%',
              borderTopRightRadius: m.role === 'assistant' ? 4 : 16,
              borderTopLeftRadius: m.role === 'user' ? 4 : 16,
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 3, padding: 8 }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold-primary)', animation: `blink 1s ease-in-out ${d}s infinite` }} />
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="اكتب هنا..."
          rows={1}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-input)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            outline: 'none',
            resize: 'none',
            overflowY: 'auto',
            maxHeight: 120,
            lineHeight: 1.5,
            display: 'block',
          }}
        />
        <button
          onClick={send}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--gold-primary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="#1A3D3D">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
