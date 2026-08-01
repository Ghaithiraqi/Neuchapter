'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toEnglishNumerals } from '@/lib/utils';

type TabId = 'write' | 'voice';

interface Entry {
  id: number;
  content: string;
  type: string;
  mood: number | null;
  createdAt: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

// ─── Write Tab ────────────────────────────────────────────────────────────────

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
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, type: 'text' }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => {
          setText('');
          setSaved(false);
          onSaved();
        }, 1200);
      } else {
        setError('خطأ في الحفظ');
      }
    } catch {
      setError('تعذّر الاتصال');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '0 0 18px' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
        ماذا يحدث في داخلك، الآن؟
      </p>
      <div
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-input)',
          padding: 16,
        }}
      >
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب بلا قواعد، بلا إصلاح، بلا حذف..."
          rows={4}
          style={{
            width: '100%',
            minHeight: 100,
            maxHeight: 280,
            overflowY: 'auto',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            lineHeight: 1.7,
            resize: 'none',
            outline: 'none',
            display: 'block',
          }}
        />
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error ? (
            <span style={{ fontSize: 12, color: 'var(--alert-warm)', fontFamily: 'var(--font-body)' }}>{error}</span>
          ) : (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)' }}>
              {toEnglishNumerals(text.length)} حرف
            </span>
          )}
          <button
            onClick={save}
            disabled={text.length < 10 || saving}
            style={{
              padding: '9px 24px',
              background: saved ? 'rgba(107,168,140,0.3)' : text.length < 10 ? 'var(--gold-faint)' : 'var(--gold-primary)',
              border: text.length < 10 ? '1px solid var(--border-mid)' : 'none',
              borderRadius: 'var(--radius-button)',
              color: saved ? 'var(--accent-emerald)' : text.length < 10 ? 'var(--text-muted)' : 'var(--bg-deep)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 700,
              cursor: text.length < 10 || saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
            }}
          >
            {saved ? 'تم الحفظ ✓' : saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Voice Tab ────────────────────────────────────────────────────────────────

function VoiceSection({ onSaved }: { onSaved: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'done' | 'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef('audio/webm');

  const saveTranscript = async (text: string) => {
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
      } else {
        setSaveState('error');
      }
    } catch {
      setSaveState('error');
    }
  };

  const startRecording = async () => {
    try {
      setTranscript('');
      setSaveState('idle');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      mimeRef.current = mime;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setStatus('processing');
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        const ext = mimeRef.current.includes('mp4') ? 'mp4' : 'webm';
        const fd = new FormData();
        fd.append('audio', blob, `rec.${ext}`);
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
          const { text } = await res.json();
          setTranscript(text ?? '');
          setStatus('done');
          if (text) await saveTranscript(text);
        } catch {
          setStatus('error');
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setStatus('recording');
    } catch {
      setStatus('error');
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setIsRecording(false);
  };

  const STATUS_TEXT = { idle: 'اضغط للبدء', recording: 'يستمع إليك...', processing: 'جاري التفريغ...', done: 'تم التفريغ', error: 'حدث خطأ' };
  const STATUS_HINT = { idle: 'حديثك يُحوَّل لنص', recording: 'اضغط للإيقاف', processing: 'لحظة...', done: 'تم الحفظ تلقائياً', error: 'حاول مجدداً' };

  return (
    <div style={{ padding: '0 0 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
        تكلّم بصوتك. سيُحوَّل لنص ويُحفظ تلقائياً.
      </p>
      <button
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          width: 88, height: 88, borderRadius: '50%',
          background: isRecording ? 'rgba(216,90,48,0.12)' : 'var(--gold-faint)',
          border: `2px solid ${isRecording ? 'var(--alert-warm)' : 'var(--gold-primary)'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'all 0.3s',
          animation: isRecording ? 'gentlePulse 2s ease-in-out infinite' : 'none',
        }}
      >
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" strokeWidth="2"
          stroke={isRecording ? 'var(--alert-warm)' : 'var(--gold-primary)'}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      </button>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{STATUS_TEXT[status]}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)' }}>{STATUS_HINT[status]}</div>
      </div>
      {transcript && (
        <div
          style={{
            width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-small)', padding: '12px 14px',
            fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7,
          }}
        >
          {transcript}
          <div style={{ marginTop: 8, fontSize: 12, color: saveState === 'saved' ? 'var(--accent-emerald)' : saveState === 'error' ? 'var(--alert-warm)' : 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            {saveState === 'saved' ? 'تم الحفظ ✓' : saveState === 'saving' ? 'جاري الحفظ...' : saveState === 'error' ? 'فشل الحفظ' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EntryPage() {
  const [tab, setTab] = useState<TabId>('write');
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
    <div style={{ padding: '0 20px' }}>
      {/* Header */}
      <div style={{ margin: '20px 0 18px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 4 }}>
          سجّل لحظتك
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
          كل ما تكتبه يُحفظ في مساحتك الخاصة
        </p>
      </div>

      {/* Card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-card)', padding: '18px 18px 0', marginBottom: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        {/* Tab switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'rgba(0,0,0,0.2)', borderRadius: 50, padding: 4, marginBottom: 20 }}>
          {([
            { id: 'write' as TabId, label: '✏️ كتابة' },
            { id: 'voice' as TabId, label: '🎙️ صوت' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '9px', background: tab === t.id ? 'var(--gold-primary)' : 'transparent',
                border: 'none', borderRadius: 50,
                fontFamily: 'var(--font-body)', fontSize: 13,
                color: tab === t.id ? 'var(--bg-deep)' : 'var(--text-secondary)',
                cursor: 'pointer', fontWeight: tab === t.id ? 700 : 400,
                transition: 'all 0.2s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'write' && <WriteSection onSaved={loadEntries} />}
        {tab === 'voice' && <VoiceSection onSaved={loadEntries} />}
      </div>

      {/* قائمة المذكرات */}
      {entries.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-card)', padding: '18px 18px', marginBottom: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text-primary)', fontWeight: 700 }}>
              آخر المذكرات
            </div>
            <button
              onClick={() => router.push('/journal')}
              style={{ background: 'transparent', border: '1px solid var(--border-mid)', borderRadius: 50, padding: '5px 14px', color: 'var(--gold-primary)', fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer' }}
            >
              عرض الكل
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((e) => (
              <div
                key={e.id}
                onClick={() => router.push(`/journal/${e.id}`)}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)',
                  borderRadius: 16, padding: '12px 14px', cursor: 'pointer',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}
              >
                <div style={{ fontSize: 16, flexShrink: 0 }}>{e.type === 'voice' ? '🎙️' : '✏️'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {e.content.slice(0, 80)}{e.content.length > 80 ? '...' : ''}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {formatDate(e.createdAt)}
                    {e.mood != null && ` · مزاج ${e.mood}/7`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
