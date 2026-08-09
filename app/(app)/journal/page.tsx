'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toEnglishNumerals } from '@/lib/utils';

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
  return toEnglishNumerals(new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }));
}

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.07)',
  borderRadius: 20,
};

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

function EntryTypeIcon({ isVoice }: { isVoice: boolean }) {
  return (
    <span
      style={{
        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
        background: isVoice ? 'rgba(93,205,165,.14)' : 'rgba(74,60,180,.14)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isVoice ? '#5DCDA5' : '#8B7EE8',
      }}
    >
      {isVoice ? (
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M6 11a6 6 0 0012 0M12 17v4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
          <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-body)', fontSize: 11, color: '#8FD8C0',
        padding: '3px 11px', background: 'rgba(93,205,165,.08)',
        border: '1px solid rgba(93,205,165,.2)', borderRadius: 20,
      }}
    >
      {label} {toEnglishNumerals(value)}/10
    </span>
  );
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
    <div style={{ padding: '20px 20px 8px', direction: 'rtl' }}>
      {/* الهيدر */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <BackButton onClick={() => router.back()} />
        <h1 style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 19, color: '#EAF2EE' }}>
          مذكراتي
        </h1>
      </div>

      {/* شريط البحث */}
      <div style={{ position: 'relative', marginBottom: 18 }}>
        <svg
          width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="#6B7A8C"
          style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في مذكراتك..."
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 44px 12px 18px',
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)',
            borderRadius: 50, color: '#EAF2EE',
            fontFamily: 'var(--font-body)', fontSize: 13.5, outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((entry) => (
          <div
            key={entry.id}
            onClick={() => router.push(`/journal/${entry.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/journal/${entry.id}`); }}
            style={{ ...CARD, padding: '16px 17px', cursor: 'pointer', transition: 'border-color 0.3s ease' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
              <EntryTypeIcon isVoice={entry.type === 'voice'} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#6B7A8C' }}>
                {formatArabicDate(entry.createdAt)}
              </span>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14, color: '#B6BFCF',
                lineHeight: 1.75, margin: 0,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
              }}
            >
              {entry.content}
            </p>
            {(entry.mood !== null || entry.energy !== null) && (
              <div style={{ marginTop: 11, display: 'flex', gap: 8 }}>
                {entry.mood !== null && <StatPill label="مزاج" value={entry.mood} />}
                {entry.energy !== null && <StatPill label="طاقة" value={entry.energy} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '34px 22px' }}>
          <span style={{ width: 50, height: 50, borderRadius: 15, background: 'rgba(93,205,165,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5DCDA5', marginBottom: 14 }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
              <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: '#B6BFCF', lineHeight: 1.8 }}>
            {search ? 'لا نتائج مطابقة' : 'لا توجد مذكرات بعد'}
          </div>
        </div>
      )}

      {hasMore && !search && filtered.length > 0 && (
        <button
          onClick={() => fetchEntries()}
          disabled={loading}
          style={{
            width: '100%', marginTop: 14, minHeight: 44,
            padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 50, color: '#5DCDA5',
            fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer', transition: 'all 0.3s ease',
          }}
        >
          {loading ? '...' : 'تحميل المزيد'}
        </button>
      )}
    </div>
  );
}
