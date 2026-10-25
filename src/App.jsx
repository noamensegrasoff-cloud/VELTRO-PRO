import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Bell, Menu, ChevronDown, LogOut, ArrowUpRight, Moon, Sun, RotateCw,
  MoreHorizontal, CalendarDays, Package, ReceiptText,
  Wallet, CircleAlert, Clock3, ChartNoAxesCombined,
  ShoppingCart, X, Globe, ClipboardList, History,
  CircleCheck, PackageCheck, Cloud, PanelLeftClose, PanelLeftOpen,
  Plus, Phone, MapPin, Pencil, Trash2, ImagePlus, Building2, FileText, Users, Eye, Printer, ScanLine
} from 'lucide-react';
import { dashboard, sections } from './data/navigation.js';
import { getCloudStatus } from './services/cloudStorage.js';
import { supabase } from './lib/supabase.js';
import BusinessOnboarding from './BusinessOnboarding.jsx';
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
    noNotifications: 'لا توجد إشعارات جديدة.', logout: 'تسجيل الخروج',
    logoutConfirm: 'هل تريد تسجيل الخروج من VELTRO-PRO؟', cancel: 'إلغاء', confirm: 'تسجيل الخروج',
    signedOut: 'تم تسجيل الخروج من المعاينة', signIn: 'العودة إلى المعاينة',
    back: 'العودة', home: 'لوحة التحكم', selected: 'القسم المحدد',
    welcome: 'مرحبًا بك في', title: 'VELTRO BUSINESS SUITE',
    daily: 'الحالة اليومية', cashBalance: 'رصيد الصندوق', expense: 'المصاريف',
    profit: 'الربح التقديري', viewDetails: 'عرض التفاصيل', allSections: 'الأقسام',
    searchResults: 'نتائج البحث', noResults: 'لا توجد نتائج مطابقة.',
    topProducts: 'أكثر المنتجات حركة', activity: 'النشاط حسب الفترة',
    cloudTitle: 'التخزين السحابي', cloudConfigured: 'إعداد السحابة مكتمل، بانتظار تسجيل الدخول', cloudMissing: 'أضف إعدادات Supabase لربط السحابة', cloudConnected: 'اتصال الحساب السحابي نشط', cloudChecking: 'جارٍ فحص إعدادات السحابة', cloudError: 'تعذر التحقق من اتصال السحابة', cloudPrototype: 'واجهة تجريبية — لم تُربط معاملات المتجر بعد', darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح',
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
    cloudTitle: 'Cloud storage', cloudConfigured: 'Cloud configured; sign-in required', cloudMissing: 'Add Supabase settings to connect cloud storage', cloudConnected: 'Cloud account session is active', cloudChecking: 'Checking cloud configuration', cloudError: 'Could not check cloud connection', cloudPrototype: 'UI preview — store transactions are not connected yet', darkMode: 'Dark mode', lightMode: 'Light mode',
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
    cloudTitle: 'Stockage cloud', cloudConfigured: 'Cloud configuré ; connexion requise', cloudMissing: 'Ajoutez la configuration Supabase pour connecter le cloud', cloudConnected: 'Session du compte cloud active', cloudChecking: 'Vérification de la configuration cloud', cloudError: 'Impossible de vérifier la connexion cloud', cloudPrototype: 'Aperçu — les opérations du magasin ne sont pas encore reliées',
  }
};

const activityRows = [
  { id: 'INV-1048', product: 'Youkous 1.5L', operation: 'sold', quantity: '24', status: 'completed', time: '10:42' },
  { id: 'PUR-0217', product: 'Ifri 0.5L', operation: 'bought', quantity: '120', status: 'received', time: '10:18' },
  { id: 'INV-1047', product: 'Jus d’orange', operation: 'sold', quantity: '12', status: 'completed', time: '09:56' },
  { id: 'STK-0081', product: 'Sucre 1 kg', operation: 'returned', quantity: '3', status: 'pending', time: '09:31' },
];

function getLabel(item, lang) { return item?.label?.[lang] || item?.label?.ar || ''; }

