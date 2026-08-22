'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toEnglishNumerals } from '@/lib/utils';
import { useVoiceRecorder } from '@/lib/hooks/useVoiceRecorder';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

// ─── Chat Modes ────────────────────────────────────────────────────────────────

const CHAT_MODES = [
  {
    id: 'support',
    name: 'وضع صعب',
    icon: '🌧️',
    color: '#4A3CB4',
    systemPrompt:
      'أنت مرشد داعم وحاني. المستخدم يمر بلحظة صعبة. كن قصيراً، دافئاً، تجنب الأسئلة الكثيرة. ركّز على الاحتواء والتطمين. لا تعطه نصائح إلا لو طلب.',
  },
  {
    id: 'reflect',
    name: 'أحتاج أفكر',
    icon: '🤔',
    color: '#376EC8',
    systemPrompt:
      'أنت معالج CBT. ساعد المستخدم يفكك أفكاره بأسئلة سقراطية عميقة. اسأل سؤال واحد قوي في كل رد. ركّز على: ما الفكرة؟ ما الدليل؟ ما البديل؟',
  },
  {
    id: 'motivate',
    name: 'أحتاج تحفيز',
    icon: '💪',
    color: '#5DCDA5',
    systemPrompt:
      'أنت كوتش قوي ومباشر. المستخدم يحتاج طاقة وحماس. كن واضحاً، مباشراً، استخدم لغة قوية لكن إيجابية. ذكّره بإنجازاته وقدراته.',
  },
  {
    id: 'analyze',
    name: 'حلل لحظة',
    icon: '📝',
    color: '#259696',
    systemPrompt:
      'أنت محلل سلوكي. المستخدم يريد تفكيك تجربة معينة. اسأل عن: السياق، المحفز، الأفكار، المشاعر، السلوك، النتيجة. ساعده يرى الأنماط.',
  },
  {
    id: 'morning',
    name: 'بداية يوم',
    icon: '🌅',
    color: '#2EBE80',
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
  { cmd: '/تأمل', desc: 'تأمل 5 دقائق' },
  { cmd: '/تحليل', desc: 'افتح التقارير' },
  { cmd: '/حفظ', desc: 'احفظ آخر رد لكلود' },
  { cmd: '/محادثات', desc: 'عرض المحادثات السابقة' },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessageSource {
  id: string;
  bookSlug: string;
  bookTitle: string;
  unitNumber: number;
  unitTitle: string;
  snippet: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
  savedId?: number; // DB id إذا تم الحفظ
  sources?: MessageSource[];
  mode?: ModeId; // الوضع الفعّال وقت الإرسال — غير متوفر للرسائل المُستعادة من الأرشيف
}

// ─── Memory chips (من ذاكرتي) ──────────────────────────────────────────────

interface ProfileSummary {
  triggers?: string[];
  copingWorks?: string[];
  goals?: string[];
}

function buildMemoryChips(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ProfileSummary;
    const chips: string[] = [];
    if (parsed.copingWorks?.[0]) chips.push(parsed.copingWorks[0]);
    if (parsed.triggers?.[0]) chips.push(`محفّزك الأكبر: ${parsed.triggers[0]}`);
    if (parsed.goals?.[0]) chips.push(`هدفك: ${parsed.goals[0]}`);
    return chips;
  } catch {
    return [];
  }
}

// ─── Wide layout — recent sessions sidebar ─────────────────────────────────

interface SessionSummary {
  id: number;
  mode: string;
  updatedAt: string;
  messageCount: number;
  firstMessage: string;
}

const SESSION_MODE_LABELS: Record<string, string> = {
  general: '💬 عام',
  journal: '📖 مذكرة',
  sos: '🆘 طوارئ',
};

function sessionModeLabel(mode: string): string {
  const known = CHAT_MODES.find((m) => m.id === mode);
  if (known) return `${known.icon} ${known.name}`;
  return SESSION_MODE_LABELS[mode] ?? `💬 ${mode}`;
}

function sessionDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays <= 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `قبل ${toEnglishNumerals(diffDays)} أيام`;
  return toEnglishNumerals(d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }));
}

// ─── Bubble treatments ──────────────────────────────────────────────────────────

const BUBBLE_USER: React.CSSProperties = {
  background: 'linear-gradient(140deg, rgba(55,110,200,.9), rgba(74,60,180,.85))',
  border: 'none',
  color: '#EAF2EE',
  borderRadius: '22px 22px 6px 22px',
  boxShadow: '0 6px 18px rgba(55,110,200,.2)',
};

