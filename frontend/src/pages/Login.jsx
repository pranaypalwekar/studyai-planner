import React, { useState } from 'react';
import { useAuth } from '../App';
import { LogIn } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const { setToken, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/google');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(`${data.error}: ${data.message}`);
      } else {
        setError('Could not initialize Google login. Check backend configuration.');
      }
    } catch (err) {
      setError('Connection error to auth server at http://localhost:5000');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // In actual implementation, we would POST to /api/auth/login or /register
    // Defaulting to mock demo for email/password if backend not reachable
    try {
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin ? { email, password } : { email, password, name };
        
        const res = await fetch(`http://localhost:5000${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            setToken(data.access_token);
            setUser({ 
                name: data.user.name || (isLogin ? "Demo User" : "New Scholar"), 
                xp: data.user.xp || 1200, 
                level: data.user.level || 2,
                ...data.user
            });
        } else {
            setError(data.error || 'Authentication failed');
        }
    } catch (err) {
        // Fallback for demo
        setToken('dummy-jwt-token-12345');
        setUser({ name: name || (isLogin ? "Demo User" : "New Scholar"), xp: 1200, level: 2 });
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '8px' }}>
            <span style={{ fontSize: '32px' }}>✨</span> StudyAI
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>{isLogin ? 'Welcome back! Log in to continue.' : 'Create an account to start tracking.'}</p>
        </div>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', fontSize: '14px' }}>{error}</div>}

        <button 
          onClick={handleGoogleLogin} 
          className="btn" 
          style={{ 
            width: '100%', 
            background: '#fff', 
            color: '#757575', 
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px',
            fontWeight: '600'
          }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" style={{ width: '18px' }} />
          Sign in with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
            <span style={{ padding: '0 12px' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {!isLogin && (
            <div>
              <label className="input-label">Full Name</label>
              <input 
                type="text" 
                className="input-base" 
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin} 
              />
            </div>
          )}
          <div>
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              className="input-base" 
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-base" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', width: '100%' }}>
            <LogIn size={18} /> {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '500' }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
