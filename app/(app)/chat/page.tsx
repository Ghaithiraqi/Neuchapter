'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toArabicNumerals } from '@/lib/utils';
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder';

// ─── Chat Modes ────────────────────────────────────────────────────────────────

const CHAT_MODES = [
  {
    id: 'support',
    name: 'وضع صعب',
    icon: '🌧️',
    color: '#A78BFA',
    systemPrompt:
      'أنت مرشد داعم وحاني. المستخدم يمر بلحظة صعبة. كن قصيراً، دافئاً، تجنب الأسئلة الكثيرة. ركّز على الاحتواء والتطمين. لا تعطه نصائح إلا لو طلب.',
  },
  {
    id: 'reflect',
    name: 'أحتاج أفكر',
    icon: '🤔',
    color: '#7FA88C',
    systemPrompt:
      'أنت معالج CBT. ساعد المستخدم يفكك أفكاره بأسئلة سقراطية عميقة. اسأل سؤال واحد قوي في كل رد. ركّز على: ما الفكرة؟ ما الدليل؟ ما البديل؟',
  },
  {
    id: 'motivate',
    name: 'أحتاج تحفيز',
    icon: '💪',
    color: '#E8B872',
    systemPrompt:
      'أنت كوتش قوي ومباشر. المستخدم يحتاج طاقة وحماس. كن واضحاً، مباشراً، استخدم لغة قوية لكن إيجابية. ذكّره بإنجازاته وقدراته.',
  },
  {
    id: 'analyze',
    name: 'حلل لحظة',
    icon: '📝',
    color: '#6B95C9',
    systemPrompt:
      'أنت محلل سلوكي. المستخدم يريد تفكيك تجربة معينة. اسأل عن: السياق، المحفز، الأفكار، المشاعر، السلوك، النتيجة. ساعده يرى الأنماط.',
  },
  {
    id: 'morning',
    name: 'بداية يوم',
    icon: '🌅',
    color: '#FF8040',
    systemPrompt:
      'أنت مرشد صباحي. ساعد المستخدم يحدد نية واضحة لليوم. اسأل: كيف نمت؟ ما هدفك اليوم؟ ما التحدي المتوقع؟ كيف ستتعامل معه؟',
  },
  {
    id: 'evening',
    name: 'نهاية يوم',
    icon: '🌙',
    color: '#7B8FAB',
    systemPrompt:
      'أنت مرشد مسائي للتأمل. ساعد المستخدم يراجع يومه. اسأل: ما أفضل لحظة؟ ما الصعب؟ ما تعلمت؟ ما تشكر عليه؟ كن هادئاً ومتأملاً.',
  },
] as const;

type ModeId = (typeof CHAT_MODES)[number]['id'];

// ─── Slash Commands ────────────────────────────────────────────────────────────

const SLASH_CMDS = [
  { cmd: '/سجل', desc: 'سجّل النص كمذكرة' },
  { cmd: '/طوارئ', desc: 'افتح صفحة الطوارئ' },
  { cmd: '/تنفس', desc: 'دائرة التنفس' },
  { cmd: '/تأمل', desc: 'تأمل ٥ دقائق' },
  { cmd: '/تحليل', desc: 'افتح التقارير' },
  { cmd: '/حفظ', desc: 'احفظ آخر رد لكلود' },
  { cmd: '/محادثات', desc: 'عرض المحادثات السابقة' },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessageSource {
  id: string;
  bookTitle: string;
  unitTitle: string;
  snippet: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
  savedId?: number; // DB id إذا تم الحفظ
  sources?: MessageSource[];
}

// ─── Breathing Modal ──────────────────────────────────────────────────────────

function BreathingModal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [count, setCount] = useState(4);
  const [round, setRound] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((c) => {
        if (c > 1) return c - 1;
        // Next phase
        setPhase((p) => {
          if (p === 'in') { setCount(4); return 'hold'; }
          if (p === 'hold') { setCount(4); return 'out'; }
          setCount(4);
          setRound((r) => r + 1);
          return 'in';
        });
        return 4;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const phaseText = { in: 'شهيق', hold: 'احتفظ', out: 'زفير' };
  const phaseColor = { in: '#7FA88C', hold: '#E8B872', out: '#A78BFA' };
  const phaseScale = { in: 1.3, hold: 1.3, out: 0.85 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,26,26,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>
        التنفس العميق — الجولة {toArabicNumerals(round)}
      </div>
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: `${phaseColor[phase]}20`,
          border: `3px solid ${phaseColor[phase]}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${phaseScale[phase]})`,
          transition: 'transform 1s ease, border-color 1s',
          boxShadow: `0 0 40px ${phaseColor[phase]}30`,
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: phaseColor[phase] }}>
          {toArabicNumerals(count)}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: phaseColor[phase] }}>
          {phaseText[phase]}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{ marginTop: 16, padding: '12px 32px', background: 'var(--gold-faint)', border: '1px solid var(--border-mid)', borderRadius: 50, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer' }}
      >
        إنهاء
      </button>
    </div>
  );
}

