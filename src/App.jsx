import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Bell, Menu, ChevronDown, LogOut, ArrowUpRight, Moon, Sun, RotateCw, CloudUpload,
  MoreHorizontal, CalendarDays, Package, ReceiptText,
  Wallet, CircleAlert, Clock3, ChartNoAxesCombined,
  ShoppingCart, X, Globe, ClipboardList, History, ArrowLeft, LayoutDashboard,
  CircleCheck, PackageCheck, Cloud, PanelLeftClose, PanelLeftOpen,
  Plus, Phone, MapPin, Pencil, Trash2, ImagePlus, Building2, FileText, Users, Eye, Printer, ScanLine, Mail, Wifi, Server, UserRound, Pause, Check, LockKeyhole
} from 'lucide-react';
import { dashboard, sections } from './data/navigation.js';
import { getCloudStatus } from './services/cloudStorage.js';
import { startAutoSync, syncWorkspace } from './services/databaseSync.js';
import { supabase } from './lib/supabase.js';
import BusinessOnboarding from './BusinessOnboarding.jsx';
import ProductsPage from './ProductsPage.jsx';
import ProductMovementPage from './ProductMovementPage.jsx';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

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
    noNotifications: 'لا توجد إشعارات جديدة.', logout: 'تسجيل الخروج', sync: 'مزامنة البيانات', syncing: 'جارٍ المزامنة…', syncDone: 'اكتملت المزامنة', syncError: 'تعذرت المزامنة',
    logoutConfirm: 'هل تريد تسجيل الخروج من VELTRO-PRO؟', cancel: 'إلغاء', confirm: 'تسجيل الخروج',
    signedOut: 'تم تسجيل الخروج من المعاينة', signIn: 'العودة إلى المعاينة',
    back: 'العودة', home: 'لوحة التحكم', selected: 'القسم المحدد',
    welcome: 'مرحبًا بك في', title: 'VELTRO BUSINESS SUITE',
    daily: 'الحالة اليومية', cashBalance: 'رصيد الصندوق', expense: 'المصاريف', capital: 'رأس مال المحل', dailyProfit: 'الربح اليومي', capitalHint: 'يظهر بعد ربط بيانات المحل', profitHint: 'حسب المبيعات والتكاليف المسجلة', notLinked: 'بانتظار البيانات الفعلية', sectionsIntro: 'اختر القسم الذي تريد العمل فيه', backToSections: 'العودة إلى الأقسام',
    profit: 'الربح التقديري', viewDetails: 'عرض التفاصيل', allSections: 'الأقسام',
    searchResults: 'نتائج البحث', noResults: 'لا توجد نتائج مطابقة.',
    topProducts: 'أكثر المنتجات حركة', activity: 'النشاط حسب الفترة',
    cloudTitle: 'التخزين السحابي', cloudConfigured: 'إعداد السحابة مكتمل، بانتظار تسجيل الدخول', cloudMissing: 'أضف إعدادات Supabase لربط السحابة', cloudConnected: 'اتصال الحساب السحابي نشط', cloudChecking: 'جارٍ فحص إعدادات السحابة', cloudError: 'تعذر التحقق من اتصال السحابة', cloudPrototype: 'واجهة تجريبية — لم تُربط معاملات المتجر بعد', refreshPage: 'إعادة تحميل الصفحة',
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
    noNotifications: 'No new notifications.', logout: 'Log out', sync: 'Sync data', syncing: 'Syncing…', syncDone: 'Sync completed', syncError: 'Sync failed',
    logoutConfirm: 'Log out of VELTRO-PRO preview?', cancel: 'Cancel', confirm: 'Log out',
    signedOut: 'You have left the preview', signIn: 'Return to preview',
    back: 'Back', home: 'Dashboard', selected: 'Selected section',
    welcome: 'Welcome to', title: 'VELTRO BUSINESS SUITE',
    daily: 'Daily status', cashBalance: 'Cash balance', expense: 'Expenses', capital: 'Store capital', dailyProfit: 'Daily profit', capitalHint: 'Shown after store data is connected', profitHint: 'Based on recorded sales and costs', notLinked: 'Awaiting live data', sectionsIntro: 'Choose a section to get started', backToSections: 'Back to sections',
    profit: 'Estimated profit', viewDetails: 'View details', allSections: 'Sections',
    searchResults: 'Search results', noResults: 'No matching results.',
    topProducts: 'Top moving products', activity: 'Activity by period',
    cloudTitle: 'Cloud storage', cloudConfigured: 'Cloud configured; sign-in required', cloudMissing: 'Add Supabase settings to connect cloud storage', cloudConnected: 'Cloud account session is active', cloudChecking: 'Checking cloud configuration', cloudError: 'Could not check cloud connection', cloudPrototype: 'UI preview — store transactions are not connected yet', refreshPage: 'Reload page',
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
    noNotifications: 'Aucune nouvelle notification.', logout: 'Déconnexion', sync: 'Synchroniser les données', syncing: 'Synchronisation…', syncDone: 'Synchronisation terminée', syncError: 'Échec de la synchronisation',
    logoutConfirm: 'Voulez-vous quitter l’aperçu VELTRO-PRO ?', cancel: 'Annuler', confirm: 'Déconnexion',
    signedOut: 'Vous avez quitté l’aperçu', signIn: 'Revenir à l’aperçu',
    back: 'Retour', home: 'Tableau de bord', selected: 'Rubrique sélectionnée',
    welcome: 'Bienvenue dans', title: 'VELTRO BUSINESS SUITE',
    daily: 'Situation journalière', cashBalance: 'Solde de caisse', expense: 'Dépenses', capital: 'Capital du magasin', dailyProfit: 'Bénéfice du jour', capitalHint: 'Disponible après connexion des données', profitHint: 'Selon les ventes et coûts enregistrés', notLinked: 'En attente des données réelles', sectionsIntro: 'Choisissez une rubrique pour commencer', backToSections: 'Retour aux rubriques',
    profit: 'Bénéfice estimé', viewDetails: 'Voir les détails', allSections: 'Rubriques',
    searchResults: 'Résultats', noResults: 'Aucun résultat.',
    topProducts: 'Produits les plus actifs', activity: 'Activité par période',
    cloudTitle: 'Stockage cloud', cloudConfigured: 'Cloud configuré ; connexion requise', cloudMissing: 'Ajoutez la configuration Supabase pour connecter le cloud', cloudConnected: 'Session du compte cloud active', cloudChecking: 'Vérification de la configuration cloud', cloudError: 'Impossible de vérifier la connexion cloud', cloudPrototype: 'Aperçu — les opérations du magasin ne sont pas encore reliées', refreshPage: 'Recharger la page',
  }
};

const activityRows = [
  { id: 'INV-1048', product: 'Youkous 1.5L', operation: 'sold', quantity: '24', status: 'completed', time: '10:42' },
  { id: 'PUR-0217', product: 'Ifri 0.5L', operation: 'bought', quantity: '120', status: 'received', time: '10:18' },
  { id: 'INV-1047', product: 'Jus d’orange', operation: 'sold', quantity: '12', status: 'completed', time: '09:56' },
  { id: 'STK-0081', product: 'Sucre 1 kg', operation: 'returned', quantity: '3', status: 'pending', time: '09:31' },
];

function getLabel(item, lang) { return item?.label?.[lang] || item?.label?.ar || ''; }

