import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, Calendar, Timer, MessageSquare, PieChart, LogOut, Settings, Globe, BookOpen, Zap } from 'lucide-react';

const dict = {
  en: { Overview: "Overview", "Study Planner": "Study Planner", "Focus Timer": "Focus Timer", "AI Tutor": "AI Tutor", "Analytics": "Analytics", "Settings": "Settings" },
  es: { Overview: "Resumen", "Study Planner": "Planificador", "Focus Timer": "Temporizador", "AI Tutor": "Tutor IA", "Analytics": "Analítica", "Settings": "Configuración" },
  hi: { Overview: "सिंहावलोकन", "Study Planner": "स्टडी प्लानर", "Focus Timer": "फ़ोकस टाइमर", "AI Tutor": "एआई ट्यूटर", "Analytics": "एनालिटिक्स", "Settings": "सेटिंग्स" },
  mr: { Overview: "आढावा", "Study Planner": "अभ्यास नियोजक", "Focus Timer": "फोकस टाइमर", "AI Tutor": "एआय ट्यूटर", "Analytics": "विश्लेषण", "Settings": "सेटिंग्ज" }
};

const LanguageContext = createContext(null);
export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');
  const t = (key) => dict[lang]?.[key] || key;
  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
};
export const useLanguage = () => useContext(LanguageContext);

import Dashboard from './pages/Dashboard';
import FocusMode from './pages/FocusMode';
import Planner from './pages/Planner';
import AIChat from './pages/AIChat';
import NotesGenerator from './pages/NotesGenerator';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import SettingsPage from './pages/Settings';
import Classroom from './pages/Classroom';
import Flashcards from './pages/Flashcards';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL (from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      localStorage.setItem('token', urlToken);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        localStorage.setItem('token', token);
        try {
          const res = await fetch('http://localhost:5000/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
          } else {
            // Token might be invalid
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          console.error("Failed to fetch user:", err);
        }
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, setToken, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// All pages imported.

const Sidebar = () => {
  const location = useLocation();
  const { user, setUser, setToken } = useAuth();
  const { t, lang, setLang } = useLanguage();
  
  const handleLogout = () => {
    setUser(null);
    setToken(null);
  };

  const links = [
    { to: '/', label: t('Overview'), icon: <Home size={20} /> },
    { to: '/planner', label: t('Study Planner'), icon: <Calendar size={20} /> },
    { to: '/focus', label: t('Focus Timer'), icon: <Timer size={20} /> },
    { to: '/chat', label: t('AI Tutor'), icon: <MessageSquare size={20} /> },
    { to: '/classroom', label: 'Classroom', icon: <BookOpen size={20} /> },
    { to: '/notes', label: 'Notes Generator', icon: <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'></path><polyline points='14 2 14 8 20 8'></polyline><line x1='16' y1='13' x2='8' y2='13'></line><line x1='16' y1='17' x2='8' y2='17'></line><polyline points='10 9 9 9 8 9'></polyline></svg>" alt="" style={{filter: 'invert(1)'}}/> },
    { to: '/flashcards', label: 'Flashcards', icon: <Zap size={20} /> },
    { to: '/analytics', label: t('Analytics'), icon: <PieChart size={20} /> }
  ];

  return (
    <div style={{
      width: '260px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      background: 'rgba(11, 15, 25, 0.8)',
      backdropFilter: 'blur(10px)',
      borderRight: '1px solid var(--glass-border)',
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ padding: '0 24px', marginBottom: '32px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
          <span style={{ fontSize: '24px' }}>✨</span> StudyAI
        </h2>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 12px' }}>
        {links.map(link => {
          const isActive = location.pathname === link.to;
          return (
            <Link 
              key={link.to} 
              to={link.to} 
              className={`nav-link ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <span style={{ color: isActive ? 'var(--primary)' : 'inherit' }}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '24px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/settings" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, padding: '8px 12px', background: 'none' }}>
            <Settings size={20} /> {t('Settings')}
          </Link>
          <button onClick={() => {
            const languages = ['en', 'es', 'hi', 'mr'];
            const currentIndex = languages.indexOf(lang);
            setLang(languages[(currentIndex + 1) % languages.length]);
          }} className="nav-link" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-active)' }}>
            <Globe size={16} /> {lang.toUpperCase()}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
              {user?.profilePic ? <img src={user.profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.name?.charAt(0) || 'U')}
            </div>
            <div style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{user?.name || "User"}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Lvl {user?.level || 1}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            title="Log Out"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '6px' }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const AuthLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

const AppRoutes = () => {
  const { token } = useAuth();
  
  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <AuthLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/focus" element={<FocusMode />} />
          <Route path="/chat" element={<AIChat />} />
          <Route path="/classroom" element={<Classroom />} />
          <Route path="/notes" element={<NotesGenerator />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthLayout>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppRoutes />
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
