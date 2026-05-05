'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { LTR } from '@/components/shared/LTR';
import { ChatTab } from '@/components/home/ChatTab';

const PROTOCOL_OPTIONS = [
  {
    step: '01',
    title: 'تكلّم معي',
    desc: 'محادثة مفتوحة · بلا حكم',
    time: '~ 5min',
    action: 'chat',
  },
  {
    step: '02',
    title: 'خطتي للحظات الصعبة',
    desc: '٥ خطوات حضّرتها مسبقاً',
    time: '~ 3min',
    action: 'plan',
  },
  {
    step: '03',
    title: 'تأريض ٥-٤-٣-٢-١',
    desc: 'إعادة الجهاز العصبي للحاضر',
    time: '~ 4min',
    action: 'grounding',
  },
  {
    step: '04',
    title: 'سجّل ولا تتحرك',
    desc: 'احفظ اللحظة لتحليلها لاحقاً',
    time: '~ 1min',
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
        background: 'var(--night-deepest)',
        padding: '32px 22px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* وهج */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 30%, rgba(107, 149, 201, 0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* زر الرجوع */}
      <button
        onClick={() => { setActiveAction(null); router.push('/'); }}
        style={{
          alignSelf: 'flex-start',
          background: 'none',
          border: 'none',
          color: 'var(--ink-muted)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          cursor: 'pointer',
          letterSpacing: 1,
          marginBottom: 16,
          zIndex: 2,
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
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--therapy-blue)',
            letterSpacing: 2,
            padding: '6px 14px',
            border: '1px solid var(--therapy-blue-soft)',
            borderRadius: 20,
            marginBottom: 22,
            background: 'rgba(107, 149, 201, 0.05)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              background: 'var(--therapy-blue)',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'blink 1.5s ease-in-out infinite',
            }}
          />
          <LTR>PROTOCOL · ACTIVE</LTR>
        </div>

        <h1
          style={{
            fontFamily: "'Noto Naskh Arabic', serif",
            fontSize: 26,
            color: 'var(--ink-primary)',
            marginBottom: 12,
            fontWeight: 700,
          }}
        >
          أنا هنا.
        </h1>

        <p
          style={{
            fontFamily: "'Amiri', serif",
            fontSize: 16,
            color: 'var(--ink-secondary)',
            lineHeight: 1.7,
            maxWidth: 320,
            margin: '0 auto',
            fontStyle: 'italic',
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
            border: '1px solid var(--therapy-blue-soft)',
            background: 'var(--card-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            animation: 'breathe 8s ease-in-out infinite',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 18,
              borderRadius: '50%',
              border: '1px solid rgba(107, 149, 201, 0.4)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 44,
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--therapy-blue-glow), transparent 70%)',
            }}
          />
          <div style={{ textAlign: 'center', zIndex: 2 }}>
            <div
              style={{
                fontFamily: "'Noto Naskh Arabic', serif",
                fontSize: 16,
                color: 'var(--therapy-blue)',
                letterSpacing: 1,
                fontWeight: 500,
              }}
            >
              شهيق · زفير
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'var(--ink-muted)',
                marginTop: 4,
              }}
            >
              <LTR>8s · cycle</LTR>
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
            background: 'var(--card-bg)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              fontFamily: "'Noto Naskh Arabic', serif",
              fontSize: 16,
              color: 'var(--ink-primary)',
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
                  fontFamily: "'Amiri', serif",
                  fontSize: 28,
                  color: 'var(--therapy-blue-bright)',
                  fontWeight: 700,
                  width: 36,
                  flexShrink: 0,
                }}
              >
                {s.num}
              </span>
              <span
                style={{
                  fontFamily: "'Noto Naskh Arabic', serif",
                  fontSize: 15,
                  color: 'var(--ink-primary)',
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
              padding: '10px',
              background: 'var(--therapy)',
              border: 'none',
              borderRadius: 10,
              color: 'var(--night-deepest)',
              fontFamily: "'Noto Naskh Arabic', serif",
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
            background: 'var(--card-bg)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: "'Noto Naskh Arabic', serif",
              fontSize: 15,
              color: 'var(--ink-secondary)',
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
              padding: '8px 20px',
              background: 'var(--therapy)',
              border: 'none',
              borderRadius: 8,
              color: 'var(--night-deepest)',
              fontFamily: "'Noto Naskh Arabic', serif",
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
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--ink-muted)',
            letterSpacing: 2,
            marginBottom: 14,
            textAlign: 'center',
          }}
        >
          — اختر مساراً —
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROTOCOL_OPTIONS.map((opt) => (
            <button
              key={opt.step}
              onClick={() => handleAction(opt.action)}
              style={{
                padding: '16px 18px',
                background: activeAction === opt.action ? 'var(--card-bg-elevated)' : 'var(--card-bg)',
                border: `1px solid ${activeAction === opt.action ? 'var(--therapy-blue-soft)' : 'var(--border-soft)'}`,
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.25s',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                textAlign: 'right',
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'var(--therapy-blue)',
                  fontWeight: 500,
                  width: 32,
                  flexShrink: 0,
                  textAlign: 'center',
                }}
              >
                <LTR>{opt.step}</LTR>
              </div>
              <div
                style={{
                  width: 1,
                  height: 32,
                  background: 'var(--border-mid)',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'Noto Naskh Arabic', serif",
                    fontSize: 15,
                    color: 'var(--ink-primary)',
                    marginBottom: 3,
                    fontWeight: 500,
                  }}
                >
                  {opt.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                  {opt.desc}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: 'var(--ink-faint)',
                }}
              >
                <LTR>{opt.time}</LTR>
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

// نسخة محدودة من ChatTab لوضع الطوارئ
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
        background: 'var(--card-bg)',
        borderRadius: 16,
        padding: 16,
        border: '1px solid var(--therapy-blue-soft)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: m.role === 'assistant' ? 'var(--card-bg-elevated)' : 'var(--therapy-soft)',
              fontSize: 13,
              color: 'var(--ink-primary)',
              fontFamily: "'Noto Naskh Arabic', serif",
              lineHeight: 1.7,
              alignSelf: m.role === 'assistant' ? 'flex-start' : 'flex-end',
              maxWidth: '90%',
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 3, padding: 8 }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--therapy-blue)', animation: `blink 1s ease-in-out ${d}s infinite` }} />
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
            padding: '9px 12px',
            background: 'var(--night-deepest)',
            border: '1px solid var(--border-soft)',
            borderRadius: 8,
            color: 'var(--ink-primary)',
            fontFamily: "'Tajawal', sans-serif",
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
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--therapy)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="var(--night-deepest)">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