// ─── Meditation Modal ─────────────────────────────────────────────────────────

function MeditationModal({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = useState(300);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,26,26,0.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', textAlign: 'center' }}>
        تأمل هادئ 🧘
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.8, maxWidth: 280 }}>
        أغمض عينيك، ركّز على أنفاسك. دع الأفكار تمر دون أن تتعلق بها.
      </p>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, color: seconds > 0 ? 'var(--gold-primary)' : '#7FA88C', fontWeight: 700 }}>
        {seconds > 0 ? `${toArabicNumerals(m)}:${s.toString().padStart(2, '0').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])}` : 'انتهى ✓'}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setRunning((r) => !r)}
          style={{ padding: '12px 24px', background: 'var(--gold-faint)', border: '1px solid var(--border-mid)', borderRadius: 50, color: 'var(--gold-primary)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer' }}
        >
          {running ? 'إيقاف مؤقت' : 'استمرار'}
        </button>
        <button
          onClick={onClose}
          style={{ padding: '12px 24px', background: 'transparent', border: '1px solid var(--border-soft)', borderRadius: 50, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer' }}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}

// ─── Source Chips ─────────────────────────────────────────────────────────────

function SourceChip({ source }: { source: MessageSource }) {
  const [expanded, setExpanded] = useState(false);

  // اختصار اسم الكتاب: قبل القوس الأول
  const shortBook = source.bookTitle.split('(')[0].trim();

  return (
    <div
      style={{
        border: '1px solid var(--border-soft)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--gold-faint)',
        maxWidth: 320,
      }}
    >
      {/* رأس الشريحة — قابل للنقر */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          padding: '5px 10px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'right',
        }}
      >
        <span style={{ fontSize: 12, flexShrink: 0 }}>📖</span>
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--gold-primary)',
            lineHeight: 1.4,
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {shortBook} — {source.unitTitle}
        </span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            display: 'inline-block',
          }}
        >
          ▾
        </span>
      </button>

      {/* المقتطف — يظهر عند التوسيع */}
      {expanded && (
        <div
          style={{
            padding: '0 10px 8px',
            borderTop: '1px solid var(--border-soft)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              margin: '8px 0 6px',
            }}
          >
            {source.snippet}
            {source.snippet.length >= 180 ? '…' : ''}
          </p>
          {/* placeholder — سيُربط بصفحة المكتبة لاحقًا */}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              color: 'var(--text-muted)',
              opacity: 0.5,
              cursor: 'not-allowed',
              userSelect: 'none',
            }}
          >
            عرض الكامل ↗
          </span>
        </div>
      )}
    </div>
  );
}

function SourceChips({ sources }: { sources?: MessageSource[] }) {
  if (!sources?.length) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        marginTop: 4,
        paddingRight: 4,
      }}
    >
      {sources.map((s) => (
        <SourceChip key={s.id} source={s} />
      ))}
    </div>
  );
}

