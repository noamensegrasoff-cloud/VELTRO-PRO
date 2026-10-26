import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Search, RotateCcw, Package, SlidersHorizontal, Barcode } from 'lucide-react';

const labels = {
  ar: { title:'حركة المنتجات', sub:'سجل تتبّع دخول وخروج وتعديلات المخزون', search:'ابحث باسم المنتج أو المرجع...', barcodeSearch:'بحث بالباركود', barcodePlaceholder:'أدخل أو امسح الكودبار...', all:'كل الحركات', in:'دخول', out:'خروج', adjust:'تسوية', date:'التاريخ', product:'المنتج', type:'نوع الحركة', before:'قبل', change:'التغيير', after:'بعد', source:'المصدر', user:'المستخدم', details:'التفاصيل', empty:'لا توجد حركات مسجلة بعد', emptyHint:'ستظهر الحركات هنا عند ربطها بعمليات البيع والشراء أو تسجيل تسوية مخزون.', refresh:'إعادة تحميل', note:'هذه الصفحة تعرض الحركات المسجلة فقط؛ لا يتم تعديل المخزون من هنا.', noData:'لا توجد بيانات حركة متاحة بعد' },
  fr: { title:'Mouvements des produits', sub:'Historique des entrées, sorties et ajustements du stock', search:'Rechercher produit ou référence...', barcodeSearch:'Recherche par code-barres', barcodePlaceholder:'Saisir ou scanner le code-barres...', all:'Tous les mouvements', in:'Entrée', out:'Sortie', adjust:'Ajustement', date:'Date', product:'Produit', type:'Type', before:'Avant', change:'Variation', after:'Après', source:'Source', user:'Utilisateur', details:'Détails', empty:'Aucun mouvement enregistré', emptyHint:'Les mouvements apparaîtront ici une fois reliés aux ventes, achats ou ajustements de stock.', refresh:'Actualiser', note:'Cette page affiche uniquement les mouvements enregistrés ; elle ne modifie pas le stock.', noData:'Aucune donnée de mouvement disponible' },
  en: { title:'Product movements', sub:'Track stock entries, exits and adjustments', search:'Search product or reference...', barcodeSearch:'Search barcode', barcodePlaceholder:'Enter or scan barcode...', all:'All movements', in:'Stock in', out:'Stock out', adjust:'Adjustment', date:'Date', product:'Product', type:'Movement type', before:'Before', change:'Change', after:'After', source:'Source', user:'User', details:'Details', empty:'No movements recorded yet', emptyHint:'Movements will appear here once connected to sales, purchases or stock adjustments.', refresh:'Refresh', note:'This page displays recorded movements only; it does not change stock.', noData:'No movement data is available yet' }
};

const styles = {
  panel:{background:'var(--panel, rgba(20,31,49,.72))',border:'1px solid var(--border, rgba(120,160,190,.18))',borderRadius:18},
  button:{display:'inline-flex',alignItems:'center',gap:8,border:'1px solid var(--border, rgba(120,160,190,.22))',borderRadius:10,padding:'10px 13px',background:'linear-gradient(135deg,rgba(37,99,235,.22),rgba(20,184,166,.16))',color:'var(--text, inherit)',borderColor:'rgba(45,190,190,.35)',fontWeight:650,boxShadow:'0 4px 14px rgba(15,100,160,.10)',cursor:'pointer'},
  field:{width:'100%',minWidth:0,background:'var(--input, rgba(9,18,32,.55))',color:'var(--text, inherit)',border:'1px solid var(--border, rgba(120,160,190,.22))',borderRadius:10,padding:'11px 12px',outline:'none'}
};

