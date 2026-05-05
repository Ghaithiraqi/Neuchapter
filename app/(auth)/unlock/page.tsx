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
        background: 'var(--bg-deep)',
      }}
    >
      {/* شعار دائري ذهبي */}
      <div
        style={{
          width: 64,
          height: 64,
          border: '2px solid var(--gold-primary)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          background: 'var(--gold-faint)',
          animation: 'gentlePulse 4s ease-in-out infinite',
          boxShadow: '0 0 24px rgba(232, 184, 114, 0.15)',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            background: 'var(--gold-primary)',
            borderRadius: '50%',
          }}
        />
      </div>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 34,
          color: 'var(--text-primary)',
          marginBottom: 8,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        جددني
      </h1>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--text-secondary)',
          marginBottom: 52,
          letterSpacing: 0.5,
        }}
      >
        رحلة العودة لذاتك
      </p>

      {/* نقاط الرمز */}
      <div
        style={{
          display: 'flex',
          gap: 18,
          marginBottom: 44,
          animation: error ? 'shake 0.3s ease' : 'none',
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 13,
              height: 13,
              borderRadius: '50%',
              border: `1.5px solid ${passcode.length > i ? 'var(--gold-primary)' : 'var(--text-muted)'}`,
              background: passcode.length > i ? 'var(--gold-primary)' : 'transparent',
              boxShadow:
                passcode.length > i ? '0 0 10px rgba(232, 184, 114, 0.5)' : 'none',
              transition: 'all 0.3s ease',
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
          maxWidth: 264,
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
                width: 60,
                height: 60,
                margin: '0 auto',
                borderRadius: 16,
                background: isEmpty ? 'transparent' : 'var(--gold-faint)',
                border: isEmpty ? 'none' : '1px solid var(--border-mid)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                fontSize: isDelete ? 18 : 24,
                fontWeight: 600,
                cursor: isEmpty ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={(e) => {
                if (!isEmpty) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--gold-muted)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isEmpty) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--gold-faint)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-mid)';
                }
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
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--alert-warm)',
            letterSpacing: 0.5,
          }}
        >
          رمز خاطئ، حاول مجدداً
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
