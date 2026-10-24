import React, { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Store } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import './auth.css';

const words = {
  ar: { eyebrow:'VELTRO BUSINESS SUITE', title:'إدارة تجارتك تبدأ من هنا', subtitle:'سجّل الدخول إلى مساحة عملك الآمنة.', login:'تسجيل الدخول', signup:'إنشاء حساب', email:'البريد الإلكتروني', password:'كلمة المرور', confirm:'تأكيد كلمة المرور', forgot:'نسيت كلمة المرور؟', submitLogin:'دخول إلى حسابي', submitSignup:'إنشاء حساب جديد', switchLogin:'لديك حساب؟ سجّل الدخول', switchSignup:'ليس لديك حساب؟ أنشئ حسابًا', loading:'جارٍ المعالجة…', missing:'إعدادات Supabase غير موجودة في نسخة النشر. تحقق من متغيرات GitHub Actions ثم أعد النشر.', mismatch:'كلمتا المرور غير متطابقتين.', short:'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', registered:'تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. أكّد البريد ثم سجّل الدخول.', resetSent:'إذا كان البريد مسجّلًا، فستصلك رسالة لإعادة تعيين كلمة المرور.', reset:'إرسال رابط الاستعادة', resetBack:'العودة لتسجيل الدخول', updateTitle:'إنشاء كلمة مرور جديدة', updateSubtitle:'اختر كلمة مرور جديدة لحماية حسابك.', updateSubmit:'حفظ كلمة المرور الجديدة', updated:'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.', invalidRecovery:'رابط الاستعادة غير صالح أو منتهي الصلاحية. اطلب رابطًا جديدًا من صفحة تسجيل الدخول.', brand:'نظام إدارة الأعمال', secure:'اتصال آمن عبر Supabase', error:'تعذّر إكمال العملية.', google:'المتابعة باستخدام Google', orEmail:'أو باستخدام البريد الإلكتروني' },
  fr: { eyebrow:'VELTRO BUSINESS SUITE', title:'Votre commerce commence ici', subtitle:'Connectez-vous à votre espace de travail sécurisé.', login:'Connexion', signup:'Créer un compte', email:'Adresse e-mail', password:'Mot de passe', confirm:'Confirmer le mot de passe', forgot:'Mot de passe oublié ?', submitLogin:'Se connecter', submitSignup:'Créer mon compte', switchLogin:'Déjà un compte ? Se connecter', switchSignup:'Pas de compte ? Créer un compte', loading:'Traitement…', missing:'Configuration Supabase absente du déploiement. Vérifiez les variables GitHub Actions puis redéployez.', mismatch:'Les mots de passe ne correspondent pas.', short:'Le mot de passe doit contenir au moins 6 caractères.', registered:'Un e-mail de confirmation a été envoyé. Confirmez votre adresse puis connectez-vous.', resetSent:'Si cette adresse existe, un lien de réinitialisation sera envoyé.', reset:'Envoyer le lien', resetBack:'Retour à la connexion', updateTitle:'Créer un nouveau mot de passe', updateSubtitle:'Choisissez un nouveau mot de passe pour protéger votre compte.', updateSubmit:'Enregistrer le nouveau mot de passe', updated:'Mot de passe modifié. Vous pouvez maintenant vous connecter avec le nouveau mot de passe.', invalidRecovery:'Lien de réinitialisation invalide ou expiré. Demandez un nouveau lien depuis la page de connexion.', brand:'Gestion commerciale', secure:'Connexion sécurisée via Supabase', error:'Impossible de terminer l’opération.', google:'Continuer avec Google', orEmail:'ou avec votre adresse e-mail' },
  en: { eyebrow:'VELTRO BUSINESS SUITE', title:'Your business starts here', subtitle:'Sign in to your secure workspace.', login:'Sign in', signup:'Create account', email:'Email address', password:'Password', confirm:'Confirm password', forgot:'Forgot password?', submitLogin:'Sign in to workspace', submitSignup:'Create an account', switchLogin:'Already have an account? Sign in', switchSignup:'New to VELTRO? Create an account', loading:'Please wait…', missing:'Supabase settings are missing from this deployment. Check GitHub Actions variables and redeploy.', mismatch:'Passwords do not match.', short:'Password must be at least 6 characters.', registered:'A confirmation email has been sent. Confirm your email, then sign in.', resetSent:'If the email is registered, a password reset link will be sent.', reset:'Send reset link', resetBack:'Back to sign in', updateTitle:'Create a new password', updateSubtitle:'Choose a new password to secure your account.', updateSubmit:'Save new password', updated:'Your password has been changed. You can now sign in with the new password.', invalidRecovery:'This reset link is invalid or expired. Request a new link from the sign-in page.', brand:'Business management suite', secure:'Secure connection powered by Supabase', error:'The operation could not be completed.', google:'Continue with Google', orEmail:'or continue with email' }
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
  const [recoveryMode, setRecoveryMode] = useState(false);
  const t=words[lang], dir=lang==='ar'?'rtl':'ltr';

  useEffect(() => {
    if (!supabase) return undefined;
    let alive=true;
    supabase.auth.getSession().then(({data})=>{ if(alive) setSession(data.session); }).catch(()=>{});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,nextSession)=>{
      setSession(nextSession);
      if(event==='PASSWORD_RECOVERY'){
        setRecoveryMode(true);
        setMode('update');
        setMessage('');
        setError('');
      }
    });
    return ()=>{alive=false;subscription.unsubscribe();};
  }, []);

  async function signInWithGoogle() {
    setError(''); setMessage('');
    if (!isSupabaseConfigured || !supabase) { setError(t.missing); return; }
    setBusy(true);
    try {
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } }
      });
      if (error) throw error;
    } catch(e) {
      setError(e?.message || t.error);
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    if (!isSupabaseConfigured || !supabase) { setError(t.missing); return; }
    if ((mode==='signup' || mode==='update') && password!==confirm) { setError(t.mismatch); return; }
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
      } else if(mode==='reset') {
        const redirectTo=window.location.origin+window.location.pathname+'?reset-password=true';
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo});
        if(error) throw error;
        setMessage(t.resetSent);
      } else if(mode==='update') {
        const {error}=await supabase.auth.updateUser({password});
        if(error) throw error;
        setRecoveryMode(false);
        setMode('login');
        setPassword('');
        setConfirm('');
        setMessage(t.updated);
        // End the recovery session so the user signs in normally with the new password.
        try { await supabase.auth.signOut(); } catch {}
        setSession(null);
        window.history.replaceState({},document.title,window.location.pathname);
      }
    } catch(e) {
      const description=String(e?.message||'');
      if(mode==='update' && /expired|invalid|token|session|code/i.test(description)) setError(t.invalidRecovery);
      else setError(e?.message || t.error);
    } finally { setBusy(false); }
  }

  if(session && !recoveryMode && mode!=='update') return <>{children}</>;

  const heading=mode==='login'?t.login:mode==='signup'?t.signup:mode==='update'?t.updateTitle:t.forgot;
  const submitLabel=mode==='login'?t.submitLogin:mode==='signup'?t.submitSignup:mode==='update'?t.updateSubmit:t.reset;
  return <main className="veltro-auth" dir={dir} lang={lang}>
    <div className="auth-glow auth-glow-a"/><div className="auth-glow auth-glow-b"/>
    <header className="auth-top"><div className="auth-brand"><span className="auth-logo">V</span><span><b>VELTRO</b><small>BUSINESS SUITE</small></span></div><label className="auth-language"><span>◎</span><select value={lang} onChange={e=>{setLang(e.target.value);setError('');setMessage('');}} aria-label="Language"><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select></label></header>
    <section className="auth-content"><div className="auth-intro"><div className="auth-kicker"><span/> {t.eyebrow}</div><h1>{t.title}</h1><p>{t.subtitle}</p><div className="auth-feature"><span><Store size={19}/></span><div><b>{t.brand}</b><small>{t.secure}</small></div><ShieldCheck className="auth-shield" size={21}/></div></div>
      <form className="auth-card" onSubmit={submit}><div className="auth-card-heading"><span className="auth-card-icon"><LockKeyhole size={21}/></span><div><h2>{heading}</h2><p>{mode==='update'?t.updateSubtitle:t.eyebrow}</p></div></div>
      {(mode==='login'||mode==='signup'||mode==='reset')&&<label className="auth-field"><span>{t.email}</span><div className="auth-input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="name@example.com" required/></div></label>}
      {(mode==='login'||mode==='signup'||mode==='update')&&<label className="auth-field"><span>{t.password}</span><div className="auth-input-wrap"><LockKeyhole size={17}/><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'} minLength={6} required/><button type="button" className="auth-eye" onClick={()=>setShowPassword(v=>!v)} aria-label="Show password">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
      {(mode==='signup'||mode==='update')&&<label className="auth-field"><span>{t.confirm}</span><div className="auth-input-wrap"><LockKeyhole size={17}/><input type={showPassword?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" minLength={6} required/></div></label>}
      {mode==='login'&&<button type="button" className="auth-forgot" onClick={()=>{setMode('reset');setError('');setMessage('');}}>{t.forgot}</button>}
      {error&&<div className="auth-alert auth-error" role="alert">{error}</div>}{message&&<div className="auth-alert auth-message" role="status">{message}</div>}
      <button className="auth-submit" type="submit" disabled={busy}>{busy?<LoaderCircle className="auth-spin" size={18}/>:<>{submitLabel}<ArrowRight size={17}/></>}{busy&&t.loading}</button>
      {mode!=='update'&&<button type="button" className="auth-switch" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');setMessage('');}}>{mode==='login'?t.switchSignup:mode==='signup'?t.switchLogin:t.resetBack}</button>}
      {(mode==='login'||mode==='signup')&&<><div className="auth-divider"><span>{t.orEmail}</span></div><button type="button" className="auth-google" onClick={signInWithGoogle} disabled={busy}><svg aria-hidden="true" viewBox="0 0 48 48" width="19" height="19"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.01 46.98 31.8 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.62 14.62 48 24 48Z"/></svg><span>{t.google}</span></button></>}
      </form></section><footer className="auth-footer"><span>© 2026 VELTRO BUSINESS SUITE</span><span><ShieldCheck size={14}/> {t.secure}</span></footer>
  </main>;
}
