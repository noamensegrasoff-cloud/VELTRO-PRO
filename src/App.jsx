import React, { useMemo, useState } from 'react';
import {
  Activity, Bell, Boxes, ChartNoAxesCombined, ChevronDown, CircleHelp,
  ClipboardList, Command, CreditCard, Download, LayoutDashboard, Menu,
  Package, PackageSearch, Search, Settings2, ShieldCheck, ShoppingBag,
  ShoppingCart, Sparkles, Truck, Users, Wallet, Wifi, X, ArrowUpRight,
  ArrowDownRight, MoreHorizontal, CalendarDays, CircleCheck, Clock3
} from 'lucide-react';
import { sections } from './data/navigation.js';

const navigation = [
  { label: 'لوحة التحكم', icon: LayoutDashboard, id: 'dashboard' },
  { label: 'المبيعات', icon: ShoppingCart, id: 'sales' },
  { label: 'المشتريات', icon: PackageSearch, id: 'purchases' },
  { label: 'المنتجات والمخزون', icon: Boxes, id: 'products' },
  { label: 'الطلبات', icon: ClipboardList, id: 'orders' },
  { label: 'الموردون', icon: Truck, id: 'suppliers' },
  { label: 'الزبائن', icon: Users, id: 'customers' },
  { label: 'الصندوق', icon: Wallet, id: 'cash' },
  { label: 'التقارير والتحليلات', icon: ChartNoAxesCombined, id: 'reports' },
];
const metrics = [
  { label: 'إجمالي المبيعات', value: '284,650', unit: 'دج', change: '+12.8%', up: true, icon: ShoppingBag, color: 'cyan' },
  { label: 'صافي الأرباح', value: '48,290', unit: 'دج', change: '+8.2%', up: true, icon: ChartNoAxesCombined, color: 'violet' },
  { label: 'المنتجات في المخزون', value: '1,284', unit: 'منتج', change: '36 منخفض', up: false, icon: Boxes, color: 'blue' },
  { label: 'فواتير قيد المعالجة', value: '18', unit: 'فاتورة', change: '6 تحتاج مراجعة', up: false, icon: ClipboardList, color: 'pink' },
];
const bars = [34,48,41,64,52,76,57,86,67,93,71,82];
const activities = [
  { title: 'عملية بيع جديدة', desc: 'فاتورة #INV-2084 · نقطة البيع الرئيسية', time: 'منذ دقيقتين', amount: '+ 12,500 دج', type: 'sale' },
  { title: 'تحديث المخزون', desc: 'تم تحديث بيانات 8 منتجات', time: 'منذ 18 دقيقة', amount: '8 منتجات', type: 'stock' },
  { title: 'استلام مشتريات', desc: 'فاتورة مورد #PUR-0318', time: 'منذ 42 دقيقة', amount: '− 34,800 دج', type: 'purchase' },
];
const fmt = (v) => v.toLocaleString('en-US');

function MiniBars() {
  return <div className="mini-bars" aria-label="رسم بياني تجريبي للمبيعات">{bars.map((h, i) => <span key={i} style={{'--bar-height': h + '%', '--bar-delay': (i * 35) + 'ms'}} className={i === 9 ? 'bar-highlight' : ''} />)}</div>;
}
function SalesChart() {
  return <svg className="sales-chart" viewBox="0 0 620 190" preserveAspectRatio="none" role="img" aria-label="منحنى مبيعات توضيحي">
    {[25,65,105,145].map(y => <line key={y} x1="8" y1={y} x2="610" y2={y} stroke="rgba(153,184,231,.11)" strokeDasharray="4 6" />)}
    <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#43d9f5" stopOpacity=".3"/><stop offset="100%" stopColor="#43d9f5" stopOpacity="0"/></linearGradient><linearGradient id="salesLine" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#49dff0"/><stop offset="100%" stopColor="#9a7bff"/></linearGradient></defs>
    <path d="M8 145 C35 136 42 122 62 127 S92 100 112 111 S148 130 165 94 S202 102 220 79 S250 89 275 68 S313 96 335 62 S365 74 388 52 S426 80 445 44 S484 65 505 31 S548 55 568 24 S594 42 610 16 L610 175 L8 175 Z" fill="url(#salesFill)"/>
    <path d="M8 145 C35 136 42 122 62 127 S92 100 112 111 S148 130 165 94 S202 102 220 79 S250 89 275 68 S313 96 335 62 S365 74 388 52 S426 80 445 44 S484 65 505 31 S548 55 568 24 S594 42 610 16" fill="none" stroke="url(#salesLine)" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="505" cy="31" r="5" fill="#4fe5f2" stroke="#101e47" strokeWidth="3"/>
  </svg>;
}
function Donut() {
  return <div className="donut-wrap"><div className="donut-chart"><div className="donut-center"><strong>72%</strong><span>مكتمل</span></div></div><div className="donut-legend"><span><i className="legend-cyan"/>مبيعات التجزئة <b>48%</b></span><span><i className="legend-violet"/>الجملة <b>32%</b></span><span><i className="legend-blue"/>أخرى <b>20%</b></span></div></div>;
}

