'use client';

import React, { useEffect, useRef, useState } from 'react';

interface NeuchapterLogoProps {
  /** Width/height in px (square). Default: 40 */
  size?: number;
  /** Animate the stroke drawing on mount. Respects prefers-reduced-motion. */
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const GRADIENT_ID = 'neuchapter-brand-gradient';

/**
 * The Neuchapter logo mark — letter N with brand gradient stroke
 * and a mint accent dot above the right stem.
 *
 * Gradient colours mirror --brand-gradient:
 *   #2EBE80 → #259696 → #376EC8 → #4A3CB4
 */
export default function NeuchapterLogo({
  size = 40,
  animate = false,
  className,
  style,
}: NeuchapterLogoProps) {
  const prefersReduced =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const shouldAnimate = animate && !prefersReduced;

  // The N is drawn on a 100×100 viewBox.
  // Left stem:  M 33,70  L 33,33
  // Diagonal:   L 67,70
  // Right stem: L 67,46  (shorter — stops below the dot)
  // Total approximate length ≈ 134 (37+75+24)
  const N_LENGTH = 140;
  const DOT_DELAY = 2.1; // seconds — dot appears after stroke finishes

  const [dotVisible, setDotVisible] = useState(!shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate) return;
    const t = setTimeout(() => setDotVisible(true), DOT_DELAY * 1000);
    return () => clearTimeout(t);
  }, [shouldAnimate]);

  const strokeWidth = 15;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Neuchapter"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#2EBE80" />
          <stop offset="42%"  stopColor="#259696" />
          <stop offset="68%"  stopColor="#376EC8" />
          <stop offset="100%" stopColor="#4A3CB4" />
        </linearGradient>
      </defs>

      {/* N stroke */}
      <path
        d="M 33 70 L 33 33 L 67 70 L 67 46"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          shouldAnimate
            ? {
                strokeDasharray: N_LENGTH,
                strokeDashoffset: N_LENGTH,
                animation: `neuchapter-draw 2s cubic-bezier(0.4,0,0.2,1) forwards`,
              }
            : undefined
        }
      />

      {/* Mint accent dot above right stem */}
      <circle
        cx="67"
        cy="31"
        r="10"
        fill="#5DCDA5"
        style={{
          opacity: dotVisible ? 1 : 0,
          transition: shouldAnimate ? 'opacity 0.4s ease' : undefined,
        }}
      />

      {shouldAnimate && (
        <style>{`
          @keyframes neuchapter-draw {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      )}
    </svg>
  );
}
