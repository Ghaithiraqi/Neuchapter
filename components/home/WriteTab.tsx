'use client';

import { useState, useRef, useEffect } from 'react';
import { toArabicNumerals } from '@/lib/utils';

export function WriteTab() {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [text]);

  const handleSave = async () => {
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
        }, 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(res.status === 401 ? 'انتهت الجلسة، أعد الدخول' : (data.error ?? 'خطأ في الحفظ'));
      }
    } catch {
      setError('تعذّر الاتصال بالسيرفر');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--night-deepest)',
        border: '1px solid var(--border-soft)',
        borderRadius: 14,
        padding: 18,
      }}
    >
      <p
        style={{
          fontFamily: "'Amiri', serif",
          fontSize: 16,
          color: 'var(--ink-secondary)',
          fontStyle: 'italic',
          lineHeight: 1.6,
          marginBottom: 14,
        }}
      >
        ماذا يحدث في داخلك، الآن؟
      </p>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اكتب بلا قواعد، بلا إصلاح، بلا حذف..."
        rows={1}
        style={{
          width: '100%',
          minHeight: 88,
          maxHeight: 300,
          overflowY: 'auto',
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-primary)',
          fontFamily: "'Tajawal', sans-serif",
          fontSize: 14,
          lineHeight: 1.7,
          resize: 'none',
          outline: 'none',
          fontWeight: 300,
          display: 'block',
        }}
      />

      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: '1px dashed var(--border-soft)',
        }}
      >
        {error && (
          <div style={{
            fontSize: 12,
            color: '#e57373',
            fontFamily: "'Tajawal', sans-serif",
            marginBottom: 10,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--ink-muted)',
              letterSpacing: 0.5,
            }}
          >
            {toArabicNumerals(text.length)} · حرف
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            aria-label="حفظ المذكرة"
            style={{
              padding: '8px 20px',
              background: saved
                ? 'var(--clinical-green)'
                : text.length < 10
                  ? 'rgba(107,149,201,0.15)'
                  : 'var(--therapy-blue)',
              border: saved
                ? 'none'
                : text.length < 10
                  ? '1px solid rgba(107,149,201,0.3)'
                  : 'none',
              borderRadius: 8,
              color: text.length < 10 ? 'var(--therapy-blue-soft)' : '#0a0f1a',
              fontFamily: "'Tajawal', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: text.length < 10 || saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saved ? 'تم الحفظ ✓' : saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}