function Sidebar({ lang, t, activeId, onNavigate, onLogout, onSync, syncing, search, mobileOpen, setMobileOpen, sidebarVisible }) {
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
    <aside className={'sidebar ' + (mobileOpen ? 'sidebar-open' : '') + (!sidebarVisible ? ' sidebar-hidden' : '')}>
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
        <button className="sync-link" onClick={onSync} disabled={syncing} aria-busy={syncing}><RotateCw className={syncing ? "sync-spinning" : ""} size={15}/><span>{syncing ? t('syncing') : t('sync')}</span></button>
        <button className="logout-link" onClick={onLogout}><LogOut size={15}/><span>{t('logout')}</span></button>
      </div>
    </aside>
  </>;
}
function MetricCard({ icon: Icon, label, value, trend, tone = 'blue', footer }) {
  return <article className="metric-card">
    <div className="metric-top"><span className={'metric-icon tone-' + tone}><Icon size={17} strokeWidth={1.9}/></span>{trend&&<span className="metric-trend"><ArrowUpRight size={12}/> {trend}</span>}</div>
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

function DashboardPage({ t, lang, onNavigate, onOpenSection }) {
  return <div className="page-content dashboard-content">
    <div className="page-heading"><div><div className="heading-kicker"><span className="health-dot"/>{t('welcome')} <b>VELTRO</b></div><h1>{t('home')}</h1><p>{t('subtitle')}</p></div><div className="heading-actions"><span className="demo-badge">{t('demo')}</span><button className="date-button"><CalendarDays size={14}/>{t('today')} <ChevronDown size={14}/></button></div></div>
    <section className="section-launcher" aria-label={t('allSections')}>
      <div className="section-launcher-heading"><div><h2>{t('allSections')}</h2><p>{t('sectionsIntro')}</p></div><span className="section-launcher-mark"><LayoutDashboard size={20}/></span></div>
      <div className="section-launcher-grid">
        {sections.map((section,index)=>{const Icon=section.icon;return <button type="button" key={section.id} className={'section-launch-card section-tone-'+(index%6)} onClick={()=>onOpenSection(section)}>
          <span className="section-launch-icon"><Icon size={23} strokeWidth={1.8}/></span><span className="section-launch-name">{getLabel(section,lang)}</span><span className="section-launch-meta">{section.children.length} <span>{lang==='ar'?'أقسام فرعية':lang==='fr'?'rubriques':'items'}</span></span><ChevronDown className="section-launch-arrow" size={16}/>
        </button>})}
      </div>
    </section>
    <section className="dashboard-overview" aria-label={t('home')}>
      <div className="dashboard-overview-heading"><div><h2>{t('home')}</h2><p>{t('subtitle')}</p></div><span className="dashboard-overview-mark"><ChartNoAxesCombined size={19}/></span></div>
      <div className="metrics-grid">
        <MetricCard icon={Wallet} label={t('capital')} value="— DA" trend="" tone="blue" footer={t('capitalHint')}/>
        <MetricCard icon={ChartNoAxesCombined} label={t('dailyProfit')} value="— DA" trend="" tone="green" footer={t('profitHint')}/>
        <MetricCard icon={ShoppingCart} label={t('revenue')} value="245,800 DA" trend="8.4%" tone="violet" footer={t('demo')}/>
        <MetricCard icon={ReceiptText} label={t('expense')} value="— DA" trend="" tone="amber" footer={t('notLinked')}/>
      </div>
      <div className="charts-grid"><SalesChart t={t} lang={lang}/><MixChart t={t}/></div>
      <div className="lower-grid"><RecentActivity t={t}/><StockOverview t={t}/></div>
      <div className="quick-actions"><span>{t('shortcuts')}</span>
        <button onClick={()=>onNavigate({id:'product-list',label:{ar:'قائمة المنتجات',en:'Product list',fr:'Liste des produits'}})}><Package size={14}/>{t('addProduct')}</button>
        <button onClick={()=>onNavigate({id:'point-of-sale',label:{ar:'نقطة البيع',en:'Point of sale',fr:'Point de vente'}})}><ShoppingCart size={14}/>{t('newSale')}</button>
        <button onClick={()=>onNavigate({id:'order-new',label:{ar:'طلب السلع',en:'Order goods',fr:'Commander des articles'}})}><ClipboardList size={14}/>{t('newOrder')}</button>
        <button onClick={()=>onNavigate({id:'cash-summary',label:{ar:'ملخص الصندوق',en:'Cash summary',fr:'Résumé de caisse'}})}><Wallet size={14}/>{t('openCash')}</button>
      </div>
    </section>
  </div>;
}

function SupplierListPage({ lang }) {
  const labels = {
    ar: { title:'قائمة الموردين', subtitle:'إدارة بيانات الموردين ووسائل الاتصال بهم في مكان واحد.', add:'إضافة مورد', search:'ابحث بالاسم أو الهاتف…', searchRef:'ابحث بالمرجع أو امسح الكود…', total:'إجمالي الموردين', shown:'المعروض', empty:'لا يوجد موردون بعد', emptyHint:'ابدأ بإضافة أول مورد إلى سجل متجرك.', name:'اسم المورد', phone:'رقم الهاتف', email:'البريد الإلكتروني', balance:'الرصيد المستحق (دج)', id:'المعرف', address:'العنوان', description:'الوصف', photo:'صورة المورد', choosePhoto:'اختيار صورة', save:'حفظ المورد', update:'حفظ التعديلات', cancel:'إلغاء', edit:'تعديل', delete:'حذف', actions:'الإجراءات', view:'معاينة', qr:'رمز QR', barcode:'الباركود', print:'طباعة بطاقة المورد', created:'تاريخ التسجيل', noDescription:'لا توجد ملاحظات مضافة', noPhone:'لا يوجد رقم هاتف', noAddress:'لم يُحدد العنوان', confirmDelete:'هل تريد حذف هذا المورد؟', required:'يرجى إدخال اسم المورد.', saved:'تم حفظ بيانات المورد محليًا.', duplicate:'هذا المعرف مستخدم بالفعل.', close:'إغلاق', details:'بيانات المورد', all:'كل الموردين' },
    en: { title:'Supplier list', subtitle:'Manage supplier profiles and contact details in one place.', add:'Add supplier', search:'Search name or phone…', searchRef:'Search reference or scan code…', total:'Total suppliers', shown:'Shown', empty:'No suppliers yet', emptyHint:'Add your first supplier to the store directory.', name:'Supplier name', phone:'Phone number', email:'Email address', balance:'Outstanding balance (DA)', id:'Supplier ID', address:'Address', description:'Description', photo:'Supplier photo', choosePhoto:'Choose photo', save:'Save supplier', update:'Save changes', cancel:'Cancel', edit:'Edit', delete:'Delete', actions:'Actions', view:'Preview', qr:'QR code', barcode:'Barcode', print:'Print supplier card', created:'Registered', noDescription:'No notes added', noPhone:'No phone number', noAddress:'No address added', confirmDelete:'Delete this supplier?', required:'Please enter a supplier name.', saved:'Supplier saved locally.', duplicate:'This ID is already in use.', close:'Close', details:'Supplier details', all:'All suppliers' },
    fr: { title:'Liste des fournisseurs', subtitle:'Gérez les profils et coordonnées des fournisseurs au même endroit.', add:'Ajouter un fournisseur', search:'Rechercher nom ou téléphone…', searchRef:'Rechercher référence ou scanner…', total:'Total fournisseurs', shown:'Affichés', empty:'Aucun fournisseur pour le moment', emptyHint:'Ajoutez le premier fournisseur à votre répertoire.', name:'Nom du fournisseur', phone:'Téléphone', email:'E-mail', balance:'Solde dû (DA)', id:'Identifiant', address:'Adresse', description:'Description', photo:'Photo du fournisseur', choosePhoto:'Choisir une photo', save:'Enregistrer', update:'Enregistrer les modifications', cancel:'Annuler', edit:'Modifier', delete:'Supprimer', actions:'Actions', view:'Aperçu', qr:'Code QR', barcode:'Code-barres', print:'Imprimer la carte', created:'Inscrit le', noDescription:'Aucune note ajoutée', noPhone:'Aucun téléphone', noAddress:'Aucune adresse', confirmDelete:'Supprimer ce fournisseur ?', required:'Veuillez saisir le nom du fournisseur.', saved:'Fournisseur enregistré localement.', duplicate:'Cet identifiant est déjà utilisé.', close:'Fermer', details:'Coordonnées du fournisseur', all:'Tous les fournisseurs' }
  };
  const t = key => labels[lang]?.[key] || labels.ar[key] || key;
  const [suppliers, setSuppliers] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem('veltro.suppliers.v1') || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
  });
  const [query, setQuery] = useState('');
  const [refQuery, setRefQuery] = useState('');
  const [previewSupplier, setPreviewSupplier] = useState(null);
  const [deleteSupplier, setDeleteSupplier] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const emptyForm = { name:'', phone:'', email:'', balance:'0', address:'', description:'', photo:'' };
  const [form, setForm] = useState(emptyForm);
  useEffect(() => { try { localStorage.setItem('veltro.suppliers.v1', JSON.stringify(suppliers)); } catch { setError(lang==='ar'?'تعذر حفظ البيانات محليًا؛ قد تكون الصور كبيرة جدًا.':'Could not save locally; images may be too large.'); } }, [suppliers, lang]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const r = refQuery.trim().toLocaleLowerCase();
    return suppliers.filter(s => (!q || [s.name,s.phone].some(v => String(v||'').toLocaleLowerCase().includes(q))) && (!r || String(s.id||'').toLocaleLowerCase().includes(r)));
  }, [suppliers, query, refQuery]);
  const openAdd = () => { setEditingId(null); setForm(emptyForm); setError(''); setModalOpen(true); };
  const openEdit = supplier => { setEditingId(supplier.id); setForm({ name:supplier.name||'', phone:supplier.phone||'', email:supplier.email||'', balance:String(supplier.balance??supplier.debt??0), address:supplier.address||'', description:supplier.description||'', photo:supplier.photo||'' }); setError(''); setModalOpen(true); };
  const setField = (key,value) => setForm(current => ({...current,[key]:value}));
  const readPhoto = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(lang==='ar'?'اختر ملف صورة صالحًا.':'Please choose a valid image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError(lang==='ar'?'حجم الصورة يجب ألا يتجاوز 2 ميغابايت.':'Photo must be 2 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.onload = () => setField('photo', String(reader.result || ''));
    reader.onerror = () => setError(lang==='ar'?'تعذر قراءة الصورة.':'Could not read the photo.');
    reader.readAsDataURL(file);
  };
  const save = event => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) { setError(t('required')); return; }
    const nextId = editingId || ('SUP-' + String(Math.max(0,...suppliers.map(s => Number(String(s.id||'').replace(/\D/g,''))||0))+1).padStart(4,'0'));
    if (suppliers.some(s => s.id === nextId && s.id !== editingId)) { setError(t('duplicate')); return; }
    const record = { ...form, name, phone:form.phone.trim(), email:form.email.trim(), balance:Math.max(0,Number(form.balance)||0), address:form.address.trim(), description:form.description.trim(), id:nextId, updatedAt:new Date().toISOString() };
    setSuppliers(current => editingId ? current.map(s => s.id===editingId ? record : s) : [record,...current]);
    setModalOpen(false); setForm(emptyForm); setEditingId(null); setError('');
  };
  const remove = () => {
    if (!deleteSupplier) return;
    setSuppliers(current => current.filter(s => s.id !== deleteSupplier.id));
    if (previewSupplier?.id === deleteSupplier.id) setPreviewSupplier(null);
    setDeleteSupplier(null);
  };
  const printCard = supplier => {
    const win = window.open('', '_blank', 'width=720,height=560');
    if (!win) { window.alert(lang==='ar'?'اسمح بفتح نافذة الطباعة من المتصفح.':'Allow the print window in your browser.'); return; }
    const safe = value => String(value||'').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
    const qr = document.querySelector('[data-supplier-qr="'+supplier.id+'"]')?.outerHTML || '';
    const barcode = document.querySelector('[data-supplier-barcode="'+supplier.id+'"]')?.outerHTML || '';
    win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+safe(supplier.name)+'</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#18304a}.card{max-width:640px;margin:auto;border:1px solid #dce5ed;border-radius:14px;padding:24px;text-align:center}.ref{color:#168f91;font-weight:bold}.codes{display:flex;align-items:center;justify-content:space-around;gap:20px;flex-wrap:wrap;margin-top:22px}.codes svg{max-width:100%}.info{line-height:1.8;color:#52667d}</style></head><body><div class="card"><h2>'+safe(supplier.name)+'</h2><div class="ref">'+safe(supplier.id)+'</div><p class="info">'+safe(supplier.phone||'')+'<br>'+safe(supplier.email||'')+'<br>'+safe(supplier.address||'')+'</p><div class="codes"><div>'+qr+'<p>QR Code</p></div><div>'+barcode+'<p>Barcode</p></div></div></div><script>window.onload=function(){window.print()}<\/script></body></html>');
    win.document.close();
  };
  return <div className="page-content supplier-page">
    <div className="page-heading supplier-heading">
      <div><div className="heading-kicker"><span className="health-dot"/>{lang==='ar'?'الموردون':lang==='fr'?'Fournisseurs':'Suppliers'}</div><h1>{t('title')}</h1><p>{t('subtitle')}</p></div>
      <button className="supplier-primary" onClick={openAdd}><Plus size={16}/>{t('add')}</button>
    </div>
    <div className="supplier-stats">
      <div className="supplier-stat"><span className="supplier-stat-icon"><Building2 size={17}/></span><div><small>{t('total')}</small><strong>{suppliers.length}</strong></div></div>
      <div className="supplier-stat"><span className="supplier-stat-icon supplier-stat-teal"><Users size={17}/></span><div><small>{t('shown')}</small><strong>{filtered.length}</strong></div></div>
    </div>
    <section className="supplier-directory panel">
      <div className="supplier-toolbar"><div><h2>{t('all')}</h2><p>{lang==='ar'?'سجل الموردين المسجلين في هذا الجهاز':lang==='fr'?'Répertoire enregistré sur cet appareil':'Directory saved on this device'}</p></div><div className="supplier-searches"><label className="supplier-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('search')}/><span>{filtered.length}</span></label><label className="supplier-search supplier-ref-search"><ScanLine size={15}/><input value={refQuery} onChange={e=>setRefQuery(e.target.value)} placeholder={t('searchRef')} dir="ltr"/></label></div></div>
      {filtered.length===0 ? <div className="supplier-empty"><span><Building2 size={27}/></span><h3>{(query||refQuery) ? (lang==='ar'?'لا توجد نتائج مطابقة':lang==='fr'?'Aucun résultat':'No matching results') : t('empty')}</h3><p>{(query||refQuery) ? (lang==='ar'?'جرّب البحث بكلمات أخرى.':lang==='fr'?'Essayez d’autres mots-clés.':'Try another search.') : t('emptyHint')}</p>{!query&&!refQuery&&<button className="supplier-primary" onClick={openAdd}><Plus size={15}/>{t('add')}</button>}</div>
      : <div className="supplier-table-wrap"><table className="supplier-table"><thead><tr><th>{t('name')}</th><th>{t('id')}</th><th>{t('phone')}</th><th>{t('email')}</th><th>{t('address')}</th><th>{t('description')}</th><th>{t('actions')}</th></tr></thead><tbody>
        {filtered.map(supplier=><tr key={supplier.id}><td><div className="supplier-name-cell">{supplier.photo?<img src={supplier.photo} alt=""/>:<span className="supplier-avatar"><Building2 size={17}/></span>}<span><b>{supplier.name}</b><small>{supplier.id}</small></span></div></td><td><code className="supplier-id">{supplier.id}</code></td><td>{supplier.phone?<a className="supplier-phone" href={'tel:'+supplier.phone}><Phone size={13}/>{supplier.phone}</a>:<span className="supplier-muted">{t('noPhone')}</span>}</td><td>{supplier.email?<a className="supplier-email" href={'mailto:'+supplier.email}><Mail size={13}/>{supplier.email}</a>:<span className="supplier-muted">—</span>}</td><td><span className="supplier-address"><MapPin size={13}/>{supplier.address||t('noAddress')}</span></td><td><span className="supplier-description">{supplier.description||'—'}</span></td><td><div className="supplier-row-actions"><button onClick={()=>setPreviewSupplier(supplier)} aria-label="Preview" title="Preview"><Eye size={14}/></button><button onClick={()=>openEdit(supplier)} aria-label={t('edit')} title={t('edit')}><Pencil size={14}/></button><button className="danger" onClick={()=>setDeleteSupplier(supplier)} aria-label={t('delete')} title={t('delete')}><Trash2 size={14}/></button></div></td></tr>)}
      </tbody></table></div>}
    </section>
    {modalOpen&&<div className="supplier-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false);}}><section className="supplier-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-modal-title"><div className="supplier-modal-head"><div><span>{t('details')}</span><h2 id="supplier-modal-title">{editingId?t('edit'):t('add')}</h2></div><button type="button" onClick={()=>setModalOpen(false)} aria-label={t('close')}><X size={17}/></button></div>
      <form onSubmit={save}><div className="supplier-photo-field"><label className="supplier-photo-preview">{form.photo?<img src={form.photo} alt=""/>:<ImagePlus size={22}/>}<input type="file" accept="image/*" onChange={readPhoto}/></label><div><b>{t('photo')}</b><small>{lang==='ar'?'صورة اختيارية، حتى 2 ميغابايت':lang==='fr'?'Photo facultative, 2 Mo maximum':'Optional photo, up to 2 MB'}</small><label className="supplier-photo-button"><ImagePlus size={13}/>{t('choosePhoto')}<input type="file" accept="image/*" onChange={readPhoto}/></label></div></div>
      <div className="supplier-form-grid"><label className="supplier-field"><span>{t('name')} <i>*</i></span><input autoFocus value={form.name} onChange={e=>setField('name',e.target.value)} required maxLength={100} placeholder={lang==='ar'?'اسم الشركة أو الموزع':'Company or distributor name'}/></label><label className="supplier-field"><span>{t('id')}</span><input value={editingId||'يُنشأ تلقائيًا / Auto'} readOnly dir="ltr"/></label><label className="supplier-field"><span>{t('phone')}</span><input value={form.phone} onChange={e=>setField('phone',e.target.value)} inputMode="tel" maxLength={40} placeholder="+213 …"/></label><label className="supplier-field"><span>{t('email')}</span><input type="email" value={form.email} onChange={e=>setField('email',e.target.value)} maxLength={254} placeholder="contact@example.com"/></label><label className="supplier-field"><span>{t('balance')}</span><input type="number" min="0" step="0.01" inputMode="decimal" value={form.balance} onChange={e=>setField('balance',e.target.value)} placeholder="0.00"/></label><label className="supplier-field"><span>{t('address')}</span><input value={form.address} onChange={e=>setField('address',e.target.value)} maxLength={200} placeholder={lang==='ar'?'المدينة، العنوان…':'City, address…'}/></label><label className="supplier-field supplier-field-wide"><span>{t('description')}</span><textarea value={form.description} onChange={e=>setField('description',e.target.value)} rows={3} maxLength={1000} placeholder={lang==='ar'?'ملاحظات أو نوع السلع التي يوفرها المورد…':'Notes or goods supplied…'}/></label></div>
      {error&&<p className="supplier-form-error">{error}</p>}<div className="supplier-modal-actions"><button type="button" className="supplier-secondary" onClick={()=>setModalOpen(false)}>{t('cancel')}</button><button type="submit" className="supplier-primary"><CircleCheck size={15}/>{editingId?t('update'):t('save')}</button></div></form>
    </section></div>}
  
    {previewSupplier&&<div className="supplier-modal-backdrop supplier-preview-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPreviewSupplier(null);}}><section className="supplier-preview-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-preview-title">
      <div className="supplier-preview-top"><div><span>{t('details')}</span><h2 id="supplier-preview-title">{previewSupplier.name}</h2><code>{previewSupplier.id}</code></div><button onClick={()=>setPreviewSupplier(null)} aria-label="Close"><X size={18}/></button></div>
      <div className="supplier-preview-body"><div className="supplier-preview-identity">{previewSupplier.photo?<img src={previewSupplier.photo} alt=""/>:<span className="supplier-preview-avatar"><Building2 size={27}/></span>}<div><h3>{previewSupplier.name}</h3><span>{t('id')}: {previewSupplier.id}</span><small>{t('phone')}: {previewSupplier.phone||t('noPhone')}</small></div></div>
      <div className="supplier-detail-grid"><div className="supplier-detail-card"><Phone size={16}/><span>{t('phone')}</span><b>{previewSupplier.phone||t('noPhone')}</b></div><div className="supplier-detail-card"><Mail size={16}/><span>{t('email')}</span><b>{previewSupplier.email||'—'}</b></div><div className="supplier-detail-card"><MapPin size={16}/><span>{t('address')}</span><b>{previewSupplier.address||t('noAddress')}</b></div></div>
      <div className="supplier-notes"><span>{t('description')}</span><p>{previewSupplier.description||t('noDescription')}</p></div>
      <div className="supplier-codes-grid"><div className="supplier-code-card"><h3>{t('qr')}</h3><div className="supplier-qr" data-supplier-qr={previewSupplier.id}><QRCodeSVG value={previewSupplier.id} size={124} level="M" includeMargin/></div><code>{previewSupplier.id}</code></div><div className="supplier-code-card supplier-barcode-card"><h3>{t('barcode')}</h3><div data-supplier-barcode={previewSupplier.id}><Barcode value={previewSupplier.id} format="CODE128" width={1.4} height={52} fontSize={12} margin={6} displayValue/></div><code>{previewSupplier.id}</code></div></div></div>
      <div className="supplier-preview-actions"><button className="supplier-secondary" onClick={()=>printCard(previewSupplier)}><Printer size={15}/>{t('print')}</button><button className="supplier-secondary" onClick={()=>openEdit(previewSupplier)}><Pencil size={15}/>{t('edit')}</button><button className="supplier-primary" onClick={()=>setPreviewSupplier(null)}>{t('close')}</button></div>
    </section></div>}
    {deleteSupplier&&<div className="supplier-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDeleteSupplier(null);}}><section className="supplier-delete-modal" role="dialog" aria-modal="true"><span className="supplier-delete-icon"><Trash2 size={22}/></span><h2>{t('confirmDelete')}</h2><p><b>{deleteSupplier.name}</b></p><div><button className="supplier-secondary" onClick={()=>setDeleteSupplier(null)}>{t('cancel')}</button><button className="supplier-delete-confirm" onClick={remove}><Trash2 size={14}/>{t('delete')}</button></div></section></div>}

  </div>;
}