export default function App() {
  const [active, setActive] = useState('dashboard');
  const [language, setLanguage] = useState('ar');
  const [query, setQuery] = useState('');
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [period, setPeriod] = useState('هذا الأسبوع');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const filteredNavigation = useMemo(() => navigation.filter(item => item.label.includes(query.trim())), [query]);
  const current = navigation.find(item => item.id === active) || navigation[0];
  const chooseSection = (id) => { setActive(id); setSidebarOpen(false); };
  return (
    <main className={"dashboard-app lang-" + language} dir={language === "ar" ? "rtl" : "ltr"}>
      <aside className={'sidebar ' + (sidebarOpen ? 'sidebar-open' : '')}>
        <div className="brand-lockup"><span className="brand-symbol"><Sparkles size={18}/></span><span className="brand-words"><b>VELTRO</b><small>BUSINESS SUITE</small></span></div>
        <div className="workspace-switch" onClick={() => setProfileOpen(v => !v)} role="button" tabIndex={0}><span className="workspace-avatar">V</span><span className="workspace-name"><b>متجري</b><small>الخطة الاحترافية</small></span><ChevronDown size={15}/></div>
        <div className="sidebar-label">مساحة العمل</div>
        <nav className="sidebar-nav" aria-label="القائمة الرئيسية">
          {navigation.map(item => { const Icon = item.icon; return <button key={item.id} className={'nav-item ' + (active === item.id ? 'nav-active' : '')} onClick={() => chooseSection(item.id)}><Icon size={17}/><span>{item.label}</span>{item.id === 'orders' && <i className="nav-count">4</i>}</button>; })}
        </nav>
        <div className="sidebar-label secondary-label">النظام</div>
        <button className={'nav-item ' + (active === 'settings' ? 'nav-active' : '')} onClick={() => chooseSection('settings')}><Settings2 size={17}/><span>الإعدادات</span></button>
        <button className="nav-item" onClick={() => setModal({title:'مركز المساعدة',desc:'هذه معاينة تصميمية لمركز المساعدة في VELTRO-PRO.'})}><CircleHelp size={17}/><span>مركز المساعدة</span></button>
        <div className="sidebar-bottom"><div className="system-card"><span className="system-orb"><Activity size={16}/></span><div><b>النظام يعمل بشكل طبيعي</b><small><i/> جميع الخدمات مستقرة</small></div></div><div className="sidebar-user"><span className="user-avatar">N</span><span><b>مدير المتجر</b><small>المسؤول الرئيسي</small></span><MoreHorizontal size={18} onClick={() => setProfileOpen(v => !v)}/></div></div>
      </aside>
      {sidebarOpen && <button className="mobile-scrim" aria-label="إغلاق القائمة" onClick={() => setSidebarOpen(false)}/>}
      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-left"><button className="mobile-menu" onClick={() => setSidebarOpen(v => !v)} aria-label="القائمة"><Menu size={20}/></button><div className="breadcrumb">مساحة العمل <span>/</span> <b>{current.label}</b></div></div>
          <div className="topbar-actions"><label className="language-switch"><span>文</span><select value={language} onChange={e => setLanguage(e.target.value)} aria-label="Language"><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select></label>
            <label className="global-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث في القوائم..." /><kbd>⌘ K</kbd>{query && <div className="search-results">{filteredNavigation.length ? filteredNavigation.map(n => <button key={n.id} onClick={() => {chooseSection(n.id);setQuery('')}}>{n.label}<ArrowUpRight size={14}/></button>) : <span>لا توجد نتائج</span>}</div>}</label>
            <span className="topbar-divider"/>
            <button className={'icon-button ' + (noticeOpen ? 'icon-button-active' : '')} aria-label="الإشعارات" onClick={() => {setNoticeOpen(v=>!v);setProfileOpen(false)}}><Bell size={18}/><i className="notification-dot"/></button>
            <button className="profile-trigger" onClick={() => {setProfileOpen(v=>!v);setNoticeOpen(false)}}><span className="user-avatar">N</span><ChevronDown size={14}/></button>
          </div>
          {noticeOpen && <div className="floating-panel notification-panel"><div className="floating-title"><b>الإشعارات</b><span>3 جديدة</span></div><div className="notice-row"><i className="notice-cyan"/><span><b>مخزون منخفض</b><small>3 منتجات تحتاج إلى إعادة الطلب</small></span><small>الآن</small></div><div className="notice-row"><i className="notice-violet"/><span><b>ملخص اليوم جاهز</b><small>يمكنك مراجعة مؤشرات الأداء</small></span><small>10 د</small></div><button className="text-action" onClick={()=>setNoticeOpen(false)}>إغلاق الإشعارات</button></div>}
          {profileOpen && <div className="floating-panel profile-panel"><b>مدير المتجر</b><span>إدارة حساب مساحة العمل</span><button onClick={()=>{setProfileOpen(false);setModal({title:'إعدادات الحساب',desc:'هذه معاينة تفاعلية للتصميم، وليست متصلة بحساب متجر حقيقي.'})}}>إعدادات الحساب</button></div>}
        </header>
        <div className="dashboard-content">
          <div className="welcome-row"><div><div className="eyebrow"><span/> لوحة معلومات الأعمال</div><h1>{active === 'dashboard' ? <>مرحبًا بك، <em>إليك نظرة عامة.</em></> : <>{current.label} <em>في لمحة.</em></>}</h1><p>إليك ما يحدث في مساحة عملك اليوم.</p></div><div className="welcome-actions"><button className="outline-action" onClick={() => setModal({title:'تصدير التقرير',desc:'سيُتاح تصدير التقارير عند ربط الواجهة ببيانات المتجر الفعلية.'})}><Download size={16}/> تصدير التقرير</button><button className="primary-action" onClick={() => setModal({title:'إنشاء عملية جديدة',desc:'هذه واجهة تجريبية للتصميم. لم يتم ربط إنشاء الفواتير بقاعدة بيانات المتجر.'})}><Sparkles size={16}/> إجراء جديد</button></div></div>
          <div className="status-strip"><span className="status-check"><CircleCheck size={15}/></span><span><b>كل شيء على ما يرام</b><small>آخر تحديث للواجهة منذ لحظات</small></span><span className="status-live"><i/> مباشر تجريبي</span><span className="status-strip-spacer"/><span className="status-strip-note"><Wifi size={14}/> وضع العرض</span></div>
          <div className="metric-grid">{metrics.map((m,i)=>{const Icon=m.icon;return <article className={'metric-card metric-'+m.color} key={m.label}><div className="metric-top"><span>{m.label}</span><span className="metric-icon"><Icon size={18}/></span></div><div className="metric-number"><strong>{m.value}</strong><small>{m.unit}</small></div><div className="metric-bottom"><span className={m.up?'trend-up':'trend-neutral'}>{m.up?<ArrowUpRight size={14}/>:<Activity size={13}/>} {m.change}</span><span className="metric-period">مقارنة بالفترة السابقة</span></div><div className="metric-glow"/></article>})}</div>
          <div className="primary-grid">
            <article className="glass-card sales-card"><div className="card-heading"><div><span className="card-kicker">تحليلات الأداء</span><h2>نظرة عامة على المبيعات</h2></div><button className="period-select" onClick={() => setPeriod(period === 'هذا الأسبوع' ? 'هذا الشهر' : period === 'هذا الشهر' ? 'هذا العام' : 'هذا الأسبوع')}><CalendarDays size={14}/>{period}<ChevronDown size={13}/></button></div><div className="sales-total"><strong>284,650 <small>دج</small></strong><span><ArrowUpRight size={14}/> 12.8%</span><small>إجمالي المبيعات خلال {period}</small></div><SalesChart/><div className="chart-axis"><span>الأحد</span><span>الإثنين</span><span>الثلاثاء</span><span>الأربعاء</span><span>الخميس</span><span>الجمعة</span><span>السبت</span></div></article>
            <article className="glass-card tasks-card"><div className="card-heading"><div><span className="card-kicker">مساحة العمل</span><h2>نظرة سريعة</h2></div><button className="dots-button" onClick={() => setModal({title:'نظرة سريعة',desc:'ملخص بصري تجريبي لمؤشرات مساحة العمل.'})}><MoreHorizontal size={19}/></button></div><div className="quick-stat"><span className="quick-icon cyan-bg"><ShoppingCart size={17}/></span><span><b>عمليات البيع</b><small>نشاط نقاط البيع</small></span><strong>126</strong></div><div className="quick-stat"><span className="quick-icon violet-bg"><Package size={17}/></span><span><b>حركة المنتجات</b><small>إضافة وتحديث المخزون</small></span><strong>38</strong></div><div className="quick-stat"><span className="quick-icon blue-bg"><CreditCard size={17}/></span><span><b>المدفوعات</b><small>عمليات مسجلة</small></span><strong>94</strong></div><div className="task-progress"><div><span>إنجاز مهام اليوم</span><b>72%</b></div><div className="progress-track"><i/></div></div></article>
            <article className="glass-card categories-card"><div className="card-heading"><div><span className="card-kicker">توزيع النشاط</span><h2>مصادر المبيعات</h2></div><button className="dots-button" onClick={() => setModal({title:'مصادر المبيعات',desc:'الرسم التوضيحي يعرض توزيعًا تجريبيًا، وليس بيانات فعلية.'})}><MoreHorizontal size={19}/></button></div><Donut/></article>
            <article className="glass-card priority-card"><div className="card-heading"><div><span className="card-kicker">مؤشرات مباشرة</span><h2>مؤشر النشاط اليومي</h2></div><span className="live-chip"><i/> تجريبي</span></div><MiniBars/><div className="priority-foot"><span>أقل نشاط</span><span>أعلى نشاط</span><b>+18.6% <ArrowUpRight size={13}/></b></div></article>
          </div>
          <article className="glass-card activity-card"><div className="card-heading"><div><span className="card-kicker">آخر التحديثات</span><h2>النشاط الأخير</h2></div><button className="text-action" onClick={() => chooseSection('reports')}>عرض كل النشاط <ArrowUpRight size={14}/></button></div><div className="activity-table"><div className="activity-header"><span>العملية</span><span>الوقت</span><span>القيمة / التفاصيل</span><span>الحالة</span></div>{activities.map((a,i)=><div className="activity-row" key={a.title}><span className="activity-title"><i className={'activity-icon activity-'+a.type}>{a.type==='sale'?<ShoppingCart size={16}/>:a.type==='stock'?<Package size={16}/>:<Truck size={16}/>}</i><span><b>{a.title}</b><small>{a.desc}</small></span></span><span className="activity-time"><Clock3 size={13}/>{a.time}</span><span className="activity-amount">{a.amount}</span><span><i className="completed-dot"/> مكتمل</span></div>)}</div></article>
          <footer className="dashboard-footer"><span>© 2026 VELTRO BUSINESS SUITE</span><span><ShieldCheck size={13}/> واجهة عرض تصميمية · الأرقام المعروضة تجريبية</span><span>مصمم للأعمال. مبني للسرعة.</span></footer>
        </div>
      </section>
      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><section className="design-modal" role="dialog" aria-modal="true" aria-label={modal.title}><button className="modal-close" onClick={()=>setModal(null)} aria-label="إغلاق"><X size={18}/></button><span className="modal-symbol"><Sparkles size={22}/></span><h2>{modal.title}</h2><p>{modal.desc}</p><button className="primary-action" onClick={()=>setModal(null)}>حسنًا</button></section></div>}
    </main>
  );
}
