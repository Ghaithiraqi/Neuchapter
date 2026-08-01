'use client';

import { useState, useRef, useCallback } from 'react';

export function VoiceTab() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'done' | 'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');

  const saveTranscript = async (text: string) => {
    setSaveState('saving');
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, type: 'voice' }),
      });
      setSaveState(res.ok ? 'saved' : 'error');
    } catch {
      setSaveState('error');
    }
  };

  const startRecording = async () => {
    try {
      setTranscript('');
      setSaveState('idle');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      mimeTypeRef.current = mimeType || 'audio/webm';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setStatus('processing');
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const ext = mimeTypeRef.current.includes('mp4') ? 'mp4' : 'webm';
        const formData = new FormData();
        formData.append('audio', blob, `recording.${ext}`);

        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          const { text } = await res.json();
          setTranscript(text ?? '');
          setStatus('done');
          if (text) await saveTranscript(text);
        } catch {
          setStatus('error');
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setStatus('recording');
    } catch {
      setStatus('error');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const toggle = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const statusText = {
    idle: 'اضغط للبدء',
    recording: 'يستمع إليك...',
    processing: 'جاري التفريغ...',
    done: 'تم التفريغ',
    error: 'حدث خطأ',
  }[status];

  const statusHint = {
    idle: 'مدّة قصوى 5 دقائق',
    recording: 'اضغط للإيقاف',
    processing: 'لحظة...',
    done: 'تم الحفظ تلقائياً',
    error: 'حاول مجدداً',
  }[status];

  return (
    <div
      style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-input)',
        padding: '24px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-secondary)',
          textAlign: 'center',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        تكلّم بصوتك. سيُحوَّل لنص ويُحلَّل لاحقاً.
      </p>

      <button
        onClick={toggle}
        aria-label={isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: isRecording ? 'rgba(216, 90, 48, 0.12)' : 'var(--gold-faint)',
          border: `2px solid ${isRecording ? 'var(--alert-warm)' : 'var(--gold-primary)'}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.3s ease',
          boxShadow: isRecording
            ? '0 0 20px rgba(216, 90, 48, 0.2)'
            : '0 0 20px rgba(232, 184, 114, 0.15)',
        }}
      >
        {isRecording && (
          <div
            style={{
              position: 'absolute',
              inset: -5,
              borderRadius: '50%',
              border: '1px solid var(--alert-warm)',
              opacity: 0.3,
              animation: 'ringPulse 2s ease-out infinite',
            }}
          />
        )}
        <svg
          width="32"
          height="32"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke={isRecording ? 'var(--alert-warm)' : 'var(--gold-primary)'}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      </button>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-primary)',
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          {statusText}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          {statusHint}
        </div>
      </div>

      {/* موجة الصوت */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          height: 22,
          opacity: isRecording ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      >
        {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((delay, i) => (
          <div
            key={i}
            style={{
              width: 2,
              background: 'var(--gold-primary)',
              borderRadius: 1,
              animation: `wave 1s ease-in-out ${delay}s infinite`,
              height: [8, 14, 20, 12, 16, 10, 18][i],
            }}
          />
        ))}
      </div>

      {transcript && (
        <div style={{ width: '100%' }}>
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-small)',
              padding: '12px 14px',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-primary)',
              lineHeight: 1.7,
              marginBottom: 10,
            }}
          >
            {transcript}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              color: saveState === 'saved' ? 'var(--accent-emerald)'
                : saveState === 'error' ? 'var(--alert-warm)'
                : 'var(--text-muted)',
            }}>
              {saveState === 'saved' ? 'تم الحفظ ✓'
                : saveState === 'saving' ? 'جاري الحفظ...'
                : saveState === 'error' ? 'فشل الحفظ'
                : ''}
            </span>

            {saveState === 'error' && (
              <button
                onClick={() => saveTranscript(transcript)}
                style={{
                  padding: '7px 20px',
                  background: 'var(--gold-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-button)',
                  color: 'var(--bg-deep)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                إعادة الحفظ
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
