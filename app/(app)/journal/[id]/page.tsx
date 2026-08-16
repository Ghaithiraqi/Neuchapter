'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long', hour: '2-digit', minute: '2-digit',
  }));
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
        cursor: 'pointer', color: '#9CA6BD', marginBottom: 20,
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
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', padding: '60px 0' }}>
      {[0, 0.15, 0.3].map((d, i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#5DCDA5', animation: `blink 1.2s ease-in-out ${d}s infinite` }} />
      ))}
    </div>
  );
}

export default function JournalEntryPage() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    fetch(`/api/journal/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.entry) setEntry(d.entry); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '20px 20px 8px', direction: 'rtl' }}>
        <BackButton onClick={() => router.back()} />
        <LoadingDots />
      </div>
    );
  }

  if (!entry) {
    return (
      <div style={{ padding: '20px 20px 8px', direction: 'rtl' }}>
        <BackButton onClick={() => router.back()} />
        <div style={{ textAlign: 'center', color: '#6B7A8C', fontFamily: 'var(--font-body)', fontSize: 14, marginTop: 40 }}>
          لم تُوجد المذكرة
        </div>
      </div>
    );
  }

  const isVoice = entry.type === 'voice';

  return (
    <div style={{ padding: '20px 20px 8px', direction: 'rtl' }}>
      <BackButton onClick={() => router.back()} />

      <div
        style={{
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 22,
          padding: '22px 20px',
        }}
      >
        {/* رأس المذكرة */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: isVoice ? 'rgba(93,205,165,.14)' : 'rgba(74,60,180,.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isVoice ? '#5DCDA5' : '#8B7EE8',
            }}
          >
            {isVoice ? (
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M6 11a6 6 0 0012 0M12 17v4" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#8A93A6' }}>
            {formatArabicDate(entry.createdAt)}
          </span>
        </div>

        {/* المحتوى */}
        <p
          style={{
            fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 15, color: '#EAF2EE',
            lineHeight: 1.9, margin: 0, whiteSpace: 'pre-wrap',
          }}
        >
          {entry.content}
        </p>

        {/* المزاج والطاقة */}
        {(entry.mood !== null || entry.energy !== null) && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 10 }}>
            {entry.mood !== null && (
              <div style={{ padding: '10px 18px', background: 'rgba(93,205,165,.08)', border: '1px solid rgba(93,205,165,.22)', borderRadius: 16 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#8A93A6', marginBottom: 3 }}>المزاج</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, color: '#5DCDA5', fontWeight: 700 }}>
                  {toEnglishNumerals(entry.mood)}/7
                </div>
              </div>
            )}
            {entry.energy !== null && (
              <div style={{ padding: '10px 18px', background: 'rgba(55,110,200,.08)', border: '1px solid rgba(55,110,200,.22)', borderRadius: 16 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#8A93A6', marginBottom: 3 }}>الطاقة</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 20, color: '#6E9BE8', fontWeight: 700 }}>
                  {toEnglishNumerals(entry.energy)}/10
                </div>
              </div>
            )}
          </div>
        )}

        {/* عدد الكلمات */}
        <div style={{ marginTop: 16, fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#6B7A8C' }}>
          {toEnglishNumerals(entry.wordCount)} كلمة
        </div>
      </div>
    </div>
  );
}
