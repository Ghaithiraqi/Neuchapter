'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toEnglishNumerals } from '@/lib/utils';

const MODE_LABELS: Record<string, string> = {
  support: '🌧️ وضع صعب',
  reflect: '🤔 أحتاج أفكر',
  motivate: '💪 أحتاج تحفيز',
  analyze: '📝 حلل لحظة',
  morning: '🌅 بداية يوم',
  evening: '🌙 نهاية يوم',
  general: '💬 عام',
  journal: '📖 مذكرة',
  sos: '🆘 طوارئ',
};

interface Session {
  id: number;
  mode: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  firstMessage: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `قبل ${toEnglishNumerals(diffDays)} أيام`;
  return toEnglishNumerals(d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }));
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="رجوع"
      style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#9CA6BD',
      }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', padding: '40px 0' }}>
      {[0, 0.15, 0.3].map((d, i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#5DCDA5', animation: `blink 1.2s ease-in-out ${d}s infinite` }} />
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/chat/history')
      .then((r) => r.json())
      .then((d) => { if (d.sessions) setSessions(d.sessions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '20px 20px 8px', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <BackButton onClick={() => router.back()} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 19, color: '#EAF2EE' }}>
            محادثاتي
          </h1>
          <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 12.5, color: '#9CA6BD' }}>
            {sessions.length > 0 ? `${toEnglishNumerals(sessions.length)} محادثة سابقة` : 'لا توجد محادثات سابقة'}
          </p>
        </div>
        <button
          onClick={() => router.push('/chat')}
          style={{
            padding: '8px 16px', minHeight: 36,
            background: 'rgba(46,190,128,.1)', border: '1px solid rgba(46,190,128,.28)',
            borderRadius: 50, color: '#5DCDA5',
            fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}
        >
          ＋ جديدة
        </button>
      </div>

      {loading ? (
        <LoadingDots />
      ) : sessions.length === 0 ? (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            padding: '40px 22px',
            background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 22,
          }}
        >
          <span style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(46,190,128,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5DCDA5', marginBottom: 16 }}>
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
              <path d="M12 3c-4.5 0-8 3.1-8 7 0 2.1 1 4 2.7 5.2L6 20l4.2-2.1c.6.1 1.2.1 1.8.1 4.5 0 8-3.1 8-7s-3.5-7-8-7z" strokeLinejoin="round" />
            </svg>
          </span>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 15, color: '#EAF2EE', marginBottom: 6 }}>
            لا محادثات سابقة
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, color: '#9CA6BD' }}>
            ابدأ محادثة جديدة مع رفيقك
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/chat?session=${s.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/chat?session=${s.id}`); }}
              style={{
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 18,
                padding: '15px 16px',
                cursor: 'pointer',
                transition: 'border-color 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#5DCDA5', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {MODE_LABELS[s.mode] ?? `💬 ${s.mode}`}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#6B7A8C', flexShrink: 0 }}>
                  {formatDate(s.updatedAt)} · {toEnglishNumerals(s.messageCount)} رسالة
                </div>
              </div>
              {s.firstMessage && (
                <div
                  style={{
                    fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 13.5, color: '#B6BFCF',
                    lineHeight: 1.7,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}
                >
                  {s.firstMessage}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