export default function ProductMovementPage({ lang='ar' }) {
  const t = key => labels[lang]?.[key] || labels.ar[key] || key;
  const [query,setQuery] = useState('');
  const [barcodeQuery,setBarcodeQuery] = useState('');
  const [barcodeOpen,setBarcodeOpen] = useState(false);
  const [kind,setKind] = useState('all');
  const [reload,setReload] = useState(0);
  const movements = useMemo(() => {
    try {
      const keys = ['veltro-product-movements-v1','veltro.product.movements.v1'];
      for (const key of keys) {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {}
    return [];
  },[reload]);
  const filtered = movements.filter(m => {
    const text = [m.productName,m.name,m.product?.name,m.reference,m.barcode,m.barCode,m.productBarcode,m.product?.barcode,m.product?.barCode,m.source,m.id].map(v=>String(v||'')).join(' ').toLocaleLowerCase();
    const type = String(m.type||m.kind||'').toLowerCase();
    const normalized = /in|purchase|entry|دخل|شراء|دخول/.test(type) ? 'in' : /out|sale|exit|بيع|خروج/.test(type) ? 'out' : 'adjust';
    const barcode = [m.barcode,m.barCode,m.productBarcode,m.product?.barcode,m.product?.barCode,m.product?.barcodeValue].map(v=>String(v||'')).join(' ').toLocaleLowerCase();
    return (!query || text.includes(query.toLocaleLowerCase())) && (!barcodeQuery || barcode.includes(barcodeQuery.toLocaleLowerCase())) && (kind==='all' || normalized===kind);
  });
  const getName = m => m.productName || m.name || m.product?.name || '—';
  const getDelta = m => Number(m.quantityChange ?? m.delta ?? m.change ?? m.quantity ?? 0);
  const fmtDate = m => { const v=m.createdAt||m.date||m.timestamp; if(!v)return '—'; const d=new Date(v); return Number.isNaN(d.getTime())?String(v):d.toLocaleString(lang==='ar'?'ar-DZ':lang==='fr'?'fr-DZ':'en-GB'); };
  const fmtNum = n => new Intl.NumberFormat(lang==='ar'?'ar-DZ':'fr-DZ',{maximumFractionDigits:3}).format(Number(n)||0);
  const typeLabel = m => { const v=String(m.type||m.kind||'').toLowerCase(); if(/in|purchase|entry|دخل|شراء|دخول/.test(v))return t('in'); if(/out|sale|exit|بيع|خروج/.test(v))return t('out'); return t('adjust'); };
  return <div className="page-content product-movement-page">
    <div className="page-heading">
      <div><div className="heading-kicker"><span className="health-dot"/>{lang==='ar'?'المنتجات':lang==='fr'?'Produits':'Products'}</div><h1>{t('title')}</h1><p>{t('sub')}</p></div>
      <button style={{...styles.button,background:'linear-gradient(135deg,#2563eb,#0d9488)',color:'#fff',borderColor:'transparent',boxShadow:'0 6px 18px rgba(37,99,235,.22)'}} onClick={()=>setReload(v=>v+1)}><RotateCcw size={15}/>{t('refresh')}</button>
    </div>
    <div style={{...styles.panel,padding:16,marginBottom:16,display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',flex:1,minWidth:220}}>
        <label style={{display:'flex',gap:8,alignItems:'center',flex:'1 1 250px',minWidth:180}}><Search size={16}/><input style={styles.field} value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('search')}/></label>
        <label style={{display:'flex',gap:8,alignItems:'center'}}><SlidersHorizontal size={15}/><select style={{...styles.field,width:'auto',minHeight:42,borderRadius:12,background:'linear-gradient(135deg,rgba(37,99,235,.16),rgba(20,184,166,.12))',borderColor:'rgba(45,190,190,.4)',fontWeight:650,cursor:'pointer'}} value={kind} onChange={e=>setKind(e.target.value)}><option value="all">{t('all')}</option><option value="in">{t('in')}</option><option value="out">{t('out')}</option><option value="adjust">{t('adjust')}</option></select></label>
        <button style={{...styles.button,minHeight:42,borderRadius:12,background:barcodeOpen?'linear-gradient(135deg,#0d9488,#2563eb)':'rgba(20,184,166,.10)',color:barcodeOpen?'#fff':'var(--text, inherit)',borderColor:'rgba(45,190,190,.45)'}} onClick={()=>{setBarcodeOpen(v=>!v);setBarcodeQuery('')}}><Barcode size={16}/>{t('barcodeSearch')}</button>
        {barcodeOpen && <label style={{display:'flex',gap:8,alignItems:'center',flex:'1 1 220px',minWidth:180}}><Barcode size={16}/><input autoFocus style={{...styles.field,borderColor:'rgba(45,190,190,.55)',boxShadow:'0 0 0 3px rgba(20,184,166,.10)'}} value={barcodeQuery} onChange={e=>setBarcodeQuery(e.target.value)} placeholder={t('barcodePlaceholder')} /></label>}
      </div>
      <span style={{fontSize:13,opacity:.75}}>{filtered.length} / {movements.length}</span>
    </div>
    <section style={{...styles.panel,overflow:'hidden'}}>
      <div style={{padding:'15px 18px',display:'flex',alignItems:'center',gap:9,borderBottom:'1px solid var(--border, rgba(120,160,190,.18))'}}><span style={{display:'grid',placeItems:'center',width:36,height:36,borderRadius:11,background:'linear-gradient(135deg,rgba(38,119,224,.22),rgba(31,203,185,.18))',color:'#5dded1'}}><ArrowLeftRight size={18}/></span><div><b>{t('title')}</b><div style={{fontSize:12,opacity:.7}}>{t('note')}</div></div></div>
      {filtered.length===0 ? <div style={{padding:'48px 20px',textAlign:'center'}}><span style={{display:'inline-grid',placeItems:'center',width:58,height:58,borderRadius:18,background:'linear-gradient(135deg,rgba(38,119,224,.2),rgba(31,203,185,.15))',color:'#5dded1'}}><Package size={26}/></span><h3 style={{margin:'16px 0 8px'}}>{query||kind!=='all'?t('noData'):t('empty')}</h3><p style={{opacity:.72,maxWidth:520,margin:'0 auto',lineHeight:1.7}}>{t('emptyHint')}</p></div>
      : <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:850}}><thead><tr>{[t('date'),t('product'),t('type'),t('before'),t('change'),t('after'),t('source')].map(h=><th key={h} style={{textAlign:lang==='ar'?'right':'left',padding:'13px 15px',fontSize:12,whiteSpace:'nowrap',opacity:.7,borderBottom:'1px solid var(--border, rgba(120,160,190,.18))'}}>{h}</th>)}</tr></thead><tbody>{filtered.map((m,i)=>{const delta=getDelta(m);const incoming=delta>0;const label=typeLabel(m);return <tr key={m.id||m.reference||i}><td style={{padding:'14px 15px',whiteSpace:'nowrap',fontSize:12,opacity:.8,borderBottom:'1px solid var(--border, rgba(120,160,190,.1))'}}>{fmtDate(m)}</td><td style={{padding:'14px 15px',borderBottom:'1px solid var(--border, rgba(120,160,190,.1))'}}><b>{getName(m)}</b><div style={{fontSize:11,opacity:.6}}>{m.reference||m.id||'—'}</div></td><td style={{padding:'14px 15px',borderBottom:'1px solid var(--border, rgba(120,160,190,.1))'}}><span style={{display:'inline-flex',alignItems:'center',gap:6,borderRadius:20,padding:'5px 9px',fontSize:12,background:incoming?'rgba(20,184,166,.13)':delta<0?'rgba(245,158,11,.13)':'rgba(139,92,246,.14)',color:incoming?'#35cdb6':delta<0?'#f6b75e':'#b69afc'}}>{incoming?<ArrowDownLeft size={13}/>:delta<0?<ArrowUpRight size={13}/>:<SlidersHorizontal size={13}/>} {label}</span></td><td style={{padding:'14px 15px',borderBottom:'1px solid var(--border, rgba(120,160,190,.1))'}}>{m.stockBefore??m.before??'—'}</td><td style={{padding:'14px 15px',fontWeight:700,color:delta>0?'#35cdb6':delta<0?'#f6b75e':'inherit',borderBottom:'1px solid var(--border, rgba(120,160,190,.1))'}}>{delta>0?'+':''}{fmtNum(delta)}</td><td style={{padding:'14px 15px',borderBottom:'1px solid var(--border, rgba(120,160,190,.1))'}}>{m.stockAfter??m.after??'—'}</td><td style={{padding:'14px 15px',borderBottom:'1px solid var(--border, rgba(120,160,190,.1))'}}>{m.source||m.sourceReference||'—'}</td></tr>})}</tbody></table></div>}
    </section>
  </div>;
}
