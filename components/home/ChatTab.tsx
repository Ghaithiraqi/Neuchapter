'use client';

import { useState, useRef, useEffect } from 'react';
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const STORAGE_KEY = 'jaddidni_chat_session';

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'مرحباً غيث. كيف تشعر هذا الصباح؟ خذ وقتك في الجواب.',
  time: '',
};

export function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { status: voiceStatus, isRecording, isProcessing, errorMessage: voiceError, toggle: toggleRecording } =
    useVoiceRecorder({
      onTranscript: (text) => setInput(text),
    });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  // استرجاع الجلسة السابقة عند التحميل
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) { setRestoring(false); return; }
    const savedId = parseInt(saved);
    if (isNaN(savedId)) { setRestoring(false); return; }

    fetch(`/api/chat/session/${savedId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          const restored: Message[] = data.messages.map((m: { role: string; content: string; createdAt: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            time: new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          }));
          setMessages([INITIAL_MESSAGE, ...restored]);
          setSessionId(savedId);
        }
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setMessages((prev) => [...prev, { role: 'user', content: text, time }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'journal', sessionId, message: text }),
      });
      const data = await res.json();

      if (data.message) {
        const replyTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message, time: replyTime }]);
        if (data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem(STORAGE_KEY, String(data.sessionId));
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'عذراً، حدث خطأ. حاول مجدداً.', time: '' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSessionId(null);
    setMessages([INITIAL_MESSAGE]);
    setInput('');
  };

  const micBusy = isRecording || isProcessing;

  return (
    <div
      style={{
        background: 'var(--night-deepest)',
        border: '1px solid var(--border-soft)',
        borderRadius: 14,
        padding: 16,
        minHeight: 240,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* رأس المحادثة */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={startNewChat}
          style={{
            padding: '5px 12px',
            background: 'transparent',
            border: '1px solid var(--border-soft)',
            borderRadius: 8,
            color: 'var(--ink-muted)',
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          محادثة جديدة
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: 1,
          marginBottom: 14,
          maxHeight: 300,
          overflowY: 'auto',
        }}
      >
        {restoring && (
          <div style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: 12, fontFamily: "'Tajawal', sans-serif" }}>
            جاري استرجاع المحادثة...
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div
              style={{
                maxWidth: '85%',
                padding: '12px 14px',
                borderRadius: 14,
                fontSize: 13,
                lineHeight: 1.7,
                background: msg.role === 'assistant' ? 'var(--card-bg-elevated)' : 'var(--therapy-soft)',
                border: msg.role === 'assistant' ? '1px solid var(--border-soft)' : 'none',
                color: 'var(--ink-primary)',
                fontFamily: msg.role === 'assistant' ? "'Noto Naskh Arabic', serif" : "'Tajawal', sans-serif",
                alignSelf: msg.role === 'assistant' ? 'flex-start' : 'flex-end',
                marginRight: msg.role === 'user' ? 'auto' : undefined,
                marginLeft: msg.role === 'assistant' ? 'auto' : undefined,
                borderTopRightRadius: msg.role === 'assistant' ? 4 : 14,
                borderTopLeftRadius: msg.role === 'user' ? 4 : 14,
              }}
            >
              {msg.content}
            </div>
            {msg.time && (
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: 'var(--ink-faint)',
                  marginTop: 4,
                  letterSpacing: 0.5,
                  textAlign: msg.role === 'assistant' ? 'right' : 'left',
                  paddingRight: msg.role === 'assistant' ? 4 : 0,
                  paddingLeft: msg.role === 'user' ? 4 : 0,
                }}
              >
                {msg.time}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 14px' }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--therapy-blue)',
                  animation: `blink 1.5s ease-in-out ${delay}s infinite`,
                }}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* موجة صوتية أثناء التسجيل */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          height: isRecording ? 22 : 0,
          overflow: 'hidden',
          opacity: isRecording ? 1 : 0,
          transition: 'opacity 0.3s, height 0.3s',
          marginBottom: isRecording ? 10 : 0,
        }}
      >
        {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((delay, i) => (
          <div
            key={i}
            style={{
              width: 2,
              background: 'var(--alert-warm)',
              borderRadius: 1,
              animation: `wave 1s ease-in-out ${delay}s infinite`,
              height: [8, 14, 20, 12, 16, 10, 18][i],
            }}
          />
        ))}
      </div>

      {/* مؤشر التفريغ */}
      {isProcessing && (
        <div
          style={{
            textAlign: 'center',
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 12,
            color: 'var(--alert-warm)',
            marginBottom: 8,
            animation: 'blink 1.5s ease-in-out infinite',
          }}
        >
          جاري التفريغ...
        </div>
      )}

      {/* رسائل الخطأ */}
      {voiceStatus === 'error' && voiceError && (
        <div
          style={{
            textAlign: 'center',
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 12,
            color: '#e57373',
            marginBottom: 8,
            padding: '6px 12px',
            background: 'rgba(229, 115, 115, 0.08)',
            borderRadius: 8,
            border: '1px solid rgba(229, 115, 115, 0.15)',
          }}
        >
          {voiceError}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          paddingTop: 14,
          borderTop: '1px dashed var(--border-soft)',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={micBusy ? '' : 'اكتب ما تشعر به...'}
          disabled={isRecording}
          rows={1}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-soft)',
            borderRadius: 10,
            color: 'var(--ink-primary)',
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 13,
            outline: 'none',
            resize: 'none',
            overflowY: 'auto',
            maxHeight: 120,
            lineHeight: 1.5,
            opacity: isRecording ? 0.5 : 1,
            transition: 'opacity 0.2s',
            display: 'block',
          }}
        />

        {/* زر المايكروفون */}
        <button
          onClick={toggleRecording}
          disabled={isProcessing || loading}
          aria-label={isRecording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: isRecording ? 'rgba(201, 152, 120, 0.12)' : 'transparent',
            border: `1.5px solid ${isRecording ? 'var(--alert-warm)' : 'var(--border-strong)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isProcessing || loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0,
            opacity: isProcessing || loading ? 0.5 : 1,
            position: 'relative',
            animation: isRecording ? 'gentlePulse 2s ease-in-out infinite' : 'none',
          }}
        >
          {/* حلقة نبض خارجية أثناء التسجيل */}
          {isRecording && (
            <div
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '1px solid var(--alert-soft)',
                opacity: 0.4,
                animation: 'ringPulse 2s ease-out infinite',
              }}
            />
          )}

          {/* أيقونة إيقاف أثناء التسجيل، مايك في الحالات الأخرى */}
          {isRecording ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="var(--alert-warm)">
              <rect x="2" y="2" width="10" height="10" rx="2" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke={voiceStatus === 'error' ? '#e57373' : 'var(--ink-secondary)'}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {/* زر الإرسال — يختفي أثناء التسجيل */}
        {!isRecording && (
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || isProcessing}
            aria-label="إرسال"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--therapy-blue)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading || !input.trim() || isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
              opacity: loading || !input.trim() || isProcessing ? 0.4 : 1,
            }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="#0a0f1a">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
