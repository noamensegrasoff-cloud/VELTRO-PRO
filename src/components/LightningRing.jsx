import React, { useMemo } from 'react';

function boltPath(seed, radius) {
  let state = seed * 9301 + 49297;
  const rand = () => { state = (state * 233 + 49297) % 233280; return state / 233280; };
  const points = [];
  const steps = 38;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const jitter = (rand() - 0.5) * radius * 0.13;
    const r = radius + jitter;
    points.push([50 + Math.cos(angle) * r, 50 + Math.sin(angle) * r]);
  }
  return points.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
}

export default function LightningRing({ size = 100, seed = 1, className = '' }) {
  const paths = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    d: boltPath(seed + i * 7, 38 + i * 0.9),
    delay: `${-i * 0.37}s`,
  })), [seed]);
  return (
    <svg className={`lightning-ring ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <filter id={`electric-glow-${seed}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.12 0 0 0 0 0.88 0 0 0 0 0.78 0 0 0 1 0" result="cyanGlow" />
          <feMerge><feMergeNode in="cyanGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {paths.map((path, i) => <path key={i} d={path.d} className={i % 2 ? 'bolt bolt-violet' : 'bolt bolt-cyan'} style={{ animationDelay: path.delay }} filter={`url(#electric-glow-${seed})`} />)}
    </svg>
  );
}