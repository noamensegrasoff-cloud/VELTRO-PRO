import React, { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Store } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import './auth.css';

const words = {
  ar: { eyebrow:'VELTRO BUSINESS SUITE', title:'إدارة تجارتك تبدأ من هنا', subtitle:'سجّل الدخول إلى مساحة عملك الآمنة.', login:'تسجيل الدخول', signup:'إنشاء حساب', email:'البريد الإلكتروني', password:'كلمة المرور', confirm:'تأكيد كلمة المرور', forgot:'نسيت كلمة المرور؟', submitLogin:'دخول إلى حسابي', submitSignup:'إنشاء حساب جديد', switchLogin:'لديك حساب؟ سجّل الدخول', switchSignup:'ليس لديك حساب؟ أنشئ حسابًا', loading:'جارٍ المعالجة…', missing:'إعدادات Supabase غير موجودة في نسخة النشر. تحقق من متغيرات GitHub Actions ثم أعد النشر.', mismatch:'كلمتا المرور غير متطابقتين.', short:'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', registered:'تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. أكّد البريد ثم سجّل الدخول.', resetSent:'إذا كان البريد مسجّلًا، فستصلك رسالة لإعادة تعيين كلمة المرور.', reset:'إرسال رابط الاستعادة', resetBack:'العودة لتسجيل الدخول', brand:'نظام إدارة الأعمال', secure:'اتصال آمن عبر Supabase', error:'تعذّر إكمال العملية.' },
  fr: { eyebrow:'VELTRO BUSINESS SUITE', title:'Votre commerce commence ici', subtitle:'Connectez-vous à votre espace de travail sécurisé.', login:'Connexion', signup:'Créer un compte', email:'Adresse e-mail', password:'Mot de passe', confirm:'Confirmer le mot de passe', forgot:'Mot de passe oublié ?', submitLogin:'Se connecter', submitSignup:'Créer mon compte', switchLogin:'Déjà un compte ? Se connecter', switchSignup:'Pas de compte ? Créer un compte', loading:'Traitement…', missing:'Configuration Supabase absente du déploiement. Vérifiez les variables GitHub Actions puis redéployez.', mismatch:'Les mots de passe ne correspondent pas.', short:'Le mot de passe doit contenir au moins 6 caractères.', registered:'Un e-mail de confirmation a été envoyé. Confirmez votre adresse puis connectez-vous.', resetSent:'Si cette adresse existe, un lien de réinitialisation sera envoyé.', reset:'Envoyer le lien', resetBack:'Retour à la connexion', brand:'Gestion commerciale', secure:'Connexion sécurisée via Supabase', error:'Impossible de terminer l’opération.' },
  en: { eyebrow:'VELTRO BUSINESS SUITE', title:'Your business starts here', subtitle:'Sign in to your secure workspace.', login:'Sign in', signup:'Create account', email:'Email address', password:'Password', confirm:'Confirm password', forgot:'Forgot password?', submitLogin:'Sign in to workspace', submitSignup:'Create account', switchLogin:'Already have an account? Sign in', switchSignup:'New to VELTRO? Create an account', loading:'Please wait…', missing:'Supabase settings are missing from this deployment. Check GitHub Actions variables and redeploy.', mismatch:'Passwords do not match.', short:'Password must be at least 6 characters.', registered:'A confirmation email has been sent. Confirm your email, then sign in.', resetSent:'If the email is registered, a password reset link will be sent.', reset:'Send reset link', resetBack:'Back to sign in', brand:'Business management suite', secure:'Secure connection powered by Supabase', error:'The operation could not be completed.' }
};

export default function AuthGate({ children }) {
  const [lang, setLang] = useState(() => { try { const v=localStorage.getItem('veltro.language'); return ['ar','fr','en'].includes(v)?v:'ar'; } catch { return 'ar'; } });
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const t=words[lang], dir=lang==='ar'?'rtl':'ltr';

  useEffect(() => {
    if (!supabase) return undefined;
    let alive=true;
    supabase.auth.getSession().then(({data})=>{ if(alive) setSession(data.session); });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,nextSession)=>setSession(nextSession));
    return ()=>{alive=false;subscription.unsubscribe();};
  }, []);

  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    if (!isSupabaseConfigured || !supabase) { setError(t.missing); return; }
    if (mode==='signup' && password!==confirm) { setError(t.mismatch); return; }
    if (mode!=='reset' && password.length<6) { setError(t.short); return; }
    setBusy(true);
    try {
      if(mode==='login') {
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(error) throw error;
      } else if(mode==='signup') {
        const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin+window.location.pathname}});
        if(error) throw error;
        if(data.session) setSession(data.session);
        else setMessage(t.registered);
      } else {
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+window.location.pathname});
        if(error) throw error;
        setMessage(t.resetSent);
      }
    } catch(e) { setError(e?.message || t.error); }
    finally { setBusy(false); }
  }

  if(session) return <>{children}</>;

  return <main className="veltro-auth" dir={dir} lang={lang}>
    <div className="auth-glow auth-glow-a"/><div className="auth-glow auth-glow-b"/>
    <header className="auth-top"><div className="auth-brand"><span className="auth-logo">V</span><span><b>VELTRO</b><small>BUSINESS SUITE</small></span></div><label className="auth-language"><span>◎</span><select value={lang} onChange={e=>{setLang(e.target.value);setError('');setMessage('');}} aria-label="Language"><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select></label></header>
    <section className="auth-content"><div className="auth-intro"><div className="auth-kicker"><span/> {t.eyebrow}</div><h1>{t.title}</h1><p>{t.subtitle}</p><div className="auth-feature"><span><Store size={19}/></span><div><b>{t.brand}</b><small>{t.secure}</small></div><ShieldCheck className="auth-shield" size={21}/></div></div>
      <form className="auth-card" onSubmit={submit}><div className="auth-card-heading"><span className="auth-card-icon"><LockKeyhole size={21}/></span><div><h2>{mode==='login'?t.login:mode==='signup'?t.signup:t.forgot}</h2><p>{t.eyebrow}</p></div></div>
      <label className="auth-field"><span>{t.email}</span><div className="auth-input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="name@example.com" required/></div></label>
      {mode!=='reset'&&<label className="auth-field"><span>{t.password}</span><div className="auth-input-wrap"><LockKeyhole size={17}/><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'} minLength={6} required/><button type="button" className="auth-eye" onClick={()=>setShowPassword(v=>!v)} aria-label="Show password">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
      {mode==='signup'&&<label className="auth-field"><span>{t.confirm}</span><div className="auth-input-wrap"><LockKeyhole size={17}/><input type={showPassword?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" minLength={6} required/></div></label>}
      {mode==='login'&&<button type="button" className="auth-forgot" onClick={()=>{setMode('reset');setError('');setMessage('');}}>{t.forgot}</button>}
      {error&&<div className="auth-alert auth-error" role="alert">{error}</div>}{message&&<div className="auth-alert auth-message" role="status">{message}</div>}
      <button className="auth-submit" type="submit" disabled={busy}>{busy?<LoaderCircle className="auth-spin" size={18}/>:<>{mode==='login'?t.submitLogin:mode==='signup'?t.submitSignup:t.reset}<ArrowRight size={17}/></>}{busy&&t.loading}</button>
      <button type="button" className="auth-switch" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');setMessage('');}}>{mode==='login'?t.switchSignup:mode==='signup'?t.switchLogin:t.resetBack}</button>
      </form></section><footer className="auth-footer"><span>© 2026 VELTRO BUSINESS SUITE</span><span><ShieldCheck size={14}/> {t.secure}</span></footer>
  </main>;
}
