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
      tag: 'PATTERN · 01',
      confidence: 87,
      title: '٧٠٪ من اللحظات الصعبة تحدث بين ١٢ منتصف الليل و٣ فجراً',
      explanation:
        'هذا نمط واضح ومتكرر. الجهاز العصبي في ساعات الإرهاق يكون أقل قدرة على المقاومة، ومستويات الكورتيزول تنخفض.',
      recommendation: 'النوم قبل الساعة ١١ مساءً، الهاتف خارج الغرفة.',
    },
    {
      id: 2,
      type: 'success',
      tag: 'PROGRESS · 02',
      confidence: 100,
      title: 'ثلاث ليالٍ متتالية تجاوزت فيها لحظات قوية',
      explanation:
        'في الأحد والإثنين والثلاثاء، اخترت طريقاً آخر. هذا تدريب حقيقي لمسارات عصبية جديدة.',
    },
    {
      id: 3,
      type: 'primary',
      tag: 'PATTERN · 03',
      confidence: 74,
      title: 'الأيام التي تكتب فيها مذكرة، اللحظات الصعبة تنخفض ٤٠٪',
      explanation: 'ارتباط واضح بين التأمل الصباحي والاستقرار خلال اليوم.',
      recommendation: 'اجعل الكتابة عادة ثابتة صباحاً.',
    },
  ],
  aiInsights: 'أسبوع إيجابي مع تقدم ملحوظ في الاستمرارية. النمط الليلي يستحق الاهتمام.',
};

const METRICS_LABELS: Record<string, string> = {
  attendance: 'ATTENDANCE',
  resilience: 'RESILIENCE',
  sessions: 'SESSIONS',
  moodAvg: 'MOOD AVG',
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
          margin: '20px 0 22px',
          padding: 22,
          background: 'var(--card-bg)',
          border: '1px solid var(--border-mid)',
          borderRadius: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--ink-muted)',
              letterSpacing: 1.5,
            }}
          >
            {data.weekStart
              ? `${new Date(data.weekStart).toLocaleDateString('ar-IQ')} — ${new Date(data.weekEnd).toLocaleDateString('ar-IQ')}`
              : 'آخر ٧ أيام'}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--therapy-blue-bright)',
              padding: '3px 10px',
              border: '1px solid var(--therapy-blue-soft)',
              borderRadius: 6,
              background: 'rgba(107, 149, 201, 0.05)',
            }}
          >
            <LTR>RPT-{String(data.weekNumber).padStart(3, '0')}</LTR>
          </div>
        </div>

        <h1
          style={{
            fontFamily: "'Noto Naskh Arabic', serif",
            fontSize: 22,
            color: 'var(--ink-primary)',
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          تقرير الأسبوع
        </h1>

        <p
          style={{
            fontFamily: "'Amiri', serif",
            fontSize: 13,
            color: 'var(--ink-secondary)',
            fontStyle: 'italic',
          }}
        >
          — تحليل سلوكي مبني على بياناتك —
        </p>
      </div>

      {/* المقاييس */}
      {data.metrics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {Object.entries(data.metrics).map(([key, val]) => (
            <div
              key={key}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-mid)',
                borderRadius: 14,
                padding: 16,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 2,
                  height: '100%',
                  background: 'var(--therapy)',
                  opacity: 0.4,
                }}
              />
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: 'var(--ink-muted)',
                  letterSpacing: 1.5,
                  marginBottom: 10,
                }}
              >
                <LTR>{METRICS_LABELS[key] ?? key.toUpperCase()}</LTR>
              </div>
              <div
                style={{
                  fontFamily: "'Amiri', serif",
                  fontSize: 30,
                  color: 'var(--ink-primary)',
                  fontWeight: 700,
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                {typeof val === 'number' ? toArabicNumerals(val) : val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* الأنماط */}
      <div style={{ marginBottom: 20 }}>
        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--ink-muted)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
            }}
          >
            جاري التحميل...
          </div>
        ) : (
          data.patterns?.map((pattern) => (
            <div
              key={pattern.id}
              style={{
                background: 'var(--card-bg)',
                border: `1px solid ${pattern.type === 'primary' ? 'var(--therapy-blue-soft)' : 'var(--border-mid)'}`,
                borderRadius: 14,
                padding: 20,
                marginBottom: 10,
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
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: pattern.type === 'success' ? 'var(--clinical)' : 'var(--therapy)',
                    background:
                      pattern.type === 'success'
                        ? 'rgba(127, 168, 140, 0.08)'
                        : 'rgba(107, 149, 201, 0.08)',
                    padding: '4px 10px',
                    borderRadius: 4,
                    letterSpacing: 1.5,
                    border:
                      pattern.type === 'success'
                        ? '1px solid rgba(127, 168, 140, 0.2)'
                        : '1px solid rgba(107, 149, 201, 0.2)',
                  }}
                >
                  <LTR>{pattern.tag}</LTR>
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: 'var(--ink-faint)',
                  }}
                >
                  <LTR>CONFIDENCE · {pattern.confidence}%</LTR>
                </div>
              </div>

              <h3
                style={{
                  fontFamily: "'Noto Naskh Arabic', serif",
                  fontSize: 15,
                  color: 'var(--ink-primary)',
                  marginBottom: 10,
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                {pattern.title}
              </h3>

              <p
                style={{
                  fontFamily: "'Tajawal', sans-serif",
                  fontSize: 13,
                  color: 'var(--ink-secondary)',
                  lineHeight: 1.8,
                  fontWeight: 300,
                }}
              >
                {pattern.explanation}
              </p>

              {pattern.recommendation && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: '1px dashed var(--border-mid)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      color: 'var(--therapy)',
                      letterSpacing: 1,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    <LTR>RX —</LTR>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-secondary)',
                      lineHeight: 1.6,
                    }}
                  >
                    {pattern.recommendation}
                  </div>
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
          background: generating ? 'var(--card-bg-soft)' : 'var(--therapy)',
          border: 'none',
          borderRadius: 12,
          color: generating ? 'var(--ink-muted)' : 'var(--night-deepest)',
          fontFamily: "'Noto Naskh Arabic', serif",
          fontSize: 15,
          fontWeight: 700,
          cursor: generating ? 'not-allowed' : 'pointer',
          marginBottom: 20,
          transition: 'all 0.2s',
        }}
      >
        {generating ? 'جاري التحليل...' : 'توليد تقرير جديد'}
      </button>
    </div>
  );
}