const BUBBLE_ASSISTANT: React.CSSProperties = {
  background: 'rgba(255,255,255,.045)',
  border: '1px solid rgba(255,255,255,.08)',
  color: '#D8E1EC',
  borderRadius: '22px 22px 22px 6px',
};

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
  const phaseColor = { in: '#5DCDA5', hold: '#259696', out: '#4A3CB4' };
  const phaseScale = { in: 1.3, hold: 1.3, out: 0.85 };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200, /* modal-ok: true overlay, not the page shell */
        background: 'radial-gradient(700px 500px at 50% 40%, #16203A 0%, rgba(10,13,24,.97) 65%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26,
        padding: '32px 24px', animation: 'ncScreenIn .4s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 17, color: '#EAF2EE' }}>
        التنفس العميق — الجولة {toEnglishNumerals(round)}
      </div>
      <div
        style={{
          width: 160, height: 160, borderRadius: '50%',
          background: `${phaseColor[phase]}20`,
          border: `2px solid ${phaseColor[phase]}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${phaseScale[phase]})`,
          transition: 'transform 1s ease, border-color 1s',
          boxShadow: `0 0 44px ${phaseColor[phase]}30`,
        }}
      >
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 30, color: phaseColor[phase] }}>
          {toEnglishNumerals(count)}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: phaseColor[phase], marginTop: 2 }}>
          {phaseText[phase]}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          marginTop: 14, padding: '12px 32px', minHeight: 44,
          background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 50, color: '#B6BFCF',
          fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
        }}
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
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200, /* modal-ok: true overlay, not the page shell */
        background: 'radial-gradient(700px 500px at 50% 40%, #16203A 0%, rgba(10,13,24,.97) 65%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
        padding: 32, animation: 'ncScreenIn .4s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 17, color: '#EAF2EE', textAlign: 'center' }}>
        تأمل هادئ 🧘
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 14, color: '#B6BFCF', textAlign: 'center', lineHeight: 1.85, maxWidth: 280, margin: 0 }}>
        أغمض عينيك، ركّز على أنفاسك. دع الأفكار تمر دون أن تتعلق بها.
      </p>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 52, color: seconds > 0 ? '#5DCDA5' : '#2EBE80', fontWeight: 700 }}>
        {seconds > 0 ? `${toEnglishNumerals(m)}:${s.toString().padStart(2, '0')}` : 'انتهى ✓'}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setRunning((r) => !r)}
          style={{
            padding: '12px 24px', minHeight: 44,
            background: 'rgba(93,205,165,.1)', border: '1px solid rgba(93,205,165,.35)',
            borderRadius: 50, color: '#5DCDA5',
            fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
          }}
        >
          {running ? 'إيقاف مؤقت' : 'استمرار'}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '12px 24px', minHeight: 44,
            background: 'transparent', border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 50, color: '#909BB2',
            fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer',
          }}
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
  const chipRouter = useRouter();

  // اختصار اسم الكتاب: قبل القوس الأول
  const shortBook = source.bookTitle.split('(')[0].trim();

  return (
    <div
      style={{
        border: '1px solid rgba(37,150,150,.24)',
        borderRadius: 11,
        overflow: 'hidden',
        background: 'rgba(37,150,150,.08)',
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
          padding: '6px 11px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'right',
          minHeight: 32,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3FB6B6" strokeWidth="1.8" style={{ flexShrink: 0 }}>
          <path d="M12 3c-4.5 0-8 3.1-8 7 0 2.1 1 4 2.7 5.2L6 20l4.2-2.1c.6.1 1.2.1 1.8.1 4.5 0 8-3.1 8-7s-3.5-7-8-7z" strokeLinejoin="round" />
        </svg>
        <span
          style={{
            flex: 1,
            fontFamily: 'var(--font-body)',
            fontSize: 11.5,
            fontWeight: 500,
            color: '#3FB6B6',
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
            color: '#6B7A8C',
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
            padding: '0 11px 10px',
            borderTop: '1px solid rgba(37,150,150,.18)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: '#B6BFCF',
              lineHeight: 1.7,
              margin: '9px 0 6px',
            }}
          >
            {source.snippet}
            {source.snippet.length >= 180 ? '…' : ''}
          </p>
          <button
            onClick={() =>
              chipRouter.push(
                `/library?book=${source.bookSlug}&unit=${source.unitNumber}`
              )
            }
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              color: '#3FB6B6',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
              opacity: 0.9,
            }}
          >
            عرض الكامل ↗
          </button>
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
        gap: 5,
        marginTop: 6,
        paddingRight: 4,
      }}
    >
      {sources.map((s) => (
        <SourceChip key={s.id} source={s} />
      ))}
    </div>
  );
}

// ─── Human-support / crisis banner — calm, never alarming ─────────────────────

