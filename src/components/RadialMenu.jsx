import React from 'react';
import { ArrowRight } from 'lucide-react';
import ElectricCore from './ElectricCore.jsx';

function point(index, count, inner = false) {
  const angle = (-Math.PI / 2) + (Math.PI * 2 * index / count);
  const rx = inner ? 28 : 39;
  const ry = inner ? 25 : 36;
  return { left: `${50 + Math.cos(angle) * rx}%`, top: `${50 + Math.sin(angle) * ry}%` };
}

function connectorPoint(index, count, inner = false) {
  const angle = (-Math.PI / 2) + (Math.PI * 2 * index / count);
  const rx = inner ? 28 : 39;
  const ry = inner ? 25 : 36;
  return { x: (50 + Math.cos(angle) * rx) * 10, y: (50 + Math.sin(angle) * ry) * 7 };
}

function EnergyLinks({ count, inner = false }) {
  return (
    <svg className={`energy-links ${inner ? 'energy-links-inner' : ''}`} viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={inner ? 'energyGradientInner' : 'energyGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#35d9c3" stopOpacity=".08" />
          <stop offset="52%" stopColor="#54f0df" stopOpacity=".72" />
          <stop offset="100%" stopColor="#9b72ff" stopOpacity=".2" />
        </linearGradient>
        <filter id={inner ? 'energyGlowInner' : 'energyGlow'} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {Array.from({ length: count }, (_, index) => {
        const p = connectorPoint(index, count, inner);
        const gradientId = inner ? 'energyGradientInner' : 'energyGradient';
        const glowId = inner ? 'energyGlowInner' : 'energyGlow';
        return (
          <g key={index} className="energy-link">
            <path className="energy-link-track" d={`M 500 350 Q ${500 + (p.x - 500) * .45 - (p.y - 350) * .06} ${350 + (p.y - 350) * .45 + (p.x - 500) * .06} ${p.x} ${p.y}`} />
            <path className="energy-link-flow" d={`M 500 350 Q ${500 + (p.x - 500) * .45 - (p.y - 350) * .06} ${350 + (p.y - 350) * .45 + (p.x - 500) * .06} ${p.x} ${p.y}`} stroke={`url(#${gradientId})`} filter={`url(#${glowId})`} style={{ animationDelay: `${index * -0.31}s` }} />
            <circle className="energy-link-node" cx={p.x} cy={p.y} r="3.2" style={{ animationDelay: `${index * -0.2}s` }} />
          </g>
        );
      })}
    </svg>
  );
}

function MenuNode({ item, index, count, onClick, inner = false }) {
  const Icon = item.icon;
  return (
    <button className={`menu-node ${inner ? 'menu-node-inner' : ''} tone-${item.color || (index % 2 ? 'violet' : 'turquoise')}`}
      style={{ ...point(index, count, inner), '--node-delay': `${index * 55}ms` }}
      onClick={onClick} type="button">
      <span className="node-icon"><Icon size={inner ? 20 : 23} strokeWidth={1.8}/></span>
      <span className="node-label">{item.label}</span>
    </button>
  );
}

export default function RadialMenu({ sections, selected, open, onOpen, onToggle, onSelect, onBack, onChoose }) {
  const children = selected?.children || [];
  return (
    <div className={`radial-stage ${selected ? 'stage-branch' : open ? 'stage-root is-open' : 'stage-closed'}`}>
      <div className="stage-vignette" />
      <div className="electric-field field-one"/><div className="electric-field field-two"/>
      {!selected && open ? (
        <>
          <EnergyLinks count={sections.length} />
          {sections.map((item, i) => <MenuNode key={item.id} item={item} index={i} count={sections.length} onClick={() => onSelect(item)} />)}
          <div className="core-position root-core-position">
            <ElectricCore onClick={onToggle} hint="اضغط لإغلاق الفروع" seed={11}/>
          </div>
          <div className="stage-caption"><span className="status-dot"/> مركز التحكم <span className="caption-separator">/</span> اختر قسمًا للمتابعة</div>
        </>
      ) : selected ? (
        <>
          <button type="button" className="back-button" onClick={onBack}><ArrowRight size={17}/> القائمة الرئيسية</button>
          <EnergyLinks count={children.length} inner />
          {children.map((item, i) => <MenuNode key={item.id} item={item} index={i} count={children.length} inner onClick={() => onChoose(item)} />)}
          <div className="core-position branch-core-position">
            <ElectricCore label={selected.label} subtitle="VELTRO MODULE" size="medium" active seed={selected.id.length + 30} onClick={onBack} hint="رجوع"/>
          </div>
          <div className="stage-caption"><span className="status-dot"/> {selected.label} <span className="caption-separator">/</span> اختر وظيفة</div>
        </>
      ) : (
        <>
          <div className="core-position root-core-position">
            <ElectricCore onClick={onOpen} hint="اضغط لإطلاق الطاقة" seed={11}/>
          </div>
          <div className="stage-caption"><span className="status-dot"/> مركز التحكم <span className="caption-separator">/</span> اضغط على النواة الكهربائية</div>
        </>
      )}
    </div>
  );
}
