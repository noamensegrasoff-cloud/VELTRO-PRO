import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Compass, MapPin, Phone, Store, UserRound, Sparkles, Building2, Globe2, BriefcaseBusiness } from 'lucide-react';
import './onboarding.css';

const copy = {
  ar: {
    step:'خطوة واحدة لتبدأ', welcome:'أهلًا بك في VELTRO', headline:'لنبنِ مساحة عمل تشبه تجارتك.', intro:'عرّفنا بنشاطك ومحلّك لنهيّئ لك تجربة مناسبة من البداية. يمكنك تعديل هذه المعلومات لاحقًا.',
    choose:'ما نوع نشاطك التجاري؟', chooseHint:'اختر الأقرب إلى نشاطك', other:'نشاط آخر', otherPlaceholder:'اكتب نوع النشاط',
    storeName:'اسم المحل أو المؤسسة', storePlaceholder:'مثال: سوبرماركت الرحمة', owner:'اسم المسؤول', ownerPlaceholder:'الاسم الكامل',
    phone:'رقم الهاتف', phonePlaceholder:'05 xx xx xx xx', email:'البريد الإلكتروني المهني', address:'العنوان', addressPlaceholder:'الشارع، الحي', city:'المدينة / الولاية', cityPlaceholder:'مثال: الجزائر العاصمة',
    currency:'العملة', currencyDA:'الدينار الجزائري (DA)', optional:'اختياري', required:'يرجى اختيار النشاط وكتابة اسم المحل على الأقل.',
    continue:'إنشاء مساحة العمل', saving:'جارٍ حفظ المعلومات…', note:'تبقى معلومات نشاطك خاصة بحسابك ويمكن تعديلها لاحقًا.', logout:'تسجيل الخروج',
    activities:[['supermarket','سوبرماركت','متجر مواد غذائية واسع'],['grocery','متجر بقالة','بقالة ومواد استهلاكية'],['bookstore','مكتبة','كتب، أدوات مدرسية ومكتبية'],['clothing','ملابس وأحذية','أزياء وإكسسوارات'],['electronics','إلكترونيات','هواتف وأجهزة وملحقاتها'],['pharmacy','صيدلية','منتجات صيدلانية'],['cosmetics','مواد تجميل','عناية شخصية وعطور'],['hardware','مواد بناء وأدوات','معدات ولوازم'],['restaurant','مطعم ومقهى','مأكولات ومشروبات'],['other','نشاط آخر','أخبرنا بنوع نشاطك']],
    errors:'تعذّر حفظ معلومات المحل سحابيًا. تحقق من الاتصال ثم أعد المحاولة.'
  },
  fr: {
    step:'Une étape pour commencer', welcome:'Bienvenue sur VELTRO', headline:'Créons un espace adapté à votre commerce.', intro:'Présentez votre activité et votre établissement pour personnaliser votre expérience. Vous pourrez modifier ces informations plus tard.',
    choose:'Quel est votre secteur d’activité ?', chooseHint:'Choisissez le plus proche', other:'Autre activité', otherPlaceholder:'Saisissez votre activité',
    storeName:'Nom du magasin ou de l’entreprise', storePlaceholder:'Ex. : Superette Errahma', owner:'Nom du responsable', ownerPlaceholder:'Nom complet',
    phone:'Téléphone', phonePlaceholder:'Numéro de téléphone', email:'E-mail professionnel', address:'Adresse', addressPlaceholder:'Rue, quartier', city:'Ville / Wilaya', cityPlaceholder:'Ex. : Alger',
    currency:'Devise', currencyDA:'Dinar algérien (DA)', optional:'Facultatif', required:'Choisissez une activité et indiquez le nom du magasin.',
    continue:'Créer mon espace de travail', saving:'Enregistrement…', note:'Ces informations restent liées à votre compte et pourront être modifiées.', logout:'Déconnexion',
    activities:[['supermarket','Supermarché','Commerce alimentaire général'],['grocery','Épicerie','Alimentation de proximité'],['bookstore','Librairie','Livres et fournitures'],['clothing','Vêtements et chaussures','Mode et accessoires'],['electronics','Électronique','Téléphones et appareils'],['pharmacy','Pharmacie','Produits pharmaceutiques'],['cosmetics','Cosmétiques','Beauté et parfums'],['hardware','Bricolage et matériaux','Équipement et fournitures'],['restaurant','Restaurant et café','Restauration et boissons'],['other','Autre activité','Précisez votre activité']],
    errors:'Impossible d’enregistrer les informations dans le cloud. Vérifiez la connexion et réessayez.'
  },
  en: {
    step:'One step to get started', welcome:'Welcome to VELTRO', headline:'Let’s shape a workspace for your business.', intro:'Tell us about your activity and store so we can tailor your experience. You can edit these details later.',
    choose:'What kind of business do you run?', chooseHint:'Choose the closest match', other:'Other activity', otherPlaceholder:'Enter your business type',
    storeName:'Store or business name', storePlaceholder:'e.g. Errahma Supermarket', owner:'Owner or manager', ownerPlaceholder:'Full name',
    phone:'Phone number', phonePlaceholder:'Phone number', email:'Business email', address:'Address', addressPlaceholder:'Street, district', city:'City / region', cityPlaceholder:'e.g. Algiers',
    currency:'Currency', currencyDA:'Algerian dinar (DA)', optional:'Optional', required:'Choose an activity and enter your store name.',
    continue:'Create my workspace', saving:'Saving details…', note:'Your business details stay with your account and can be edited later.', logout:'Sign out',
    activities:[['supermarket','Supermarket','Full grocery and food retail'],['grocery','Grocery store','Local food and essentials'],['bookstore','Bookshop / stationery','Books and office supplies'],['clothing','Clothing and footwear','Fashion and accessories'],['electronics','Electronics','Phones and devices'],['pharmacy','Pharmacy','Pharmaceutical products'],['cosmetics','Beauty and cosmetics','Personal care and fragrance'],['hardware','Hardware and building supplies','Tools and materials'],['restaurant','Restaurant or café','Food and drinks'],['other','Other activity','Tell us about your business']],
    errors:'Could not save your business details to the cloud. Check your connection and try again.'
  }
};

