import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Bell, Menu, ChevronDown, LogOut, ArrowUpRight,
  MoreHorizontal, CalendarDays, Package, ReceiptText,
  Wallet, CircleAlert, Clock3, ChartNoAxesCombined,
  ShoppingCart, X, Globe, ClipboardList, History,
  CircleCheck, PackageCheck, Cloud
} from 'lucide-react';
import { dashboard, sections } from './data/navigation.js';
import { getCloudStatus } from './services/cloudStorage.js';

const copy = {
  ar: {
    workspace: 'مساحة العمل', search: 'ابحث عن قسم أو وظيفة...', demo: 'معاينة تصميمية · بيانات تجريبية',
    subtitle: 'نظرة شاملة على أداء المتجر وحركة العمل.', today: 'اليوم', revenue: 'مبيعات اليوم',
    invoices: 'فواتير البيع', products: 'المنتجات', lowStock: 'مخزون منخفض',
    vsYesterday: 'مقارنة بالأمس', salesTrend: 'حركة المبيعات', last7: 'آخر 7 أيام',
    salesVsPurchases: 'المبيعات مقابل المشتريات', sales: 'المبيعات', purchases: 'المشتريات',
    recent: 'آخر العمليات', viewAll: 'عرض الكل', productMovement: 'حركة المنتجات',
    product: 'المنتج', operation: 'العملية', quantity: 'الكمية', status: 'الحالة',
    completed: 'مكتملة', pending: 'معلقة', received: 'مستلمة', sold: 'بيع',
    bought: 'شراء', returned: 'مرتجع', stockOverview: 'نظرة على المخزون',
    available: 'متوفر', low: 'منخفض', out: 'نفد', module: 'القسم',
    moduleHint: 'هذه معاينة لواجهة القسم. سيتم ربط الجداول والإجراءات ببيانات النظام عند تنفيذ الوظائف.',
    shortcuts: 'وصول سريع', addProduct: 'إضافة منتج', newSale: 'فتح نقطة البيع',
    newOrder: 'طلب سلع', openCash: 'فتح الصندوق', notifications: 'الإشعارات',
    noNotifications: 'لا توجد إشعارات جديدة.', logout: 'تسجيل الخروج',
    logoutConfirm: 'هل تريد تسجيل الخروج من VELTRO-PRO؟', cancel: 'إلغاء', confirm: 'تسجيل الخروج',
    signedOut: 'تم تسجيل الخروج من المعاينة', signIn: 'العودة إلى المعاينة',
    back: 'العودة', home: 'لوحة التحكم', selected: 'القسم المحدد',
    welcome: 'مرحبًا بك في', title: 'VELTRO BUSINESS SUITE',
    daily: 'الحالة اليومية', cashBalance: 'رصيد الصندوق', expense: 'المصاريف',
    profit: 'الربح التقديري', viewDetails: 'عرض التفاصيل', allSections: 'الأقسام',
    searchResults: 'نتائج البحث', noResults: 'لا توجد نتائج مطابقة.',
    topProducts: 'أكثر المنتجات حركة', activity: 'النشاط حسب الفترة',
    cloudTitle: 'التخزين السحابي', cloudConfigured: 'إعداد السحابة مكتمل، بانتظار تسجيل الدخول', cloudMissing: 'أضف إعدادات Supabase لربط السحابة', cloudConnected: 'اتصال الحساب السحابي نشط', cloudPrototype: 'واجهة تجريبية — لم تُربط معاملات المتجر بعد',
  },
  en: {
    workspace: 'Workspace', search: 'Search sections and actions...', demo: 'Design preview · Sample data',
    subtitle: 'A clear overview of store performance and operations.', today: 'Today', revenue: 'Today’s sales',
    invoices: 'Sales invoices', products: 'Products', lowStock: 'Low stock',
    vsYesterday: 'vs yesterday', salesTrend: 'Sales activity', last7: 'Last 7 days',
    salesVsPurchases: 'Sales vs purchases', sales: 'Sales', purchases: 'Purchases',
    recent: 'Recent activity', viewAll: 'View all', productMovement: 'Product movement',
    product: 'Product', operation: 'Operation', quantity: 'Quantity', status: 'Status',
    completed: 'Completed', pending: 'Pending', received: 'Received', sold: 'Sale',
    bought: 'Purchase', returned: 'Return', stockOverview: 'Stock overview',
    available: 'In stock', low: 'Low', out: 'Out', module: 'Section',
    moduleHint: 'This is a preview of the section. Tables and actions will connect to system data when the functionality is implemented.',
    shortcuts: 'Quick access', addProduct: 'Add product', newSale: 'Open point of sale',
    newOrder: 'Order goods', openCash: 'Open cash register', notifications: 'Notifications',
    noNotifications: 'No new notifications.', logout: 'Log out',
    logoutConfirm: 'Log out of VELTRO-PRO preview?', cancel: 'Cancel', confirm: 'Log out',
    signedOut: 'You have left the preview', signIn: 'Return to preview',
    back: 'Back', home: 'Dashboard', selected: 'Selected section',
    welcome: 'Welcome to', title: 'VELTRO BUSINESS SUITE',
    daily: 'Daily status', cashBalance: 'Cash balance', expense: 'Expenses',
    profit: 'Estimated profit', viewDetails: 'View details', allSections: 'Sections',
    searchResults: 'Search results', noResults: 'No matching results.',
    topProducts: 'Top moving products', activity: 'Activity by period',
    cloudTitle: 'Cloud storage', cloudConfigured: 'Cloud configured; sign-in required', cloudMissing: 'Add Supabase settings to connect cloud storage', cloudConnected: 'Cloud account session is active', cloudPrototype: 'UI preview — store transactions are not connected yet',
  },
  fr: {
    workspace: 'Espace de travail', search: 'Rechercher une rubrique...', demo: 'Aperçu du design · Données fictives',
    subtitle: 'Une vue claire des performances et des opérations du magasin.', today: 'Aujourd’hui', revenue: 'Ventes du jour',
    invoices: 'Factures de vente', products: 'Produits', lowStock: 'Stock faible',
    vsYesterday: 'vs hier', salesTrend: 'Activité des ventes', last7: '7 derniers jours',
    salesVsPurchases: 'Ventes et achats', sales: 'Ventes', purchases: 'Achats',
    recent: 'Activité récente', viewAll: 'Tout voir', productMovement: 'Mouvement des produits',
    product: 'Produit', operation: 'Opération', quantity: 'Quantité', status: 'État',
    completed: 'Terminé', pending: 'En attente', received: 'Reçu', sold: 'Vente',
    bought: 'Achat', returned: 'Retour', stockOverview: 'Vue du stock',
    available: 'Disponible', low: 'Faible', out: 'Épuisé', module: 'Rubrique',
    moduleHint: 'Ceci est un aperçu de la rubrique. Les tableaux et actions seront reliés aux données lors de l’implémentation.',
    shortcuts: 'Accès rapide', addProduct: 'Ajouter un produit', newSale: 'Ouvrir le point de vente',
    newOrder: 'Commander', openCash: 'Ouvrir la caisse', notifications: 'Notifications',
    noNotifications: 'Aucune nouvelle notification.', logout: 'Déconnexion',
    logoutConfirm: 'Voulez-vous quitter l’aperçu VELTRO-PRO ?', cancel: 'Annuler', confirm: 'Déconnexion',
    signedOut: 'Vous avez quitté l’aperçu', signIn: 'Revenir à l’aperçu',
    back: 'Retour', home: 'Tableau de bord', selected: 'Rubrique sélectionnée',
    welcome: 'Bienvenue dans', title: 'VELTRO BUSINESS SUITE',
    daily: 'Situation journalière', cashBalance: 'Solde de caisse', expense: 'Dépenses',
    profit: 'Bénéfice estimé', viewDetails: 'Voir les détails', allSections: 'Rubriques',
    searchResults: 'Résultats', noResults: 'Aucun résultat.',
    topProducts: 'Produits les plus actifs', activity: 'Activité par période',
    cloudTitle: 'Stockage cloud', cloudConfigured: 'Cloud configuré ; connexion requise', cloudMissing: 'Ajoutez la configuration Supabase pour connecter le cloud', cloudConnected: 'Session du compte cloud active', cloudPrototype: 'Aperçu — les opérations du magasin ne sont pas encore reliées',
  }
};

