'use client';

import { useState } from 'react';
import { toArabicNumerals } from '@/lib/utils';

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

interface Props {
  streaks: StreakRecord[];
}

export function StreakCalendar({ streaks }: Props) {
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
    active: { background: 'var(--gold-primary)', color: '#1A3D3D', fontWeight: 700 },
    completed: { background: 'rgba(127, 168, 140, 0.35)', color: '#7FA88C', fontWeight: 600 },
    relapse: { background: 'rgba(216,90,48,0.15)', color: 'var(--alert-warm)', fontWeight: 600 },
    today: {
      background: 'var(--gold-primary)',
      color: '#1A3D3D',
      fontWeight: 700,
      boxShadow: '0 0 0 2px var(--gold-deep), 0 0 12px rgba(232,184,114,0.5)',
    },
    future: { color: 'rgba(107,128,128,0.35)' },
    empty: { color: 'var(--text-muted)', opacity: 0.3 },
  };

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-card)',
        padding: '18px 16px',
        marginBottom: 18,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={prevMonth}
          style={{
            background: 'var(--gold-faint)',
            border: '1px solid var(--border-soft)',
            borderRadius: 8,
            color: 'var(--gold-primary)',
            width: 32,
            height: 32,
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
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              color: 'var(--text-primary)',
              fontWeight: 600,
            }}
          >
            {MONTHS_AR[viewMonth]} {toArabicNumerals(viewYear)}
          </div>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              style={{
                background: 'var(--gold-faint)',
                border: '1px solid var(--border-mid)',
                borderRadius: 6,
                color: 'var(--gold-primary)',
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
          style={{
            background: isCurrentMonth ? 'transparent' : 'var(--gold-faint)',
            border: `1px solid ${isCurrentMonth ? 'transparent' : 'var(--border-soft)'}`,
            borderRadius: 8,
            color: isCurrentMonth ? 'var(--text-muted)' : 'var(--gold-primary)',
            width: 32,
            height: 32,
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {DAYS_AR.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              color: 'var(--text-muted)',
              padding: '2px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* الأيام */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} />;
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
              {toArabicNumerals(day)}
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
        {[
          { color: 'var(--gold-primary)', label: 'نظيف' },
          { color: 'rgba(127,168,140,0.4)', label: 'سابق' },
          { color: 'rgba(216,90,48,0.4)', label: 'انتكاسة' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