function CustomerListPage({ lang }) {
  const labels = {
    ar: { title:'قائمة الزبائن', subtitle:'إدارة بيانات الزبائن ووسائل الاتصال بهم في مكان واحد.', add:'إضافة زبون', search:'ابحث بالاسم أو الهاتف…', searchRef:'ابحث بالمرجع أو امسح الكود…', total:'إجمالي الزبائن', shown:'المعروض', empty:'لا يوجد زبونون بعد', emptyHint:'ابدأ بإضافة أول زبون إلى سجل متجرك.', name:'اسم الزبون', phone:'رقم الهاتف', email:'البريد الإلكتروني', balance:'الرصيد المستحق (دج)', id:'المعرف', address:'العنوان', description:'الوصف', photo:'صورة الزبون', choosePhoto:'اختيار صورة', save:'حفظ الزبون', update:'حفظ التعديلات', cancel:'إلغاء', edit:'تعديل', delete:'حذف', actions:'الإجراءات', view:'معاينة', qr:'رمز QR', barcode:'الباركود', print:'طباعة بطاقة الزبون', created:'تاريخ التسجيل', noDescription:'لا توجد ملاحظات مضافة', noPhone:'لا يوجد رقم هاتف', noAddress:'لم يُحدد العنوان', confirmDelete:'هل تريد حذف هذا الزبون؟', required:'يرجى إدخال اسم الزبون.', saved:'تم حفظ بيانات الزبون محليًا.', duplicate:'هذا المعرف مستخدم بالفعل.', close:'إغلاق', details:'بيانات الزبون', all:'كل الزبائن' },
    en: { title:'Customer list', subtitle:'Manage customer profiles and contact details in one place.', add:'Add customer', search:'Search name or phone…', searchRef:'Search reference or scan code…', total:'Total customers', shown:'Shown', empty:'No customers yet', emptyHint:'Add your first customer to the store directory.', name:'Customer name', phone:'Phone number', email:'Email address', balance:'Outstanding balance (DA)', id:'Customer ID', address:'Address', description:'Description', photo:'Customer photo', choosePhoto:'Choose photo', save:'Save customer', update:'Save changes', cancel:'Cancel', edit:'Edit', delete:'Delete', actions:'Actions', view:'Preview', qr:'QR code', barcode:'Barcode', print:'Print customer card', created:'Registered', noDescription:'No notes added', noPhone:'No phone number', noAddress:'No address added', confirmDelete:'Delete this customer?', required:'Please enter a customer name.', saved:'Customer saved locally.', duplicate:'This ID is already in use.', close:'Close', details:'Customer details', all:'All customers' },
    fr: { title:'Liste des clients', subtitle:'Gérez les profils et coordonnées des clients au même endroit.', add:'Ajouter un client', search:'Rechercher nom ou téléphone…', searchRef:'Rechercher référence ou scanner…', total:'Total clients', shown:'Affichés', empty:'Aucun client pour le moment', emptyHint:'Ajoutez le premier client à votre répertoire.', name:'Nom du client', phone:'Téléphone', email:'E-mail', balance:'Solde dû (DA)', id:'Identifiant', address:'Adresse', description:'Description', photo:'Photo du client', choosePhoto:'Choisir une photo', save:'Enregistrer', update:'Enregistrer les modifications', cancel:'Annuler', edit:'Modifier', delete:'Supprimer', actions:'Actions', view:'Aperçu', qr:'Code QR', barcode:'Code-barres', print:'Imprimer la carte', created:'Inscrit le', noDescription:'Aucune note ajoutée', noPhone:'Aucun téléphone', noAddress:'Aucune adresse', confirmDelete:'Supprimer ce client ?', required:'Veuillez saisir le nom du client.', saved:'Client enregistré localement.', duplicate:'Cet identifiant est déjà utilisé.', close:'Fermer', details:'Coordonnées du client', all:'Tous les clients' }
  };
  const t = key => labels[lang]?.[key] || labels.ar[key] || key;
  const [customers, setCustomers] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem('veltro.customers.v1') || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
  });
  const [query, setQuery] = useState('');
  const [refQuery, setRefQuery] = useState('');
  const [previewCustomer, setPreviewCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const emptyForm = { name:'', phone:'', email:'', balance:'0', address:'', description:'', photo:'' };
  const [form, setForm] = useState(emptyForm);
  useEffect(() => { try { localStorage.setItem('veltro.customers.v1', JSON.stringify(customers)); } catch { setError(lang==='ar'?'تعذر حفظ البيانات محليًا؛ قد تكون الصور كبيرة جدًا.':'Could not save locally; images may be too large.'); } }, [customers, lang]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const r = refQuery.trim().toLocaleLowerCase();
    return customers.filter(s => (!q || [s.name,s.phone].some(v => String(v||'').toLocaleLowerCase().includes(q))) && (!r || String(s.id||'').toLocaleLowerCase().includes(r)));
  }, [customers, query, refQuery]);
  const openAdd = () => { setEditingId(null); setForm(emptyForm); setError(''); setModalOpen(true); };
  const openEdit = customer => { setEditingId(customer.id); setForm({ name:customer.name||'', phone:customer.phone||'', email:customer.email||'', balance:String(customer.balance??customer.debt??0), address:customer.address||'', description:customer.description||'', photo:customer.photo||'' }); setError(''); setModalOpen(true); };
  const setField = (key,value) => setForm(current => ({...current,[key]:value}));
  const readPhoto = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(lang==='ar'?'اختر ملف صورة صالحًا.':'Please choose a valid image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError(lang==='ar'?'حجم الصورة يجب ألا يتجاوز 2 ميغابايت.':'Photo must be 2 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.onload = () => setField('photo', String(reader.result || ''));
    reader.onerror = () => setError(lang==='ar'?'تعذر قراءة الصورة.':'Could not read the photo.');
    reader.readAsDataURL(file);
  };
  const save = event => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) { setError(t('required')); return; }
    const nextId = editingId || ('CUS-' + String(Math.max(0,...customers.map(s => Number(String(s.id||'').replace(/\D/g,''))||0))+1).padStart(4,'0'));
    if (customers.some(s => s.id === nextId && s.id !== editingId)) { setError(t('duplicate')); return; }
    const record = { ...form, name, phone:form.phone.trim(), email:form.email.trim(), balance:Number(form.balance)||0, address:form.address.trim(), description:form.description.trim(), id:nextId, updatedAt:new Date().toISOString() };
    setCustomers(current => editingId ? current.map(s => s.id===editingId ? record : s) : [record,...current]);
    setModalOpen(false); setForm(emptyForm); setEditingId(null); setError('');
  };
  const remove = () => {
    if (!deleteCustomer) return;
    setCustomers(current => current.filter(s => s.id !== deleteCustomer.id));
    if (previewCustomer?.id === deleteCustomer.id) setPreviewCustomer(null);
    setDeleteCustomer(null);
  };
  const printCard = customer => {
    const win = window.open('', '_blank', 'width=720,height=560');
    if (!win) { window.alert(lang==='ar'?'اسمح بفتح نافذة الطباعة من المتصفح.':'Allow the print window in your browser.'); return; }
    const safe = value => String(value||'').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
    const qr = document.querySelector('[data-customer-qr="'+customer.id+'"]')?.outerHTML || '';
    const barcode = document.querySelector('[data-customer-barcode="'+customer.id+'"]')?.outerHTML || '';
    win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+safe(customer.name)+'</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#18304a}.card{max-width:640px;margin:auto;border:1px solid #dce5ed;border-radius:14px;padding:24px;text-align:center}.ref{color:#168f91;font-weight:bold}.codes{display:flex;align-items:center;justify-content:space-around;gap:20px;flex-wrap:wrap;margin-top:22px}.codes svg{max-width:100%}.info{line-height:1.8;color:#52667d}</style></head><body><div class="card"><h2>'+safe(customer.name)+'</h2><div class="ref">'+safe(customer.id)+'</div><p class="info">'+safe(customer.phone||'')+'<br>'+safe(customer.email||'')+'<br>'+safe(customer.address||'')+'</p><div class="codes"><div>'+qr+'<p>QR Code</p></div><div>'+barcode+'<p>Barcode</p></div></div></div><script>window.onload=function(){window.print()}<\/script></body></html>');
    win.document.close();
  };
  return <div className="page-content customer-page">
    <div className="page-heading customer-heading">
      <div><div className="heading-kicker"><span className="health-dot"/>{lang==='ar'?'الزبونون':lang==='fr'?'Clients':'Customers'}</div><h1>{t('title')}</h1><p>{t('subtitle')}</p></div>
      <button className="supplier-primary" onClick={openAdd}><Plus size={16}/>{t('add')}</button>
    </div>
    <div className="supplier-stats">
      <div className="supplier-stat"><span className="supplier-stat-icon"><Building2 size={17}/></span><div><small>{t('total')}</small><strong>{customers.length}</strong></div></div>
      <div className="supplier-stat"><span className="supplier-stat-icon supplier-stat-teal"><Users size={17}/></span><div><small>{t('shown')}</small><strong>{filtered.length}</strong></div></div>
    </div>
    <section className="supplier-directory panel">
      <div className="supplier-toolbar"><div><h2>{t('all')}</h2><p>{lang==='ar'?'سجل الزبائن المسجلين في هذا الجهاز':lang==='fr'?'Répertoire enregistré sur cet appareil':'Directory saved on this device'}</p></div><div className="supplier-searches"><label className="supplier-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('search')}/><span>{filtered.length}</span></label><label className="supplier-search supplier-ref-search"><ScanLine size={15}/><input value={refQuery} onChange={e=>setRefQuery(e.target.value)} placeholder={t('searchRef')} dir="ltr"/></label></div></div>
      {filtered.length===0 ? <div className="supplier-empty"><span><Building2 size={27}/></span><h3>{(query||refQuery) ? (lang==='ar'?'لا توجد نتائج مطابقة':lang==='fr'?'Aucun résultat':'No matching results') : t('empty')}</h3><p>{(query||refQuery) ? (lang==='ar'?'جرّب البحث بكلمات أخرى.':lang==='fr'?'Essayez d’autres mots-clés.':'Try another search.') : t('emptyHint')}</p>{!query&&!refQuery&&<button className="supplier-primary" onClick={openAdd}><Plus size={15}/>{t('add')}</button>}</div>
      : <div className="supplier-table-wrap"><table className="supplier-table"><thead><tr><th>{t('name')}</th><th>{t('id')}</th><th>{t('phone')}</th><th>{t('email')}</th><th>{t('address')}</th><th>{t('description')}</th><th>{t('actions')}</th></tr></thead><tbody>
        {filtered.map(customer=><tr key={customer.id}><td><div className="supplier-name-cell">{customer.photo?<img src={customer.photo} alt=""/>:<span className="supplier-avatar"><Building2 size={17}/></span>}<span><b>{customer.name}</b><small>{customer.id}</small></span></div></td><td><code className="supplier-id">{customer.id}</code></td><td>{customer.phone?<a className="supplier-phone" href={'tel:'+customer.phone}><Phone size={13}/>{customer.phone}</a>:<span className="supplier-muted">{t('noPhone')}</span>}</td><td>{customer.email?<a className="supplier-email" href={'mailto:'+customer.email}><Mail size={13}/>{customer.email}</a>:<span className="supplier-muted">—</span>}</td><td><span className="supplier-address"><MapPin size={13}/>{customer.address||t('noAddress')}</span></td><td><span className="supplier-description">{customer.description||'—'}</span></td><td><div className="supplier-row-actions"><button onClick={()=>setPreviewCustomer(customer)} aria-label="Preview" title="Preview"><Eye size={14}/></button><button onClick={()=>openEdit(customer)} aria-label={t('edit')} title={t('edit')}><Pencil size={14}/></button><button className="danger" onClick={()=>setDeleteCustomer(customer)} aria-label={t('delete')} title={t('delete')}><Trash2 size={14}/></button></div></td></tr>)}
      </tbody></table></div>}
    </section>
    {modalOpen&&<div className="supplier-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false);}}><section className="supplier-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-modal-title"><div className="supplier-modal-head"><div><span>{t('details')}</span><h2 id="supplier-modal-title">{editingId?t('edit'):t('add')}</h2></div><button type="button" onClick={()=>setModalOpen(false)} aria-label={t('close')}><X size={17}/></button></div>
      <form onSubmit={save}><div className="supplier-photo-field"><label className="supplier-photo-preview">{form.photo?<img src={form.photo} alt=""/>:<ImagePlus size={22}/>}<input type="file" accept="image/*" onChange={readPhoto}/></label><div><b>{t('photo')}</b><small>{lang==='ar'?'صورة اختيارية، حتى 2 ميغابايت':lang==='fr'?'Photo facultative, 2 Mo maximum':'Optional photo, up to 2 MB'}</small><label className="supplier-photo-button"><ImagePlus size={13}/>{t('choosePhoto')}<input type="file" accept="image/*" onChange={readPhoto}/></label></div></div>
      <div className="supplier-form-grid"><label className="supplier-field"><span>{t('name')} <i>*</i></span><input autoFocus value={form.name} onChange={e=>setField('name',e.target.value)} required maxLength={100} placeholder={lang==='ar'?'اسم الشركة أو الموزع':'Company or distributor name'}/></label><label className="supplier-field"><span>{t('id')}</span><input value={editingId||'يُنشأ تلقائيًا / Auto'} readOnly dir="ltr"/></label><label className="supplier-field"><span>{t('phone')}</span><input value={form.phone} onChange={e=>setField('phone',e.target.value)} inputMode="tel" maxLength={40} placeholder="+213 …"/></label><label className="supplier-field"><span>{t('email')}</span><input type="email" value={form.email} onChange={e=>setField('email',e.target.value)} maxLength={254} placeholder="contact@example.com"/></label><label className="supplier-field"><span>{t('balance')}</span><input type="number" min="0" step="0.01" inputMode="decimal" value={form.balance} onChange={e=>setField('balance',e.target.value)} placeholder="0.00"/></label><label className="supplier-field"><span>{t('address')}</span><input value={form.address} onChange={e=>setField('address',e.target.value)} maxLength={200} placeholder={lang==='ar'?'المدينة، العنوان…':'City, address…'}/></label><label className="supplier-field supplier-field-wide"><span>{t('description')}</span><textarea value={form.description} onChange={e=>setField('description',e.target.value)} rows={3} maxLength={1000} placeholder={lang==='ar'?'ملاحظات أو نوع السلع التي يوفرها الزبون…':'Notes or goods supplied…'}/></label></div>
      {error&&<p className="supplier-form-error">{error}</p>}<div className="supplier-modal-actions"><button type="button" className="supplier-secondary" onClick={()=>setModalOpen(false)}>{t('cancel')}</button><button type="submit" className="supplier-primary"><CircleCheck size={15}/>{editingId?t('update'):t('save')}</button></div></form>
    </section></div>}
  
    {previewCustomer&&<div className="supplier-modal-backdrop supplier-preview-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPreviewCustomer(null);}}><section className="supplier-preview-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-preview-title">
      <div className="supplier-preview-top"><div><span>{t('details')}</span><h2 id="supplier-preview-title">{previewCustomer.name}</h2><code>{previewCustomer.id}</code></div><button onClick={()=>setPreviewCustomer(null)} aria-label="Close"><X size={18}/></button></div>
      <div className="supplier-preview-body"><div className="supplier-preview-identity">{previewCustomer.photo?<img src={previewCustomer.photo} alt=""/>:<span className="supplier-preview-avatar"><Building2 size={27}/></span>}<div><h3>{previewCustomer.name}</h3><span>{t('id')}: {previewCustomer.id}</span><small>{t('phone')}: {previewCustomer.phone||t('noPhone')}</small></div></div>
      <div className="supplier-detail-grid"><div className="supplier-detail-card"><Phone size={16}/><span>{t('phone')}</span><b>{previewCustomer.phone||t('noPhone')}</b></div><div className="supplier-detail-card"><Mail size={16}/><span>{t('email')}</span><b>{previewCustomer.email||'—'}</b></div><div className="supplier-detail-card"><MapPin size={16}/><span>{t('address')}</span><b>{previewCustomer.address||t('noAddress')}</b></div></div>
      <div className="supplier-notes"><span>{t('description')}</span><p>{previewCustomer.description||t('noDescription')}</p></div>
      <div className="supplier-codes-grid"><div className="supplier-code-card"><h3>{t('qr')}</h3><div className="supplier-qr" data-customer-qr={previewCustomer.id}><QRCodeSVG value={previewCustomer.id} size={124} level="M" includeMargin/></div><code>{previewCustomer.id}</code></div><div className="supplier-code-card supplier-barcode-card"><h3>{t('barcode')}</h3><div data-customer-barcode={previewCustomer.id}><Barcode value={previewCustomer.id} format="CODE128" width={1.4} height={52} fontSize={12} margin={6} displayValue/></div><code>{previewCustomer.id}</code></div></div></div>
      <div className="supplier-preview-actions"><button className="supplier-secondary" onClick={()=>printCard(previewCustomer)}><Printer size={15}/>{t('print')}</button><button className="supplier-secondary" onClick={()=>openEdit(previewCustomer)}><Pencil size={15}/>{t('edit')}</button><button className="supplier-primary" onClick={()=>setPreviewCustomer(null)}>{t('close')}</button></div>
    </section></div>}
    {deleteCustomer&&<div className="supplier-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDeleteCustomer(null);}}><section className="supplier-delete-modal" role="dialog" aria-modal="true"><span className="supplier-delete-icon"><Trash2 size={22}/></span><h2>{t('confirmDelete')}</h2><p><b>{deleteCustomer.name}</b></p><div><button className="supplier-secondary" onClick={()=>setDeleteCustomer(null)}>{t('cancel')}</button><button className="supplier-delete-confirm" onClick={remove}><Trash2 size={14}/>{t('delete')}</button></div></section></div>}

  </div>;
}


