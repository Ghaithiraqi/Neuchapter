'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toEnglishNumerals } from '@/lib/utils';

interface Settings {
  name: string;
  timezone: string;
  bedtimeHour: number | null;
  reminderEnabled: boolean;
  voiceEnabled: boolean;
  profileSummary: string | null;
}

interface UserProfile {
  triggers: string[];
  copingWorks: string[];
  patterns: string[];
  goals: string[];
  tone: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const TIMEZONES = [
  { value: 'Asia/Baghdad', label: 'بغداد (UTC+3)' },
  { value: 'Asia/Riyadh', label: 'الرياض (UTC+3)' },
  { value: 'Asia/Dubai', label: 'دبي (UTC+4)' },
  { value: 'Africa/Cairo', label: 'القاهرة (UTC+2)' },
  { value: 'Europe/London', label: 'لندن (UTC+0/+1)' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const period = i < 12 ? 'ص' : 'م';
  const display = i === 0 ? `12 ${period}` : i < 13 ? `${i} ${period}` : `${i - 12} ${period}`;
  return { value: i, label: display };
});

const TONE_PRESETS = [
  { key: 'warm', title: 'مباشر ودافئ', desc: 'صريح ومشجّع' },
  { key: 'gentle', title: 'لطيف وهادئ', desc: 'ليّن وغير ملحّ' },
  { key: 'practical', title: 'عملي', desc: 'خطوات واضحة' },
] as const;

const PROFILE_CATEGORIES = [
  { key: 'triggers' as const, label: 'المحفّزات', tag: 'محفّز', iconBg: 'rgba(216,90,48,.14)', iconColor: '#E08A6E' },
  { key: 'copingWorks' as const, label: 'ما ينجح معك', tag: 'يساعدك', iconBg: 'rgba(46,190,128,.14)', iconColor: '#5DCDA5' },
  { key: 'patterns' as const, label: 'الأنماط', tag: 'نمط لاحظه', iconBg: 'rgba(37,150,150,.16)', iconColor: '#3FB6B6' },
  { key: 'goals' as const, label: 'الأهداف', tag: 'هدفك', iconBg: 'rgba(55,110,200,.14)', iconColor: '#6E9BE8' },
];

// ─── Card shell ─────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,.025)',
  border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 20,
};

// ─── Small building blocks ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13.5, color: '#A3ADC2', marginBottom: 11, letterSpacing: 0.5 }}>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 46, height: 27, borderRadius: 14, position: 'relative', flexShrink: 0,
        background: checked ? 'rgba(93,205,165,.5)' : 'rgba(255,255,255,.1)',
        border: 'none', cursor: 'pointer',
        transition: 'background 0.4s ease',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 3,
          right: checked ? 3 : undefined,
          left: checked ? undefined : 3,
          width: 21, height: 21, borderRadius: '50%',
          background: '#EAF2EE',
          boxShadow: '0 2px 6px rgba(0,0,0,.35)',
          transition: 'all 0.4s cubic-bezier(.4,0,.2,1)',
        }}
      />
    </button>
  );
}

function SettingsRow({
  icon, iconBg, iconColor, label, hint, trailing, onClick, chevron, border = true,
}: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string; hint?: string;
  trailing?: React.ReactNode; onClick?: () => void; chevron?: boolean; border?: boolean;
}) {
  const content = (
    <>
      <span style={{ width: 38, height: 38, borderRadius: 11, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, flexShrink: 0 }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 15, color: '#EAF2EE' }}>{label}</div>
        {hint && <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 12, color: '#939DB4', marginTop: 2 }}>{hint}</div>}
      </div>
      {trailing}
      {chevron && (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#808AA0" strokeWidth="1.6" style={{ transform: 'scaleX(-1)', flexShrink: 0 }}>
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );

  const rowStyle: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
    padding: '15px 17px',
    background: 'transparent', border: 'none',
    borderBottom: border ? '1px solid rgba(255,255,255,.05)' : 'none',
    textAlign: 'start',
  };

  if (onClick) {
    return <button onClick={onClick} style={{ ...rowStyle, cursor: 'pointer' }}>{content}</button>;
  }
  return <div style={rowStyle}>{content}</div>;
}