const activityRows = [
  { id: 'INV-1048', product: 'Youkous 1.5L', operation: 'sold', quantity: '24', status: 'completed', time: '10:42' },
  { id: 'PUR-0217', product: 'Ifri 0.5L', operation: 'bought', quantity: '120', status: 'received', time: '10:18' },
  { id: 'INV-1047', product: 'Jus d’orange', operation: 'sold', quantity: '12', status: 'completed', time: '09:56' },
  { id: 'STK-0081', product: 'Sucre 1 kg', operation: 'returned', quantity: '3', status: 'pending', time: '09:31' },
];

function getLabel(item, lang) { return item?.label?.[lang] || item?.label?.ar || ''; }

function Sidebar({ lang, t, activeId, onNavigate, onLogout, search, mobileOpen, setMobileOpen }) {
  const [openSections, setOpenSections] = useState(() => {
    const active = sections.find(section => section.children.some(child => child.id === activeId));
    return active ? [active.id] : [];
  });
  const groups = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return sections.map(section => {
      const sectionLabel = getLabel(section, lang);
      const children = section.children.filter(child => !q || getLabel(child, lang).toLocaleLowerCase().includes(q) || sectionLabel.toLocaleLowerCase().includes(q));
      return { ...section, sectionLabel, children, visible: !q || sectionLabel.toLocaleLowerCase().includes(q) || children.length > 0 };
    }).filter(section => section.visible);
  }, [lang, search]);
  const isActive = (id) => activeId === id || sections.some(s => s.id === id && s.children.some(c => c.id === activeId));
  const toggleSection = (id) => setOpenSections(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  return <>
    {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <aside className={'sidebar ' + (mobileOpen ? 'sidebar-open' : '')}>
      <div className="brand-row">
        <span className="brand-mark"><span>V</span></span>
        <span className="brand-copy"><b>VELTRO</b><small>BUSINESS SUITE</small></span>
        <span className="brand-version">PRO</span>
      </div>
      <button className={'dashboard-link ' + (activeId === dashboard.id ? 'active' : '')} onClick={() => { onNavigate(dashboard); setMobileOpen(false); }}>
        <dashboard.icon size={17} strokeWidth={1.9} /><span>{getLabel(dashboard, lang)}</span>
      </button>
      <div className="sidebar-caption">{t('allSections')}</div>
      <nav className="side-nav" aria-label={t('allSections')}>
        {groups.map(section => {
          const Icon = section.icon;
          const expanded = search.trim().length > 0 || openSections.includes(section.id);
          return <section className={'nav-group ' + (isActive(section.id) ? 'group-active' : '') + (expanded ? ' group-expanded' : '')} key={section.id}>
            <button className="nav-group-title" onClick={() => toggleSection(section.id)} title={section.sectionLabel} aria-expanded={expanded} aria-controls={'nav-children-' + section.id}>
              <span className="nav-group-icon"><Icon size={16} strokeWidth={1.9}/></span>
              <span className="nav-group-label">{section.sectionLabel}</span>
              <span className="nav-count">{section.children.length}</span>
              <ChevronDown className="nav-chevron" size={14} strokeWidth={2}/>
            </button>
            <div id={'nav-children-' + section.id} className="nav-children" aria-hidden={!expanded}>
              <div className="nav-children-inner">
                {section.children.map((child, index) => {
                  const ChildIcon = child.icon;
                  return <button key={child.id} className={'nav-child ' + (activeId === child.id ? 'active' : '')} onClick={() => { setOpenSections(current => current.includes(section.id) ? current : [...current, section.id]); onNavigate(child, section); setMobileOpen(false); }} title={getLabel(child, lang)}>
                    <span className="nav-child-marker">{String(index + 1).padStart(2, '0')}</span>
                    <ChildIcon size={14} strokeWidth={1.8}/><span className="nav-child-label">{getLabel(child, lang)}</span>
                    {activeId === child.id && <span className="nav-child-current" />}
                  </button>;
                })}
              </div>
            </div>
          </section>;
        })}
        {groups.length === 0 && <div className="nav-empty">{t('noResults')}</div>}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-health"><span className="health-dot"/><span>{lang === 'ar' ? 'واجهة تجريبية' : lang === 'fr' ? 'Aperçu du système' : 'System preview'}</span><span className="health-tag">DEMO</span></div>
        <button className="logout-link" onClick={onLogout}><LogOut size={15}/><span>{t('logout')}</span></button>
      </div>
    </aside>
  </>;
}
function MetricCard({ icon: Icon, label, value, trend, tone = 'blue', footer }) {
  return <article className="metric-card">
    <div className="metric-top"><span className={'metric-icon tone-' + tone}><Icon size={17} strokeWidth={1.9}/></span><span className="metric-trend"><ArrowUpRight size={12}/> {trend}</span></div>
    <div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-foot">{footer}</div>
  </article>;
}

function SalesChart({ t, lang }) {
  const labels = lang === 'ar' ? ['س','أ','إ','ث','أ','خ','ج'] : lang === 'fr' ? ['S','D','L','M','M','J','V'] : ['S','S','M','T','W','T','F'];
  const heights = [35,53,43,65,50,76,61,91,68,83,57,95,72,88];
  return <article className="panel chart-panel">
    <div className="panel-head"><div><span className="eyebrow">{t('last7')}</span><h2>{t('salesTrend')}</h2></div><button className="more-button" aria-label="More"><MoreHorizontal size={18}/></button></div>
    <div className="chart-total"><strong>245,800 <small>DA</small></strong><span className="positive"><ArrowUpRight size={13}/> 8.4%</span></div>
    <div className="bar-chart" role="img" aria-label={t('salesTrend')}>{heights.map((height,i)=><div className="bar-slot" key={i}><i style={{height:height+'%'}} className={i===11?'bar-highlight':''}/></div>)}</div>
    <div className="chart-axis">{labels.map((label,i)=><span key={i}>{label}</span>)}</div>
  </article>;
}

function MixChart({ t }) {
  return <article className="panel mix-panel">
    <div className="panel-head"><div><span className="eyebrow">{t('today')}</span><h2>{t('salesVsPurchases')}</h2></div><button className="more-button" aria-label="More"><MoreHorizontal size={18}/></button></div>
    <div className="mix-content"><div className="mix-donut"><div><strong>68<small>%</small></strong><span>{t('sales')}</span></div></div>
      <div className="mix-legend"><div><i className="legend-blue"/><span>{t('sales')}</span><b>245,800 DA</b></div><div><i className="legend-green"/><span>{t('purchases')}</span><b>92,400 DA</b></div><div><i className="legend-violet"/><span>{t('expense')}</span><b>18,200 DA</b></div></div>
    </div><div className="mix-note"><span className="health-dot"/>{t('demo')}</div>
  </article>;
}

function RecentActivity({ t }) {
  return <article className="panel recent-panel">
    <div className="panel-head"><div><span className="eyebrow">{t('today')}</span><h2>{t('recent')}</h2></div><button className="text-action">{t('viewAll')} <ArrowUpRight size={13}/></button></div>
    <div className="table-wrap"><table><thead><tr><th>{t('product')}</th><th>{t('operation')}</th><th>{t('quantity')}</th><th>{t('status')}</th><th/></tr></thead><tbody>
      {activityRows.map(row=><tr key={row.id}><td><span className="product-cell"><span className="product-mini"><Package size={14}/></span><span><b>{row.product}</b><small>{row.id} · {row.time}</small></span></span></td><td><span className={'operation-pill '+row.operation}>{t(row.operation)}</span></td><td className="quantity-cell">{row.quantity}</td><td><span className={'status-pill '+row.status}><i/>{t(row.status)}</span></td><td><button className="row-more" aria-label="More"><MoreHorizontal size={15}/></button></td></tr>)}
    </tbody></table></div>
  </article>;
}

function StockOverview({ t }) {
  const items = [
    {name:'Youkous 1.5L',stock:76,label:t('available'),tone:'good'},
    {name:'Ifri 0.5L',stock:48,label:t('available'),tone:'good'},
    {name:'Jus d’orange',stock:18,label:t('low'),tone:'warn'},
    {name:'Sucre 1 kg',stock:0,label:t('out'),tone:'bad'},
  ];
  return <article className="panel stock-panel"><div className="panel-head"><div><span className="eyebrow">{t('products')}</span><h2>{t('stockOverview')}</h2></div><PackageCheck size={18} className="panel-muted"/></div>
    <div className="stock-list">{items.map(item=><div className="stock-item" key={item.name}><span className="stock-avatar"><Package size={15}/></span><span className="stock-name"><b>{item.name}</b><small>{item.label}</small></span><span className="stock-amount">{item.stock}<small>pcs</small></span><span className={'stock-indicator '+item.tone}/></div>)}</div>
  </article>;
}

function DashboardPage({ t, lang, onNavigate }) {
  return <div className="page-content dashboard-content">
    <div className="page-heading"><div><div className="heading-kicker"><span className="health-dot"/>{t('welcome')} <b>VELTRO</b></div><h1>{t('home')}</h1><p>{t('subtitle')}</p></div><div className="heading-actions"><span className="demo-badge">{t('demo')}</span><button className="date-button"><CalendarDays size={14}/>{t('today')} <ChevronDown size={14}/></button></div></div>
    <div className="metrics-grid">
      <MetricCard icon={Wallet} label={t('revenue')} value="245,800 DA" trend="8.4%" tone="blue" footer={t('vsYesterday')}/>
      <MetricCard icon={ReceiptText} label={t('invoices')} value="126" trend="5.2%" tone="green" footer={t('vsYesterday')}/>
      <MetricCard icon={Package} label={t('products')} value="1,842" trend="2.1%" tone="violet" footer={t('available')}/>
      <MetricCard icon={CircleAlert} label={t('lowStock')} value="08" trend="3" tone="amber" footer={t('low')}/>
    </div>
    <div className="charts-grid"><SalesChart t={t} lang={lang}/><MixChart t={t}/></div>
    <div className="lower-grid"><RecentActivity t={t}/><StockOverview t={t}/></div>
    <div className="quick-actions"><span>{t('shortcuts')}</span>
      <button onClick={()=>onNavigate({id:'product-list',label:{ar:'قائمة المنتجات',en:'Product list',fr:'Liste des produits'}})}><Package size={14}/>{t('addProduct')}</button>
      <button onClick={()=>onNavigate({id:'point-of-sale',label:{ar:'نقطة البيع',en:'Point of sale',fr:'Point de vente'}})}><ShoppingCart size={14}/>{t('newSale')}</button>
      <button onClick={()=>onNavigate({id:'order-new',label:{ar:'طلب السلع',en:'Order goods',fr:'Commander des articles'}})}><ClipboardList size={14}/>{t('newOrder')}</button>
      <button onClick={()=>onNavigate({id:'cash-summary',label:{ar:'ملخص الصندوق',en:'Cash summary',fr:'Résumé de caisse'}})}><Wallet size={14}/>{t('openCash')}</button>
    </div>
  </div>;
}

function ModulePage({ page, parent, t, lang, onBack }) {
  const Icon = page.icon || parent?.icon || ChartNoAxesCombined;
  const title = getLabel(page,lang) || page.label?.ar || t('module');
  const parentLabel = parent ? getLabel(parent,lang) : t('allSections');
  return <div className="page-content module-content">
    <div className="page-heading"><div><div className="heading-kicker"><span className="health-dot"/>{parentLabel}</div><h1>{title}</h1><p>{t('moduleHint')}</p></div><span className="module-icon"><Icon size={24}/></span></div>
    <div className="module-metrics"><div className="module-metric"><span>{t('module')}</span><b>{parentLabel}</b></div><div className="module-metric"><span>{t('status')}</span><b><i className="health-dot"/>{t('demo')}</b></div><div className="module-metric"><span>{t('today')}</span><b>23 / 10 / 2026</b></div></div>
    <section className="module-workspace panel"><div className="module-empty-icon"><Icon size={28}/></div><h2>{title}</h2><p>{t('moduleHint')}</p><div className="module-empty-actions"><button onClick={onBack}>{t('back')}</button><span>{t('demo')}</span></div></section>
  </div>;
}

export default function App() {
  const [lang,setLang]=useState(()=>{try{return ['ar','fr','en'].includes(localStorage.getItem('veltro.language'))?localStorage.getItem('veltro.language'):'ar';}catch{return 'ar';}});
  const [cloudState,setCloudState]=useState('checking');
  useEffect(()=>{try{localStorage.setItem('veltro.language',lang);}catch{};document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.title=lang==='ar'?'VELTRO-PRO — نظام إدارة المتجر':lang==='fr'?'VELTRO-PRO — Gestion commerciale':'VELTRO-PRO — Business Suite';},[lang]);
  useEffect(()=>{let alive=true;getCloudStatus().then(status=>{if(alive)setCloudState(status);}).catch(()=>{if(alive)setCloudState('error');});return()=>{alive=false;};},[]);
  const [activePage,setActivePage]=useState(dashboard);
  const [activeParent,setActiveParent]=useState(null);
  const [search,setSearch]=useState('');
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [logoutOpen,setLogoutOpen]=useState(false);
  const [signedOut,setSignedOut]=useState(false);
  const t=(key)=>copy[lang][key]||copy.ar[key]||key;
  const dir=lang==='ar'?'rtl':'ltr';
  const navigate=(page,parent=null)=>{setActivePage(page);setActiveParent(parent);setNotificationsOpen(false);};
  if(signedOut) return <div className="signed-out" dir={dir}><div className="signed-out-card"><span className="brand-mark"><span>V</span></span><h1>{t('signedOut')}</h1><p>VELTRO BUSINESS SUITE</p><button onClick={()=>{setSignedOut(false);setActivePage(dashboard);}}>{t('signIn')}</button></div></div>;
  return <div className={'app-shell lang-'+lang} dir={dir}>
    <div className="app-layout">
      <Sidebar lang={lang} t={t} activeId={activePage.id} onNavigate={navigate} onLogout={()=>setLogoutOpen(true)} search={search} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/>
      <main className="workspace">
        <header className="topbar">
          <div className="topbar-start"><button className="mobile-menu-button" onClick={()=>setMobileOpen(true)} aria-label="Open navigation"><Menu size={18}/></button><div className="breadcrumbs"><span>{t('workspace')}</span><span className="crumb-sep">/</span><b>{getLabel(activePage,lang)||t('home')}</b></div></div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('search')}/><kbd>⌕</kbd></label>
            <label className="language-select"><Globe size={15}/><select value={lang} onChange={e=>setLang(e.target.value)} aria-label="Language"><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select><ChevronDown size={12}/></label>
            <div className="notification-wrap"><button className="icon-button notification-button" onClick={()=>setNotificationsOpen(v=>!v)} aria-label={t('notifications')}><Bell size={17}/><i/></button>{notificationsOpen&&<div className="notification-popover"><b>{t('notifications')}</b><p>{t('noNotifications')}</p></div>}</div>
            <div className="profile-chip"><span className="profile-avatar">V</span><span><b>VELTRO</b><small>PRO</small></span><ChevronDown size={13}/></div>
          </div>
        </header>
        {activePage.id===dashboard.id?<DashboardPage t={t} lang={lang} onNavigate={navigate}/>:<ModulePage page={activePage} parent={activeParent} t={t} lang={lang} onBack={()=>navigate(dashboard)}/>}
        <footer className="workspace-footer"><span>© 2026 VELTRO BUSINESS SUITE</span><span className={'cloud-status cloud-'+cloudState}><Cloud size={14}/><span>{cloudState==='connected'?t('cloudConnected'):cloudState==='configured'?t('cloudConfigured'):t('cloudMissing')}</span></span><span className="prototype-note">{t('cloudPrototype')}</span></footer>
      </main>
    </div>
    {logoutOpen&&<div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title"><span className="modal-icon"><LogOut size={22}/></span><h2 id="logout-title">{t('logoutConfirm')}</h2><p>VELTRO BUSINESS SUITE</p><div><button className="button-secondary" onClick={()=>setLogoutOpen(false)}>{t('cancel')}</button><button className="button-danger" onClick={()=>{setLogoutOpen(false);setSignedOut(true);}}>{t('confirm')}</button></div><button className="modal-close" onClick={()=>setLogoutOpen(false)} aria-label="Close"><X size={16}/></button></section></div>}
  </div>;
}