function CrisisBanner({
  level, reason, onBreathe, onSupport, onDismiss,
}: {
  level: 'medium' | 'high' | 'unknown';
  reason: string;
  onBreathe: () => void;
  onSupport: () => void;
  onDismiss: () => void;
}) {
  const title =
    level === 'high' ? 'أنا معك في هذه اللحظة'
    : level === 'medium' ? 'لاحظت شيئًا يستحق الانتباه'
    : 'الدعم متاح لك دائمًا، إن احتجته';
  return (
    <div
      style={{
        margin: '10px 20px 0',
        padding: '14px 16px',
        background: 'rgba(93,205,165,.07)',
        border: '1px solid rgba(93,205,165,.28)',
        borderRadius: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <span
          style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'rgba(93,205,165,.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5DCDA5',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5-2.5 4.5-9.5 9-9.5 9z" strokeLinejoin="round" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#DCEAE3', fontWeight: 700, marginBottom: 4 }}>
            {title}
          </div>
          {reason && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#B6BFCF', lineHeight: 1.7 }}>
              {reason}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button
          onClick={onBreathe}
          style={{
            padding: '7px 14px', minHeight: 36,
            background: 'rgba(93,205,165,.12)', border: '1px solid rgba(93,205,165,.3)',
            borderRadius: 20, color: '#5DCDA5',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          🌬️ تمرين تنفّس
        </button>
        <button
          onClick={onSupport}
          style={{
            padding: '7px 14px', minHeight: 36,
            background: 'rgba(55,110,200,.1)', border: '1px solid rgba(55,110,200,.28)',
            borderRadius: 20, color: '#6E9BE8',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          دعم بشري فوري
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '7px 14px', minHeight: 36,
            background: 'transparent', border: '1px solid rgba(255,255,255,.09)',
            borderRadius: 20, color: '#6B7A8C',
            fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer',
          }}
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}

// ─── Check-in banner ────────────────────────────────────────────────────────────

function CheckinBanner({ hour, onStart, onDismiss }: { hour: number; onStart: () => void; onDismiss: () => void }) {
  return (
    <div
      style={{
        margin: '10px 20px 0',
        padding: '14px 16px',
        background: 'rgba(46,190,128,.06)',
        border: '1px solid rgba(46,190,128,.2)',
        borderRadius: 18,
      }}
    >
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: '#5DCDA5', fontWeight: 700, marginBottom: 10 }}>
        {hour < 12 ? '🌅 كيف تريد أن تبدأ يومك؟' : '🌙 كيف كان يومك؟'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onStart}
          style={{
            padding: '8px 16px', minHeight: 38,
            background: 'linear-gradient(135deg,#2EBE80,#259696)', border: 'none',
            borderRadius: 20, color: '#0D1220',
            fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ابدأ {hour < 12 ? 'تسجيل الصباح' : 'تسجيل المساء'}
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '8px 16px', minHeight: 38,
            background: 'transparent', border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 20, color: '#909BB2',
            fontFamily: 'var(--font-body)', fontSize: 12.5, cursor: 'pointer',
          }}
        >
          لاحقًا
        </button>
      </div>
    </div>
  );
}

// ─── Typing indicator ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div
        style={{
          display: 'flex', gap: 5, alignItems: 'center',
          padding: '16px 18px',
          background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: '22px 22px 22px 6px',
        }}
      >
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#5DCDA5',
              animation: `ncBreathe 1.2s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}
      </div>
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
  const [crisisLevel, setCrisisLevel] = useState<'low' | 'medium' | 'high' | 'unknown' | null>(null);
  const [crisisReason, setCrisisReason] = useState('');
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [showBreathing, setShowBreathing] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);
  const [ttsLoading, setTtsLoading] = useState<number | null>(null);
  const [playingTts, setPlayingTts] = useState<number | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  const [memoryChips, setMemoryChips] = useState<string[]>([]);

  // ─── Wide (desktop) layout — opt-in, portrait stays default everywhere ───
  const isDesktopViewport = useMediaQuery('(min-width: 1024px)');
  const [wideLayoutPref, setWideLayoutPref] = useState(false);
  const showWide = wideLayoutPref && isDesktopViewport;
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const rightColRef = useRef<HTMLDivElement>(null);
  const [wideComposerRect, setWideComposerRect] = useState<{ left: number; width: number } | null>(null);

  const [recordSeconds, setRecordSeconds] = useState(0);

  const { isRecording, isProcessing, errorMessage: voiceError, toggle: toggleVoice } = useVoiceRecorder({
    onTranscript: (text) => {
      setInput((prev) => (prev ? prev + ' ' + text : text));
      inputRef.current?.focus();
    },
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrl = useRef<string | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  // The composer's own rendered height — measured live so it stays correct
  // however tall the composer grows (voice timer, error tooltip, multi-line
  // input). Combined with --bottom-bar-height + the 14px gap (the same terms
  // the composer's own `bottom` offset uses) this gives the full on-screen
  // band the fixed composer covers, measured up from the viewport's bottom
  // edge — NOT just the composer's height, since it also floats above the
  // bottom nav.
  const [composerHeight, setComposerHeight] = useState(76);
  const composerClearance = `calc(var(--bottom-bar-height, 160px) + 14px + ${composerHeight}px)`;

  const currentMode = CHAT_MODES.find((m) => m.id === modeId) ?? CHAT_MODES[0];

  // ─── Scroll to bottom ────────────────────────────────────────────────────
  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
    });
  }, []);

  // ─── Memory chips (من ذاكرتي) ────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: { settings?: { profileSummary?: string | null } }) => {
        setMemoryChips(buildMemoryChips(d.settings?.profileSummary));
      })
      .catch(() => {});
  }, []);

  // ─── Wide layout preference — stored default is portrait (unset) ────────
  useEffect(() => {
    if (localStorage.getItem('nc_chat_wide') === '1') setWideLayoutPref(true);
  }, []);

  const toggleWideLayout = useCallback(() => {
    setWideLayoutPref((prev) => {
      const next = !prev;
      localStorage.setItem('nc_chat_wide', next ? '1' : '0');
      return next;
    });
  }, []);

  // Recent sessions for the wide sidebar — only fetched when the desktop
  // viewport is even possible, so mobile users never pay for this request.
  useEffect(() => {
    if (!isDesktopViewport) return;
    fetch('/api/chat/history')
      .then((r) => r.json())
      .then((d: { sessions?: SessionSummary[] }) => {
        if (d.sessions) setRecentSessions(d.sessions.slice(0, 8));
      })
      .catch(() => {});
  }, [isDesktopViewport]);

  // Track the right column's on-screen rect so the fixed composer (which
  // must stay outside the flex flow for the --composer-height measurement
  // below to keep working) can align itself under that column instead of
  // the full viewport, matching where it visually reads as "part of" the
  // right column in the wide layout.
  useEffect(() => {
    if (!showWide) { setWideComposerRect(null); return; }
    const el = rightColRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setWideComposerRect({ left: r.left, width: r.width });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, [showWide]);

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

  useEffect(() => { scrollBottom(); }, [messages, streamingText, crisisLevel, showCheckin, scrollBottom]);

  // Measure the fixed composer's real height so the trailing spacer below the
  // messages list always reserves exactly enough room to clear it — no message
  // bubble can ever render underneath it, regardless of how content above
  // shifts (e.g. an async crisis banner popping in).
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const update = () => setComposerHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      if (!res.ok) throw new Error(`detect-crisis ${res.status}`);
      const d = await res.json() as { level: 'low' | 'medium' | 'high' | 'unknown'; reason: string };
      if (d.level !== 'low') {
        setCrisisLevel(d.level);
        setCrisisReason(d.reason);
      }
    } catch {
      // فشل الطلب نفسه (شبكة، انقطاع خادم) — لا نفترض "لا خطر" بصمت كما كان
      // سابقًا؛ نعرض صف الدعم الهادئ لأننا لا نعرف الحالة الفعلية لهذه الرسالة.
      setCrisisLevel('unknown');
      setCrisisReason('');
    }
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
              setMessages((prev) => [...prev, { role: 'assistant', content: accumulated, time: replyTime, sources: obj.sources ?? [], mode: modeId }]);
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
      // Filter on the command word only (up to the first space) — commands like
      // /سجل take trailing note text as an argument, and matching the filter
      // against the whole remainder would empty filteredCmds as soon as that
      // argument text is typed, hiding the dropdown before it can be selected.
      const commandWord = val.split(/\s/, 1)[0];
      setSlashOpen(true);
      setSlashFilter(commandWord.slice(1).toLowerCase());
    } else {
      setSlashOpen(false);
    }
    // Hide suggestions when user types
    if (val) setSuggestions([]);
  };

  const execSlash = (cmd: string) => {
    setSlashOpen(false);

    if (cmd === '/سجل') {
      // بقية النص بعد الأمر تُحفظ كمذكرة
      const text = input.slice(cmd.length).trim();
      setInput('');
      if (!text) return;
      fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, type: 'text' }),
      })
        .then((r) => {
          const feedback = r.ok ? 'سجّلت ذلك في مذكرتك ✓' : 'تعذّر حفظ المذكرة، حاول من صفحة "سجّل لحظة".';
          setMessages((prev) => [...prev, { role: 'assistant', content: feedback, time: '' }]);
        })
        .catch(() => {
          setMessages((prev) => [...prev, { role: 'assistant', content: 'تعذّر حفظ المذكرة، حاول من صفحة "سجّل لحظة".', time: '' }]);
        });
      return;
    }

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

  // ─── Restore a session from the wide sidebar's recent-chats list ─────────
  const openSession = (id: number) => {
    if (id === sessionId) return;
    setSessionId(id);
    router.replace(`/chat?session=${id}`, { scroll: false });
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
  const today = toEnglishNumerals(new Date().toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' }));

  // Message list — shared verbatim between portrait and wide layouts so
  // streaming/TTS/save/source-chip behavior can never drift between them.
  // Only the bubble max-width and outer container styling differ.
  const renderMessages = (bubbleMaxWidth: number | string, containerStyle: React.CSSProperties) => (
    <div style={containerStyle}>
      {restoring && (
        <div style={{ textAlign: 'center', color: '#6B7A8C', fontSize: 12, fontFamily: 'var(--font-body)' }}>
          جاري استرجاع المحادثة...
        </div>
      )}

      {!restoring && !sessionId && (
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#909BB2', marginBottom: 2 }}>
          {today}
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'assistant' ? 'flex-start' : 'flex-end' }}>
          <div
            style={{
              maxWidth: bubbleMaxWidth,
              padding: '13px 16px',
              fontSize: 15,
              lineHeight: 1.85,
              fontFamily: 'var(--font-body)',
              fontWeight: 400,
              position: 'relative',
              ...(msg.role === 'assistant' ? BUBBLE_ASSISTANT : BUBBLE_USER),
            }}
          >
            {/* علامة الوضع — فقط لرسائل الجلسة الحالية وعند وضع غير الافتراضي */}
            {msg.role === 'assistant' && msg.mode && msg.mode !== 'support' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, letterSpacing: 0.3, color: '#5DCDA5' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                {CHAT_MODES.find((m) => m.id === msg.mode)?.name}
              </div>
            )}
            {msg.content}
          </div>

          {/* بطاقات المصادر — لرسائل المساعد فقط */}
          {msg.role === 'assistant' && (
            <SourceChips sources={msg.sources} />
          )}

          {/* Action buttons for assistant messages */}
          {msg.role === 'assistant' && (
            <div style={{ display: 'flex', gap: 6, marginTop: 5, paddingRight: 4, alignItems: 'center' }}>
              {/* TTS button */}
              <button
                onClick={() => playTts(msg.content, i)}
                disabled={ttsLoading === i}
                style={{
                  padding: '3px 6px',
                  background: 'transparent',
                  border: 'none',
                  color: playingTts === i ? '#5DCDA5' : '#6B7A8C',
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
                  padding: '3px 6px',
                  background: 'transparent',
                  border: 'none',
                  color: msg.savedId ? '#5DCDA5' : '#6B7A8C',
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
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#6B7A8C' }}>
                  {msg.time}
                </span>
              )}
            </div>
          )}
          {msg.role === 'user' && msg.time && (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#6B7A8C', marginTop: 4, paddingLeft: 4 }}>
              {msg.time}
            </div>
          )}
        </div>
      ))}

      {/* Streaming indicator */}
      {loading && (
        streamingText ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                maxWidth: bubbleMaxWidth,
                padding: '13px 16px',
                fontSize: 15,
                lineHeight: 1.85,
                fontFamily: 'var(--font-body)',
                ...BUBBLE_ASSISTANT,
              }}
            >
              {streamingText}
              <span
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: 14,
                  background: '#5DCDA5',
                  marginRight: 2,
                  verticalAlign: 'middle',
                  animation: 'blink 1s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        ) : (
          <TypingDots />
        )
      )}

      {/* scrollMarginBottom keeps scrollIntoView from tucking the last message
          under the fixed composer — it stops short by exactly its height. */}
      <div ref={messagesEndRef} style={{ scrollMarginBottom: composerClearance }} />
    </div>
  );

  const crisisBannerEl = crisisLevel && crisisLevel !== 'low' && (
    <CrisisBanner
      level={crisisLevel}
      reason={crisisReason}
      onBreathe={() => setShowBreathing(true)}
      onSupport={() => router.push('/sos')}
      onDismiss={() => setCrisisLevel(null)}
    />
  );

  const checkinBannerEl = showCheckin && (
    <CheckinBanner
      hour={hour}
      onStart={() => startCheckin(hour < 12 ? 'morning' : 'evening')}
      onDismiss={() => { setShowCheckin(false); localStorage.setItem('jaddidni_checkin', new Date().toISOString().split('T')[0]); }}
    />
  );

  const humanSupportRow = (
    <button
      onClick={() => router.push('/sos')}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        margin: '10px 20px 0', padding: '12px 15px',
        background: 'rgba(93,205,165,.06)', border: '1px solid rgba(93,205,165,.22)',
        borderRadius: 16, cursor: 'pointer', textAlign: 'right',
      }}
    >
      <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: 'rgba(93,205,165,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5DCDA5' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5-2.5 4.5-9.5 9-9.5 9z" strokeLinejoin="round" />
        </svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 12.5, lineHeight: 1.6, color: '#B6BFCF', textAlign: 'right' }}>
        تحتاج دعمًا بشريًا؟ خطوط الأزمات وأشخاص الثقة على بُعد لمسة.
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5DCDA5" strokeWidth="1.6" style={{ flexShrink: 0, transform: 'scaleX(-1)' }}>
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  const suggestionsEl = suggestions.length > 0 && !loading && (
    <div style={{ padding: '0 20px 10px', display: 'flex', gap: 6, overflowX: 'auto' }}>
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => { setSuggestions([]); sendMessage(s); }}
          style={{
            flexShrink: 0,
            padding: '9px 15px', minHeight: 40,
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 18,
            color: '#D2DAE6',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.3s ease',
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {!showWide && (
      <>
      {/* ─── Sticky header ───────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 6,
          background: 'rgba(17,22,38,.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          padding: '14px 20px 10px',
        }}
      >
        {/* Top row — identity + actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {/* Companion avatar — هوية ثابتة، لا تتغير بتغيّر الوضع */}
            <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
              <div
                aria-hidden
                style={{
                  position: 'absolute', inset: -3, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(46,190,128,.35), transparent 70%)',
                  animation: 'breathe 7s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  position: 'relative', width: 42, height: 42, borderRadius: '50%',
                  background: 'linear-gradient(140deg, #2EBE80, #259696 55%, #376EC8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17,
                  boxShadow: '0 6px 18px rgba(46,190,128,.25)',
                }}
              >
                {currentMode.icon}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: '#EAF2EE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                رفيقك في الرحلة
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 12.5, color: '#5DCDA5' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5DCDA5', boxShadow: '0 0 8px rgba(93,205,165,.7)' }} />
                هنا معك دائمًا
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => router.push('/chat/history')}
              aria-label="محادثاتي السابقة"
              title="محادثاتي السابقة"
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)',
                color: '#A8B8C4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 6.04A9 9 0 006 3.75c-1.05 0-2.06.18-3 .5v14.25c.94-.32 1.95-.5 3-.5a9 9 0 016 2.29m0-14.25a9 9 0 016-2.29c1.05 0 2.06.18 3 .5v14.25a9 9 0 00-3-.5 9 9 0 00-6 2.29m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={newChat}
              aria-label="محادثة جديدة"
              title="محادثة جديدة"
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'rgba(46,190,128,.1)', border: '1px solid rgba(46,190,128,.28)',
                color: '#5DCDA5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </button>
            {isDesktopViewport && (
              <button
                onClick={toggleWideLayout}
                aria-label="تخطيط واسع"
                aria-pressed={showWide}
                title="تخطيط واسع"
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)',
                  color: '#6B7A8C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="4" width="18" height="16" rx="3" />
                  <path d="M9.5 4v16" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mode control — مضغوط افتراضيًا، يفتح كل الأوضاع الستة عند الضغط */}
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setModesOpen((o) => !o)}
            aria-expanded={modesOpen}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 12px', minHeight: 30,
              background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 50, color: '#B6BFCF',
              fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer',
            }}
          >
            <span>{currentMode.icon}</span>
            <span>{currentMode.name}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: modesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {modesOpen && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginTop: 8 }}>
              {CHAT_MODES.map((m) => {
                const active = m.id === modeId;
                return (
                  <button
                    key={m.id}
                    onClick={() => { setModeId(m.id); setModesOpen(false); }}
                    style={{
                      flexShrink: 0,
                      padding: '6px 13px', minHeight: 30,
                      background: active ? `${m.color}22` : 'rgba(255,255,255,.03)',
                      border: `1px solid ${active ? m.color : 'rgba(255,255,255,.08)'}`,
                      borderRadius: 50,
                      color: active ? '#EAF2EE' : '#8A93A6',
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap',
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {m.icon} {m.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Memory chips — من ذاكرتي، فقط إذا توفّر ملف شخصي فعلي */}
        {memoryChips.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.05)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11.5, color: '#3FB6B6' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 3c-4.5 0-8 3.1-8 7 0 2.1 1 4 2.7 5.2L6 20l4.2-2.1c.6.1 1.2.1 1.8.1 4.5 0 8-3.1 8-7s-3.5-7-8-7z" strokeLinejoin="round" />
                <path d="M8.5 10h7M8.5 12.5h4" strokeLinecap="round" />
              </svg>
              من ذاكرتي
            </span>
            {memoryChips.map((c, i) => (
              <span
                key={i}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 11,
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                  fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 12, color: '#B6BFCF', whiteSpace: 'nowrap',
                }}
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─── Crisis banner — calm, never alarming ───────────────────────── */}
      {crisisBannerEl}

      {/* ─── Check-in banner ─────────────────────────────────────────────── */}
      {checkinBannerEl}

      {/* ─── Human-support row — دائم، وليس فقط عند رصد أزمة ─────────────── */}
      {humanSupportRow}

      {/* ─── Messages ─────────────────────────────────────────────────────── */}
      {renderMessages('85%', { padding: '18px 20px 8px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 'max(240px, calc(100vh - 430px))', justifyContent: 'flex-end' })}

      {/* ─── Suggestions ─────────────────────────────────────────────────── */}
      {suggestionsEl}

      {/* ─── Spacer reserving flow space for the fixed composer below ─────── */}
      {/* The composer below is taken out of normal flow, so without this the
          page's real scrollable height wouldn't account for it — letting
          messages scroll into the space it visually covers. */}
      <div aria-hidden style={{ height: composerClearance }} />
      </>
      )}

      {/* ─── Wide (desktop) two-column layout — opt-in, /chat only ────────── */}
      {showWide && (
        <div style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}>
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: '20px 24px 0',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'row-reverse',
              alignItems: 'flex-start',
              gap: 28,
            }}
          >
            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <div
              style={{
                width: 240,
                flexShrink: 0,
                position: 'sticky',
                top: 84,
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                maxHeight: 'calc(100vh - 104px)',
              }}
            >
              {/* Top actions — history, new chat, switch back to portrait */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => router.push('/chat/history')}
                  aria-label="محادثاتي السابقة"
                  title="محادثاتي السابقة"
                  style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)',
                    color: '#A8B8C4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M12 6.04A9 9 0 006 3.75c-1.05 0-2.06.18-3 .5v14.25c.94-.32 1.95-.5 3-.5a9 9 0 016 2.29m0-14.25a9 9 0 016-2.29c1.05 0 2.06.18 3 .5v14.25a9 9 0 00-3-.5 9 9 0 00-6 2.29m0-14.25v14.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={newChat}
                  aria-label="محادثة جديدة"
                  title="محادثة جديدة"
                  style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: 'rgba(46,190,128,.1)', border: '1px solid rgba(46,190,128,.28)',
                    color: '#5DCDA5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  onClick={toggleWideLayout}
                  aria-label="العودة للتخطيط الافتراضي"
                  aria-pressed={showWide}
                  title="العودة للتخطيط الافتراضي"
                  style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: 'rgba(46,190,128,.1)', border: '1px solid rgba(46,190,128,.28)',
                    color: '#5DCDA5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <path d="M9.5 4v16" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Companion identity */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, paddingTop: 6 }}>
                <div style={{ position: 'relative', width: 64, height: 64 }}>
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute', inset: -5, borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(46,190,128,.35), transparent 70%)',
                      animation: 'breathe 7s ease-in-out infinite',
                    }}
                  />
                  <div
                    style={{
                      position: 'relative', width: 64, height: 64, borderRadius: '50%',
                      background: 'linear-gradient(140deg, #2EBE80, #259696 55%, #376EC8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26,
                      boxShadow: '0 6px 18px rgba(46,190,128,.25)',
                    }}
                  >
                    {currentMode.icon}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, color: '#EAF2EE' }}>
                  رفيقك في الرحلة
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 12, color: '#5DCDA5' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCDA5', boxShadow: '0 0 8px rgba(93,205,165,.7)' }} />
                  هنا معك دائمًا
                </div>
              </div>

              {/* Chat modes — vertical list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {CHAT_MODES.map((m) => {
                  const active = m.id === modeId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setModeId(m.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '9px 12px', minHeight: 40,
                        background: active ? 'rgba(46,190,128,.12)' : 'transparent',
                        border: `1px solid ${active ? 'rgba(46,190,128,.35)' : 'rgba(255,255,255,.07)'}`,
                        borderRadius: 12,
                        color: active ? '#5DCDA5' : '#8A93A6',
                        fontFamily: 'var(--font-body)',
                        fontSize: 12.5,
                        fontWeight: active ? 700 : 400,
                        cursor: 'pointer',
                        textAlign: 'right',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <span>{m.icon}</span>
                      <span>{m.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* من ذاكرتي — wraps naturally, never cut off */}
              {memoryChips.length > 0 && (
                <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11.5, color: '#3FB6B6', marginBottom: 8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M12 3c-4.5 0-8 3.1-8 7 0 2.1 1 4 2.7 5.2L6 20l4.2-2.1c.6.1 1.2.1 1.8.1 4.5 0 8-3.1 8-7s-3.5-7-8-7z" strokeLinejoin="round" />
                      <path d="M8.5 10h7M8.5 12.5h4" strokeLinecap="round" />
                    </svg>
                    من ذاكرتي
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {memoryChips.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '6px 11px', borderRadius: 11,
                          background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                          fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 11.5, color: '#B6BFCF',
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent sessions */}
              {recentSessions.length > 0 && (
                <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.05)' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11.5, color: '#6B7A8C', marginBottom: 8 }}>
                    محادثات سابقة
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {recentSessions.map((s) => {
                      const active = s.id === sessionId;
                      return (
                        <button
                          key={s.id}
                          onClick={() => openSession(s.id)}
                          style={{
                            textAlign: 'right',
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: active ? 'rgba(46,190,128,.1)' : 'rgba(255,255,255,.02)',
                            border: `1px solid ${active ? 'rgba(46,190,128,.3)' : 'rgba(255,255,255,.05)'}`,
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: active ? '#5DCDA5' : '#8A93A6', marginBottom: 3 }}>
                            {sessionModeLabel(s.mode)}
                          </div>
                          {s.firstMessage && (
                            <div
                              style={{
                                fontFamily: 'var(--font-body)', fontSize: 11.5, color: '#8A93A6', lineHeight: 1.5,
                                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {s.firstMessage}
                            </div>
                          )}
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#5A6478', marginTop: 3 }}>
                            {sessionDateLabel(s.updatedAt)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right column ────────────────────────────────────────────── */}
            <div ref={rightColRef} style={{ flex: 1, minWidth: 0 }}>
              {crisisBannerEl}
              {checkinBannerEl}
              {humanSupportRow}
              {renderMessages('640px', { padding: '18px 0 8px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 'max(280px, calc(100vh - 360px))', justifyContent: 'flex-end' })}
              {suggestionsEl}
              <div aria-hidden style={{ height: composerClearance }} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Fixed input area ───────────────────────────────────────────── */}
      {/* Position/width only differ in wide mode, to align under the measured
          right column instead of the full viewport — the --composer-height
          measurement (composerRef/ResizeObserver) below is untouched either way. */}
      <div
        ref={composerRef}
        style={
          showWide && wideComposerRect
            ? {
                position: 'fixed', /* bottombar-ok: pinned directly above the bottom nav, mirrors BottomNav's fixed shell */
                bottom: 'calc(var(--bottom-bar-height, 160px) + 14px)',
                left: wideComposerRect.left,
                width: wideComposerRect.width,
                zIndex: 20,
                padding: '8px 0 0',
              }
            : {
                position: 'fixed', /* bottombar-ok: pinned directly above the bottom nav, mirrors BottomNav's fixed shell */
                bottom: 'calc(var(--bottom-bar-height, 160px) + 14px)',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: 420,
                zIndex: 20,
                padding: '8px 20px 0',
              }
        }
      >
        {/* Slash command dropdown */}
        {slashOpen && filteredCmds.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 20,
              left: 20,
              marginBottom: 6,
              background: '#1A2036',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 -8px 28px rgba(0,0,0,0.35)',
            }}
          >
            {filteredCmds.map((c) => (
              <button
                key={c.cmd}
                onClick={() => execSlash(c.cmd)}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  textAlign: 'right',
                }}
              >
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#5DCDA5', fontWeight: 700 }}>
                  {c.cmd}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#6B7A8C' }}>
                  {c.desc}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Composed pill bar — textarea + mic + send */}
        {/* Background must read as solid, not a faint tint: this pill sits fixed
            over content that keeps growing during streaming, so anything short
            of near-opaque + blur lets scrolling text bleed through underneath
            it (see the "transparent during streaming" bug). Matches the header's
            frosted treatment above for visual consistency. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 6,
            background: 'rgba(17,22,38,.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${inputFocused ? 'rgba(93,205,165,.4)' : 'rgba(255,255,255,.09)'}`,
            borderRadius: 26,
            padding: '6px 6px 6px 18px',
            boxShadow: '0 10px 30px rgba(0,0,0,.25)',
            transition: 'border-color 0.3s ease',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={loading ? '' : 'اكتب ما يجول في خاطرك...'}
            rows={1}
            disabled={isStreaming}
            style={{
              flex: 1,
              padding: '9px 0',
              background: 'transparent',
              border: 'none',
              color: '#EAF2EE',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              outline: 'none',
              resize: 'none',
              overflowY: 'auto', /* bounded-scroll: capped auto-resize textarea, not a page container */
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
                marginBottom: 6,
                fontSize: 10,
                color: '#5DCDA5',
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
                marginBottom: 6,
                fontSize: 10,
                color: '#909BB2',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
                background: '#1A2036',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 8,
                padding: '4px 8px',
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
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: isRecording ? 'linear-gradient(140deg, rgba(93,205,165,.28), rgba(37,150,150,.28))' : 'rgba(255,255,255,.05)',
                border: `1px solid ${isRecording ? '#5DCDA5' : 'rgba(255,255,255,.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isStreaming ? 'not-allowed' : 'pointer',
                flexShrink: 0,
                opacity: isStreaming ? 0.5 : 1,
                transition: 'all 0.3s ease',
                animation: isRecording ? 'ncMicPulse 2.2s ease-out infinite' : 'none',
              }}
            >
              {isProcessing ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="9" stroke="#6B7A8C" strokeWidth="2.5" strokeOpacity="0.25" />
                  <path d="M21 12a9 9 0 00-9-9" stroke="#A8B8C4" strokeWidth="2.5" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isRecording ? '#5DCDA5' : '#A8B8C4'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: loading || !input.trim() ? 'rgba(255,255,255,.06)' : 'linear-gradient(140deg,#2EBE80,#259696)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              boxShadow: loading || !input.trim() ? 'none' : '0 6px 18px rgba(46,190,128,.28)',
              transition: 'all 0.3s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={loading || !input.trim() ? '#6B7A8C' : '#EAF2EE'} strokeWidth="1.7" style={{ transform: 'scaleX(-1)' }}>
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinejoin="round" strokeLinecap="round" />
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
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6B7A8C', fontFamily: 'var(--font-body)' }}>جاري التحميل...</div>}>
      <ChatContent />
    </Suspense>
  );
}
