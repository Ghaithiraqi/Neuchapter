'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
  const display = i === 0 ? `١٢ ${period}` : i < 13 ? `${i} ${period}` : `${i - 12} ${period}`;
  return { value: i, label: display };
});

function AddItemInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (val: string) => void;
}) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && val.trim()) {
            onAdd(val.trim());
            setVal('');
          }
        }}
        placeholder={placeholder}
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--radius-input)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          padding: '7px 12px',
          outline: 'none',
          flex: 1,
          direction: 'rtl',
        }}
      />
      <button
        onClick={() => {
          if (val.trim()) {
            onAdd(val.trim());
            setVal('');
          }
        }}
        style={{
          background: 'var(--gold-faint)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--radius-input)',
          color: 'var(--gold-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          cursor: 'pointer',
          padding: '7px 14px',
          flexShrink: 0,
        }}
      >
        +
      </button>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        background: checked ? 'var(--gold-primary)' : 'var(--bg-input)',
        border: `1px solid ${checked ? 'var(--gold-deep)' : 'var(--border-mid)'}`,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.25s ease, border-color 0.25s ease',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          right: checked ? 3 : undefined,
          left: checked ? undefined : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: checked ? '#1A3D3D' : 'var(--text-muted)',
          transition: 'left 0.25s ease, right 0.25s ease, background 0.25s ease',
        }}
      />
    </button>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 0',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 3,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

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

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-mid)',
    borderRadius: 'var(--radius-input)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    padding: '9px 14px',
    outline: 'none',
    width: '100%',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none',
    cursor: 'pointer',
    paddingLeft: 32,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B8080' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '10px center',
  };

  const dividerStyle: React.CSSProperties = {
    height: 1,
    background: 'var(--border-soft)',
    margin: '0 -20px',
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 0.15, 0.3].map((d, i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--gold-primary)',
                animation: `blink 1.2s ease-in-out ${d}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px 20px',
        maxWidth: 420,
        margin: '0 auto',
        direction: 'rtl',
      }}
    >
      {/* زر الرجوع */}
      <button
        onClick={() => router.back()}
        style={{
          background: 'var(--gold-faint)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--radius-button)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          cursor: 'pointer',
          padding: '7px 16px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        ← رجوع
      </button>

      {/* الهيدر */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            color: 'var(--text-primary)',
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          الإعدادات
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
          }}
        >
          خصّص التطبيق حسب احتياجاتك
        </p>
      </div>

      {/* قسم الملف الشخصي */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-card)',
          padding: '4px 20px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--gold-primary)',
            fontWeight: 700,
            letterSpacing: 0.8,
            padding: '16px 0 0',
            textTransform: 'uppercase',
          }}
        >
          الملف الشخصي
        </div>

        <FieldRow label="الاسم" hint="يُستخدم في المحادثة مع المساعد">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="اسمك"
            maxLength={40}
            style={{ ...inputStyle, width: 140 }}
          />
        </FieldRow>

        <div style={dividerStyle} />

        <FieldRow label="المنطقة الزمنية" hint="لحساب التوقيت بدقة">
          <select
            value={form.timezone}
            onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
            style={{ ...selectStyle, width: 170 }}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </FieldRow>

        <div style={{ height: 8 }} />
      </div>

      {/* قسم النوم */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-card)',
          padding: '4px 20px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--gold-primary)',
            fontWeight: 700,
            letterSpacing: 0.8,
            padding: '16px 0 0',
          }}
        >
          النوم والروتين
        </div>

        <FieldRow
          label="ساعة النوم المعتادة"
          hint="لتحليل أنماط اليقظة الليلية"
        >
          <select
            value={form.bedtimeHour ?? ''}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                bedtimeHour: e.target.value === '' ? null : parseInt(e.target.value),
              }))
            }
            style={{ ...selectStyle, width: 120 }}
          >
            <option value="">— لا أعرف —</option>
            {HOURS.slice(18).concat(HOURS.slice(0, 6)).map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </FieldRow>

        <div style={{ height: 8 }} />
      </div>

      {/* قسم التفضيلات */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-card)',
          padding: '4px 20px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--gold-primary)',
            fontWeight: 700,
            letterSpacing: 0.8,
            padding: '16px 0 0',
          }}
        >
          التفضيلات
        </div>

        <FieldRow
          label="التذكيرات"
          hint="تذكيرات يومية للتسجيل والمتابعة"
        >
          <Toggle
            checked={form.reminderEnabled}
            onChange={(v) => setForm((p) => ({ ...p, reminderEnabled: v }))}
          />
        </FieldRow>

        <div style={dividerStyle} />

        <FieldRow
          label="الصوت"
          hint="تشغيل الردود الصوتية في المحادثة"
        >
          <Toggle
            checked={form.voiceEnabled}
            onChange={(v) => setForm((p) => ({ ...p, voiceEnabled: v }))}
          />
        </FieldRow>

        <div style={{ height: 8 }} />
      </div>

      {/* ما يعرفه عنك رفيقك */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-card)',
          padding: '4px 20px',
          marginBottom: 32,
          direction: 'rtl',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--gold-primary)',
            fontWeight: 700,
            letterSpacing: 0.8,
            padding: '16px 0 0',
          }}
        >
          ما يعرفه عنك رفيقك
        </div>

        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            padding: '10px 0 14px',
          }}
        >
          هذا ما تعلّمه رفيقك عنك عبر محادثاتكم. يمكنك تعديله أو حذفه في أي وقت.
        </div>

        {!form.profileSummary ? (
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-muted)',
              paddingBottom: 16,
              fontStyle: 'italic',
            }}
          >
            لم تكتمل محادثة كافية بعد لبناء ملفك الشخصي.
          </div>
        ) : (
          <div style={{ paddingBottom: 16 }}>
            {(
              [
                { key: 'triggers', label: 'المحفّزات' },
                { key: 'copingWorks', label: 'ما ينجح معك' },
                { key: 'patterns', label: 'الأنماط' },
                { key: 'goals', label: 'الأهداف' },
              ] as { key: keyof Pick<UserProfile, 'triggers' | 'copingWorks' | 'patterns' | 'goals'>; label: string }[]
            ).map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  {label}
                </div>
                {profile[key].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        flex: 1,
                      }}
                    >
                      {item}
                    </span>
                    <button
                      onClick={() => {
                        const updated = { ...profile, [key]: profile[key].filter((_, i) => i !== idx) };
                        syncProfileToForm(updated);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        fontSize: 14,
                        lineHeight: 1,
                        padding: '2px 6px',
                        flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <AddItemInput
                  placeholder={`أضف ${label}...`}
                  onAdd={(val) => {
                    const updated = { ...profile, [key]: [...profile[key], val] };
                    syncProfileToForm(updated);
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                نبرة التواصل
              </div>
              <input
                type="text"
                value={profile.tone}
                onChange={(e) => {
                  const updated = { ...profile, tone: e.target.value };
                  syncProfileToForm(updated);
                }}
                placeholder="مثال: مباشر وصريح، أو دافئ وصبور..."
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-mid)',
                  borderRadius: 'var(--radius-input)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  padding: '8px 12px',
                  outline: 'none',
                  width: '100%',
                  direction: 'rtl',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={() => {
                setForm(p => ({ ...p, profileSummary: null }));
                setProfile({ triggers: [], copingWorks: [], patterns: [], goals: [], tone: '' });
              }}
              style={{
                background: 'none',
                border: '1px solid var(--border-mid)',
                borderRadius: 'var(--radius-button)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                cursor: 'pointer',
                padding: '6px 14px',
                marginTop: 8,
              }}
            >
              حذف الملف الشخصي
            </button>
          </div>
        )}
      </div>

      {/* زر الحفظ */}
      <button
        onClick={handleSave}
        disabled={saveState === 'saving'}
        style={{
          width: '100%',
          padding: '15px',
          background:
            saveState === 'saved'
              ? 'rgba(127,168,140,0.25)'
              : saveState === 'error'
              ? 'rgba(216,90,48,0.15)'
              : 'var(--gold-primary)',
          border:
            saveState === 'saved'
              ? '1px solid rgba(127,168,140,0.5)'
              : saveState === 'error'
              ? '1px solid rgba(216,90,48,0.4)'
              : 'none',
          borderRadius: 'var(--radius-button)',
          color:
            saveState === 'saved'
              ? '#7FA88C'
              : saveState === 'error'
              ? 'var(--alert-warm)'
              : '#1A3D3D',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 700,
          cursor: saveState === 'saving' ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: saveState === 'saving' ? 0.7 : 1,
        }}
      >
        {saveState === 'saving'
          ? 'جاري الحفظ...'
          : saveState === 'saved'
          ? '✓ تم الحفظ'
          : saveState === 'error'
          ? 'فشل الحفظ — حاول مجدداً'
          : 'حفظ الإعدادات'}
      </button>

      {/* مساحة سفلية */}
      <div style={{ height: 24 }} />
    </div>
  );
}
