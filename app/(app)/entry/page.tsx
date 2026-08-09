'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder';
import { toEnglishNumerals } from '@/lib/utils';

type TabId = 'voice' | 'write';

interface Entry {
  id: number;
  content: string;
  type: string;
  mood: number | null;
  createdAt: string;
}

function formatDay(dateStr: string) {
  return toEnglishNumerals(new Date(dateStr).toLocaleDateString('ar-SA', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }));
}

// ─── Live recording timer ─────────────────────────────────────────────────────

function useTimer(active: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) { setSecs(0); return; }
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// ─── Waveform — 7 staggered bars, visible only while recording ────────────────

function Waveform() {
  const delays = ['0s', '.15s', '.3s', '.45s', '.6s', '.75s', '.9s'];
  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 5, height: 44 }}>
      {delays.map((d, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: 44,
            borderRadius: 2,
            background: 'linear-gradient(#5DCDA5, #259696)',
            transform: 'scaleY(.3)',
            animation: `ncVWave 1.1s ease-in-out ${d} infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Voice Section ────────────────────────────────────────────────────────────

function VoiceSection({ onSaved }: { onSaved: () => void }) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleTranscript = useCallback(async (text: string) => {
    setSaveState('saving');
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, type: 'voice' }),
      });
      if (res.ok) {
        setSaveState('saved');
        onSaved();
        setTimeout(() => setSaveState('idle'), 3000);
      } else {
        setSaveState('error');
      }
    } catch {
      setSaveState('error');
    }
  }, [onSaved]);

  const { status, toggle, errorMessage, reset } = useVoiceRecorder({ onTranscript: handleTranscript });
  const timer = useTimer(status === 'recording');

  const isRecording  = status === 'recording';
  const isProcessing = status === 'processing';
  const isBusy       = isProcessing || saveState === 'saving';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
        padding: '32px 34px 0',
      }}
    >
      {/* Waveform slot — 44 px reserved so layout doesn't jump */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isRecording && <Waveform />}
      </div>

      {/* ── Record button ── */}
      {isBusy ? (
        /* Processing / saving */
        <div
          style={{
            width: 132, height: 132, borderRadius: '50%',
            background: 'rgba(93,205,165,.06)',
            border: '2px solid rgba(93,205,165,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#5DCDA5',
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
            style={{ animation: 'spin 1.2s linear infinite' }}>
            <path d="M12 3a9 9 0 109 9" strokeLinecap="round" />
          </svg>
        </div>
      ) : saveState === 'saved' ? (
        /* Saved confirmation */
        <div
          style={{
            width: 132, height: 132, borderRadius: '50%',
            background: 'rgba(93,205,165,.08)',
            border: '2px solid rgba(93,205,165,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#5DCDA5',
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : isRecording ? (
        /* Recording — stop button */
        <button
          onClick={toggle}
          aria-label="إيقاف التسجيل"
          style={{
            width: 132, height: 132, borderRadius: '50%',
            background: 'linear-gradient(140deg, rgba(93,205,165,.22), rgba(37,150,150,.22))',
            border: '2px solid #5DCDA5',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'ncMicPulse 2.6s ease-out infinite',
          }}
        >
          <span
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#5DCDA5',
              boxShadow: '0 0 18px rgba(93,205,165,.6)',
              display: 'block',
            }}
          />
        </button>
      ) : (
        /* Idle — mic button */
        <button
          onClick={toggle}
          aria-label="ابدأ التسجيل"
          style={{
            width: 132, height: 132, borderRadius: '50%',
            background: 'rgba(93,205,165,.08)',
            border: '2px solid rgba(93,205,165,.55)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#5DCDA5',
            boxShadow: '0 0 40px rgba(93,205,165,.12)',
            animation: 'ncFloat 8s ease-in-out infinite',
            transition: 'all .7s ease',
          }}
        >
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="9" y="2.5" width="6" height="12" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21.5M8.5 21.5h7" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* ── Status text — fixed 52 px so layout never shifts ── */}
      <div style={{ textAlign: 'center', height: 52 }}>
        {isRecording ? (
          <>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 26, color: '#5DCDA5', letterSpacing: 1, direction: 'ltr' }}>
              {timer}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, color: '#9CA6BD', marginTop: 2 }}>
              أنا أنصت… اضغط حين تنتهي لأحتفظ بها
            </div>
          </>
        ) : isBusy ? (
          <>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 17, color: '#EAF2EE', marginBottom: 4 }}>
              {isProcessing ? 'جاري التفريغ…' : 'جاري الحفظ…'}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, color: '#808AA0' }}>لحظة من فضلك</div>
          </>
        ) : saveState === 'saved' ? (
          <>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 17, color: '#5DCDA5', marginBottom: 4 }}>تم الحفظ ✓</div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, color: '#808AA0' }}>مذكرتك محفوظة بهدوء</div>
          </>
        ) : status === 'error' ? (
          <>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14, color: '#E08A6E', marginBottom: 4 }}>
              {errorMessage ?? 'حدث خطأ'}
            </div>
            <button onClick={reset} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: '#9CA6BD', cursor: 'pointer' }}>
              حاول مرة أخرى
            </button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 17, color: '#EAF2EE', marginBottom: 4 }}>
              متى ما كنت مستعدًا، ابدأ
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, color: '#808AA0' }}>
              خذ وقتك — حتى 5 دقائق
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Write Section ────────────────────────────────────────────────────────────

function WriteSection({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [text]);

  const save = async () => {
    if (text.length < 10 || saving) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, type: 'text' }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => { setText(''); setSaved(false); onSaved(); }, 1200);
      } else { setError('خطأ في الحفظ'); }
    } catch { setError('تعذّر الاتصال'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '24px 0 0' }}>
      <div
        style={{
          background: 'rgba(255,255,255,.025)',
          border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 20,
          padding: 18,
        }}
      >
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب بلا قواعد، بلا إصلاح، بلا حذف…"
          rows={5}
          style={{
            width: '100%',
            minHeight: 120,
            maxHeight: 300,
            overflowY: 'auto',
            background: 'transparent',
            border: 'none',
            color: '#EAF2EE',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            lineHeight: 1.8,
            resize: 'none',
            outline: 'none',
            display: 'block',
          }}
        />
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error
            ? <span style={{ fontSize: 13, color: '#E08A6E', fontFamily: 'var(--font-body)' }}>{error}</span>
            : <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#808AA0' }}>{toEnglishNumerals(text.length)} حرف</span>
          }
          <button
            onClick={save}
            disabled={text.length < 10 || saving}
            style={{
              padding: '10px 26px',
              background: saved ? 'rgba(93,205,165,.15)' : text.length < 10 ? 'rgba(255,255,255,.04)' : 'rgba(93,205,165,.12)',
              border: `1px solid ${saved ? 'rgba(93,205,165,.5)' : text.length < 10 ? 'rgba(255,255,255,.08)' : 'rgba(93,205,165,.4)'}`,
              borderRadius: 18,
              color: saved ? '#5DCDA5' : text.length < 10 ? '#808AA0' : '#5DCDA5',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              cursor: text.length < 10 || saving ? 'not-allowed' : 'pointer',
              transition: 'all .5s ease',
              minHeight: 44,
            }}
          >
            {saved ? 'تم الحفظ ✓' : saving ? 'جاري الحفظ…' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  const isVoice = entry.type === 'voice';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '12px 14px',
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 16,
        width: '100%',
        textAlign: 'start',
        cursor: 'pointer',
        transition: 'all .5s ease',
      }}
    >
      {/* Type indicator */}
      <span
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: isVoice ? 'rgba(93,205,165,.12)' : 'rgba(74,60,180,.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isVoice ? '#5DCDA5' : '#8B7EE8',
          flexShrink: 0,
        }}
      >
        {isVoice ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M6 11a6 6 0 0012 0M12 17v4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      {/* Content preview + date */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14.5, color: '#D2DAE6',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {entry.content.slice(0, 60) || '—'}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#808AA0', marginTop: 2 }}>
          {formatDay(entry.createdAt)}
        </div>
      </div>

      {/* Chevron (flipped for RTL) */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#808AA0" strokeWidth="1.6"
        style={{ transform: 'scaleX(-1)', flexShrink: 0 }}>
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EntryPage() {
  const [tab, setTab] = useState<TabId>('voice');
  const [entries, setEntries] = useState<Entry[]>([]);
  const router = useRouter();

  const loadEntries = useCallback(() => {
    fetch('/api/journal?limit=10')
      .then((r) => r.json())
      .then((d) => { if (d.entries) setEntries(d.entries); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  return (
    <div style={{ padding: '0 24px' }}>
      {/* Header */}
      <div style={{ padding: '20px 0 0' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20, color: '#EAF2EE' }}>
          مذكرة صوتية
        </h1>
        <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, color: '#9CA6BD' }}>
          تحدّث بصوتك، وسأحتفظ بها لك بهدوء
        </p>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
          background: 'rgba(0,0,0,.25)', borderRadius: 50, padding: 4, margin: '20px 0 0',
        }}
      >
        {([
          { id: 'voice' as TabId, label: 'صوت' },
          { id: 'write' as TabId, label: 'كتابة' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px',
              background: tab === t.id ? 'rgba(93,205,165,.14)' : 'transparent',
              border: `1px solid ${tab === t.id ? 'rgba(93,205,165,.35)' : 'transparent'}`,
              borderRadius: 50,
              fontFamily: 'var(--font-body)', fontSize: 14,
              color: tab === t.id ? '#5DCDA5' : '#808AA0',
              cursor: 'pointer',
              fontWeight: tab === t.id ? 600 : 400,
              transition: 'all .4s ease',
              minHeight: 44,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'voice' && <VoiceSection onSaved={loadEntries} />}
      {tab === 'write' && <WriteSection onSaved={loadEntries} />}

      {/* Previous entries */}
      <div style={{ padding: '36px 0 0' }}>
        <div style={{
          fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13.5,
          color: '#A3ADC2', marginBottom: 12, letterSpacing: .5,
        }}>
          مذكراتك السابقة
        </div>

        {entries.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            padding: '22px 20px',
            background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 20,
          }}>
            <span style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'rgba(93,205,165,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#5DCDA5', marginBottom: 14,
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M6 11a6 6 0 0012 0M12 17v4" strokeLinecap="round" />
              </svg>
            </span>
            <p style={{
              margin: 0, fontFamily: 'var(--font-body)', fontWeight: 400,
              fontSize: 14.5, lineHeight: 1.85, color: '#B6BFCF', maxWidth: 240,
            }}>
              رحلتك تبدأ الآن — أول مذكرة بانتظارك حين تكون مستعدًا.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {entries.map((e) => (
              <EntryCard key={e.id} entry={e} onClick={() => router.push(`/journal/${e.id}`)} />
            ))}
            {entries.length >= 10 && (
              <button
                onClick={() => router.push('/journal')}
                style={{
                  marginTop: 4, width: '100%', padding: '12px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,.06)',
                  borderRadius: 16, fontFamily: 'var(--font-body)', fontSize: 13,
                  color: '#808AA0', cursor: 'pointer', textAlign: 'center',
                }}
              >
                عرض الكل في السجل
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
