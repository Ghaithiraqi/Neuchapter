'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LTR } from '@/components/shared/LTR';

export default function UnlockPage() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const addDigit = useCallback(
    async (d: string) => {
      if (passcode.length >= 5 || loading) return;
      const newCode = passcode + d;
      setPasscode(newCode);
      setError(false);

      if (newCode.length === 5) {
        setLoading(true);
        try {
          const res = await fetch('/api/auth/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: newCode }),
          });

          if (res.ok) {
            router.push('/');
          } else {
            setError(true);
            setTimeout(() => {
              setPasscode('');
              setError(false);
            }, 600);
          }
        } catch {
          setError(true);
          setTimeout(() => {
            setPasscode('');
            setError(false);
          }, 600);
        } finally {
          setLoading(false);
        }
      }
    },
    [passcode, loading, router]
  );

  const removeDigit = useCallback(() => {
    setPasscode((prev) => prev.slice(0, -1));
    setError(false);
  }, []);

  const keys = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '', '٠', '←'];
  const keyValues = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 30px',
        background: 'var(--night-deepest)',
      }}
    >
      {/* الشعار */}
      <div
        style={{
          width: 56,
          height: 56,
          border: '2px solid var(--therapy-blue)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          background: 'var(--card-bg)',
          animation: 'gentlePulse 4s ease-in-out infinite',
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            background: 'var(--therapy-blue)',
            borderRadius: '50%',
          }}
        />
      </div>

      <h1
        style={{
          fontFamily: "'Noto Naskh Arabic', serif",
          fontSize: 32,
          color: 'var(--ink-primary)',
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        جددني
      </h1>

      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--ink-muted)',
          letterSpacing: 2,
          marginBottom: 64,
        }}
      >
        <LTR>SESSION · LOCKED</LTR>
      </p>

      {/* نقاط الرمز */}
      <div
        style={{
          display: 'flex',
          gap: 18,
          marginBottom: 56,
          animation: error ? 'shake 0.3s ease' : 'none',
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: `1.5px solid ${passcode.length > i ? 'var(--therapy-blue)' : 'var(--ink-muted)'}`,
              background: passcode.length > i ? 'var(--therapy-blue)' : 'transparent',
              boxShadow:
                passcode.length > i ? '0 0 12px var(--therapy-blue-glow)' : 'none',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      {/* لوحة الأرقام */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          width: '100%',
          maxWidth: 280,
        }}
      >
        {keys.map((key, i) => {
          const val = keyValues[i];
          const isEmpty = key === '';
          const isDelete = key === '←';

          return (
            <button
              key={i}
              onClick={() => {
                if (isEmpty) return;
                if (isDelete) removeDigit();
                else addDigit(val);
              }}
              disabled={isEmpty || loading}
              style={{
                aspectRatio: '1',
                borderRadius: 14,
                background: isEmpty ? 'transparent' : 'var(--card-bg)',
                border: isEmpty ? 'none' : '1px solid var(--border-soft)',
                color: 'var(--ink-primary)',
                fontFamily: "'Noto Naskh Arabic', serif",
                fontSize: isDelete ? 18 : 22,
                fontWeight: 500,
                cursor: isEmpty ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {key}
            </button>
          );
        })}
      </div>

      {error && (
        <p
          style={{
            marginTop: 24,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--alert-warm)',
            letterSpacing: 1,
          }}
        >
          رمز خاطئ
        </p>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
