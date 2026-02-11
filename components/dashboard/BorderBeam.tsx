'use client';

import type { CSSProperties } from 'react';

type BorderBeamProps = {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
  style?: CSSProperties;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
};

export function BorderBeam({
  size = 320,
  delay = 0,
  duration = 6,
  colorFrom = '#ffaa40',
  colorTo = '#9c40ff',
  className = '',
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) {
  const start = reverse ? `${100 - initialOffset}%` : `${initialOffset}%`;
  const end = reverse ? `${-initialOffset}%` : `${100 + initialOffset}%`;
  const ringMaskStyle = {
    padding: `${borderWidth}px`,
    mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    maskComposite: 'exclude',
    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    WebkitMaskComposite: 'xor',
  } as CSSProperties;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      style={ringMaskStyle}
    >
      <div
        className={`absolute left-0 top-0 aspect-square rounded-full ${className}`}
        style={
          {
            width: `${size}px`,
            background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            offsetDistance: start,
            animationName: 'border-beam-run',
            animationDuration: `${duration}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDelay: `${-delay}s`,
            '--beam-start': start,
            '--beam-end': end,
            ...style,
          } as CSSProperties
        }
      />
    </div>
  );
}
