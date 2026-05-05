'use client';

import { useState, useRef } from 'react';

export function VoiceTab() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'done' | 'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setStatus('processing');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

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
    idle: '',
    recording: 'اضغط للإيقاف',
    processing: 'لحظة...',
    done: 'تم الحفظ تلقائياً',
    error: 'حاول مجدداً',
  }[status];

  return (
    <div
      style={{
        background: 'var(--night-deepest)',
        border: '1px solid var(--border-soft)',
        borderRadius: 14,
        padding: '28px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
      }}
    >
      <p
        style={{
          fontFamily: "'Amiri', serif",
          fontSize: 15,
          color: 'var(--ink-secondary)',
          fontStyle: 'italic',
          textAlign: 'center',
          lineHeight: 1.6,
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
          background: isRecording ? 'rgba(201, 152, 120, 0.15)' : 'var(--card-bg-elevated)',
          border: `2px solid ${isRecording ? 'var(--alert-warm)' : 'var(--therapy-blue)'}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.3s',
        }}
      >
        {isRecording && (
          <div
            style={{
              position: 'absolute',
              inset: -5,
              borderRadius: '50%',
              border: '1px solid var(--alert-soft)',
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
          stroke={isRecording ? 'var(--alert-warm)' : 'var(--therapy-blue)'}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      </button>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Noto Naskh Arabic', serif",
            fontSize: 14,
            color: 'var(--ink-primary)',
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          {statusText}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--ink-muted)',
            letterSpacing: 0.5,
          }}
        >
          {statusHint || 'مدّة قصوى ٥ دقائق'}
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
              background: 'var(--therapy-blue)',
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
              background: 'var(--card-bg)',
              borderRadius: 10,
              padding: '12px 14px',
              fontFamily: "'Tajawal', sans-serif",
              fontSize: 13,
              color: 'var(--ink-secondary)',
              lineHeight: 1.7,
              marginBottom: 10,
            }}
          >
            {transcript}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              fontSize: 12,
              fontFamily: "'Tajawal', sans-serif",
              color: saveState === 'saved' ? 'var(--clinical-green)'
                : saveState === 'error' ? '#e57373'
                : 'var(--ink-muted)',
            }}>
              {saveState === 'saved' ? 'تم الحفظ ✓'
                : saveState === 'saving' ? 'جاري الحفظ...'
                : saveState === 'error' ? 'فشل الحفظ'
                : ''}
            </div>

            {saveState === 'error' && (
              <button
                onClick={() => saveTranscript(transcript)}
                style={{
                  padding: '7px 16px',
                  background: 'var(--therapy-blue)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#0a0f1a',
                  fontFamily: "'Tajawal', sans-serif",
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