function Sidebar({ lang, t, activeId, onNavigate, onLogout, search, mobileOpen, setMobileOpen, sidebarVisible }) {
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

function SupplierListPage({ lang }) {
  const labels = {
    ar: { title:'قائمة الموردين', subtitle:'إدارة بيانات الموردين ووسائل الاتصال بهم في مكان واحد.', add:'إضافة مورد', search:'ابحث بالاسم أو الهاتف…', searchRef:'ابحث بالمرجع أو امسح الكود…', total:'إجمالي الموردين', shown:'المعروض', empty:'لا يوجد موردون بعد', emptyHint:'ابدأ بإضافة أول مورد إلى سجل متجرك.', name:'اسم المورد', phone:'رقم الهاتف', id:'المعرف', address:'العنوان', description:'الوصف', photo:'صورة المورد', choosePhoto:'اختيار صورة', save:'حفظ المورد', update:'حفظ التعديلات', cancel:'إلغاء', edit:'تعديل', delete:'حذف', actions:'الإجراءات', view:'معاينة', qr:'رمز QR', barcode:'الباركود', print:'طباعة بطاقة المورد', created:'تاريخ التسجيل', noDescription:'لا توجد ملاحظات مضافة', noPhone:'لا يوجد رقم هاتف', noAddress:'لم يُحدد العنوان', confirmDelete:'هل تريد حذف هذا المورد؟', required:'يرجى إدخال اسم المورد.', saved:'تم حفظ بيانات المورد محليًا.', duplicate:'هذا المعرف مستخدم بالفعل.', close:'إغلاق', details:'بيانات المورد', all:'كل الموردين' },
    en: { title:'Supplier list', subtitle:'Manage supplier profiles and contact details in one place.', add:'Add supplier', search:'Search name or phone…', searchRef:'Search reference or scan code…', total:'Total suppliers', shown:'Shown', empty:'No suppliers yet', emptyHint:'Add your first supplier to the store directory.', name:'Supplier name', phone:'Phone number', id:'Supplier ID', address:'Address', description:'Description', photo:'Supplier photo', choosePhoto:'Choose photo', save:'Save supplier', update:'Save changes', cancel:'Cancel', edit:'Edit', delete:'Delete', actions:'Actions', view:'Preview', qr:'QR code', barcode:'Barcode', print:'Print supplier card', created:'Registered', noDescription:'No notes added', noPhone:'No phone number', noAddress:'No address added', confirmDelete:'Delete this supplier?', required:'Please enter a supplier name.', saved:'Supplier saved locally.', duplicate:'This ID is already in use.', close:'Close', details:'Supplier details', all:'All suppliers' },
    fr: { title:'Liste des fournisseurs', subtitle:'Gérez les profils et coordonnées des fournisseurs au même endroit.', add:'Ajouter un fournisseur', search:'Rechercher nom ou téléphone…', searchRef:'Rechercher référence ou scanner…', total:'Total fournisseurs', shown:'Affichés', empty:'Aucun fournisseur pour le moment', emptyHint:'Ajoutez le premier fournisseur à votre répertoire.', name:'Nom du fournisseur', phone:'Téléphone', id:'Identifiant', address:'Adresse', description:'Description', photo:'Photo du fournisseur', choosePhoto:'Choisir une photo', save:'Enregistrer', update:'Enregistrer les modifications', cancel:'Annuler', edit:'Modifier', delete:'Supprimer', actions:'Actions', view:'Aperçu', qr:'Code QR', barcode:'Code-barres', print:'Imprimer la carte', created:'Inscrit le', noDescription:'Aucune note ajoutée', noPhone:'Aucun téléphone', noAddress:'Aucune adresse', confirmDelete:'Supprimer ce fournisseur ?', required:'Veuillez saisir le nom du fournisseur.', saved:'Fournisseur enregistré localement.', duplicate:'Cet identifiant est déjà utilisé.', close:'Fermer', details:'Coordonnées du fournisseur', all:'Tous les fournisseurs' }
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
  const emptyForm = { name:'', phone:'', address:'', description:'', photo:'' };
  const [form, setForm] = useState(emptyForm);
  useEffect(() => { try { localStorage.setItem('veltro.suppliers.v1', JSON.stringify(suppliers)); } catch { setError(lang==='ar'?'تعذر حفظ البيانات محليًا؛ قد تكون الصور كبيرة جدًا.':'Could not save locally; images may be too large.'); } }, [suppliers, lang]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const r = refQuery.trim().toLocaleLowerCase();
    return suppliers.filter(s => (!q || [s.name,s.phone].some(v => String(v||'').toLocaleLowerCase().includes(q))) && (!r || String(s.id||'').toLocaleLowerCase().includes(r)));
  }, [suppliers, query, refQuery]);
  const openAdd = () => { setEditingId(null); setForm(emptyForm); setError(''); setModalOpen(true); };
  const openEdit = supplier => { setEditingId(supplier.id); setForm({ name:supplier.name||'', phone:supplier.phone||'', address:supplier.address||'', description:supplier.description||'', photo:supplier.photo||'' }); setError(''); setModalOpen(true); };
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
    const record = { ...form, name, phone:form.phone.trim(), address:form.address.trim(), description:form.description.trim(), id:nextId, updatedAt:new Date().toISOString() };
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
    win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+safe(supplier.name)+'</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#18304a}.card{max-width:640px;margin:auto;border:1px solid #dce5ed;border-radius:14px;padding:24px;text-align:center}.ref{color:#168f91;font-weight:bold}.codes{display:flex;align-items:center;justify-content:space-around;gap:20px;flex-wrap:wrap;margin-top:22px}.codes svg{max-width:100%}.info{line-height:1.8;color:#52667d}</style></head><body><div class="card"><h2>'+safe(supplier.name)+'</h2><div class="ref">'+safe(supplier.id)+'</div><p class="info">'+safe(supplier.phone||'')+'<br>'+safe(supplier.address||'')+'</p><div class="codes"><div>'+qr+'<p>QR Code</p></div><div>'+barcode+'<p>Barcode</p></div></div></div><script>window.onload=function(){window.print()}<\/script></body></html>');
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
      : <div className="supplier-table-wrap"><table className="supplier-table"><thead><tr><th>{t('name')}</th><th>{t('id')}</th><th>{t('phone')}</th><th>{t('address')}</th><th>{t('description')}</th><th>{t('actions')}</th></tr></thead><tbody>
        {filtered.map(supplier=><tr key={supplier.id}><td><div className="supplier-name-cell">{supplier.photo?<img src={supplier.photo} alt=""/>:<span className="supplier-avatar"><Building2 size={17}/></span>}<span><b>{supplier.name}</b><small>{supplier.id}</small></span></div></td><td><code className="supplier-id">{supplier.id}</code></td><td>{supplier.phone?<a className="supplier-phone" href={'tel:'+supplier.phone}><Phone size={13}/>{supplier.phone}</a>:<span className="supplier-muted">{t('noPhone')}</span>}</td><td><span className="supplier-address"><MapPin size={13}/>{supplier.address||t('noAddress')}</span></td><td><span className="supplier-description">{supplier.description||'—'}</span></td><td><div className="supplier-row-actions"><button onClick={()=>setPreviewSupplier(supplier)} aria-label="Preview" title="Preview"><Eye size={14}/></button><button onClick={()=>openEdit(supplier)} aria-label={t('edit')} title={t('edit')}><Pencil size={14}/></button><button className="danger" onClick={()=>setDeleteSupplier(supplier)} aria-label={t('delete')} title={t('delete')}><Trash2 size={14}/></button></div></td></tr>)}
      </tbody></table></div>}
    </section>
    {modalOpen&&<div className="supplier-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false);}}><section className="supplier-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-modal-title"><div className="supplier-modal-head"><div><span>{t('details')}</span><h2 id="supplier-modal-title">{editingId?t('edit'):t('add')}</h2></div><button type="button" onClick={()=>setModalOpen(false)} aria-label={t('close')}><X size={17}/></button></div>
      <form onSubmit={save}><div className="supplier-photo-field"><label className="supplier-photo-preview">{form.photo?<img src={form.photo} alt=""/>:<ImagePlus size={22}/>}<input type="file" accept="image/*" onChange={readPhoto}/></label><div><b>{t('photo')}</b><small>{lang==='ar'?'صورة اختيارية، حتى 2 ميغابايت':lang==='fr'?'Photo facultative, 2 Mo maximum':'Optional photo, up to 2 MB'}</small><label className="supplier-photo-button"><ImagePlus size={13}/>{t('choosePhoto')}<input type="file" accept="image/*" onChange={readPhoto}/></label></div></div>
      <div className="supplier-form-grid"><label className="supplier-field"><span>{t('name')} <i>*</i></span><input autoFocus value={form.name} onChange={e=>setField('name',e.target.value)} required maxLength={100} placeholder={lang==='ar'?'اسم الشركة أو الموزع':'Company or distributor name'}/></label><label className="supplier-field"><span>{t('id')}</span><input value={editingId||'يُنشأ تلقائيًا / Auto'} readOnly dir="ltr"/></label><label className="supplier-field"><span>{t('phone')}</span><input value={form.phone} onChange={e=>setField('phone',e.target.value)} inputMode="tel" maxLength={40} placeholder="+213 …"/></label><label className="supplier-field"><span>{t('address')}</span><input value={form.address} onChange={e=>setField('address',e.target.value)} maxLength={200} placeholder={lang==='ar'?'المدينة، العنوان…':'City, address…'}/></label><label className="supplier-field supplier-field-wide"><span>{t('description')}</span><textarea value={form.description} onChange={e=>setField('description',e.target.value)} rows={3} maxLength={1000} placeholder={lang==='ar'?'ملاحظات أو نوع السلع التي يوفرها المورد…':'Notes or goods supplied…'}/></label></div>
      {error&&<p className="supplier-form-error">{error}</p>}<div className="supplier-modal-actions"><button type="button" className="supplier-secondary" onClick={()=>setModalOpen(false)}>{t('cancel')}</button><button type="submit" className="supplier-primary"><CircleCheck size={15}/>{editingId?t('update'):t('save')}</button></div></form>
    </section></div>}
  
    {previewSupplier&&<div className="supplier-modal-backdrop supplier-preview-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPreviewSupplier(null);}}><section className="supplier-preview-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-preview-title">
      <div className="supplier-preview-top"><div><span>{t('details')}</span><h2 id="supplier-preview-title">{previewSupplier.name}</h2><code>{previewSupplier.id}</code></div><button onClick={()=>setPreviewSupplier(null)} aria-label="Close"><X size={18}/></button></div>
      <div className="supplier-preview-body"><div className="supplier-preview-identity">{previewSupplier.photo?<img src={previewSupplier.photo} alt=""/>:<span className="supplier-preview-avatar"><Building2 size={27}/></span>}<div><h3>{previewSupplier.name}</h3><span>{t('id')}: {previewSupplier.id}</span><small>{t('phone')}: {previewSupplier.phone||t('noPhone')}</small></div></div>
      <div className="supplier-detail-grid"><div className="supplier-detail-card"><Phone size={16}/><span>{t('phone')}</span><b>{previewSupplier.phone||t('noPhone')}</b></div><div className="supplier-detail-card"><MapPin size={16}/><span>{t('address')}</span><b>{previewSupplier.address||t('noAddress')}</b></div></div>
      <div className="supplier-notes"><span>{t('description')}</span><p>{previewSupplier.description||t('noDescription')}</p></div>
      <div className="supplier-codes-grid"><div className="supplier-code-card"><h3>{t('qr')}</h3><div className="supplier-qr" data-supplier-qr={previewSupplier.id}><QRCodeSVG value={previewSupplier.id} size={124} level="M" includeMargin/></div><code>{previewSupplier.id}</code></div><div className="supplier-code-card supplier-barcode-card"><h3>{t('barcode')}</h3><div data-supplier-barcode={previewSupplier.id}><Barcode value={previewSupplier.id} format="CODE128" width={1.4} height={52} fontSize={12} margin={6} displayValue/></div><code>{previewSupplier.id}</code></div></div></div>
      <div className="supplier-preview-actions"><button className="supplier-secondary" onClick={()=>printCard(previewSupplier)}><Printer size={15}/>{t('print')}</button><button className="supplier-secondary" onClick={()=>openEdit(previewSupplier)}><Pencil size={15}/>{t('edit')}</button><button className="supplier-primary" onClick={()=>setPreviewSupplier(null)}>{t('close')}</button></div>
    </section></div>}
    {deleteSupplier&&<div className="supplier-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDeleteSupplier(null);}}><section className="supplier-delete-modal" role="dialog" aria-modal="true"><span className="supplier-delete-icon"><Trash2 size={22}/></span><h2>{t('confirmDelete')}</h2><p><b>{deleteSupplier.name}</b></p><div><button className="supplier-secondary" onClick={()=>setDeleteSupplier(null)}>{t('cancel')}</button><button className="supplier-delete-confirm" onClick={remove}><Trash2 size={14}/>{t('delete')}</button></div></section></div>}

  </div>;
}

