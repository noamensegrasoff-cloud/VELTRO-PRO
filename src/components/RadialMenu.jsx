import React from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import ElectricCore from './ElectricCore.jsx';

function point(index, count, inner = false) {
  const angle = (-Math.PI / 2) + (Math.PI * 2 * index / count);
  const rx = inner ? 28 : 39;
  const ry = inner ? 25 : 36;
  return { left: `${50 + Math.cos(angle) * rx}%`, top: `${50 + Math.sin(angle) * ry}%` };
}

function MenuNode({ item, index, count, onClick, inner = false }) {
  const Icon = item.icon;
  return (
    <button className={`menu-node ${inner ? 'menu-node-inner' : ''} tone-${item.color || (index % 2 ? 'violet' : 'turquoise')}`}
      style={{ ...point(index, count, inner), '--node-delay': `${index * 38}ms` }}
      onClick={onClick} type="button">
      <span className="node-icon"><Icon size={inner ? 20 : 23} strokeWidth={1.8}/></span>
      <span className="node-label">{item.label}</span>
    </button>
  );
}

export default function RadialMenu({ sections, selected, open, onOpen, onSelect, onBack, onChoose }) {
  const children = selected?.children || [];
  return (
    <div className={`radial-stage ${selected ? 'stage-branch' : open ? 'stage-root is-open' : 'stage-closed'}`}>
      <div className="stage-vignette" />
      <div className="electric-field field-one"/><div className="electric-field field-two"/>
      {!selected ? (
        <>
          {sections.map((item, i) => <MenuNode key={item.id} item={item} index={i} count={sections.length} onClick={() => onSelect(item)} />)}
          <div className="core-position root-core-position">
            <ElectricCore onClick={onOpen} hint={open ? "اختر قسمًا للمتابعة" : "اضغط لإطلاق الطاقة"} seed={11}/>
          </div>
          <div className="stage-caption"><span className="status-dot"/> مركز التحكم <span className="caption-separator">/</span> {open ? "اختر قسمًا للمتابعة" : "اضغط على النواة الكهربائية"}</div>
        </>
      ) : (
        <>
          <button type="button" className="back-button" onClick={onBack}><ArrowRight size={17}/> القائمة الرئيسية</button>
          {children.map((item, i) => <MenuNode key={item.id} item={item} index={i} count={children.length} inner onClick={() => onChoose(item)} />)}
          <div className="core-position branch-core-position">
            <ElectricCore label={selected.label} subtitle="VELTRO MODULE" size="medium" active seed={selected.id.length + 30} onClick={onBack} hint="رجوع"/>
          </div>
          <div className="stage-caption"><span className="status-dot"/> {selected.label} <span className="caption-separator">/</span> اختر وظيفة</div>
        </>
      )}
    </div>
  );
}