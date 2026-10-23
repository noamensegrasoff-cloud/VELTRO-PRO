import React from 'react';
import { Zap } from 'lucide-react';
import LightningRing from './LightningRing.jsx';

export default function ElectricCore({ label = 'VELTRO', subtitle = 'BUSINESS SUITE', size = 'large', onClick, active = false, seed = 1, hint }) {
  return (
    <button type="button" className={`electric-core core-${size} ${active ? 'is-active' : ''}`} onClick={onClick} aria-label={label}>
      <LightningRing size="100%" seed={seed} className="core-lightning" />
      <span className="core-orb">
        <span className="core-mark"><Zap size={size === 'large' ? 22 : 15} strokeWidth={2.5} /></span>
        <span className="core-title">{label}</span>
        <span className="core-subtitle">{subtitle}</span>
      </span>
      {hint && <span className="core-hint">{hint}</span>}
    </button>
  );
}