function SupplierAccountsPage({lang}) {
 const ar=lang==='ar',fr=lang==='fr';
 const L=ar?{title:'حسابات الموردين',sub:'متابعة الأرصدة والديون المستحقة للموردين من شاشة واحدة.',count:'عدد الموردين',chart:'توزيع ديون الموردين',total:'إجمالي الديون',preview:'معاينة التفاصيل',search:'ابحث بالاسم أو رقم الهاتف…',ref:'المعرف أو الباركود أو الكودبار…',directory:'سجل حسابات الموردين',name:'المورد',id:'المعرف',phone:'الهاتف',balance:'الرصيد المستحق',status:'حالة الحساب',action:'الإجراء',details:'الوضعية المالية للمورد',close:'إغلاق',debtors:'موردون لديهم ديون',none:'لا توجد ديون مستحقة مسجلة حاليًا.',empty:'لا توجد نتائج مطابقة',noPhone:'—',due:'عليه دين',clear:'دون دين',all:'كل الموردين',cur:'دج',note:'افتح المورد لعرض معاملاته ودفعاته.',email:'البريد الإلكتروني',address:'العنوان',from:'من تاريخ',to:'إلى تاريخ',allTime:'كل الفترات',date:'التاريخ',type:'نوع المعاملة',refNo:'رقم المرجع',description:'البيان',debit:'مشتريات / مدين',credit:'دفعة / دائن',running:'الرصيد بعد العملية',invoice:'بون شراء',payment:'دفعة',addPayment:'إضافة دفعة',editPayment:'تعديل الدفعة',deletePayment:'حذف الدفعة',amount:'مبلغ الدفعة',method:'طريقة الدفع',cash:'نقدًا',transfer:'تحويل بنكي',other:'أخرى',memo:'ملاحظة',save:'حفظ الدفعة',cancel:'إلغاء',standardPrint:'طباعة الوضعية العادية',detailedPrint:'طباعة الوضعية المفصلة',previewInvoice:'معاينة البون',noTransactions:'لا توجد معاملات ضمن الفترة المحددة.',confirmDelete:'هل تريد حذف هذه الدفعة؟',balanceNow:'الرصيد الحالي',paid:'إجمالي الدفعات',purchases:'إجمالي المشتريات',invoiceDetails:'تفاصيل بون الشراء',keyboard:'تنقل بالأسهم ↑ ↓، Enter للمعاينة',required:'أدخل مبلغًا صحيحًا أكبر من صفر.',delete:'حذف',edit:'تعديل',print:'طباعة',invoiceDate:'تاريخ البون',total:'الإجمالي',statusPaid:'مدفوع',statusDue:'آجل / جزئي',supplierInfo:'بيانات المورد',transactionHistory:'سجل المعاملات'}:
 fr?{title:'Comptes fournisseurs',sub:'Suivez les soldes et dettes fournisseurs sur un seul écran.',count:'Nombre de fournisseurs',chart:'Répartition des dettes',total:'Total des dettes',preview:'Voir le détail',search:'Nom ou téléphone…',ref:'Identifiant, code-barres ou code…',directory:'Comptes fournisseurs',name:'Fournisseur',id:'Identifiant',phone:'Téléphone',balance:'Solde dû',status:'État du compte',action:'Action',details:'Situation financière du fournisseur',close:'Fermer',debtors:'Fournisseurs débiteurs',none:'Aucune dette enregistrée.',empty:'Aucun résultat',noPhone:'—',due:'Dette due',clear:'Sans dette',all:'Tous les fournisseurs',cur:'DA',note:'Ouvrez une fiche pour consulter les opérations et paiements.',email:'E-mail',address:'Adresse',from:'Du',to:'Au',allTime:'Toute période',date:'Date',type:'Type',refNo:'Référence',description:'Libellé',debit:'Achats / débit',credit:'Paiement / crédit',running:'Solde après opération',invoice:'Bon d’achat',payment:'Paiement',addPayment:'Ajouter paiement',editPayment:'Modifier paiement',deletePayment:'Supprimer paiement',amount:'Montant du paiement',method:'Mode de paiement',cash:'Espèces',transfer:'Virement',other:'Autre',memo:'Note',save:'Enregistrer',cancel:'Annuler',standardPrint:'Imprimer résumé',detailedPrint:'Imprimer le détail',previewInvoice:'Aperçu du bon',noTransactions:'Aucune opération pour cette période.',confirmDelete:'Supprimer ce paiement ?',balanceNow:'Solde actuel',paid:'Total payé',purchases:'Total achats',invoiceDetails:'Détail du bon',keyboard:'Flèches ↑ ↓, Entrée pour ouvrir',required:'Saisissez un montant supérieur à zéro.',delete:'Supprimer',edit:'Modifier',print:'Imprimer',invoiceDate:'Date du bon',total:'Total',statusPaid:'Payé',statusDue:'À crédit / partiel',supplierInfo:'Informations fournisseur',transactionHistory:'Historique des opérations'}:
 {title:'Supplier accounts',sub:'Track supplier balances and outstanding debts in one clear workspace.',count:'Total suppliers',chart:'Supplier debt breakdown',total:'Total outstanding',preview:'View details',search:'Search by name or phone…',ref:'Supplier ID, barcode or code…',directory:'Supplier account directory',name:'Supplier',id:'Reference',phone:'Phone',balance:'Outstanding',status:'Account status',action:'Action',details:'Supplier financial statement',close:'Close',debtors:'Suppliers with debt',none:'No outstanding debts recorded.',empty:'No matching results',noPhone:'—',due:'Debt due',clear:'No debt',all:'All suppliers',cur:'DA',note:'Open a supplier to view transactions and payments.',email:'Email',address:'Address',from:'From date',to:'To date',allTime:'All time',date:'Date',type:'Transaction type',refNo:'Reference',description:'Description',debit:'Purchases / debit',credit:'Payment / credit',running:'Balance after transaction',invoice:'Purchase invoice',payment:'Payment',addPayment:'Add payment',editPayment:'Edit payment',deletePayment:'Delete payment',amount:'Payment amount',method:'Payment method',cash:'Cash',transfer:'Bank transfer',other:'Other',memo:'Note',save:'Save payment',cancel:'Cancel',standardPrint:'Print summary',detailedPrint:'Print detailed statement',previewInvoice:'Preview invoice',noTransactions:'No transactions in this date range.',confirmDelete:'Delete this payment?',balanceNow:'Current balance',paid:'Total payments',purchases:'Total purchases',invoiceDetails:'Purchase invoice details',keyboard:'Arrow keys ↑ ↓, Enter to preview',required:'Enter an amount greater than zero.',delete:'Delete',edit:'Edit',print:'Print',invoiceDate:'Invoice date',total:'Total',statusPaid:'Paid',statusDue:'Credit / partial',supplierInfo:'Supplier information',transactionHistory:'Transaction history'};
 const [suppliers,setSuppliers]=useState(()=>{try{const x=JSON.parse(localStorage.getItem('veltro.suppliers.v1')||'[]');return Array.isArray(x)?x:[]}catch{return[]}});
 const [q,SQ]=useState(''),[r,SR]=useState(''),[selected,SS]=useState(null),[from,SF]=useState(''),[to,ST]=useState(''),[paymentOpen,SP]=useState(false),[editingPayment,SEP]=useState(null),[paymentForm,SForm]=useState({date:new Date().toISOString().slice(0,10),amount:'',method:'cash',memo:''}),[invoicePreview,SIP]=useState(null),[focusIndex,SFI]=useState(0);
 useEffect(()=>{const sync=()=>{try{const x=JSON.parse(localStorage.getItem('veltro.suppliers.v1')||'[]');setSuppliers(Array.isArray(x)?x:[])}catch{}};window.addEventListener('storage',sync);window.addEventListener('focus',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('focus',sync)}},[]);
 const bal=s=>{const v=s?.balance??s?.debt??s?.outstanding??s?.currentBalance??s?.dueAmount??0,n=Number(String(v).replace(/[^0-9,.-]/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
 const money=n=>new Intl.NumberFormat(ar?'fr-DZ':fr?'fr-FR':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' '+L.cur;
 const rows=suppliers.map(s=>({...s,_bal:bal(s)})).filter(s=>(!q||[s.name,s.phone].some(v=>String(v||'').toLowerCase().includes(q.trim().toLowerCase())))&&(!r||[s.id,s.barcode,s.code,s.reference].some(v=>String(v||'').toLowerCase().includes(r.trim().toLowerCase()))));
 const debts=rowsAllDebts(suppliers,bal).filter(s=>s._bal>0), total=debts.reduce((n,s)=>n+s._bal,0), credits=rows.filter(s=>s._bal<0), creditTotal=credits.reduce((n,s)=>n+Math.abs(s._bal),0),max=Math.max(1,...debts.map(s=>s._bal));
 function loadTransactions(s){try{const store=JSON.parse(localStorage.getItem('veltro.supplier.transactions.v1')||'{}');const own=Array.isArray(store[s.id])?store[s.id]:[];const purchases=['veltro_purchase_invoices','veltro.purchases.v1','veltro.purchase.invoices','veltro.purchaseInvoices','veltro-purchases'].flatMap(k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch{return[]}});const invoices=purchases.filter(p=>String(p.supplierId??p.supplier_id??p.supplier?.id??p.supplierName??p.supplier_name??'')===String(s.id)||String(p.supplierName??p.supplier_name??p.supplier?.name??'').toLowerCase()===String(s.name||'').toLowerCase()).map((p,i)=>({id:String(p.id??p.invoiceNumber??p.number??'INV-'+i),date:String(p.date??p.createdAt??p.created_at??'').slice(0,10),type:'invoice',reference:p.invoiceNumber??p.number??p.id??'—',description:p.description??p.notes??L.invoice,amount:Number(p.total??p.totalAmount??p.grandTotal??p.amount??0)||0,raw:p}));return [...invoices,...own.filter(t=>t.type==='payment')].sort((a,b)=>String(a.date).localeCompare(String(b.date)))}catch{return[]}}
 const [transactions,STX]=useState([]);
 const openSupplier=s=>{SS(s);SF('');ST('');SIP(null);const store=(()=>{try{return JSON.parse(localStorage.getItem('veltro.supplier.transactions.v1')||'{}')}catch{return{}}})();const own=Array.isArray(store[s.id])?store[s.id]:[];const purchases=['veltro_purchase_invoices','veltro.purchases.v1','veltro.purchase.invoices','veltro.purchaseInvoices','veltro-purchases'].flatMap(k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch{return[]}});const invoices=purchases.filter(p=>String(p.supplierId??p.supplier_id??p.supplier?.id??'')===String(s.id)||String(p.supplierName??p.supplier_name??p.supplier?.name??'').toLowerCase()===String(s.name||'').toLowerCase()).map((p,i)=>({id:String(p.id??p.invoiceNumber??p.number??'INV-'+i),date:String(p.date??p.createdAt??p.created_at??'').slice(0,10),type:'invoice',reference:p.invoiceNumber??p.number??p.id??'—',description:p.description??p.notes??L.invoice,amount:Number(p.total??p.totalAmount??p.grandTotal??p.amount??0)||0,raw:p}));STX([...invoices,...own.filter(t=>t.type==='payment')].sort((a,b)=>String(a.date).localeCompare(String(b.date))));SP(false);SEP(null)};
 const allTransactions=transactions.filter(t=>(!from||String(t.date||'')>=from)&&(!to||String(t.date||'')<=to)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const sumPurchases=transactions.filter(t=>t.type==='invoice').reduce((n,t)=>n+(Number(t.amount)||0),0),sumPayments=transactions.filter(t=>t.type==='payment'&&!t.deleted).reduce((n,t)=>n+(Number(t.amount)||0),0);
 const currentBalance=selected?Number(selected.balance??selected.debt??selected.outstanding??selected.currentBalance??0)+sumPurchases-sumPayments:0;
 const persistPayments=next=>{if(!selected)return;const store=(()=>{try{return JSON.parse(localStorage.getItem('veltro.supplier.transactions.v1')||'{}')}catch{return{}}})();store[selected.id]=next.filter(t=>t.type==='payment');localStorage.setItem('veltro.supplier.transactions.v1',JSON.stringify(store));STX([...transactions.filter(t=>t.type==='invoice'),...store[selected.id]].sort((a,b)=>String(a.date).localeCompare(String(b.date))))};
 const beginPayment=t=>{SEP(t||null);SForm(t?{date:t.date||new Date().toISOString().slice(0,10),amount:String(t.amount),method:t.method||'cash',memo:t.memo||''}:{date:new Date().toISOString().slice(0,10),amount:'',method:'cash',memo:''});SP(true)};
 const savePayment=e=>{e.preventDefault();const amount=Number(paymentForm.amount);if(!Number.isFinite(amount)||amount<=0){alert(L.required);return}const record={id:editingPayment?.id||'PAY-'+Date.now(),type:'payment',date:paymentForm.date,amount,method:paymentForm.method,memo:paymentForm.memo.trim(),reference:editingPayment?.reference||'PAY-'+Date.now()};const next=editingPayment?transactions.map(t=>t.id===editingPayment.id?record:t):[...transactions,record];persistPayments(next);SP(false);SEP(null)};
 const deletePayment=t=>{if(!window.confirm(L.confirmDelete))return;persistPayments(transactions.filter(x=>x.id!==t.id))};
 const printStatement=detailed=>{if(!selected)return;const list=allTransactions.map(t=>'<tr><td>'+esc(t.date||'—')+'</td><td>'+esc(t.type==='invoice'?L.invoice:L.payment)+'</td><td>'+esc(t.reference||t.id||'—')+'</td><td>'+esc(t.description||t.memo||'—')+'</td><td>'+esc(t.type==='invoice'?money(t.amount):'—')+'</td><td>'+esc(t.type==='payment'?money(t.amount):'—')+'</td></tr>').join('');const w=window.open('','_blank','width=1000,height=750');if(!w)return;w.document.write('<!doctype html><html lang="'+(ar?'ar':'fr')+'" dir="'+(ar?'rtl':'ltr')+'"><head><meta charset="utf-8"><title>'+esc(L.details)+'</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#152238}h1{margin-bottom:5px}small{color:#68778c}.summary{display:flex;gap:24px;margin:20px 0;padding:15px;background:#f2f6fa;border-radius:10px}.summary b{display:block;margin-top:5px;font-size:18px}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{padding:10px;border:1px solid #dce4ec;text-align:start;font-size:12px}th{background:#edf2f7}.foot{margin-top:20px;text-align:end;font-weight:bold}@media print{button{display:none}}</style></head><body><h1>'+esc(L.details)+'</h1><small>'+esc(selected.name||'')+' · '+esc(selected.id||'')+' · '+esc(selected.phone||'')+'</small><div class="summary"><div>'+esc(L.purchases)+'<b>'+esc(money(sumPurchases))+'</b></div><div>'+esc(L.paid)+'<b>'+esc(money(sumPayments))+'</b></div><div>'+esc(L.balanceNow)+'<b>'+esc(money(currentBalance))+'</b></div></div><p>'+esc(L.from)+': '+esc(from||L.allTime)+' &nbsp; '+esc(L.to)+': '+esc(to||L.allTime)+'</p>'+(detailed?'<table><thead><tr><th>'+esc(L.date)+'</th><th>'+esc(L.type)+'</th><th>'+esc(L.refNo)+'</th><th>'+esc(L.description)+'</th><th>'+esc(L.debit)+'</th><th>'+esc(L.credit)+'</th></tr></thead><tbody>'+list+'</tbody></table>':'<p>'+esc(L.transactionHistory)+': '+allTransactions.length+' · '+esc(L.purchases)+': '+esc(money(sumPurchases))+' · '+esc(L.paid)+': '+esc(money(sumPayments))+'</p>')+'<div class="foot">'+esc(L.balanceNow)+': '+esc(money(currentBalance))+'</div><script>window.onload=()=>window.print()<\\/script></body></html>');w.document.close()};
 const previewInvoice=t=>SIP(t);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const onTableKey=e=>{if(!allTransactions.length)return;if(e.key==='ArrowDown'){e.preventDefault();SFI(i=>Math.min(allTransactions.length-1,i+1))}else if(e.key==='ArrowUp'){e.preventDefault();SFI(i=>Math.max(0,i-1))}else if(e.key==='Enter'){e.preventDefault();const t=allTransactions[focusIndex];if(t?.type==='invoice')previewInvoice(t);else if(t?.type==='payment')beginPayment(t)}};
 return <div className="page-content supplier-accounts-page">
 <div className="page-heading supplier-accounts-heading"><div><div className="heading-kicker"><span className="health-dot"/>{ar?'الموردون':fr?'Fournisseurs':'Suppliers'}</div><h1>{L.title}</h1><p>{L.sub}</p></div><span className="supplier-accounts-live"><span className="health-dot"/>{ar?'ملخص الحسابات':fr?'Résumé des comptes':'Account overview'}</span></div>
 <div className="supplier-accounts-metrics"><article className="supplier-account-card"><div className="supplier-account-card-head"><span className="supplier-account-icon"><Building2 size={18}/></span><span>{L.count}</span></div><strong>{suppliers.length}</strong><small>{ar?'مسجل في قائمة الموردين':fr?'dans le répertoire':'in supplier directory'}</small><div className="supplier-count-track"><i style={{width:suppliers.length?'100%':'0%'}}/></div></article>
 <article className="supplier-account-card supplier-debt-chart-card"><div className="supplier-account-card-head"><span className="supplier-account-icon teal"><ChartNoAxesCombined size={18}/></span><span>{L.chart}</span></div>{debts.length?<div className="supplier-debt-bars">{debts.slice(0,4).map(s=><div className="supplier-debt-bar-row" key={s.id||s.name}><span title={s.name}>{s.name||s.id}</span><div><i style={{width:Math.max(4,s._bal/max*100)+'%'}}/></div><b>{money(s._bal)}</b></div>)}</div>:<div className="supplier-chart-empty"><ChartNoAxesCombined size={22}/><b>{money(0)}</b><small>{L.none}</small></div>}<div className="supplier-debt-chart-foot"><span><i/>{L.debtors}</span><b>{debts.length}</b></div></article>
 <article className="supplier-account-card supplier-total-debt-card"><div className="supplier-account-card-head"><span className="supplier-account-icon violet"><Wallet size={18}/></span><span>{L.total}</span></div><strong className="supplier-total-debt-value">{money(total)}</strong><small>{debts.length} {L.debtors}</small><button onClick={()=>{if(debts[0])openSupplier(debts[0])}}><Eye size={15}/>{L.preview}<ArrowUpRight size={14}/></button></article></div>
 <section className="supplier-accounts-directory panel"><div className="supplier-accounts-toolbar"><div><h2>{L.directory}</h2><p>{L.note}</p></div><div className="supplier-accounts-searches"><label><Search size={15}/><input value={q} onChange={e=>SQ(e.target.value)} placeholder={L.search}/>{q&&<button onClick={()=>SQ('')}><X size={13}/></button>}</label><label><ScanLine size={15}/><input value={r} onChange={e=>SR(e.target.value)} placeholder={L.ref} dir="ltr"/>{r&&<button onClick={()=>SR('')}><X size={13}/></button>}</label></div></div>
 <div className="supplier-accounts-table-wrap"><table className="supplier-accounts-table"><thead><tr><th>{L.name}</th><th>{L.id}</th><th>{L.phone}</th><th>{L.balance}</th><th>{L.status}</th><th>{L.action}</th></tr></thead><tbody>{rows.map(s=><tr key={s.id||s.name} onDoubleClick={()=>openSupplier(s)}><td><button className="supplier-account-name-button" onClick={()=>openSupplier(s)}>{s.photo?<img src={s.photo} alt=""/>:<span><Building2 size={15}/></span>}<b>{s.name||'—'}</b></button></td><td><code>{s.id||s.barcode||'—'}</code></td><td>{s.phone||L.noPhone}</td><td><b className={s._bal>0?'supplier-debt-amount':'supplier-zero-amount'}>{money(s._bal)}</b></td><td><span className={'supplier-account-status '+(s._bal>0?'has-debt':'no-debt')}><i/>{s._bal>0?L.due:L.clear}</span></td><td><button className="supplier-account-view" onClick={()=>openSupplier(s)} title={L.preview}><Eye size={15}/></button></td></tr>)}{!rows.length&&<tr><td colSpan="6"><div className="supplier-accounts-empty"><Search size={22}/><b>{L.empty}</b></div></td></tr>}</tbody></table></div><div className="supplier-accounts-foot"><span>{rows.length} / {suppliers.length} {L.all}</span><span>{money(total)}</span></div></section>
 {selected&&<div className="supplier-ledger-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)SS(null)}}><section className="supplier-ledger-modal" role="dialog" aria-modal="true" aria-label={L.details}><header className="supplier-ledger-header"><div className="supplier-ledger-identity">{selected.photo?<img src={selected.photo} alt=""/>:<span><Building2 size={24}/></span>}<div><small>{L.details}</small><h2>{selected.name}</h2><p>{selected.id} · {selected.phone||L.noPhone}</p></div></div><button className="supplier-ledger-close" onClick={()=>SS(null)} aria-label={L.close}><X size={19}/></button></header>
 <div className="supplier-ledger-profile"><div><span>{L.email}</span><b>{selected.email||'—'}</b></div><div><span>{L.phone}</span><b>{selected.phone||'—'}</b></div><div><span>{L.address}</span><b>{selected.address||'—'}</b></div><div><span>{L.balanceNow}</span><b className={currentBalance>0?'supplier-debt-amount':''}>{money(currentBalance)}</b></div></div>
 <div className="supplier-ledger-stats"><article><span>{L.purchases}</span><b>{money(sumPurchases)}</b></article><article><span>{L.paid}</span><b>{money(sumPayments)}</b></article><article><span>{L.balanceNow}</span><b>{money(currentBalance)}</b></article></div>
 <div className="supplier-ledger-tools"><div className="supplier-ledger-dates"><label>{L.from}<input type="date" value={from} onChange={e=>{SF(e.target.value);SFI(0)}}/></label><label>{L.to}<input type="date" value={to} onChange={e=>{ST(e.target.value);SFI(0)}}/></label><button onClick={()=>{SF('');ST('')}}>{L.allTime}</button></div><div className="supplier-ledger-actions"><button className="primary" onClick={()=>beginPayment()}><Plus size={15}/>{L.addPayment}</button><button onClick={()=>printStatement(false)}><Printer size={15}/>{L.standardPrint}</button><button onClick={()=>printStatement(true)}><FileText size={15}/>{L.detailedPrint}</button></div></div>
 <div className="supplier-ledger-table-wrap" tabIndex="0" onKeyDown={onTableKey} aria-label={L.transactionHistory}><table className="supplier-ledger-table"><thead><tr><th>{L.date}</th><th>{L.type}</th><th>{L.refNo}</th><th>{L.description}</th><th>{L.debit}</th><th>{L.credit}</th><th>{L.action}</th></tr></thead><tbody>{allTransactions.map((t,i)=><tr key={t.id} className={i===focusIndex?'keyboard-selected':''} onClick={()=>SFI(i)} onDoubleClick={()=>t.type==='invoice'?previewInvoice(t):beginPayment(t)}><td>{t.date||'—'}</td><td><span className={'supplier-ledger-type '+(t.type==='invoice'?'invoice':'payment')}>{t.type==='invoice'?<ReceiptText size={13}/>:<Wallet size={13}/>}{t.type==='invoice'?L.invoice:L.payment}</span></td><td><code>{t.reference||t.id||'—'}</code></td><td>{t.description||t.memo||'—'}</td><td>{t.type==='invoice'?money(t.amount):'—'}</td><td>{t.type==='payment'?money(t.amount):'—'}</td><td><div className="supplier-ledger-row-actions">{t.type==='invoice'?<button title={L.previewInvoice} onClick={()=>previewInvoice(t)}><Eye size={14}/></button>:<><button title={L.editPayment} onClick={()=>beginPayment(t)}><Pencil size={14}/></button><button title={L.deletePayment} onClick={()=>deletePayment(t)}><Trash2 size={14}/></button></>}</div></td></tr>)}{!allTransactions.length&&<tr><td colSpan="7"><div className="supplier-accounts-empty"><History size={22}/><b>{L.noTransactions}</b></div></td></tr>}</tbody></table></div><footer className="supplier-ledger-footer"><span><KeyboardHint text={L.keyboard}/></span><span>{allTransactions.length} · {L.transactionHistory}</span></footer>
 {paymentOpen&&<div className="supplier-payment-overlay"><form className="supplier-payment-form" onSubmit={savePayment}><header><div><small>{selected.name}</small><h3>{editingPayment?L.editPayment:L.addPayment}</h3></div><button type="button" onClick={()=>SP(false)}><X size={17}/></button></header><label>{L.date}<input type="date" value={paymentForm.date} required onChange={e=>SForm({...paymentForm,date:e.target.value})}/></label><label>{L.amount}<input type="number" min="0.01" step="0.01" autoFocus required value={paymentForm.amount} onChange={e=>SForm({...paymentForm,amount:e.target.value})}/></label><label>{L.method}<select value={paymentForm.method} onChange={e=>SForm({...paymentForm,method:e.target.value})}><option value="cash">{L.cash}</option><option value="transfer">{L.transfer}</option><option value="other">{L.other}</option></select></label><label>{L.memo}<textarea rows="2" value={paymentForm.memo} onChange={e=>SForm({...paymentForm,memo:e.target.value})}/></label><div className="supplier-payment-buttons"><button type="button" onClick={()=>SP(false)}>{L.cancel}</button><button type="submit" className="primary">{L.save}</button></div></form></div>}
 {invoicePreview&&<div className="supplier-payment-overlay"><section className="supplier-invoice-preview"><header><div><small>{L.invoice}</small><h3>{L.invoiceDetails}</h3></div><button onClick={()=>SIP(null)}><X size={17}/></button></header><div className="supplier-invoice-preview-info"><div><span>{L.refNo}</span><b>{invoicePreview.reference||invoicePreview.id}</b></div><div><span>{L.invoiceDate}</span><b>{invoicePreview.date||'—'}</b></div><div><span>{L.total}</span><b>{money(invoicePreview.amount)}</b></div></div>{invoicePreview.raw?.items?.length?<div className="supplier-invoice-items"><table><thead><tr><th>{ar?'المنتج':fr?'Article':'Item'}</th><th>{ar?'الكمية':fr?'Qté':'Qty'}</th><th>{ar?'السعر':fr?'Prix':'Price'}</th><th>{L.total}</th></tr></thead><tbody>{invoicePreview.raw.items.map((item,i)=><tr key={item.id||i}><td>{item.name||item.productName||'—'}</td><td>{item.quantity??item.qty??'—'}</td><td>{money(Number(item.price)||0)}</td><td>{money(Number(item.total??(Number(item.quantity??item.qty)||0)*(Number(item.price)||0))||0)}</td></tr>)}</tbody></table></div>:<p>{invoicePreview.description||invoicePreview.raw?.notes||'—'}</p>}<footer><button onClick={()=>SIP(null)}>{L.close}</button><button className="primary" onClick={()=>{const w=window.open('','_blank','width=900,height=700');if(w){w.document.write('<html><meta charset="utf-8"><body style="font-family:Arial;padding:28px"><h2>'+esc(L.invoiceDetails)+'</h2><p>'+esc(selected.name)+' · '+esc(invoicePreview.reference||invoicePreview.id)+'</p><p>'+esc(invoicePreview.date)+' · '+esc(money(invoicePreview.amount))+'</p><pre>'+esc(JSON.stringify(invoicePreview.raw||invoicePreview,null,2))+'</pre><script>window.onload=()=>window.print()<\\/script></body></html>');w.document.close()}}}><Printer size={14}/>{L.print}</button></footer></section></div>}
 </section></div>}
 </div>;
}
function rowsAllDebts(suppliers,bal){return suppliers.map(s=>({...s,_bal:bal(s)})).filter(s=>s._bal>0).sort((a,b)=>b._bal-a._bal)}
function KeyboardHint({text}){return <span className="supplier-keyboard-hint"><span aria-hidden="true">↑↓</span>{text}</span>}
function CustomerAccountsPage({lang}) {
 const ar=lang==='ar',fr=lang==='fr';
 const L=ar?{title:'حسابات الزبائن',sub:'متابعة أرصدة الزبائن وديونهم المستحقة من شاشة واحدة.',count:'عدد الزبائن',chart:'توزيع ديون الزبائن',total:'إجمالي الديون',preview:'معاينة التفاصيل',search:'ابحث بالاسم أو رقم الهاتف…',ref:'المعرف أو الباركود أو الكودبار…',directory:'سجل حسابات الزبائن',name:'الزبون',id:'المعرف',phone:'الهاتف',balance:'الرصيد المستحق',status:'حالة الحساب',action:'الإجراء',details:'الوضعية المالية للزبون',close:'إغلاق',debtors:'زبائن لديهم ديون',none:'لا توجد ديون مستحقة مسجلة حاليًا.',empty:'لا توجد نتائج مطابقة',noPhone:'—',due:'عليه دين',clear:'دون دين',all:'كل الزبائن',cur:'دج',note:'افتح الزبون لعرض معاملاته ودفعاته.',email:'البريد الإلكتروني',address:'العنوان',from:'من تاريخ',to:'إلى تاريخ',allTime:'كل الفترات',date:'التاريخ',type:'نوع المعاملة',refNo:'رقم المرجع',description:'البيان',debit:'فواتير بيع / مدين',credit:'دفعة / دائن',running:'الرصيد بعد العملية',invoice:'فاتورة بيع',payment:'دفعة',addPayment:'إضافة دفعة',editPayment:'تعديل الدفعة',deletePayment:'حذف الدفعة',amount:'مبلغ الدفعة',method:'طريقة الدفع',cash:'نقدًا',transfer:'تحويل بنكي',other:'أخرى',memo:'ملاحظة',save:'حفظ الدفعة',cancel:'إلغاء',standardPrint:'طباعة الوضعية العادية',detailedPrint:'طباعة الوضعية المفصلة',previewInvoice:'معاينة البون',noTransactions:'لا توجد معاملات ضمن الفترة المحددة.',confirmDelete:'هل تريد حذف هذه الدفعة؟',balanceNow:'الرصيد الحالي',paid:'إجمالي الدفعات',purchases:'إجمالي المبيعات',invoiceDetails:'تفاصيل فاتورة البيع',keyboard:'تنقل بالأسهم ↑ ↓، Enter للمعاينة',required:'أدخل مبلغًا صحيحًا أكبر من صفر.',delete:'حذف',edit:'تعديل',print:'طباعة',invoiceDate:'تاريخ البون',total:'الإجمالي',statusPaid:'مدفوع',statusDue:'آجل / جزئي',customerInfo:'بيانات الزبون',transactionHistory:'سجل المعاملات'}:
 fr?{title:'Comptes clients',sub:'Suivez les soldes et dettes clients sur un seul écran.',count:'Nombre de clients',chart:'Répartition des dettes',total:'Total des dettes',preview:'Voir le détail',search:'Nom ou téléphone…',ref:'Identifiant, code-barres ou code…',directory:'Comptes clients',name:'Client',id:'Identifiant',phone:'Téléphone',balance:'Solde dû',status:'État du compte',action:'Action',details:'Situation financière du client',close:'Fermer',debtors:'Clients débiteurs',none:'Aucune dette enregistrée.',empty:'Aucun résultat',noPhone:'—',due:'Dette due',clear:'Sans dette',all:'Tous les clients',cur:'DA',note:'Ouvrez une fiche pour consulter les opérations et paiements.',email:'E-mail',address:'Adresse',from:'Du',to:'Au',allTime:'Toute période',date:'Date',type:'Type',refNo:'Référence',description:'Libellé',debit:'Ventes / débit',credit:'Paiement / crédit',running:'Solde après opération',invoice:'Facture de vente',payment:'Paiement',addPayment:'Ajouter paiement',editPayment:'Modifier paiement',deletePayment:'Supprimer paiement',amount:'Montant du paiement',method:'Mode de paiement',cash:'Espèces',transfer:'Virement',other:'Autre',memo:'Note',save:'Enregistrer',cancel:'Annuler',standardPrint:'Imprimer résumé',detailedPrint:'Imprimer le détail',previewInvoice:'Aperçu du bon',noTransactions:'Aucune opération pour cette période.',confirmDelete:'Supprimer ce paiement ?',balanceNow:'Solde actuel',paid:'Total payé',purchases:'Total ventes',invoiceDetails:'Détail du bon',keyboard:'Flèches ↑ ↓, Entrée pour ouvrir',required:'Saisissez un montant supérieur à zéro.',delete:'Supprimer',edit:'Modifier',print:'Imprimer',invoiceDate:'Date du bon',total:'Total',statusPaid:'Payé',statusDue:'À crédit / partiel',customerInfo:'Informations client',transactionHistory:'Historique des opérations'}:
 {title:'Customer accounts',sub:'Track customer balances and outstanding debts in one clear workspace.',count:'Total customers',chart:'Customer debt breakdown',total:'Total outstanding',preview:'View details',search:'Search by name or phone…',ref:'Customer ID, barcode or code…',directory:'Customer account directory',name:'Customer',id:'Reference',phone:'Phone',balance:'Outstanding',status:'Account status',action:'Action',details:'Customer financial statement',close:'Close',debtors:'Customers with debt',none:'No outstanding debts recorded.',empty:'No matching results',noPhone:'—',due:'Debt due',clear:'No debt',all:'All customers',cur:'DA',note:'Open a customer to view transactions and payments.',email:'Email',address:'Address',from:'From date',to:'To date',allTime:'All time',date:'Date',type:'Transaction type',refNo:'Reference',description:'Description',debit:'Sales / debit',credit:'Payment / credit',running:'Balance after transaction',invoice:'Sales invoice',payment:'Payment',addPayment:'Add payment',editPayment:'Edit payment',deletePayment:'Delete payment',amount:'Payment amount',method:'Payment method',cash:'Cash',transfer:'Bank transfer',other:'Other',memo:'Note',save:'Save payment',cancel:'Cancel',standardPrint:'Print summary',detailedPrint:'Print detailed statement',previewInvoice:'Preview invoice',noTransactions:'No transactions in this date range.',confirmDelete:'Delete this payment?',balanceNow:'Current balance',paid:'Total payments',purchases:'Total sales',invoiceDetails:'Sales invoice details',keyboard:'Arrow keys ↑ ↓, Enter to preview',required:'Enter an amount greater than zero.',delete:'Delete',edit:'Edit',print:'Print',invoiceDate:'Invoice date',total:'Total',statusPaid:'Paid',statusDue:'Credit / partial',customerInfo:'Customer information',transactionHistory:'Transaction history'};
 const [customers,setCustomers]=useState(()=>{try{const x=JSON.parse(localStorage.getItem('veltro.customers.v1')||'[]');return Array.isArray(x)?x:[]}catch{return[]}});
 const [q,SQ]=useState(''),[r,SR]=useState(''),[selected,SS]=useState(null),[from,SF]=useState(''),[to,ST]=useState(''),[paymentOpen,SP]=useState(false),[editingPayment,SEP]=useState(null),[paymentForm,SForm]=useState({date:new Date().toISOString().slice(0,10),amount:'',method:'cash',memo:''}),[invoicePreview,SIP]=useState(null),[focusIndex,SFI]=useState(0);
 useEffect(()=>{const sync=()=>{try{const x=JSON.parse(localStorage.getItem('veltro.customers.v1')||'[]');setCustomers(Array.isArray(x)?x:[])}catch{}};window.addEventListener('storage',sync);window.addEventListener('focus',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('focus',sync)}},[]);
 const bal=s=>{const v=s?.balance??s?.debt??s?.outstanding??s?.currentBalance??s?.dueAmount??0,n=Number(String(v).replace(/[^0-9,.-]/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
 const money=n=>new Intl.NumberFormat(ar?'fr-DZ':fr?'fr-FR':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' '+L.cur;
 const rows=customers.map(s=>({...s,_bal:bal(s)})).filter(s=>(!q||[s.name,s.phone].some(v=>String(v||'').toLowerCase().includes(q.trim().toLowerCase())))&&(!r||[s.id,s.barcode,s.code,s.reference].some(v=>String(v||'').toLowerCase().includes(r.trim().toLowerCase()))));
 const debts=rowsAllDebts(customers,bal).filter(s=>s._bal>0), total=debts.reduce((n,s)=>n+s._bal,0), credits=rows.filter(s=>s._bal<0), creditTotal=credits.reduce((n,s)=>n+Math.abs(s._bal),0),max=Math.max(1,...debts.map(s=>s._bal));
 function loadTransactions(s){try{const store=JSON.parse(localStorage.getItem('veltro.customer.transactions.v1')||'{}');const own=Array.isArray(store[s.id])?store[s.id]:[];const purchases=['veltro_sales_invoices','veltro.sales.invoices.v1','veltro.sales.invoices','veltro.salesInvoices','veltro-sales'].flatMap(k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch{return[]}});const invoices=purchases.filter(p=>String(p.customerId??p.customer_id??p.customer?.id??p.customerName??p.customer_name??'')===String(s.id)||String(p.customerName??p.customer_name??p.customer?.name??'').toLowerCase()===String(s.name||'').toLowerCase()).map((p,i)=>({id:String(p.id??p.invoiceNumber??p.number??'INV-'+i),date:String(p.date??p.createdAt??p.created_at??'').slice(0,10),type:'invoice',reference:p.invoiceNumber??p.number??p.id??'—',description:p.description??p.notes??L.invoice,amount:Number(p.total??p.totalAmount??p.grandTotal??p.amount??0)||0,raw:p}));return [...invoices,...own.filter(t=>t.type==='payment')].sort((a,b)=>String(a.date).localeCompare(String(b.date)))}catch{return[]}}
 const [transactions,STX]=useState([]);
 const openCustomer=s=>{SS(s);SF('');ST('');SIP(null);const store=(()=>{try{return JSON.parse(localStorage.getItem('veltro.customer.transactions.v1')||'{}')}catch{return{}}})();const own=Array.isArray(store[s.id])?store[s.id]:[];const purchases=['veltro_sales_invoices','veltro.sales.invoices.v1','veltro.sales.invoices','veltro.salesInvoices','veltro-sales'].flatMap(k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch{return[]}});const invoices=purchases.filter(p=>String(p.customerId??p.customer_id??p.customer?.id??'')===String(s.id)||String(p.customerName??p.customer_name??p.customer?.name??'').toLowerCase()===String(s.name||'').toLowerCase()).map((p,i)=>({id:String(p.id??p.invoiceNumber??p.number??'INV-'+i),date:String(p.date??p.createdAt??p.created_at??'').slice(0,10),type:'invoice',reference:p.invoiceNumber??p.number??p.id??'—',description:p.description??p.notes??L.invoice,amount:Number(p.total??p.totalAmount??p.grandTotal??p.amount??0)||0,raw:p}));STX([...invoices,...own.filter(t=>t.type==='payment')].sort((a,b)=>String(a.date).localeCompare(String(b.date))));SP(false);SEP(null)};
 const allTransactions=transactions.filter(t=>(!from||String(t.date||'')>=from)&&(!to||String(t.date||'')<=to)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const sumPurchases=transactions.filter(t=>t.type==='invoice').reduce((n,t)=>n+(Number(t.amount)||0),0),sumPayments=transactions.filter(t=>t.type==='payment'&&!t.deleted).reduce((n,t)=>n+(Number(t.amount)||0),0);
 const currentBalance=selected?Number(selected.balance??selected.debt??selected.outstanding??selected.currentBalance??0)+sumPurchases-sumPayments:0;
 const persistPayments=next=>{if(!selected)return;const store=(()=>{try{return JSON.parse(localStorage.getItem('veltro.customer.transactions.v1')||'{}')}catch{return{}}})();store[selected.id]=next.filter(t=>t.type==='payment');localStorage.setItem('veltro.customer.transactions.v1',JSON.stringify(store));STX([...transactions.filter(t=>t.type==='invoice'),...store[selected.id]].sort((a,b)=>String(a.date).localeCompare(String(b.date))))};
 const beginPayment=t=>{SEP(t||null);SForm(t?{date:t.date||new Date().toISOString().slice(0,10),amount:String(t.amount),method:t.method||'cash',memo:t.memo||''}:{date:new Date().toISOString().slice(0,10),amount:'',method:'cash',memo:''});SP(true)};
 const savePayment=e=>{e.preventDefault();const amount=Number(paymentForm.amount);if(!Number.isFinite(amount)||amount<=0){alert(L.required);return}const record={id:editingPayment?.id||'PAY-'+Date.now(),type:'payment',date:paymentForm.date,amount,method:paymentForm.method,memo:paymentForm.memo.trim(),reference:editingPayment?.reference||'PAY-'+Date.now()};const next=editingPayment?transactions.map(t=>t.id===editingPayment.id?record:t):[...transactions,record];persistPayments(next);SP(false);SEP(null)};
 const deletePayment=t=>{if(!window.confirm(L.confirmDelete))return;persistPayments(transactions.filter(x=>x.id!==t.id))};
 const printStatement=detailed=>{if(!selected)return;const list=allTransactions.map(t=>'<tr><td>'+esc(t.date||'—')+'</td><td>'+esc(t.type==='invoice'?L.invoice:L.payment)+'</td><td>'+esc(t.reference||t.id||'—')+'</td><td>'+esc(t.description||t.memo||'—')+'</td><td>'+esc(t.type==='invoice'?money(t.amount):'—')+'</td><td>'+esc(t.type==='payment'?money(t.amount):'—')+'</td></tr>').join('');const w=window.open('','_blank','width=1000,height=750');if(!w)return;w.document.write('<!doctype html><html lang="'+(ar?'ar':'fr')+'" dir="'+(ar?'rtl':'ltr')+'"><head><meta charset="utf-8"><title>'+esc(L.details)+'</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#152238}h1{margin-bottom:5px}small{color:#68778c}.summary{display:flex;gap:24px;margin:20px 0;padding:15px;background:#f2f6fa;border-radius:10px}.summary b{display:block;margin-top:5px;font-size:18px}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{padding:10px;border:1px solid #dce4ec;text-align:start;font-size:12px}th{background:#edf2f7}.foot{margin-top:20px;text-align:end;font-weight:bold}@media print{button{display:none}}</style></head><body><h1>'+esc(L.details)+'</h1><small>'+esc(selected.name||'')+' · '+esc(selected.id||'')+' · '+esc(selected.phone||'')+'</small><div class="summary"><div>'+esc(L.purchases)+'<b>'+esc(money(sumPurchases))+'</b></div><div>'+esc(L.paid)+'<b>'+esc(money(sumPayments))+'</b></div><div>'+esc(L.balanceNow)+'<b>'+esc(money(currentBalance))+'</b></div></div><p>'+esc(L.from)+': '+esc(from||L.allTime)+' &nbsp; '+esc(L.to)+': '+esc(to||L.allTime)+'</p>'+(detailed?'<table><thead><tr><th>'+esc(L.date)+'</th><th>'+esc(L.type)+'</th><th>'+esc(L.refNo)+'</th><th>'+esc(L.description)+'</th><th>'+esc(L.debit)+'</th><th>'+esc(L.credit)+'</th></tr></thead><tbody>'+list+'</tbody></table>':'<p>'+esc(L.transactionHistory)+': '+allTransactions.length+' · '+esc(L.purchases)+': '+esc(money(sumPurchases))+' · '+esc(L.paid)+': '+esc(money(sumPayments))+'</p>')+'<div class="foot">'+esc(L.balanceNow)+': '+esc(money(currentBalance))+'</div><script>window.onload=()=>window.print()<\\/script></body></html>');w.document.close()};
 const previewInvoice=t=>SIP(t);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const onTableKey=e=>{if(!allTransactions.length)return;if(e.key==='ArrowDown'){e.preventDefault();SFI(i=>Math.min(allTransactions.length-1,i+1))}else if(e.key==='ArrowUp'){e.preventDefault();SFI(i=>Math.max(0,i-1))}else if(e.key==='Enter'){e.preventDefault();const t=allTransactions[focusIndex];if(t?.type==='invoice')previewInvoice(t);else if(t?.type==='payment')beginPayment(t)}};
 return <div className="page-content customer-accounts-page">
 <div className="page-heading customer-accounts-heading"><div><div className="heading-kicker"><span className="health-dot"/>{ar?'الزبونون':fr?'Clients':'Customers'}</div><h1>{L.title}</h1><p>{L.sub}</p></div><span className="supplier-accounts-live"><span className="health-dot"/>{ar?'ملخص الحسابات':fr?'Résumé des comptes':'Account overview'}</span></div>
 <div className="supplier-accounts-metrics"><article className="supplier-account-card"><div className="supplier-account-card-head"><span className="supplier-account-icon"><Building2 size={18}/></span><span>{L.count}</span></div><strong>{customers.length}</strong><small>{ar?'مسجل في قائمة الزبائن':fr?'dans le répertoire':'in customer directory'}</small><div className="supplier-count-track"><i style={{width:customers.length?'100%':'0%'}}/></div></article>
 <article className="supplier-account-card supplier-debt-chart-card"><div className="supplier-account-card-head"><span className="supplier-account-icon teal"><ChartNoAxesCombined size={18}/></span><span>{L.chart}</span></div>{debts.length?<div className="supplier-debt-bars">{debts.slice(0,4).map(s=><div className="supplier-debt-bar-row" key={s.id||s.name}><span title={s.name}>{s.name||s.id}</span><div><i style={{width:Math.max(4,s._bal/max*100)+'%'}}/></div><b>{money(s._bal)}</b></div>)}</div>:<div className="supplier-chart-empty"><ChartNoAxesCombined size={22}/><b>{money(0)}</b><small>{L.none}</small></div>}<div className="supplier-debt-chart-foot"><span><i/>{L.debtors}</span><b>{debts.length}</b></div></article>
 <article className="supplier-account-card supplier-total-debt-card"><div className="supplier-account-card-head"><span className="supplier-account-icon violet"><Wallet size={18}/></span><span>{L.total}</span></div><strong className="supplier-total-debt-value">{money(total)}</strong><small>{debts.length} {L.debtors}</small><button onClick={()=>{if(debts[0])openCustomer(debts[0])}}><Eye size={15}/>{L.preview}<ArrowUpRight size={14}/></button></article></div>
 <section className="supplier-accounts-directory panel"><div className="supplier-accounts-toolbar"><div><h2>{L.directory}</h2><p>{L.note}</p></div><div className="supplier-accounts-searches"><label><Search size={15}/><input value={q} onChange={e=>SQ(e.target.value)} placeholder={L.search}/>{q&&<button onClick={()=>SQ('')}><X size={13}/></button>}</label><label><ScanLine size={15}/><input value={r} onChange={e=>SR(e.target.value)} placeholder={L.ref} dir="ltr"/>{r&&<button onClick={()=>SR('')}><X size={13}/></button>}</label></div></div>
 <div className="supplier-accounts-table-wrap"><table className="supplier-accounts-table"><thead><tr><th>{L.name}</th><th>{L.id}</th><th>{L.phone}</th><th>{L.balance}</th><th>{L.status}</th><th>{L.action}</th></tr></thead><tbody>{rows.map(s=><tr key={s.id||s.name} onDoubleClick={()=>openCustomer(s)}><td><button className="supplier-account-name-button" onClick={()=>openCustomer(s)}>{s.photo?<img src={s.photo} alt=""/>:<span><Building2 size={15}/></span>}<b>{s.name||'—'}</b></button></td><td><code>{s.id||s.barcode||'—'}</code></td><td>{s.phone||L.noPhone}</td><td><b className={s._bal>0?'supplier-debt-amount':'supplier-zero-amount'}>{money(s._bal)}</b></td><td><span className={'supplier-account-status '+(s._bal>0?'has-debt':'no-debt')}><i/>{s._bal>0?L.due:L.clear}</span></td><td><button className="supplier-account-view" onClick={()=>openCustomer(s)} title={L.preview}><Eye size={15}/></button></td></tr>)}{!rows.length&&<tr><td colSpan="6"><div className="supplier-accounts-empty"><Search size={22}/><b>{L.empty}</b></div></td></tr>}</tbody></table></div><div className="supplier-accounts-foot"><span>{rows.length} / {customers.length} {L.all}</span><span>{money(total)}</span></div></section>
 {selected&&<div className="supplier-ledger-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)SS(null)}}><section className="supplier-ledger-modal" role="dialog" aria-modal="true" aria-label={L.details}><header className="supplier-ledger-header"><div className="supplier-ledger-identity">{selected.photo?<img src={selected.photo} alt=""/>:<span><Building2 size={24}/></span>}<div><small>{L.details}</small><h2>{selected.name}</h2><p>{selected.id} · {selected.phone||L.noPhone}</p></div></div><button className="supplier-ledger-close" onClick={()=>SS(null)} aria-label={L.close}><X size={19}/></button></header>
 <div className="supplier-ledger-profile"><div><span>{L.email}</span><b>{selected.email||'—'}</b></div><div><span>{L.phone}</span><b>{selected.phone||'—'}</b></div><div><span>{L.address}</span><b>{selected.address||'—'}</b></div><div><span>{L.balanceNow}</span><b className={currentBalance>0?'supplier-debt-amount':''}>{money(currentBalance)}</b></div></div>
 <div className="supplier-ledger-stats"><article><span>{L.purchases}</span><b>{money(sumPurchases)}</b></article><article><span>{L.paid}</span><b>{money(sumPayments)}</b></article><article><span>{L.balanceNow}</span><b>{money(currentBalance)}</b></article></div>
 <div className="supplier-ledger-tools"><div className="supplier-ledger-dates"><label>{L.from}<input type="date" value={from} onChange={e=>{SF(e.target.value);SFI(0)}}/></label><label>{L.to}<input type="date" value={to} onChange={e=>{ST(e.target.value);SFI(0)}}/></label><button onClick={()=>{SF('');ST('')}}>{L.allTime}</button></div><div className="supplier-ledger-actions"><button className="primary" onClick={()=>beginPayment()}><Plus size={15}/>{L.addPayment}</button><button onClick={()=>printStatement(false)}><Printer size={15}/>{L.standardPrint}</button><button onClick={()=>printStatement(true)}><FileText size={15}/>{L.detailedPrint}</button></div></div>
 <div className="supplier-ledger-table-wrap" tabIndex="0" onKeyDown={onTableKey} aria-label={L.transactionHistory}><table className="supplier-ledger-table"><thead><tr><th>{L.date}</th><th>{L.type}</th><th>{L.refNo}</th><th>{L.description}</th><th>{L.debit}</th><th>{L.credit}</th><th>{L.action}</th></tr></thead><tbody>{allTransactions.map((t,i)=><tr key={t.id} className={i===focusIndex?'keyboard-selected':''} onClick={()=>SFI(i)} onDoubleClick={()=>t.type==='invoice'?previewInvoice(t):beginPayment(t)}><td>{t.date||'—'}</td><td><span className={'supplier-ledger-type '+(t.type==='invoice'?'invoice':'payment')}>{t.type==='invoice'?<ReceiptText size={13}/>:<Wallet size={13}/>}{t.type==='invoice'?L.invoice:L.payment}</span></td><td><code>{t.reference||t.id||'—'}</code></td><td>{t.description||t.memo||'—'}</td><td>{t.type==='invoice'?money(t.amount):'—'}</td><td>{t.type==='payment'?money(t.amount):'—'}</td><td><div className="supplier-ledger-row-actions">{t.type==='invoice'?<button title={L.previewInvoice} onClick={()=>previewInvoice(t)}><Eye size={14}/></button>:<><button title={L.editPayment} onClick={()=>beginPayment(t)}><Pencil size={14}/></button><button title={L.deletePayment} onClick={()=>deletePayment(t)}><Trash2 size={14}/></button></>}</div></td></tr>)}{!allTransactions.length&&<tr><td colSpan="7"><div className="supplier-accounts-empty"><History size={22}/><b>{L.noTransactions}</b></div></td></tr>}</tbody></table></div><footer className="supplier-ledger-footer"><span><KeyboardHint text={L.keyboard}/></span><span>{allTransactions.length} · {L.transactionHistory}</span></footer>
 {paymentOpen&&<div className="supplier-payment-overlay"><form className="supplier-payment-form" onSubmit={savePayment}><header><div><small>{selected.name}</small><h3>{editingPayment?L.editPayment:L.addPayment}</h3></div><button type="button" onClick={()=>SP(false)}><X size={17}/></button></header><label>{L.date}<input type="date" value={paymentForm.date} required onChange={e=>SForm({...paymentForm,date:e.target.value})}/></label><label>{L.amount}<input type="number" min="0.01" step="0.01" autoFocus required value={paymentForm.amount} onChange={e=>SForm({...paymentForm,amount:e.target.value})}/></label><label>{L.method}<select value={paymentForm.method} onChange={e=>SForm({...paymentForm,method:e.target.value})}><option value="cash">{L.cash}</option><option value="transfer">{L.transfer}</option><option value="other">{L.other}</option></select></label><label>{L.memo}<textarea rows="2" value={paymentForm.memo} onChange={e=>SForm({...paymentForm,memo:e.target.value})}/></label><div className="supplier-payment-buttons"><button type="button" onClick={()=>SP(false)}>{L.cancel}</button><button type="submit" className="primary">{L.save}</button></div></form></div>}
 {invoicePreview&&<div className="supplier-payment-overlay"><section className="supplier-invoice-preview"><header><div><small>{L.invoice}</small><h3>{L.invoiceDetails}</h3></div><button onClick={()=>SIP(null)}><X size={17}/></button></header><div className="supplier-invoice-preview-info"><div><span>{L.refNo}</span><b>{invoicePreview.reference||invoicePreview.id}</b></div><div><span>{L.invoiceDate}</span><b>{invoicePreview.date||'—'}</b></div><div><span>{L.total}</span><b>{money(invoicePreview.amount)}</b></div></div>{invoicePreview.raw?.items?.length?<div className="supplier-invoice-items"><table><thead><tr><th>{ar?'المنتج':fr?'Article':'Item'}</th><th>{ar?'الكمية':fr?'Qté':'Qty'}</th><th>{ar?'السعر':fr?'Prix':'Price'}</th><th>{L.total}</th></tr></thead><tbody>{invoicePreview.raw.items.map((item,i)=><tr key={item.id||i}><td>{item.name||item.productName||'—'}</td><td>{item.quantity??item.qty??'—'}</td><td>{money(Number(item.price)||0)}</td><td>{money(Number(item.total??(Number(item.quantity??item.qty)||0)*(Number(item.price)||0))||0)}</td></tr>)}</tbody></table></div>:<p>{invoicePreview.description||invoicePreview.raw?.notes||'—'}</p>}<footer><button onClick={()=>SIP(null)}>{L.close}</button><button className="primary" onClick={()=>{const w=window.open('','_blank','width=900,height=700');if(w){w.document.write('<html><meta charset="utf-8"><body style="font-family:Arial;padding:28px"><h2>'+esc(L.invoiceDetails)+'</h2><p>'+esc(selected.name)+' · '+esc(invoicePreview.reference||invoicePreview.id)+'</p><p>'+esc(invoicePreview.date)+' · '+esc(money(invoicePreview.amount))+'</p><pre>'+esc(JSON.stringify(invoicePreview.raw||invoicePreview,null,2))+'</pre><script>window.onload=()=>window.print()<\\/script></body></html>');w.document.close()}}}><Printer size={14}/>{L.print}</button></footer></section></div>}
 </section></div>}
 </div>;
}

function ModulePage({ page, parent, t, lang, onBack }) {
  if (page.id === 'product-list') return <ProductsPage lang={lang} />;
  if (page.id === 'product-movement') return <ProductMovementPage lang={lang} />;
  if (page.id === 'supplier-list') return <SupplierListPage lang={lang} />;
  if (page.id === 'customer-list') return <CustomerListPage lang={lang} />;
  if (page.id === 'supplier-accounts') return <SupplierAccountsPage lang={lang} />;
  if (page.id === 'customer-accounts') return <CustomerAccountsPage lang={lang} />;
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
  const [currentUser,setCurrentUser]=useState(null);
  const [profileOpen,setProfileOpen]=useState(false);
  const [sessionPaused,setSessionPaused]=useState(false);
  const [clockNow,setClockNow]=useState(()=>new Date());
  useEffect(()=>{let alive=true;supabase.auth.getUser().then(({data})=>{if(alive)setCurrentUser(data?.user||null)}).catch(()=>{if(alive)setCurrentUser(null)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setCurrentUser(session?.user||null));return()=>{alive=false;subscription?.unsubscribe()}},[]);
  useEffect(()=>{const timer=window.setInterval(()=>setClockNow(new Date()),1000);return()=>window.clearInterval(timer)},[]);
  const [manualSyncing,setManualSyncing]=useState(false);
  const [setupState,setSetupState]=useState('checking');
  const [setupProfile,setSetupProfile]=useState({});
  const [setupSaving,setSetupSaving]=useState(false);
  const [setupError,setSetupError]=useState('');
  useEffect(()=>{try{localStorage.setItem('veltro.language',lang);}catch{};document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.title=lang==='ar'?'VELTRO-PRO — نظام إدارة المتجر':lang==='fr'?'VELTRO-PRO — Gestion commerciale':'VELTRO-PRO — Business Suite';},[lang]);

  useEffect(()=>{let alive=true;getCloudStatus().then(status=>{if(alive)setCloudState(status);}).catch(()=>{if(alive)setCloudState('error');});return()=>{alive=false;};},[]);
  // Keep the local outbox and every registered business entity synchronized while
  // the authenticated workspace is open. Offline edits remain local and retry online.
  useEffect(()=>{
    let alive=true;
    let refreshTimer=null;
    const stopAutoSync=startAutoSync({
      onStatus: result=>{
        if(!alive)return;
        if(result?.status==='synced')setCloudState('connected');
        else if(result?.status==='not_configured')setCloudState('not_configured');
        else if(result?.status==='error'||result?.status==='partial')setCloudState('error');
        else if(result?.status==='offline')setCloudState('configured');
      }
    });
    const refresh=()=>{ if(alive && typeof navigator!=='undefined' && navigator.onLine) void syncWorkspace().catch(()=>{}); };
    refreshTimer=window.setInterval(refresh,30000);
    const channel=supabase?.channel('veltro-workspace-cloud-sync')
      .on('postgres_changes',{event:'*',schema:'public',table:'cloud_records'},()=>{
        // Let the active sync finish first; a later tick reconciles the new rows.
        window.setTimeout(refresh,800);
      }).subscribe();
    return()=>{
      alive=false;
      stopAutoSync();
      if(refreshTimer)window.clearInterval(refreshTimer);
      if(channel)supabase.removeChannel(channel);
    };
  },[]);
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try {
        const {data:{session}}=await supabase.auth.getSession();
        if(!alive)return;
        const user=session?.user;
        if(!user){setSetupState('complete');return;}
        const storageKey='veltro.business-profile.'+user.id;
        let localProfile=null;
        try{const raw=localStorage.getItem(storageKey);if(raw)localProfile=JSON.parse(raw);}catch{}
        const cloudProfile=user.user_metadata?.business_profile;
        const profile=cloudProfile||localProfile;
        if(profile&&profile.storeName&&profile.activity){
          setSetupProfile(profile);
          try{localStorage.setItem(storageKey,JSON.stringify(profile));}catch{}
          setSetupState('complete');
        }else{
          setSetupProfile({});
          setSetupState('required');
        }
      }catch{if(alive)setSetupState('required');}
    })();
    return()=>{alive=false;};
  },[]);
  async function completeBusinessSetup(profile){
    setSetupSaving(true);setSetupError('');
    try{
      const {data:{user},error:userError}=await supabase.auth.getUser();
      if(userError)throw userError;
      if(!user)throw new Error('لم يتم العثور على جلسة المستخدم.');
      const {error}=await supabase.auth.updateUser({data:{business_profile:profile}});
      if(error)throw error;
      try{localStorage.setItem('veltro.business-profile.'+user.id,JSON.stringify(profile));}catch{}
      setSetupProfile(profile);
      setSetupState('complete');
    }catch(error){
      setSetupError(error?.message||'تعذّر حفظ معلومات المحل. حاول مجددًا.');
    }finally{setSetupSaving(false);}
  }
  async function logoutFromSetup(){
    try{const {error}=await supabase.auth.signOut();if(error)throw error;setSetupState('required');}
    catch(error){setSetupError(error?.message||'تعذّر تسجيل الخروج. حاول مجددًا.');}
  }
  const [activePage,setActivePage]=useState(dashboard);
  const [activeParent,setActiveParent]=useState(null);
  const [openNavSection,setOpenNavSection]=useState(null);
  const [search,setSearch]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const [languageOpen,setLanguageOpen]=useState(false);
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [sidebarVisible,setSidebarVisible]=useState(true);
  const [logoutOpen,setLogoutOpen]=useState(false);
  const [signedOut,setSignedOut]=useState(false);
  const t=(key)=>copy[lang][key]||copy.ar[key]||key;
  const handleManualSync=async()=>{if(manualSyncing)return;setManualSyncing(true);try{const result=await syncWorkspace();if(result?.status!=='synced')throw new Error('sync_failed');setCloudState('connected');window.alert(t('syncDone'));}catch{setCloudState('error');window.alert(t('syncError'));}finally{setManualSyncing(false);}};
  const dir=lang==='ar'?'rtl':'ltr';
  const NavigationSectionIcon=openNavSection?.icon;
  const navigate=(page,parent=null)=>{setActivePage(page);setActiveParent(parent);setOpenNavSection(null);setNotificationsOpen(false);setSearchOpen(false);setLanguageOpen(false);};
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (openNavSection) { event.preventDefault(); setOpenNavSection(null); return; }
        if (searchOpen || languageOpen || notificationsOpen || profileOpen) { event.preventDefault(); setSearchOpen(false); setLanguageOpen(false); setNotificationsOpen(false); setProfileOpen(false); return; }
        if (logoutOpen) {
          event.preventDefault();
          setLogoutOpen(false);
          return;
        }
        if (mobileOpen) {
          event.preventDefault();
          setMobileOpen(false);
          return;
        }
        return;
      }

    };
    // Capture phase cancels browser defaults before page-level handlers can run.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [openNavSection, logoutOpen, signedOut, mobileOpen, activePage.id, searchOpen, languageOpen, notificationsOpen, profileOpen]);
  if(setupState==='checking') return <div className="signed-out" dir={dir}><div className="signed-out-card"><span className="brand-mark"><span>V</span></span><h1>VELTRO</h1><p>{lang==='ar'?'جارٍ تجهيز مساحة العمل…':lang==='fr'?'Préparation de votre espace…':'Preparing your workspace…'}</p></div></div>;
  if(setupState==='required') return <BusinessOnboarding lang={lang} onLanguageChange={setLang} initialProfile={setupProfile} onComplete={completeBusinessSetup} onLogout={logoutFromSetup} saving={setupSaving} saveError={setupError}/>;
  if(signedOut) return <div className="signed-out" dir={dir}><div className="signed-out-card"><span className="brand-mark"><span>V</span></span><h1>{t('signedOut')}</h1><p>VELTRO BUSINESS SUITE</p><button onClick={()=>{setSignedOut(false);setActivePage(dashboard);}}>{t('signIn')}</button></div></div>;
  return <div className={'app-shell lang-'+lang+' theme-light'} dir={dir}>
    <div className="app-layout">
      <main className="workspace">
        <header className="topbar glass-topbar">
          <div className="topbar-identity">
            <div className="header-popover-wrap user-wrap">
              <button className="topbar-user" onClick={()=>{setProfileOpen(v=>!v);setSearchOpen(false);setLanguageOpen(false);setNotificationsOpen(false)}} aria-expanded={profileOpen}><span className="profile-avatar"><UserRound size={18}/></span><span className="topbar-user-copy"><b>{currentUser?.user_metadata?.full_name||currentUser?.user_metadata?.name||currentUser?.email?.split('@')[0]||(lang==='ar'?'المستخدم الحالي':lang==='fr'?'Utilisateur actuel':'Current user')}</b><small>{setupProfile?.storeName||currentUser?.email||'VELTRO-PRO'}</small></span><ChevronDown size={13}/></button>
              {profileOpen&&<div className="header-popover profile-popover"><div className="profile-popover-head"><span className="profile-avatar large"><UserRound size={23}/></span><div><b>{currentUser?.user_metadata?.full_name||currentUser?.user_metadata?.name||currentUser?.email?.split('@')[0]||(lang==='ar'?'المستخدم الحالي':lang==='fr'?'Utilisateur actuel':'Current user')}</b><small>{currentUser?.email||'—'}</small><span className="profile-online"><i/>{lang==='ar'?'الجلسة نشطة':lang==='fr'?'Session active':'Session active'}</span></div></div>
                <button className="profile-menu-item" onClick={()=>setProfileOpen(false)}><ArrowLeft size={15}/>{lang==='ar'?'العودة':lang==='fr'?'Retour':'Back'}</button>
                <button className="profile-menu-item" onClick={async()=>{setProfileOpen(false);try{const {error}=await supabase.auth.signOut();if(error)throw error;window.location.reload()}catch(error){window.alert(error?.message||'Sign out failed')}}}><UserRound size={15}/>{lang==='ar'?'تغيير المستخدم':lang==='fr'?'Changer d’utilisateur':'Switch user'}</button>
                <button className="profile-menu-item" onClick={()=>{setProfileOpen(false);setSessionPaused(true)}}><Pause size={15}/>{lang==='ar'?'تعليق الجلسة':lang==='fr'?'Suspendre la session':'Pause session'}</button>
                <button className="profile-menu-item danger" onClick={async()=>{setProfileOpen(false);try{const {error}=await supabase.auth.signOut();if(error)throw error;window.location.reload()}catch(error){window.alert(error?.message||'Sign out failed')}}}><LogOut size={15}/>{lang==='ar'?'تسجيل الخروج':lang==='fr'?'Déconnexion':'Sign out'}</button>
              </div>}
            </div>
            <div className="connection-card"><span className={'connection-state '+(navigator.onLine?'is-online':'is-offline')}><Wifi size={15}/><span><b>Internet</b><small>{navigator.onLine?(lang==='ar'?'متصل':lang==='fr'?'Connecté':'Connected'):(lang==='ar'?'غير متصل':lang==='fr'?'Hors ligne':'Offline')}</small></span><i/></span><span className={'connection-state '+(cloudState==='connected'?'is-online':'is-pending')}><Cloud size={15}/><span><b>{lang==='ar'?'السحابة':'Cloud'}</b><small>{cloudState==='connected'?(lang==='ar'?'متصلة':lang==='fr'?'Connecté':'Connected'):(lang==='ar'?'قيد الفحص':lang==='fr'?'À vérifier':'Check status')}</small></span><i/></span><span className={'connection-state '+(cloudState==='error'?'is-offline':'is-online')}><Server size={15}/><span><b>{lang==='ar'?'السيرفر':'Server'}</b><small>{cloudState==='error'?(lang==='ar'?'غير متاح':lang==='fr'?'Indisponible':'Unavailable'):(lang==='ar'?'جاهز':lang==='fr'?'Prêt':'Ready')}</small></span><i/></span></div>
          </div>
          <div className="topbar-tools">
            <div className="header-popover-wrap search-wrap"><button className="topbar-tool search-tool" onClick={()=>{setSearchOpen(v=>!v);setLanguageOpen(false);setNotificationsOpen(false);setProfileOpen(false)}} aria-label={t('search')}><Search size={17}/><span>{lang==='ar'?'بحث':lang==='fr'?'Rechercher':'Search'}</span></button>{searchOpen&&<div className="header-popover search-popover"><div className="popover-title"><b>{t('searchResults')}</b><button className="popover-close" onClick={()=>setSearchOpen(false)}><X size={15}/></button></div><label className="popup-search-field"><Search size={16}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('search')}/><kbd>Esc</kbd></label></div>}</div>
            <div className="topbar-tool-group">
              <button className="topbar-tool compact-tool home-tool" onClick={()=>navigate(dashboard)} aria-label={t('home')} title={t('home')}><LayoutDashboard size={16}/></button>
              <button className="topbar-tool compact-tool refresh-tool" onClick={()=>window.location.reload()} aria-label={t('refreshPage')} title={t('refreshPage')}><RotateCw size={16}/></button>
              <div className="header-popover-wrap notification-wrap"><button className="topbar-tool compact-tool" onClick={()=>{setNotificationsOpen(v=>!v);setSearchOpen(false);setLanguageOpen(false);setProfileOpen(false)}} aria-label={t('notifications')}><Bell size={17}/><i className="tool-indicator"/></button>{notificationsOpen&&<div className="header-popover notification-popover"><div className="popover-title"><b>{t('notifications')}</b><button className="popover-close" onClick={()=>setNotificationsOpen(false)}><X size={15}/></button></div><div className="notification-empty"><span><Bell size={18}/></span><b>{t('noNotifications')}</b><p>{lang==='ar'?'ستظهر هنا التنبيهات المهمة.':lang==='fr'?'Les alertes importantes apparaîtront ici.':'Important alerts will appear here.'}</p></div></div>}</div>
              <div className="header-popover-wrap language-wrap"><button className="topbar-tool compact-tool" onClick={()=>{setLanguageOpen(v=>!v);setSearchOpen(false);setNotificationsOpen(false);setProfileOpen(false)}} aria-label="Language"><Globe size={17}/><span>{lang.toUpperCase()}</span></button>{languageOpen&&<div className="header-popover language-popover"><b className="popover-heading">{lang==='ar'?'لغة التطبيق':lang==='fr'?'Langue':'Language'}</b>{[['ar','العربية'],['fr','Français'],['en','English']].map(([value,label])=><button key={value} className={'language-option '+(lang===value?'selected':'')} onClick={()=>{setLang(value);setLanguageOpen(false)}}><span>{label}</span>{lang===value&&<Check size={15}/>}</button>)}</div>}</div>
              <button className="topbar-tool compact-tool sync-tool" onClick={handleManualSync} disabled={manualSyncing} aria-label={t('sync')} title={t('sync')}><CloudUpload className={manualSyncing?'sync-spinning':''} size={16}/></button>
            </div>
            <div className="topbar-datetime glass-time-card"><CalendarDays size={15}/><span><b>{new Intl.DateTimeFormat(lang==='ar'?'ar-DZ':lang==='fr'?'fr-FR':'en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(clockNow)}</b><strong>{clockNow.toLocaleTimeString(lang==='ar'?'ar-DZ':lang==='fr'?'fr-FR':'en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</strong></span></div><span className="topbar-brand-mark" aria-label="VELTRO-PRO">V</span>
          </div>
        </header>
        <div className="workspace-canvas" aria-label={lang==='ar'?'مساحة العمل فارغة لإعادة التصميم':lang==='fr'?'Espace de travail vide pour la refonte':'Empty workspace for redesign'} />
      </main>
    </div>
    {sessionPaused&&<div className="session-pause-overlay"><section className="session-pause-card"><span><LockKeyhole size={25}/></span><h2>{lang==='ar'?'الجلسة معلّقة':lang==='fr'?'Session suspendue':'Session paused'}</h2><p>{lang==='ar'?'تم إخفاء مساحة العمل مؤقتًا. استأنف الجلسة للمتابعة.':lang==='fr'?'Votre espace est masqué temporairement. Reprenez la session.':'Your workspace is hidden temporarily. Resume to continue.'}</p><button onClick={()=>setSessionPaused(false)}>{lang==='ar'?'استئناف الجلسة':lang==='fr'?'Reprendre la session':'Resume session'}</button><button className="pause-signout" onClick={async()=>{try{const {error}=await supabase.auth.signOut();if(error)throw error;window.location.reload()}catch(error){window.alert(error?.message||'Sign out failed')}}}>{t('logout')}</button></section></div>}
    {logoutOpen&&<div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title"><span className="modal-icon"><LogOut size={22}/></span><h2 id="logout-title">{t('logoutConfirm')}</h2><p>VELTRO BUSINESS SUITE</p><div><button className="button-secondary" onClick={()=>setLogoutOpen(false)}>{t('cancel')}</button><button className="button-danger" onClick={async()=>{try{const {error}=await supabase.auth.signOut();if(error)throw error;setLogoutOpen(false);setSignedOut(false);}catch(error){window.alert(error?.message||'تعذّر تسجيل الخروج. حاول مجددًا.');}}}>{t('confirm')}</button></div><button className="modal-close" onClick={()=>setLogoutOpen(false)} aria-label="Close"><X size={16}/></button></section></div>}
  </div>;
}
