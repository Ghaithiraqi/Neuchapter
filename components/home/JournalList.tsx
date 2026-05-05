'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Entry {
  id: number;
  content: string;
  type: string;
  mood: number | null;
  energy: number | null;
  createdAt: string;
}

function formatArabicDateShort(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', weekday: 'short' });
}

export function JournalList() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/journal?limit=5')
      .then((r) => r.json())
      .then((d) => { if (d.entries) setEntries(d.entries); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-card)',
        padding: '20px 20px',
        marginBottom: 18,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 19,
            color: 'var(--text-primary)',
            fontWeight: 700,
          }}
        >
          مذكراتي
        </div>
        <button
          onClick={() => router.push('/journal')}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-button)',
            padding: '5px 14px',
            color: 'var(--gold-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          عرض كل المذكرات
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            onClick={() => router.push(`/journal/${entry.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/journal/${entry.id}`); }}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-soft)',
              borderRadius: 20,
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'border-color 0.3s ease',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            {/* أيقونة النوع */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--gold-faint)',
                border: '1px solid var(--border-mid)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {entry.type === 'voice' ? (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--gold-primary)">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              ) : (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--gold-primary)">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  marginBottom: 6,
                }}
              >
                {entry.content.slice(0, 100)}{entry.content.length > 100 ? '...' : ''}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                }}>
                  {formatArabicDateShort(entry.createdAt)}
                </span>
                {entry.mood !== null && (
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                  }}>
                    المزاج {entry.mood}/10
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
