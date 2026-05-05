'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toArabicNumerals } from '@/lib/utils';

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
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long', hour: '2-digit', minute: '2-digit',
  });
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
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: 60 }}>
        ...
      </div>
    );
  }

  if (!entry) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginTop: 60 }}>
        لم تُوجد المذكرة
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: 600, margin: '0 auto' }}>
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
          marginBottom: 20,
          transition: 'all 0.3s ease',
        }}
      >
        ←
      </button>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-card)',
        padding: '24px 22px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        {/* رأس المذكرة */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--gold-faint)',
              border: '1px solid var(--border-mid)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {entry.type === 'voice' ? (
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--gold-primary)">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="var(--gold-primary)">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            )}
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            {formatArabicDate(entry.createdAt)}
          </span>
        </div>

        {/* المحتوى */}
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--text-primary)',
          lineHeight: 1.9,
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}>
          {entry.content}
        </p>

        {/* المزاج والطاقة */}
        {(entry.mood !== null || entry.energy !== null) && (
          <div style={{
            marginTop: 20,
            paddingTop: 14,
            borderTop: '1px solid var(--border-soft)',
            display: 'flex',
            gap: 12,
          }}>
            {entry.mood !== null && (
              <div
                style={{
                  padding: '8px 16px',
                  background: 'var(--gold-faint)',
                  border: '1px solid var(--border-mid)',
                  borderRadius: 'var(--radius-button)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>المزاج</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--gold-primary)', fontWeight: 700 }}>
                  {toArabicNumerals(entry.mood)}/١٠
                </div>
              </div>
            )}
            {entry.energy !== null && (
              <div
                style={{
                  padding: '8px 16px',
                  background: 'var(--gold-faint)',
                  border: '1px solid var(--border-mid)',
                  borderRadius: 'var(--radius-button)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>الطاقة</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--gold-primary)', fontWeight: 700 }}>
                  {toArabicNumerals(entry.energy)}/١٠
                </div>
              </div>
            )}
          </div>
        )}

        {/* عدد الكلمات */}
        <div style={{
          marginTop: 14,
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          color: 'var(--text-muted)',
        }}>
          {toArabicNumerals(entry.wordCount)} كلمة
        </div>
      </div>
    </div>
  );
}
