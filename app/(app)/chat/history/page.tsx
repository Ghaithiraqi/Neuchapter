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
    <div style={{ padding: '0 20px' }}>
      {/* Header */}
      <div style={{ margin: '20px 0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 4 }}>
            محادثاتي
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
            {sessions.length > 0 ? `${sessions.length} محادثة سابقة` : 'لا توجد محادثات سابقة'}
          </p>
        </div>
        <button
          onClick={() => router.push('/chat')}
          style={{ padding: '9px 18px', background: 'var(--gold-primary)', border: 'none', borderRadius: 50, color: 'var(--bg-deep)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          ＋ جديدة
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
          جاري التحميل...
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>
            لا محادثات سابقة
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
            ابدأ محادثة جديدة مع كلود
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/chat?session=${s.id}`)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-small)',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--gold-primary)', fontWeight: 600 }}>
                  {MODE_LABELS[s.mode] ?? `💬 ${s.mode}`}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatDate(s.updatedAt)} · {s.messageCount} رسالة
                </div>
              </div>
              {s.firstMessage && (
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
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
