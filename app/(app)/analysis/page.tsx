'use client';

import { useEffect, useState } from 'react';
import { LTR } from '@/components/shared/LTR';
import { toArabicNumerals } from '@/lib/utils';

interface Metrics {
  attendance: string;
  resilience: number;
  sessions: number;
  moodAvg: number;
}

interface Pattern {
  id: number;
  type: string;
  tag: string;
  confidence: number;
  title: string;
  explanation: string;
  recommendation?: string;
}

interface Analysis {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  metrics: Metrics;
  patterns: Pattern[];
  aiInsights: string;
}

const DEMO_ANALYSIS: Analysis = {
  weekStart: '',
  weekEnd: '',
  weekNumber: 18,
  metrics: { attendance: '٦/٧', resilience: 11, sessions: 5, moodAvg: 5.8 },
  patterns: [
    {
      id: 1,
      type: 'primary',
      tag: 'نمط · ٠١',
      confidence: 87,
      title: '٧٠٪ من اللحظات الصعبة تحدث بين ١٢ منتصف الليل و٣ فجراً',
      explanation:
        'هذا نمط واضح ومتكرر. الجهاز العصبي في ساعات الإرهاق يكون أقل قدرة على المقاومة، ومستويات الكورتيزول تنخفض.',
      recommendation: 'النوم قبل الساعة ١١ مساءً، الهاتف خارج الغرفة.',
    },
    {
      id: 2,
      type: 'success',
      tag: 'تقدم · ٠٢',
      confidence: 100,
      title: 'ثلاث ليالٍ متتالية تجاوزت فيها لحظات قوية',
      explanation:
        'في الأحد والإثنين والثلاثاء، اخترت طريقاً آخر. هذا تدريب حقيقي لمسارات عصبية جديدة.',
    },
    {
      id: 3,
      type: 'primary',
      tag: 'نمط · ٠٣',
      confidence: 74,
      title: 'الأيام التي تكتب فيها مذكرة، اللحظات الصعبة تنخفض ٤٠٪',
      explanation: 'ارتباط واضح بين التأمل الصباحي والاستقرار خلال اليوم.',
      recommendation: 'اجعل الكتابة عادة ثابتة صباحاً.',
    },
  ],
  aiInsights: 'أسبوع إيجابي مع تقدم ملحوظ في الاستمرارية. النمط الليلي يستحق الاهتمام.',
};

const METRICS_LABELS: Record<string, string> = {
  attendance: 'الحضور',
  resilience: 'الصمود',
  sessions: 'الجلسات',
  moodAvg: 'متوسط المزاج',
};

export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/analysis')
      .then((r) => r.json())
      .then((d) => {
        if (d.analysis) setAnalysis(d.analysis);
        else setAnalysis(DEMO_ANALYSIS);
      })
      .catch(() => setAnalysis(DEMO_ANALYSIS))
      .finally(() => setLoading(false));
  }, []);

  const generateAnalysis = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/analysis', { method: 'POST' });
      const data = await res.json();
      if (data.analysis) setAnalysis(data.analysis);
    } catch {
      // صامت
    } finally {
      setGenerating(false);
    }
  };

  const data = analysis ?? DEMO_ANALYSIS;

  return (
    <div style={{ padding: '0 20px' }}>
      {/* الهيدر */}
      <div
        style={{
          margin: '20px 0 18px',
          padding: '22px 22px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-card)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            {data.weekStart
              ? `${new Date(data.weekStart).toLocaleDateString('ar-IQ')} — ${new Date(data.weekEnd).toLocaleDateString('ar-IQ')}`
              : 'آخر ٧ أيام'}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              color: 'var(--gold-primary)',
              padding: '4px 12px',
              border: '1px solid var(--border-mid)',
              borderRadius: 'var(--radius-button)',
              background: 'var(--gold-faint)',
            }}
          >
            أسبوع {toArabicNumerals(data.weekNumber)}
          </div>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--text-primary)',
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          تقرير الأسبوع
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}
        >
          تحليل سلوكي مبني على بياناتك
        </p>
      </div>

      {/* المقاييس */}
      {data.metrics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 18,
          }}
        >
          {Object.entries(data.metrics).map(([key, val]) => {
            const isPositive = key === 'attendance' || key === 'sessions' || key === 'resilience';
            return (
              <div
                key={key}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-small)',
                  padding: '16px 18px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginBottom: 10,
                  }}
                >
                  {METRICS_LABELS[key] ?? key}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 32,
                    color: isPositive ? 'var(--gold-soft)' : 'var(--text-primary)',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {typeof val === 'number' ? toArabicNumerals(val) : val}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* الأنماط */}
      <div style={{ marginBottom: 18 }}>
        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
            }}
          >
            جاري التحميل...
          </div>
        ) : (
          data.patterns?.map((pattern) => (
            <div
              key={pattern.id}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${pattern.type === 'success' ? 'rgba(107, 168, 140, 0.3)' : 'var(--border-soft)'}`,
                borderRadius: 'var(--radius-small)',
                padding: 20,
                marginBottom: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    color: pattern.type === 'success' ? '#7FA88C' : 'var(--gold-primary)',
                    background: pattern.type === 'success' ? 'rgba(107, 168, 140, 0.08)' : 'var(--gold-faint)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-button)',
                    border: pattern.type === 'success' ? '1px solid rgba(107, 168, 140, 0.2)' : '1px solid var(--border-mid)',
                  }}
                >
                  {pattern.tag}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                  }}
                >
                  دقة {toArabicNumerals(pattern.confidence)}٪
                </div>
              </div>

              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  color: 'var(--text-primary)',
                  marginBottom: 10,
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                {pattern.title}
              </h3>

              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.8,
                }}
              >
                {pattern.explanation}
              </p>

              {pattern.recommendation && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-soft)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 11,
                      color: 'var(--gold-primary)',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    التوصية ←
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    {pattern.recommendation}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* زر توليد تقرير جديد */}
      <button
        onClick={generateAnalysis}
        disabled={generating}
        style={{
          width: '100%',
          padding: '14px',
          background: generating ? 'var(--gold-faint)' : 'var(--gold-primary)',
          border: generating ? '1px solid var(--border-mid)' : 'none',
          borderRadius: 'var(--radius-button)',
          color: generating ? 'var(--text-muted)' : '#1A3D3D',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 700,
          cursor: generating ? 'not-allowed' : 'pointer',
          marginBottom: 20,
          transition: 'all 0.3s ease',
        }}
      >
        {generating ? 'جاري التحليل...' : 'توليد تقرير جديد'}
      </button>
    </div>
  );
}
