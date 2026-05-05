'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

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
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-muted)', fontFamily: "'Tajawal', sans-serif" }}>
        ...
      </div>
    );
  }

  if (!entry) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-muted)', fontFamily: "'Tajawal', sans-serif" }}>
        لم تُوجد المذكرة
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: 600, margin: '0 auto' }}>
      <button
        onClick={() => router.back()}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--therapy-blue)',
          cursor: 'pointer',
          fontSize: 20,
          marginBottom: 20,
          lineHeight: 1,
        }}
      >
        ←
      </button>

      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-mid)',
        borderRadius: 20,
        padding: '24px 22px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>{entry.type === 'voice' ? '🎙️' : '✏️'}</span>
          <span style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 12,
            color: 'var(--ink-muted)',
          }}>
            {formatArabicDate(entry.createdAt)}
          </span>
        </div>

        <p style={{
          fontFamily: "'Tajawal', sans-serif",
          fontSize: 15,
          color: 'var(--ink-primary)',
          lineHeight: 1.9,
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}>
          {entry.content}
        </p>

        {(entry.mood !== null || entry.energy !== null) && (
          <div style={{
            marginTop: 20,
            paddingTop: 14,
            borderTop: '1px dashed var(--border-soft)',
            display: 'flex',
            gap: 16,
          }}>
            {entry.mood !== null && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: "'Tajawal', sans-serif", marginBottom: 2 }}>المزاج</div>
                <div style={{ fontSize: 18, color: 'var(--therapy-blue-bright)', fontFamily: "'Amiri', serif" }}>{entry.mood}/10</div>
              </div>
            )}
            {entry.energy !== null && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: "'Tajawal', sans-serif", marginBottom: 2 }}>الطاقة</div>
                <div style={{ fontSize: 18, color: 'var(--therapy-blue-bright)', fontFamily: "'Amiri', serif" }}>{entry.energy}/10</div>
              </div>
            )}
          </div>
        )}

        <div style={{
          marginTop: 16,
          fontSize: 11,
          color: 'var(--ink-faint)',
          fontFamily: "'Tajawal', sans-serif",
        }}>
          {entry.wordCount} كلمة
        </div>
      </div>
    </div>
  );
}
