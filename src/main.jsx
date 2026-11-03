import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AuthGate from './AuthGate.jsx';
import './styles.css';
import './button-system.css';
import './product-editor-layout.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    try {
      localStorage.setItem('veltro.last-ui-error', JSON.stringify({
        message: String(error?.message || error),
        componentStack: String(info?.componentStack || ''),
        timestamp: new Date().toISOString()
      }));
    } catch {}
  }

  render() {
    if (this.state.failed) {
      const lang = (() => {
        try { return localStorage.getItem('veltro.language') || 'ar'; }
        catch { return 'ar'; }
      })();
      const ar = lang === 'ar';
      const fr = lang === 'fr';
      return <main dir={ar ? 'rtl' : 'ltr'} style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center',
        padding: 24, boxSizing: 'border-box',
        background: 'linear-gradient(145deg,#edf4fa,#f8fbff)',
        color: '#18304a', fontFamily: 'system-ui,sans-serif'
      }}>
        <section style={{
          width: 'min(100%,460px)', padding: 28, borderRadius: 24,
          background: 'rgba(255,255,255,.92)', border: '1px solid #dce7f0',
          boxShadow: '0 18px 60px rgba(30,65,95,.12)', textAlign: 'center'
        }}>
          <div style={{fontSize:36,fontWeight:800,color:'#168f91'}}>V</div>
          <h1 style={{fontSize:22,margin:'12px 0'}}>
            {ar ? 'حدث خطأ في عرض الصفحة' : fr ? "Une erreur d’affichage est survenue" : 'The page encountered an error'}
          </h1>
          <p style={{lineHeight:1.8,color:'#61758a'}}>
            {ar ? 'تم إيقاف الجزء المتعطل بدلاً من ترك شاشة بيضاء. أعد تحميل التطبيق للمتابعة.' : fr ? "La partie défaillante a été isolée. Rechargez l’application pour continuer." : 'The failing view was isolated instead of leaving a blank screen. Reload the app to continue.'}
          </p>
          <button type="button" onClick={() => window.location.reload()} style={{
            marginTop:12, border:0, borderRadius:14, padding:'12px 24px',
            background:'#167f88', color:'#fff', fontSize:15, fontWeight:700,
            cursor:'pointer'
          }}>
            {ar ? 'إعادة تحميل التطبيق' : fr ? 'Recharger' : 'Reload app'}
          </button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AuthGate><App /></AuthGate>
    </AppErrorBoundary>
  </React.StrictMode>
);
