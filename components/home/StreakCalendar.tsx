'use client';

import { useState } from 'react';
import { toEnglishNumerals } from '@/lib/utils';

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// أحد → سبت
const DAYS_AR = ['أح', 'إث', 'ث', 'أر', 'خ', 'ج', 'س'];

interface StreakRecord {
  id: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  relapseDate: string | null;
}

type DayType = 'active' | 'completed' | 'relapse' | 'today' | 'future' | 'empty';

function utcMidnight(year: number, month: number, day: number): number {
  return Date.UTC(year, month, day);
}

function getDayType(year: number, month: number, day: number, streaks: StreakRecord[]): DayType {
  const now = new Date();
  const todayMs = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dateMs = utcMidnight(year, month, day);

  if (dateMs > todayMs) return 'future';

  for (const s of streaks) {
    if (s.relapseDate) {
      const rd = new Date(s.relapseDate);
      const rMs = utcMidnight(rd.getUTCFullYear(), rd.getUTCMonth(), rd.getUTCDate());
      if (dateMs === rMs) return 'relapse';
    }
  }

  for (const s of streaks) {
    const sd = new Date(s.startDate);
    const startMs = utcMidnight(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate());
    const endMs = s.endDate
      ? (() => { const ed = new Date(s.endDate); return utcMidnight(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate()); })()
      : todayMs;

    if (dateMs >= startMs && dateMs <= endMs) {
      if (dateMs === todayMs) return 'today';
      return s.isActive ? 'active' : 'completed';
    }
  }

  return 'empty';
}

type MintCategory = 'clean' | 'relapse' | 'future' | 'empty';

/** يوم واحد بمعايير شاشة "سجلّي": الفئة والـ"هل هو اليوم" منفصلان، بخلاف gold/DayType. */
function getMintDayInfo(
  year: number,
  month: number,
  day: number,
  streaks: StreakRecord[],
): { category: MintCategory; isToday: boolean } {
  const now = new Date();
  const todayMs = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dateMs = utcMidnight(year, month, day);
  const isToday = dateMs === todayMs;

  if (dateMs > todayMs) return { category: 'future', isToday: false };

  for (const s of streaks) {
    if (s.relapseDate) {
      const rd = new Date(s.relapseDate);
      const rMs = utcMidnight(rd.getUTCFullYear(), rd.getUTCMonth(), rd.getUTCDate());
      if (dateMs === rMs) return { category: 'relapse', isToday };
    }
  }

  for (const s of streaks) {
    const sd = new Date(s.startDate);
    const startMs = utcMidnight(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate());
    const endMs = s.endDate
      ? (() => { const ed = new Date(s.endDate!); return utcMidnight(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate()); })()
      : todayMs;
    if (dateMs >= startMs && dateMs <= endMs) return { category: 'clean', isToday };
  }

  return { category: 'empty', isToday };
}

function mintCellStyle(category: MintCategory, isToday: boolean): React.CSSProperties {
  if (category === 'clean' && isToday) {
    return { border: '2px solid #5DCDA5', background: 'rgba(93,205,165,.08)', color: '#EAF2EE', fontWeight: 700, cursor: 'pointer' };
  }
  if (category === 'relapse' && isToday) {
    return { border: '2px solid #5DCDA5', background: 'rgba(176,137,104,.18)', color: '#E8D9C8', fontWeight: 700, cursor: 'pointer' };
  }
  if (category === 'clean') {
    return { border: '1px solid rgba(46,190,128,.3)', background: 'rgba(46,190,128,.15)', color: '#EAF2EE', fontWeight: 600, cursor: 'pointer' };
  }
  if (category === 'relapse') {
    return { border: '1px solid rgba(176,137,104,.4)', background: 'rgba(176,137,104,.16)', color: '#E8D9C8', fontWeight: 600, cursor: 'pointer' };
  }
  if (category === 'future') return { color: 'rgba(107,128,128,.35)' };
  return { color: 'var(--text-muted)', opacity: 0.3 };
}

function mintMarker(category: MintCategory, isToday: boolean): { glyph: string; color: string } {
  if (category === 'relapse') return { glyph: '◇', color: '#D8B99C' };
  if (category === 'clean' && isToday) return { glyph: '•', color: '#5DCDA5' };
  if (category === 'clean') return { glyph: '✓', color: '#5DCDA5' };
  return { glyph: '', color: 'transparent' };
}

interface Props {
  streaks: StreakRecord[];
  /** 'gold' (default) = المظهر الأصلي في الرئيسية. 'mint' = شاشة سجلّي: علامات شكلية + إمكانية الضغط على اليوم. */
  variant?: 'gold' | 'mint';
  /** يُستدعى فقط للأيام غير المستقبلية/غير الفارغة (mint فقط). */
  onDaySelect?: (date: Date, category: 'clean' | 'relapse', isToday: boolean) => void;
}