const icons = [Store, BriefcaseBusiness, Compass, Building2, Sparkles, Store, Sparkles, Building2, Store, Globe2];

export default function BusinessOnboarding({ lang='ar', initialProfile={}, onComplete, onLogout, saving=false, saveError='' }) {
  const t = copy[lang] || copy.ar;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [activity, setActivity] = useState(initialProfile.activity || '');
  const [customActivity, setCustomActivity] = useState(initialProfile.customActivity || '');
  const [form, setForm] = useState({
    storeName: initialProfile.storeName || '', owner: initialProfile.owner || '',
    phone: initialProfile.phone || '', email: initialProfile.email || '',
    address: initialProfile.address || '', city: initialProfile.city || '',
    currency: initialProfile.currency || 'DZD'
  });
  const [error, setError] = useState('');
  const selected = useMemo(() => t.activities.find(item => item[0] === activity), [t, activity]);
  const update = (key, value) => setForm(current => ({...current, [key]:value}));
  function submit(event) {
    event.preventDefault();
    if (!activity || !form.storeName.trim() || (activity === 'other' && !customActivity.trim())) {
      setError(t.required);
      return;
    }
    setError('');
    onComplete({...form, storeName:form.storeName.trim(), owner:form.owner.trim(), activity, activityLabel: activity === 'other' ? customActivity.trim() : selected?.[1], customActivity:customActivity.trim(), currency:'DZD', completedAt:new Date().toISOString()});
  }
  return <main className="onboard-root" dir={dir} lang={lang}>
    <div className="onboard-orb onboard-orb-a"/><div className="onboard-orb onboard-orb-b"/>
    <header className="onboard-header">
      <div className="onboard-brand"><span className="onboard-mark">V</span><span><b>VELTRO</b><small>BUSINESS SUITE</small></span></div>
      <div className="onboard-header-right"><span className="onboard-step"><i/> {t.step}</span><button className="onboard-logout" onClick={onLogout}>{t.logout}</button></div>
    </header>
    <div className="onboard-layout">
      <section className="onboard-intro">
        <div className="onboard-eyebrow"><Sparkles size={14}/><span>VELTRO · BUSINESS SETUP</span></div>
        <h1>{t.welcome}<br/><em>{t.headline}</em></h1>
        <p>{t.intro}</p>
        <div className="onboard-visual">
          <div className="onboard-visual-grid"/>
          <div className="onboard-orbit orbit-one"/><div className="onboard-orbit orbit-two"/>
          <div className="onboard-visual-card"><span className="visual-card-icon"><Store size={21}/></span><div><b>{form.storeName || (lang==='ar'?'متجرك يبدأ هنا':'Your store starts here')}</b><small>{selected?.[1] || (lang==='ar'?'نشاطك التجاري':'Your business activity')}</small></div><span className="visual-check"><Check size={15}/></span></div>
          <div className="onboard-float float-a"><Building2 size={17}/><span>{lang==='ar'?'مساحة عمل منظمة':lang==='fr'?'Espace structuré':'Organized workspace'}</span></div>
          <div className="onboard-float float-b"><span className="float-dot"/><span>{lang==='ar'?'جاهز للانطلاق':lang==='fr'?'Prêt à démarrer':'Ready to begin'}</span></div>
        </div>
        <div className="onboard-trust"><span><Check size={14}/></span><p>{t.note}</p></div>
      </section>
      <section className="onboard-form-panel">
        <form onSubmit={submit}>
          <div className="onboard-form-heading"><div><span>{t.step}</span><h2>{t.choose}</h2><p>{t.chooseHint}</p></div><span className="onboard-form-icon"><Store size={20}/></span></div>
          <div className="activity-grid">{t.activities.map((item,index)=>{const Icon=icons[index]||Store;return <button type="button" key={item[0]} className={'activity-option '+(activity===item[0]?'selected':'')} onClick={()=>{setActivity(item[0]);setError('');}}><span className="activity-icon"><Icon size={18}/></span><span className="activity-copy"><b>{item[1]}</b><small>{item[2]}</small></span><span className="activity-radio">{activity===item[0]&&<i/>}</span></button>;})}</div>
          {activity==='other'&&<label className="onboard-field full"><span>{t.other}</span><input value={customActivity} onChange={e=>setCustomActivity(e.target.value)} placeholder={t.otherPlaceholder} required/></label>}
          <div className="onboard-section-title"><span className="section-line"/><b>{lang==='ar'?'معلومات المحل':lang==='fr'?'Informations du magasin':'Store information'}</b><span className="section-line"/></div>
          <div className="onboard-fields">
            <label className="onboard-field full"><span>{t.storeName} <i>*</i></span><input value={form.storeName} onChange={e=>update('storeName',e.target.value)} placeholder={t.storePlaceholder} autoComplete="organization" required/></label>
            <label className="onboard-field"><span>{t.owner} <small>· {t.optional}</small></span><div className="onboard-input-icon"><UserRound size={16}/><input value={form.owner} onChange={e=>update('owner',e.target.value)} placeholder={t.ownerPlaceholder} autoComplete="name"/></div></label>
            <label className="onboard-field"><span>{t.phone} <small>· {t.optional}</small></span><div className="onboard-input-icon"><Phone size={16}/><input type="tel" value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder={t.phonePlaceholder} autoComplete="tel"/></div></label>
            <label className="onboard-field full"><span>{t.email} <small>· {t.optional}</small></span><div className="onboard-input-icon"><Globe2 size={16}/><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="contact@business.com" autoComplete="email"/></div></label>
            <label className="onboard-field"><span>{t.address} <small>· {t.optional}</small></span><div className="onboard-input-icon"><MapPin size={16}/><input value={form.address} onChange={e=>update('address',e.target.value)} placeholder={t.addressPlaceholder} autoComplete="street-address"/></div></label>
            <label className="onboard-field"><span>{t.city} <small>· {t.optional}</small></span><input value={form.city} onChange={e=>update('city',e.target.value)} placeholder={t.cityPlaceholder} autoComplete="address-level2"/></label>
          </div>
          {(error||saveError)&&<div className="onboard-error" role="alert">{error||saveError}</div>}
          <button className="onboard-submit" type="submit" disabled={saving}><span>{saving?t.saving:t.continue}</span><span className="submit-arrow">{saving?<span className="onboard-spinner"/>:dir==='rtl'?<ArrowLeft size={18}/>:<ArrowRight size={18}/>}</span></button>
          <p className="onboard-form-foot"><Check size={13}/>{t.note}</p>
        </form>
      </section>
    </div>
    <footer className="onboard-footer"><span>© 2026 VELTRO BUSINESS SUITE</span><span><i/> {lang==='ar'?'إعداد آمن لمساحة العمل':lang==='fr'?'Configuration sécurisée':'Secure workspace setup'}</span></footer>
  </main>;
}