function ModulePage({ page, parent, t, lang, onBack }) {
  if (page.id === 'supplier-list') return <SupplierListPage lang={lang} />;
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
  const [theme,setTheme]=useState(()=>{try{if(localStorage.getItem('veltro.theme.palette.v2')!=='1'){localStorage.setItem('veltro.theme.palette.v2','1');localStorage.setItem('veltro.theme','dark');return 'dark';}return localStorage.getItem('veltro.theme')==='light'?'light':'dark';}catch{return 'dark';}});
  const [lang,setLang]=useState(()=>{try{return ['ar','fr','en'].includes(localStorage.getItem('veltro.language'))?localStorage.getItem('veltro.language'):'ar';}catch{return 'ar';}});
  const [cloudState,setCloudState]=useState('checking');
  const [setupState,setSetupState]=useState('checking');
  const [setupProfile,setSetupProfile]=useState({});
  const [setupSaving,setSetupSaving]=useState(false);
  const [setupError,setSetupError]=useState('');
  useEffect(()=>{try{localStorage.setItem('veltro.language',lang);}catch{};document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.title=lang==='ar'?'VELTRO-PRO — نظام إدارة المتجر':lang==='fr'?'VELTRO-PRO — Gestion commerciale':'VELTRO-PRO — Business Suite';},[lang]);
  useEffect(()=>{try{localStorage.setItem('veltro.theme',theme);}catch{};document.documentElement.dataset.theme=theme;},[theme]);
  useEffect(()=>{let alive=true;getCloudStatus().then(status=>{if(alive)setCloudState(status);}).catch(()=>{if(alive)setCloudState('error');});return()=>{alive=false;};},[]);
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
  const [search,setSearch]=useState('');
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [sidebarVisible,setSidebarVisible]=useState(true);
  const [logoutOpen,setLogoutOpen]=useState(false);
  const [signedOut,setSignedOut]=useState(false);
  const t=(key)=>copy[lang][key]||copy.ar[key]||key;
  const dir=lang==='ar'?'rtl':'ltr';
  const navigate=(page,parent=null)=>{setActivePage(page);setActiveParent(parent);setNotificationsOpen(false);};
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
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
        setSidebarVisible(visible => !visible);
        return;
      }

    };
    // Capture phase cancels browser defaults before page-level handlers can run.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [sidebarVisible, logoutOpen, signedOut, mobileOpen, activePage.id]);
  if(setupState==='checking') return <div className="signed-out" dir={dir}><div className="signed-out-card"><span className="brand-mark"><span>V</span></span><h1>VELTRO</h1><p>{lang==='ar'?'جارٍ تجهيز مساحة العمل…':lang==='fr'?'Préparation de votre espace…':'Preparing your workspace…'}</p></div></div>;
  if(setupState==='required') return <BusinessOnboarding lang={lang} onLanguageChange={setLang} initialProfile={setupProfile} onComplete={completeBusinessSetup} onLogout={logoutFromSetup} saving={setupSaving} saveError={setupError}/>;
  if(signedOut) return <div className="signed-out" dir={dir}><div className="signed-out-card"><span className="brand-mark"><span>V</span></span><h1>{t('signedOut')}</h1><p>VELTRO BUSINESS SUITE</p><button onClick={()=>{setSignedOut(false);setActivePage(dashboard);}}>{t('signIn')}</button></div></div>;
  return <div className={'app-shell lang-'+lang+' theme-'+theme+(sidebarVisible?'':' sidebar-collapsed')} dir={dir}>
    <div className="app-layout">
      <Sidebar lang={lang} t={t} activeId={activePage.id} onNavigate={navigate} onLogout={()=>setLogoutOpen(true)} search={search} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} sidebarVisible={sidebarVisible}/>
      <main className="workspace">
        <header className="topbar">
          <div className="topbar-start"><button className="mobile-menu-button" onClick={()=>{setSidebarVisible(true);setMobileOpen(true);}} aria-label="Open navigation"><Menu size={18}/></button><button className="sidebar-toggle-button" onClick={()=>setSidebarVisible(v=>!v)} aria-label={sidebarVisible?(lang==='ar'?'إخفاء القائمة الجانبية':'Hide sidebar'):(lang==='ar'?'إظهار القائمة الجانبية':'Show sidebar')} title="Esc"><kbd>Esc</kbd>{sidebarVisible?<PanelLeftClose size={17}/>:<PanelLeftOpen size={17}/>}</button><div className="breadcrumbs"><span>{t('workspace')}</span><span className="crumb-sep">/</span><b>{getLabel(activePage,lang)||t('home')}</b></div></div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('search')}/><kbd>⌕</kbd></label>
            <button className="icon-button refresh-button" onClick={()=>window.location.reload()} aria-label={lang==='ar'?'تحديث الصفحة':lang==='fr'?'Actualiser la page':'Refresh page'} title={lang==='ar'?'تحديث الصفحة':lang==='fr'?'Actualiser la page':'Refresh page'}><RotateCw size={17}/></button>
            <button className="icon-button theme-toggle" onClick={()=>setTheme(v=>v==='dark'?'light':'dark')} aria-label={theme==='dark'?t('lightMode'):t('darkMode')} title={theme==='dark'?t('lightMode'):t('darkMode')}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button>
            <label className="language-select"><Globe size={15}/><select value={lang} onChange={e=>setLang(e.target.value)} aria-label="Language"><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select><ChevronDown size={12}/></label>
            <div className="notification-wrap"><button className="icon-button notification-button" onClick={()=>setNotificationsOpen(v=>!v)} aria-label={t('notifications')}><Bell size={17}/><i/></button>{notificationsOpen&&<div className="notification-popover"><b>{t('notifications')}</b><p>{t('noNotifications')}</p></div>}</div>
            <div className="profile-chip"><span className="profile-avatar">V</span><span><b>VELTRO</b><small>PRO</small></span><ChevronDown size={13}/></div>
          </div>
        </header>
        {activePage.id===dashboard.id?<DashboardPage t={t} lang={lang} onNavigate={navigate}/>:<ModulePage page={activePage} parent={activeParent} t={t} lang={lang} onBack={()=>navigate(dashboard)}/>}
        <footer className="workspace-footer"><span>© 2026 VELTRO BUSINESS SUITE</span><span className={'cloud-status cloud-'+cloudState}><Cloud size={14}/><span>{cloudState==='connected'?t('cloudConnected'):cloudState==='configured'?t('cloudConfigured'):cloudState==='checking'?t('cloudChecking'):cloudState==='error'?t('cloudError'):t('cloudMissing')}</span></span><span className="prototype-note">{t('cloudPrototype')}</span></footer>
      </main>
    </div>
    {logoutOpen&&<div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title"><span className="modal-icon"><LogOut size={22}/></span><h2 id="logout-title">{t('logoutConfirm')}</h2><p>VELTRO BUSINESS SUITE</p><div><button className="button-secondary" onClick={()=>setLogoutOpen(false)}>{t('cancel')}</button><button className="button-danger" onClick={async()=>{try{const {error}=await supabase.auth.signOut();if(error)throw error;setLogoutOpen(false);setSignedOut(false);}catch(error){window.alert(error?.message||'تعذّر تسجيل الخروج. حاول مجددًا.');}}}>{t('confirm')}</button></div><button className="modal-close" onClick={()=>setLogoutOpen(false)} aria-label="Close"><X size={16}/></button></section></div>}
  </div>;
}