// ─── Main Chat Component ───────────────────────────────────────────────────────

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(
    sessionParam ? parseInt(sessionParam) : null,
  );
  const [modeId, setModeId] = useState<ModeId>('support');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [crisisLevel, setCrisisLevel] = useState<'low' | 'medium' | 'high' | null>(null);
  const [crisisReason, setCrisisReason] = useState('');
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [showBreathing, setShowBreathing] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);
  const [ttsLoading, setTtsLoading] = useState<number | null>(null);
  const [playingTts, setPlayingTts] = useState<number | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [recordSeconds, setRecordSeconds] = useState(0);

  const { isRecording, isProcessing, errorMessage: voiceError, toggle: toggleVoice } = useVoiceRecorder({
    onTranscript: (text) => {
      setInput((prev) => (prev ? prev + ' ' + text : text));
      inputRef.current?.focus();
    },
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrl = useRef<string | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentMode = CHAT_MODES.find((m) => m.id === modeId) ?? CHAT_MODES[0];

  // ─── Scroll to bottom ────────────────────────────────────────────────────
  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // ─── Restore session ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) {
      // Daily check-in
      const today = new Date().toISOString().split('T')[0];
      const lastCheckin = localStorage.getItem('jaddidni_checkin');
      if (lastCheckin !== today) {
        const hour = new Date().getHours();
        if (hour < 12 || hour >= 20) setShowCheckin(true);
      }
      // Initial greeting
      setMessages([{
        role: 'assistant',
        content: 'مرحباً غيث. كيف تشعر الآن؟ خذ وقتك.',
        time: '',
      }]);
      return;
    }

    setRestoring(true);
    fetch(`/api/chat/session/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.messages && d.messages.length > 0) {
          const restored: Message[] = d.messages.map((m: { role: string; content: string; createdAt: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            time: new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          }));
          setMessages(restored);
        }
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, [sessionId]);

  useEffect(() => { scrollBottom(); }, [messages, streamingText, scrollBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setRecordSeconds(0);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // ─── Crisis Detection ─────────────────────────────────────────────────────
  const detectCrisis = async (text: string) => {
    try {
      const res = await fetch('/api/chat/detect-crisis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const d = await res.json() as { level: 'low' | 'medium' | 'high'; reason: string };
      if (d.level !== 'low') {
        setCrisisLevel(d.level);
        setCrisisReason(d.reason);
      }
    } catch {/**/}
  };

  // ─── Send Message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    setSuggestions([]);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setMessages((prev) => [...prev, { role: 'user', content: text, time }]);
    setInput('');
    setLoading(true);
    setStreamingText('');
    setCrisisLevel(null);

    // Crisis detection (non-blocking)
    detectCrisis(text);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: modeId,
          modePrompt: currentMode.systemPrompt,
          sessionId,
          message: text,
        }),
      });

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line) as { type: string; text?: string; sessionId?: number; suggestions?: string[]; sources?: MessageSource[] };
            if (obj.type === 'delta' && obj.text) {
              accumulated += obj.text;
              setStreamingText(accumulated);
            } else if (obj.type === 'done') {
              const replyTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
              setMessages((prev) => [...prev, { role: 'assistant', content: accumulated, time: replyTime, sources: obj.sources ?? [] }]);
              setStreamingText('');
              if (obj.sessionId) setSessionId(obj.sessionId);
              if (obj.suggestions?.length) setSuggestions(obj.suggestions);
            } else if (obj.type === 'error') {
              setMessages((prev) => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ. حاول مجدداً.', time: '' }]);
              setStreamingText('');
            }
          } catch {/**/}
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ في الاتصال.', time: '' }]);
      setStreamingText('');
    } finally {
      setLoading(false);
    }
  }, [input, loading, modeId, currentMode.systemPrompt, sessionId]);

  // ─── Save Message ─────────────────────────────────────────────────────────
  const saveMessage = async (msg: Message, idx: number) => {
    try {
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msg.content, mode: modeId, sessionId }),
      });
      const d = await res.json() as { saved?: { id: number } };
      if (d.saved) {
        setMessages((prev) => prev.map((m, i) => i === idx ? { ...m, savedId: d.saved!.id } : m));
      }
    } catch {/**/}
  };

  const unsaveMessage = async (msg: Message, idx: number) => {
    if (!msg.savedId) return;
    try {
      await fetch(`/api/saved?id=${msg.savedId}`, { method: 'DELETE' });
      setMessages((prev) => prev.map((m, i) => i === idx ? { ...m, savedId: undefined } : m));
    } catch {/**/}
  };

  // ─── TTS ──────────────────────────────────────────────────────────────────
  const playTts = async (text: string, idx: number) => {
    // Stop if already playing
    if (audioRef.current) {
      audioRef.current.pause();
      if (currentAudioUrl.current) URL.revokeObjectURL(currentAudioUrl.current);
      audioRef.current = null;
      setPlayingTts(null);
      if (playingTts === idx) return;
    }

    setTtsLoading(idx);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 1000) }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      currentAudioUrl.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingTts(idx);
      await audio.play();
      audio.onended = () => {
        setPlayingTts(null);
        audioRef.current = null;
        URL.revokeObjectURL(url);
        currentAudioUrl.current = null;
      };
    } catch {/**/} finally {
      setTtsLoading(null);
    }
  };

  // ─── Slash Commands ───────────────────────────────────────────────────────
  const handleInput = (val: string) => {
    setInput(val);
    if (val.startsWith('/')) {
      setSlashOpen(true);
      setSlashFilter(val.slice(1).toLowerCase());
    } else {
      setSlashOpen(false);
    }
    // Hide suggestions when user types
    if (val) setSuggestions([]);
  };

  const execSlash = (cmd: string) => {
    setSlashOpen(false);
    setInput('');

    if (cmd === '/طوارئ') { router.push('/sos'); return; }
    if (cmd === '/تحليل') { router.push('/analysis'); return; }
    if (cmd === '/تنفس') { setShowBreathing(true); return; }
    if (cmd === '/تأمل') { setShowMeditation(true); return; }
    if (cmd === '/محادثات') { router.push('/chat/history'); return; }
    if (cmd === '/حفظ') {
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistant) {
        const idx = messages.lastIndexOf(lastAssistant);
        saveMessage(lastAssistant, idx);
      }
      return;
    }
    if (cmd === '/سجل') {
      // بقية النص بعد الأمر تُحفظ كمذكرة
      setInput('');
      return;
    }
  };

  const filteredCmds = SLASH_CMDS.filter(
    (c) => !slashFilter || c.cmd.slice(1).includes(slashFilter) || c.desc.includes(slashFilter),
  );

  // ─── Check-in ─────────────────────────────────────────────────────────────
  const startCheckin = (type: 'morning' | 'evening') => {
    setShowCheckin(false);
    localStorage.setItem('jaddidni_checkin', new Date().toISOString().split('T')[0]);
    setModeId(type === 'morning' ? 'morning' : 'evening');
    const msg = type === 'morning' ? 'أبي أبدأ يومي صح. كيف تساعدني؟' : 'أريد أراجع يومي. ساعدني.';
    sendMessage(msg);
  };

  // ─── New Chat ─────────────────────────────────────────────────────────────
  const newChat = () => {
    setSessionId(null);
    setMessages([{ role: 'assistant', content: 'مرحباً غيث. كيف تشعر الآن؟ خذ وقتك.', time: '' }]);
    setSuggestions([]);
    setCrisisLevel(null);
    setInput('');
    router.replace('/chat', { scroll: false });
  };

  // ─── Key handler ──────────────────────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (slashOpen && filteredCmds.length > 0) {
        execSlash(filteredCmds[0].cmd);
      } else {
        sendMessage();
      }
    }
    if (e.key === 'Escape') setSlashOpen(false);
  };

  const isStreaming = loading && streamingText.length > 0;
  const hour = new Date().getHours();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 110px)',
        overflow: 'hidden',
      }}
    >
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '12px 20px 8px',
          borderBottom: '1px solid var(--border-soft)',
          flexShrink: 0,
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>
            {currentMode.icon} {currentMode.name}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => router.push('/chat/history')}
              style={{ padding: '6px 12px', background: 'var(--gold-faint)', border: '1px solid var(--border-soft)', borderRadius: 20, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 11, cursor: 'pointer' }}
            >
              📚 محادثاتي
            </button>
            <button
              onClick={newChat}
              style={{ padding: '6px 12px', background: 'var(--gold-faint)', border: '1px solid var(--border-mid)', borderRadius: 20, color: 'var(--gold-primary)', fontFamily: 'var(--font-body)', fontSize: 11, cursor: 'pointer' }}
            >
              ＋ جديدة
            </button>
          </div>
        </div>

        {/* Mode pills — horizontal scroll */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {CHAT_MODES.map((m) => {
            const active = m.id === modeId;
            return (
              <button
                key={m.id}
                onClick={() => setModeId(m.id)}
                style={{
                  flexShrink: 0,
                  padding: '5px 12px',
                  background: active ? `${m.color}25` : 'transparent',
                  border: `1px solid ${active ? m.color : 'var(--border-soft)'}`,
                  borderRadius: 50,
                  color: active ? m.color : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {m.icon} {m.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Crisis Banner ────────────────────────────────────────────────── */}
      {crisisLevel && crisisLevel !== 'low' && (
        <div
          style={{
            padding: '12px 20px',
            background: crisisLevel === 'high' ? 'rgba(216,90,48,0.12)' : 'rgba(232,184,114,0.08)',
            borderBottom: `1px solid ${crisisLevel === 'high' ? 'rgba(216,90,48,0.3)' : 'var(--border-mid)'}`,
            flexShrink: 0,
          }}
        >
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: crisisLevel === 'high' ? 'var(--alert-warm)' : 'var(--gold-primary)', fontWeight: 700, marginBottom: 6 }}>
            {crisisLevel === 'high' ? '🚨 أنت في لحظة صعبة جداً' : '⚠️ لاحظت شيئاً صعباً'}
          </div>
          {crisisReason && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {crisisReason}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowBreathing(true)} style={{ padding: '5px 12px', background: 'var(--gold-faint)', border: '1px solid var(--border-mid)', borderRadius: 20, color: 'var(--gold-primary)', fontFamily: 'var(--font-body)', fontSize: 11, cursor: 'pointer' }}>
              🌬️ تنفس
            </button>
            <button onClick={() => router.push('/sos')} style={{ padding: '5px 12px', background: 'rgba(216,90,48,0.1)', border: '1px solid rgba(216,90,48,0.3)', borderRadius: 20, color: 'var(--alert-warm)', fontFamily: 'var(--font-body)', fontSize: 11, cursor: 'pointer' }}>
              🆘 بروتوكول الطوارئ
            </button>
            <button onClick={() => setCrisisLevel(null)} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid var(--border-soft)', borderRadius: 20, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 11, cursor: 'pointer' }}>
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ─── Check-in Banner ──────────────────────────────────────────────── */}
      {showCheckin && (
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--gold-faint)',
            borderBottom: '1px solid var(--border-mid)',
            flexShrink: 0,
          }}
        >
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--gold-primary)', fontWeight: 600, marginBottom: 8 }}>
            {hour < 12 ? '🌅 كلود يريد سؤالك عن يومك' : '🌙 كيف كان يومك؟'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => startCheckin(hour < 12 ? 'morning' : 'evening')} style={{ padding: '6px 14px', background: 'var(--gold-primary)', border: 'none', borderRadius: 20, color: '#1A3D3D', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              ابدأ {hour < 12 ? 'check-in الصباحي' : 'check-in المسائي'}
            </button>
            <button onClick={() => { setShowCheckin(false); localStorage.setItem('jaddidni_checkin', new Date().toISOString().split('T')[0]); }} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border-mid)', borderRadius: 20, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer' }}>
              لاحقاً
            </button>
          </div>
        </div>
      )}

      {/* ─── Messages ─────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {restoring && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-body)' }}>
            جاري استرجاع المحادثة...
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'assistant' ? 'flex-start' : 'flex-end' }}>
            <div
              style={{
                maxWidth: '85%',
                padding: '11px 14px',
                borderRadius: 16,
                fontSize: 14,
                lineHeight: 1.8,
                background: msg.role === 'assistant' ? 'var(--bg-elevated)' : `${currentMode.color}18`,
                border: msg.role === 'assistant' ? '1px solid var(--border-soft)' : `1px solid ${currentMode.color}35`,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                borderTopRightRadius: msg.role === 'assistant' ? 4 : 16,
                borderTopLeftRadius: msg.role === 'user' ? 4 : 16,
                position: 'relative',
              }}
            >
              {msg.content}
            </div>

            {/* بطاقات المصادر — لرسائل المساعد فقط */}
            {msg.role === 'assistant' && (
              <SourceChips sources={msg.sources} />
            )}

            {/* Action buttons for assistant messages */}
            {msg.role === 'assistant' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4, paddingRight: 4 }}>
                {/* TTS button */}
                <button
                  onClick={() => playTts(msg.content, i)}
                  disabled={ttsLoading === i}
                  style={{
                    padding: '3px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: playingTts === i ? 'var(--gold-primary)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    cursor: ttsLoading === i ? 'wait' : 'pointer',
                    opacity: ttsLoading === i ? 0.5 : 1,
                  }}
                  title={playingTts === i ? 'إيقاف' : 'استمع'}
                >
                  {ttsLoading === i ? '⏳' : playingTts === i ? '🔇' : '🔊'}
                </button>

                {/* Save button */}
                <button
                  onClick={() => msg.savedId ? unsaveMessage(msg, i) : saveMessage(msg, i)}
                  style={{
                    padding: '3px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: msg.savedId ? 'var(--gold-primary)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}
                  title={msg.savedId ? 'إزالة الحفظ' : 'حفظ'}
                >
                  {msg.savedId ? '⭐' : '☆'}
                </button>

                {msg.time && (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>
                    {msg.time}
                  </span>
                )}
              </div>
            )}
            {msg.role === 'user' && msg.time && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)', marginTop: 3, paddingLeft: 4 }}>
                {msg.time}
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {streamingText ? (
              <div
                style={{
                  maxWidth: '85%',
                  padding: '11px 14px',
                  borderRadius: 16,
                  borderTopRightRadius: 4,
                  fontSize: 14,
                  lineHeight: 1.8,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-soft)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {streamingText}
                <span
                  style={{
                    display: 'inline-block',
                    width: 2,
                    height: 14,
                    background: 'var(--gold-primary)',
                    marginRight: 2,
                    verticalAlign: 'middle',
                    animation: 'blink 1s ease-in-out infinite',
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 4, padding: '8px 14px' }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold-primary)', animation: `blink 1.5s ease-in-out ${delay}s infinite` }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Suggestions ─────────────────────────────────────────────────── */}
      {suggestions.length > 0 && !loading && (
        <div style={{ padding: '0 20px 6px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => { setSuggestions([]); sendMessage(s); }}
              style={{
                flexShrink: 0,
                padding: '6px 14px',
                background: 'var(--gold-faint)',
                border: '1px solid var(--border-mid)',
                borderRadius: 50,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ─── Input Area ───────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 20px 12px',
          borderTop: '1px solid var(--border-soft)',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {/* Slash command dropdown */}
        {slashOpen && filteredCmds.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 20,
              left: 20,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-mid)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
              zIndex: 50,
            }}
          >
            {filteredCmds.map((c) => (
              <button
                key={c.cmd}
                onClick={() => execSlash(c.cmd)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border-soft)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--gold-primary)', fontWeight: 700 }}>
                  {c.cmd}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)' }}>
                  {c.desc}
                </span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={loading ? '' : 'اكتب أو اكتب / للأوامر...'}
            rows={1}
            disabled={isStreaming}
            style={{
              flex: 1,
              padding: '11px 14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-input)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              outline: 'none',
              resize: 'none',
              overflowY: 'auto',
              maxHeight: 120,
              lineHeight: 1.5,
              opacity: isStreaming ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          />

          {/* ── Mic button ─────────────────────────────────────────────── */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {isRecording && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 4,
                fontSize: 10,
                color: '#ef4444',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}>
                {formatTimer(recordSeconds)}
              </div>
            )}
            {voiceError && !isRecording && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 4,
                fontSize: 10,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-soft)',
                borderRadius: 6,
                padding: '3px 6px',
                maxWidth: 160,
                textAlign: 'center',
              }}>
                {voiceError}
              </div>
            )}
            <button
              onClick={toggleVoice}
              disabled={isStreaming}
              title={isRecording ? 'إيقاف التسجيل' : isProcessing ? 'جاري التحويل...' : 'تسجيل صوتي'}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: isRecording ? '#ef4444' : 'var(--gold-faint)',
                border: `1px solid ${isRecording ? '#ef4444' : 'var(--border-mid)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isStreaming ? 'not-allowed' : 'pointer',
                flexShrink: 0,
                opacity: isStreaming ? 0.5 : 1,
                transition: 'all 0.2s',
                animation: isRecording ? 'micPulse 1.5s ease-in-out infinite' : 'none',
              }}
            >
              {isProcessing ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="9" stroke="var(--text-muted)" strokeWidth="2.5" strokeOpacity="0.25" />
                  <path d="M21 12a9 9 0 00-9-9" stroke="var(--text-secondary)" strokeWidth="2.5" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isRecording ? '#fff' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0014 0" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="9" y1="22" x2="15" y2="22" />
                </svg>
              )}
            </button>
          </div>

          {/* ── Send button ─────────────────────────────────────────────── */}
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: loading || !input.trim() ? 'var(--gold-faint)' : 'var(--gold-primary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              opacity: loading || !input.trim() ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke={loading || !input.trim() ? 'var(--text-muted)' : '#1A3D3D'}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Modals ────────────────────────────────────────────────────────── */}
      {showBreathing && <BreathingModal onClose={() => setShowBreathing(false)} />}
      {showMeditation && <MeditationModal onClose={() => setShowMeditation(false)} />}
    </div>
  );
}

// ─── Export with Suspense (useSearchParams requires it) ───────────────────────

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>جاري التحميل...</div>}>
      <ChatContent />
    </Suspense>
  );
}
