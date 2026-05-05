'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Entry {
  id: number;
  content: string;
  type: string;
  mood: number | null;
  energy: number | null;
  wordCount: number;
  createdAt: string;
}

function formatArabicDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const PAGE_SIZE = 20;

  const fetchEntries = async (reset = false) => {
    setLoading(true);
    const offset = reset ? 0 : page * PAGE_SIZE;
    try {
      const r = await fetch(`/api/journal?limit=${PAGE_SIZE}&offset=${offset}`);
      const d = await r.json();
      if (d.entries) {
        setEntries((prev) => reset ? d.entries : [...prev, ...d.entries]);
        setHasMore(d.entries.length === PAGE_SIZE);
        if (!reset) setPage((p) => p + 1);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchEntries(true); }, []);

  const filtered = entries.filter((e) =>
    search ? e.content.includes(search) : true
  );

  return (
    <div style={{ padding: '20px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--therapy-blue)',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <h1 style={{
          fontFamily: "'Noto Naskh Arabic', serif",
          fontSize: 22,
          color: 'var(--ink-primary)',
          fontWeight: 700,
          margin: 0,
        }}>
          مذكراتي
        </h1>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث في مذكراتك..."
        style={{
          width: '100%',
          padding: '10px 14px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-soft)',
          borderRadius: 10,
          color: 'var(--ink-primary)',
          fontFamily: "'Tajawal', sans-serif",
          fontSize: 13,
          outline: 'none',
          marginBottom: 16,
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((entry) => (
          <div
            key={entry.id}
            onClick={() => router.push(`/journal/${entry.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/journal/${entry.id}`); }}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-mid)',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{entry.type === 'voice' ? '🎙️' : '✏️'}</span>
              <span style={{
                fontFamily: "'Tajawal', sans-serif",
                fontSize: 11,
                color: 'var(--ink-muted)',
              }}>
                {formatArabicDate(entry.createdAt)}
              </span>
            </div>
            <p style={{
              fontFamily: "'Tajawal', sans-serif",
              fontSize: 14,
              color: 'var(--ink-secondary)',
              lineHeight: 1.7,
              margin: 0,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            }}>
              {entry.content}
            </p>
            {(entry.mood !== null || entry.energy !== null) && (
              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                {entry.mood !== null && (
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                    مزاج {entry.mood}/10
                  </span>
                )}
                {entry.energy !== null && (
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                    طاقة {entry.energy}/10
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <p style={{
          textAlign: 'center',
          color: 'var(--ink-muted)',
          fontFamily: "'Tajawal', sans-serif",
          marginTop: 40,
        }}>
          لا توجد مذكرات بعد
        </p>
      )}

      {hasMore && !search && (
        <button
          onClick={() => fetchEntries()}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '12px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-soft)',
            borderRadius: 10,
            color: 'var(--therapy-blue)',
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {loading ? '...' : 'تحميل المزيد'}
        </button>
      )}
    </div>
  );
}
