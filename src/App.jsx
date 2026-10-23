import React, { useEffect, useState } from 'react';
import { Wifi, ShieldCheck, Sparkles } from 'lucide-react';
import { sections } from './data/navigation.js';
import RadialMenu from './components/RadialMenu.jsx';

export default function App() {
  const [selected, setSelected] = useState(null);\n  const [menuOpen, setMenuOpen] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (chosen) setChosen(null);
        else { setSelected(null); setMenuOpen(false); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chosen]);

  const choose = (item) => {
    setChosen(item);
    setPulse((value) => value + 1);
  };

  return (
    <main className="app-shell" dir="rtl">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-symbol"><Sparkles size={17}/></span><span><b>VELTRO</b><small>BUSINESS SUITE</small></span></div>
        <div className="topbar-meta"><span className="connection"><Wifi size={15}/> <span>واجهة تجريبية</span></span><span className="topbar-divider"/><span className="version-label">RADIAL NAV · 0.1</span></div>
      </header>
      <section className="hero-copy">
        <p className="eyebrow"><span/> NEXT-GENERATION COMMERCE</p>
        <h1>كل أعمالك، <em>في مركز واحد.</em></h1>
        <p className="hero-description">تنقّل كهربائي تفاعلي — اختر دائرة لتنتقل الطاقة إلى القسم التالي.</p>
      </section>
      <RadialMenu sections={sections} selected={selected} open={menuOpen} onOpen={() => setMenuOpen(true)} onToggle={() => setMenuOpen((value) => !value)} onSelect={(item) => { setSelected(item); setMenuOpen(false); setChosen(null); }} onBack={() => { setSelected(null); setMenuOpen(true); setChosen(null); }} onChoose={choose}/>
      {chosen && <div className="selection-panel" role="status">
        <span className="selection-kicker"><ShieldCheck size={15}/> نموذج تفاعلي</span>
        <strong>{chosen.label}</strong>
        <span>تم اختيار هذا الفرع في النموذج. لم يتم ربطه ببيانات المتجر بعد.</span>
        <button type="button" onClick={() => setChosen(null)}>حسنًا</button>
      </div>}
      <footer className="app-footer"><span>DESIGNED FOR CLARITY. BUILT FOR SPEED.</span><span>⚡ ELECTRIC NAVIGATION <b>{String(pulse).padStart(2, '0')}</b></span></footer>
    </main>
  );
}