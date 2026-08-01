'use client';

import { useState, useRef, useEffect } from 'react';
import { toEnglishNumerals } from '@/lib/utils';

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
        background: 'var(--bg-input)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-input)',
        padding: 16,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 12,
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
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          lineHeight: 1.7,
          resize: 'none',
          outline: 'none',
          display: 'block',
        }}
      />

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid var(--border-soft)',
        }}
      >
        {error && (
          <div style={{
            fontSize: 12,
            color: 'var(--alert-warm)',
            fontFamily: 'var(--font-body)',
            marginBottom: 10,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            {toEnglishNumerals(text.length)} حرف
          </span>

          <button
            onClick={handleSave}
            disabled={saving}
            aria-label="حفظ المذكرة"
            style={{
              padding: '9px 24px',
              background: saved
                ? 'rgba(107, 168, 140, 0.3)'
                : text.length < 10
                  ? 'var(--gold-faint)'
                  : 'var(--gold-primary)',
              border: text.length < 10 ? '1px solid var(--border-mid)' : 'none',
              borderRadius: 'var(--radius-button)',
              color: saved
                ? 'var(--accent-emerald)'
                : text.length < 10
                  ? 'var(--text-muted)'
                  : 'var(--bg-deep)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 700,
              cursor: text.length < 10 || saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
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
