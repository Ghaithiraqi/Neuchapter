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
      {/* الهيدر */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'var(--gold-faint)',
            border: '1px solid var(--border-mid)',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 16,
            flexShrink: 0,
            transition: 'all 0.3s ease',
          }}
        >
          ←
        </button>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          color: 'var(--text-primary)',
          fontWeight: 700,
          margin: 0,
        }}>
          مذكراتي
        </h1>
      </div>

      {/* شريط البحث — pill shape */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <svg
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="var(--text-muted)"
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في مذكراتك..."
          style={{
            width: '100%',
            padding: '12px 44px 12px 18px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-button)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.3s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((entry) => (
          <div
            key={entry.id}
            onClick={() => router.push(`/journal/${entry.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/journal/${entry.id}`); }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-soft)',
              borderRadius: 20,
              padding: '16px 18px',
              cursor: 'pointer',
              transition: 'border-color 0.3s ease',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--gold-faint)',
                  border: '1px solid var(--border-mid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {entry.type === 'voice' ? (
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--gold-primary)">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--gold-primary)">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                )}
              </div>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}>
                {formatArabicDate(entry.createdAt)}
              </span>
            </div>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
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
              <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
                {entry.mood !== null && (
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    padding: '3px 10px',
                    background: 'var(--gold-faint)',
                    borderRadius: 'var(--radius-button)',
                    border: '1px solid var(--border-soft)',
                  }}>
                    مزاج {entry.mood}/10
                  </span>
                )}
                {entry.energy !== null && (
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    padding: '3px 10px',
                    background: 'var(--gold-faint)',
                    borderRadius: 'var(--radius-button)',
                    border: '1px solid var(--border-soft)',
                  }}>
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
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-body)',
          marginTop: 40,
          fontSize: 14,
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
            background: 'transparent',
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-button)',
            color: 'var(--gold-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          {loading ? '...' : 'تحميل المزيد'}
        </button>
      )}
    </div>
  );
}