function StatCard({ value, label, color, bg, border }: { value: number; label: string; color: string; bg: string; border: string }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 18, padding: '16px 10px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 26, color, lineHeight: 1, direction: 'ltr' }}>
        {toEnglishNumerals(value)}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 11.5, color: '#9CA6BD', marginTop: 7, lineHeight: 1.5 }}>
        {label}
      </div>
    </div>
  );
}

function AddItemInput({ placeholder, onAdd }: { placeholder: string; onAdd: (val: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); }
        }}
        placeholder={placeholder}
        style={{
          flex: 1, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 12, color: '#EAF2EE', fontFamily: 'var(--font-body)', fontSize: 13,
          padding: '9px 13px', outline: 'none', direction: 'rtl',
        }}
      />
      <button
        onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }}
        style={{
          background: 'rgba(93,205,165,.1)', border: '1px solid rgba(93,205,165,.3)',
          borderRadius: 12, color: '#5DCDA5', fontFamily: 'var(--font-body)', fontSize: 15,
          cursor: 'pointer', padding: '9px 16px', flexShrink: 0,
        }}
      >
        +
      </button>
    </div>
  );
}

function FactChip({ tag, iconBg, iconColor, text, onDelete }: {
  tag: string; iconBg: string; iconColor: string; text: string; onDelete: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16 }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, flexShrink: 0, marginTop: 1 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 11, color: iconColor, marginBottom: 3, letterSpacing: 0.3 }}>{tag}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14, lineHeight: 1.6, color: '#D2DAE6' }}>{text}</div>
      </div>
      <button
        onClick={onDelete}
        aria-label="حذف هذه المعلومة"
        style={{ width: 26, height: 26, borderRadius: 8, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#808AA0', flexShrink: 0, cursor: 'pointer' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<Settings>({
    name: '',
    timezone: 'Asia/Baghdad',
    bedtimeHour: 23,
    reminderEnabled: true,
    voiceEnabled: true,
    profileSummary: null,
  });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [profile, setProfile] = useState<UserProfile>({
    triggers: [], copingWorks: [], patterns: [], goals: [], tone: '',
  });

  const [journeyStart, setJourneyStart] = useState<string | null>(null);
  const [streakStats, setStreakStats] = useState<{ longestStreak: number; totalCleanDays: number } | null>(null);
  const [entryCount, setEntryCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: { settings?: Settings }) => {
        if (d.settings) {
          setForm({
            name: d.settings.name ?? '',
            timezone: d.settings.timezone ?? 'Asia/Baghdad',
            bedtimeHour: d.settings.bedtimeHour ?? null,
            reminderEnabled: d.settings.reminderEnabled ?? true,
            voiceEnabled: d.settings.voiceEnabled ?? true,
            profileSummary: d.settings.profileSummary ?? null,
          });
        }
      })
      .catch(() => {/* سيبقى النموذج بقيمه الافتراضية */})
      .finally(() => setLoading(false));

    fetch('/api/streak')
      .then((r) => r.json())
      .then((d: { stats?: { longestStreak: number; totalCleanDays: number }; allStreaks?: { startDate: string }[] }) => {
        if (d.stats) setStreakStats(d.stats);
        if (d.allStreaks?.length) setJourneyStart(d.allStreaks[0].startDate);
      })
      .catch(() => {});

    fetch('/api/journal?limit=1')
      .then((r) => r.json())
      .then((d: { total?: number }) => { if (typeof d.total === 'number') setEntryCount(d.total); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.profileSummary) return;
    try {
      const parsed = JSON.parse(form.profileSummary) as Partial<UserProfile>;
      setProfile({
        triggers: parsed.triggers ?? [],
        copingWorks: parsed.copingWorks ?? [],
        patterns: parsed.patterns ?? [],
        goals: parsed.goals ?? [],
        tone: parsed.tone ?? '',
      });
    } catch { /* invalid JSON — keep current profile state */ }
  }, [form.profileSummary]);

  const syncProfileToForm = useCallback((updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    setForm(p => ({ ...p, profileSummary: JSON.stringify(updatedProfile) }));
  }, []);

  const handleSave = useCallback(async () => {
    if (saveState === 'saving') return;
    setSaveState('saving');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('failed');
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }, [form, saveState]);

  const handleLock = async () => {
    await fetch('/api/auth/lock', { method: 'POST' });
    router.push('/unlock');
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,.2)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: 12,
    color: '#EAF2EE',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    padding: '9px 14px',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    cursor: 'pointer',
    paddingLeft: 30,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7A8C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '9px center',
  };

  const initial = form.name.trim().charAt(0) || 'ن';
  const journeyDate = journeyStart
    ? toEnglishNumerals(new Date(journeyStart).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'long', year: 'numeric' }))
    : null;

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 0.15, 0.3].map((d, i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#5DCDA5', animation: `blink 1.2s ease-in-out ${d}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 22px 8px', direction: 'rtl' }}>

      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
        <button
          onClick={() => router.back()}
          aria-label="رجوع"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9CA6BD', flexShrink: 0,
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20, color: '#EAF2EE' }}>رحلتي</h1>
      </div>

      {/* ─── Identity ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 26 }}>
        <div style={{ position: 'relative', width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <div aria-hidden style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: 'radial-gradient(circle, rgba(46,190,128,.32), transparent 70%)' }} />
          <div style={{ position: 'relative', width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(140deg,#2EBE80,#259696 55%,#376EC8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 36, color: '#EAF2EE', boxShadow: '0 10px 28px -6px rgba(46,190,128,.35)' }}>
            {initial}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20, color: '#EAF2EE', marginBottom: 4 }}>
          {form.name.trim() ? `رحلة ${form.name.trim()}` : 'رحلتي نحو ذاتي'}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, color: '#9CA6BD' }}>
          {journeyDate ? `بدأت الرحلة في ${journeyDate}` : 'رحلتك بدأت للتو'}
        </div>
      </div>

      {/* ─── Stats grid ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard value={streakStats?.longestStreak ?? 0} label="أطول فترة حضور" color="#5DCDA5" bg="rgba(46,190,128,.07)" border="rgba(46,190,128,.2)" />
        <StatCard value={streakStats?.totalCleanDays ?? 0} label="إجمالي الأيام النظيفة" color="#6E9BE8" bg="rgba(55,110,200,.07)" border="rgba(55,110,200,.2)" />
        <StatCard value={entryCount ?? 0} label="عدد المذكرات" color="#8B7EE8" bg="rgba(74,60,180,.09)" border="rgba(74,60,180,.24)" />
      </div>

      {/* ─── الملف الشخصي ─────────────────────────────────────────────────── */}
      <SectionLabel>الملف الشخصي</SectionLabel>
      <div style={{ ...CARD, overflow: 'hidden', marginBottom: 22 }}>
        <SettingsRow
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" strokeLinecap="round" /></svg>}
          iconBg="rgba(46,190,128,.14)" iconColor="#5DCDA5"
          label="الاسم" hint="يُستخدم في المحادثة مع رفيقك"
          trailing={
            <input
              type="text" value={form.name} maxLength={40}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="اسمك"
              style={{ ...inputStyle, width: 110, textAlign: 'center' }}
            />
          }
        />
        <SettingsRow
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a13 13 0 010 18a13 13 0 010-18z" /></svg>}
          iconBg="rgba(55,110,200,.14)" iconColor="#6E9BE8"
          label="المنطقة الزمنية" hint="لحساب التوقيت بدقة"
          trailing={
            <select value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} style={{ ...selectStyle, width: 150 }}>
              {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          }
        />
        <SettingsRow
          border={false}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z" strokeLinejoin="round" /></svg>}
          iconBg="rgba(74,60,180,.18)" iconColor="#8B7EE8"
          label="ساعة النوم المعتادة" hint="لتحليل أنماط اليقظة الليلية"
          trailing={
            <select
              value={form.bedtimeHour ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, bedtimeHour: e.target.value === '' ? null : parseInt(e.target.value) }))}
              style={{ ...selectStyle, width: 108 }}
            >
              <option value="">— لا أعرف —</option>
              {HOURS.slice(18).concat(HOURS.slice(0, 6)).map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          }
        />
      </div>

      {/* ─── رفيقك في الرحلة ──────────────────────────────────────────────── */}
      <SectionLabel>رفيقك في الرحلة</SectionLabel>
      <div style={{ ...CARD, padding: 17, marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14.5, color: '#EAF2EE', marginBottom: 3 }}>نبرة رفيقك</div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 12.5, lineHeight: 1.7, color: '#939DB4', marginBottom: 14 }}>
          كيف تحبّ أن يخاطبك — اختر نبرة جاهزة أو صف نبرتك الخاصة.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
          {TONE_PRESETS.map((t) => {
            const active = profile.tone === t.title;
            return (
              <button
                key={t.key}
                onClick={() => syncProfileToForm({ ...profile, tone: t.title })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px',
                  borderRadius: 14, cursor: 'pointer', textAlign: 'start',
                  background: active ? 'rgba(93,205,165,.1)' : 'rgba(255,255,255,.03)',
                  border: `1px solid ${active ? 'rgba(93,205,165,.4)' : 'rgba(255,255,255,.07)'}`,
                  transition: 'all 0.4s ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: active ? '#EAF2EE' : '#C6D0DE' }}>{t.title}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 12, color: '#939DB4', marginTop: 2 }}>{t.desc}</div>
                </div>
                {active && (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#5DCDA5" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={profile.tone}
          onChange={(e) => syncProfileToForm({ ...profile, tone: e.target.value })}
          placeholder="أو صف نبرة مخصّصة..."
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', direction: 'rtl' }}
        />
      </div>

      {/* ─── ما يعرفه عنك رفيقك ───────────────────────────────────────────── */}
      <SectionLabel>ما يعرفه عنك رفيقك</SectionLabel>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 12.5, color: '#939DB4', lineHeight: 1.7, marginBottom: 14 }}>
          هذا ما تعلّمه رفيقك عنك عبر محادثاتكم. يمكنك تعديله أو حذفه في أي وقت.
        </div>

        {!form.profileSummary ? (
          <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '34px 22px' }}>
            <span style={{ width: 50, height: 50, borderRadius: 15, background: 'rgba(37,150,150,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3FB6B6', marginBottom: 14 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3c-4.5 0-8 3.1-8 7 0 2.1 1 4 2.7 5.2L6 20l4.2-2.1c.6.1 1.2.1 1.8.1 4.5 0 8-3.1 8-7s-3.5-7-8-7z" strokeLinejoin="round" />
              </svg>
            </span>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 15, color: '#EAF2EE', marginBottom: 6 }}>رفيقك ما زال يتعرّف عليك</div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 13, lineHeight: 1.8, color: '#B6BFCF', maxWidth: 250 }}>
              كلّما تحدّثتما أكثر، تعلّم عنك بلطف.
            </div>
          </div>
        ) : (
          <>
            {PROFILE_CATEGORIES.map(({ key, label, tag, iconBg, iconColor }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#A8B8C4', fontWeight: 600, marginBottom: 8 }}>{label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  {profile[key].map((item, idx) => (
                    <FactChip
                      key={idx}
                      tag={tag}
                      iconBg={iconBg}
                      iconColor={iconColor}
                      text={item}
                      onDelete={() => syncProfileToForm({ ...profile, [key]: profile[key].filter((_, i) => i !== idx) })}
                    />
                  ))}
                </div>
                <AddItemInput
                  placeholder={`أضف ${label}...`}
                  onAdd={(val) => syncProfileToForm({ ...profile, [key]: [...profile[key], val] })}
                />
              </div>
            ))}

            <button
              onClick={() => {
                setForm(p => ({ ...p, profileSummary: null }));
                setProfile({ triggers: [], copingWorks: [], patterns: [], goals: [], tone: '' });
              }}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,.1)', borderRadius: 50,
                color: '#909BB2', fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer', padding: '7px 16px',
              }}
            >
              حذف الملف الشخصي
            </button>
          </>
        )}
      </div>

      {/* ─── الإعدادات ─────────────────────────────────────────────────────── */}
      <SectionLabel>الإعدادات</SectionLabel>
      <div style={{ ...CARD, overflow: 'hidden', marginBottom: 22 }}>
        <SettingsRow
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" strokeLinejoin="round" /><path d="M10 20a2 2 0 004 0" strokeLinecap="round" /></svg>}
          iconBg="rgba(37,150,150,.16)" iconColor="#3FB6B6"
          label="التذكيرات" hint="تذكيرات يومية للتسجيل والمتابعة"
          trailing={<Toggle checked={form.reminderEnabled} onChange={(v) => setForm((p) => ({ ...p, reminderEnabled: v }))} />}
        />
        <SettingsRow
          border={false}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0014 0" strokeLinecap="round" /><line x1="12" y1="19" x2="12" y2="22" strokeLinecap="round" /></svg>}
          iconBg="rgba(55,110,200,.14)" iconColor="#6E9BE8"
          label="الصوت" hint="تشغيل الردود الصوتية في المحادثة"
          trailing={<Toggle checked={form.voiceEnabled} onChange={(v) => setForm((p) => ({ ...p, voiceEnabled: v }))} />}
        />
      </div>

      {/* ─── حين تحتاج سندًا ──────────────────────────────────────────────── */}
      <SectionLabel>حين تحتاج سندًا</SectionLabel>
      <div style={{ ...CARD, overflow: 'hidden', marginBottom: 22 }}>
        <SettingsRow
          onClick={() => router.push('/sos')}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" strokeLinejoin="round" /><path d="M9 11.5l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          iconBg="rgba(93,205,165,.14)" iconColor="#5DCDA5"
          label="خطتي للتعافي"
          chevron
        />
        <SettingsRow
          border={false}
          onClick={() => router.push('/sos')}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M18.5 13.5a7 7 0 10-13 0M12 3v2M4 12H2M22 12h-2M5.5 5.5l1.5 1.5M17 7l1.5-1.5" strokeLinecap="round" /><path d="M4 15a2 2 0 012 2v1a2 2 0 01-4 0v-1a2 2 0 012-2zM20 15a2 2 0 012 2v1a2 2 0 01-4 0v-1a2 2 0 012-2z" strokeLinejoin="round" /></svg>}
          iconBg="rgba(55,110,200,.14)" iconColor="#6E9BE8"
          label="خطوط الدعم والمساعدة"
          chevron
        />
      </div>

      {/* ─── حفظ ──────────────────────────────────────────────────────────── */}
      <button
        onClick={handleSave}
        disabled={saveState === 'saving'}
        style={{
          width: '100%', padding: '15px', minHeight: 44,
          background: saveState === 'saved' ? 'rgba(93,205,165,.15)' : saveState === 'error' ? 'rgba(216,90,48,.12)' : 'linear-gradient(135deg,#2EBE80,#259696)',
          border: saveState === 'saved' ? '1px solid rgba(93,205,165,.5)' : saveState === 'error' ? '1px solid rgba(216,90,48,.4)' : 'none',
          borderRadius: 24,
          color: saveState === 'saved' ? '#5DCDA5' : saveState === 'error' ? '#D85A30' : '#0D1220',
          fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
          cursor: saveState === 'saving' ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: saveState === 'saving' ? 0.7 : 1,
          marginBottom: 14,
        }}
      >
        {saveState === 'saving' ? 'جاري الحفظ...' : saveState === 'saved' ? '✓ تم الحفظ' : saveState === 'error' ? 'فشل الحفظ — حاول مجدداً' : 'حفظ الإعدادات'}
      </button>

      {/* ─── قفل التطبيق ──────────────────────────────────────────────────── */}
      <button
        onClick={handleLock}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          padding: '15px', minHeight: 44, marginBottom: 22,
          background: 'rgba(176,137,104,.08)', border: '1px solid rgba(176,137,104,.26)',
          borderRadius: 18, cursor: 'pointer', color: '#D8B99C',
          fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 14.5,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        قفل التطبيق
      </button>

      {/* ─── تذييل ────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 12, color: '#6E7893', lineHeight: 1.9, marginBottom: 16 }}>
        كل خطوة تُحتسب. أنت لست وحدك.<br />Neuchapter · الإصدار 1.0
      </div>
    </div>
  );
}