export function StreakCalendar({ streaks, variant = 'gold', onDaySelect }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    const futureLimit = today.getMonth() === 11
      ? { y: today.getFullYear() + 1, m: 0 }
      : { y: today.getFullYear(), m: today.getMonth() + 1 };
    if (viewYear > futureLimit.y || (viewYear === futureLimit.y && viewMonth >= futureLimit.m)) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // إنشاء خلايا الشبكة
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayStyles: Record<DayType, React.CSSProperties> = {
    active: { background: 'var(--gold-primary)', color: 'var(--bg-deep)', fontWeight: 700 },
    completed: { background: 'rgba(46, 190, 128, 0.18)', color: 'var(--accent-emerald)', fontWeight: 600 },
    relapse: { background: 'rgba(216,90,48,0.15)', color: 'var(--alert-warm)', fontWeight: 600 },
    today: {
      background: 'var(--gold-primary)',
      color: 'var(--bg-deep)',
      fontWeight: 700,
      boxShadow: '0 0 0 2px var(--gold-deep), 0 0 12px rgba(46,190,128,0.5)',
    },
    future: { color: 'rgba(107,128,128,0.35)' },
    empty: { color: 'var(--text-muted)', opacity: 0.3 },
  };

  const isMint = variant === 'mint';
  const navBtnColor = isMint ? '#9CA6BD' : 'var(--gold-primary)';
  const navBtnBg = isMint ? 'rgba(255,255,255,.04)' : 'var(--gold-faint)';
  const navBtnBorder = isMint ? '1px solid rgba(255,255,255,.08)' : '1px solid var(--border-soft)';

  return (
    <div
      style={
        isMint
          ? { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 20, padding: '18px 16px', marginBottom: 18 }
          : { background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-card)', padding: '18px 16px', marginBottom: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
      }
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={prevMonth}
          aria-label="الشهر السابق"
          style={{
            background: navBtnBg,
            border: navBtnBorder,
            borderRadius: isMint ? '50%' : 8,
            color: navBtnColor,
            width: isMint ? 36 : 32,
            height: isMint ? 36 : 32,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ‹
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              fontFamily: isMint ? 'var(--font-body)' : 'var(--font-display)',
              fontSize: isMint ? 17 : 15,
              color: isMint ? '#EAF2EE' : 'var(--text-primary)',
              fontWeight: 700,
            }}
          >
            {MONTHS_AR[viewMonth]} {toEnglishNumerals(viewYear)}
          </div>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              style={{
                background: navBtnBg,
                border: isMint ? navBtnBorder : '1px solid var(--border-mid)',
                borderRadius: 6,
                color: navBtnColor,
                fontSize: 10,
                padding: '2px 8px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              اليوم
            </button>
          )}
        </div>

        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="الشهر التالي"
          style={{
            background: isCurrentMonth ? 'transparent' : navBtnBg,
            border: isCurrentMonth ? '1px solid transparent' : navBtnBorder,
            borderRadius: isMint ? '50%' : 8,
            color: isCurrentMonth ? 'var(--text-muted)' : navBtnColor,
            width: isMint ? 36 : 32,
            height: isMint ? 36 : 32,
            cursor: isCurrentMonth ? 'default' : 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ›
        </button>
      </div>

      {/* أيام الأسبوع */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMint ? 6 : 4, marginBottom: 6 }}>
        {DAYS_AR.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              fontSize: isMint ? 12 : 10,
              color: isMint ? '#808AA0' : 'var(--text-muted)',
              padding: '2px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* الأيام */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: variant === 'mint' ? 6 : 4 }}>
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} />;
          }

          if (variant === 'mint') {
            const { category, isToday } = getMintDayInfo(viewYear, viewMonth, day, streaks);
            const style = mintCellStyle(category, isToday);
            const marker = mintMarker(category, isToday);
            const clickable = category === 'clean' || category === 'relapse';

            return (
              <button
                key={day}
                type="button"
                disabled={!clickable}
                aria-label={`${day} — ${category === 'clean' ? 'نظيف' : category === 'relapse' ? 'انتكاسة' : 'لا بيانات'}${isToday ? ' · اليوم' : ''}`}
                onClick={() => {
                  if (!clickable || !onDaySelect) return;
                  onDaySelect(new Date(Date.UTC(viewYear, viewMonth, day)), category, isToday);
                }}
                style={{
                  aspectRatio: '1',
                  borderRadius: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  direction: 'ltr',
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  transition: 'all 0.2s',
                  animation: isToday ? 'gentlePulse 4s ease-in-out infinite' : undefined,
                  ...style,
                }}
              >
                <span>{toEnglishNumerals(day)}</span>
                <span style={{ fontSize: 9, lineHeight: 1, height: 9, color: marker.color }}>{marker.glyph}</span>
              </button>
            );
          }

          const dtype = getDayType(viewYear, viewMonth, day, streaks);
          const style = dayStyles[dtype];
          const isToday = dtype === 'today';

          return (
            <div
              key={day}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                position: 'relative',
                animation: isToday ? 'gentlePulse 4s ease-in-out infinite' : undefined,
                transition: 'all 0.2s',
                ...style,
              }}
            >
              {toEnglishNumerals(day)}
              {dtype === 'relapse' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--alert-warm)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 14,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {(variant === 'mint'
          ? [
              { label: 'نظيف', swatch: <span style={{ width: 18, height: 18, borderRadius: 6, background: 'rgba(46,190,128,.16)', border: '1px solid rgba(46,190,128,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5DCDA5', fontSize: 10 }}>✓</span> },
              { label: 'انتكاسة', swatch: <span style={{ width: 18, height: 18, borderRadius: 6, background: 'rgba(176,137,104,.18)', border: '1px solid rgba(176,137,104,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D8B99C', fontSize: 10 }}>◇</span> },
              { label: 'اليوم', swatch: <span style={{ width: 18, height: 18, borderRadius: 6, border: '2px solid #5DCDA5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5DCDA5', fontSize: 9 }}>•</span> },
            ]
          : [
              { color: 'var(--gold-primary)', label: 'نظيف' },
              { color: 'rgba(127,168,140,0.4)', label: 'سابق' },
              { color: 'rgba(216,90,48,0.4)', label: 'انتكاسة' },
            ]
        ).map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: variant === 'mint' ? 7 : 4 }}>
            {'swatch' in item ? item.swatch : <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color }} />}
            <span style={{ fontFamily: 'var(--font-body)', fontSize: variant === 'mint' ? 12.5 : 10, color: variant === 'mint' ? '#B6BFCF' : 'var(--text-muted)' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
