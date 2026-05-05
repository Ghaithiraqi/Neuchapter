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
        background: 'var(--card-bg)',
        border: '1px solid var(--border-mid)',
        borderRadius: 24,
        padding: 22,
        marginBottom: 18,
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
            fontFamily: "'Noto Naskh Arabic', serif",
            fontSize: 17,
            color: 'var(--ink-primary)',
            fontWeight: 700,
          }}
        >
          مذكراتي
        </div>
        <button
          onClick={() => router.push('/journal')}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-soft)',
            borderRadius: 8,
            padding: '5px 12px',
            color: 'var(--therapy-blue)',
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          عرض الكل
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
              background: 'var(--night-deepest)',
              border: '1px solid var(--border-soft)',
              borderRadius: 12,
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
              {entry.type === 'voice' ? '🎙️' : '✏️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Tajawal', sans-serif",
                  fontSize: 13,
                  color: 'var(--ink-secondary)',
                  lineHeight: 1.6,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  marginBottom: 6,
                }}
              >
                {entry.content.slice(0, 120)}{entry.content.length > 120 ? '...' : ''}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{
                  fontFamily: "'Tajawal', sans-serif",
                  fontSize: 11,
                  color: 'var(--ink-muted)',
                }}>
                  {formatArabicDateShort(entry.createdAt)}
                </span>
                {entry.mood !== null && (
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
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
