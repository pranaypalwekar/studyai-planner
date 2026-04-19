import React, { useState } from 'react';
import { Play, Pause, RefreshCw, Award } from 'lucide-react';

const FocusMode = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // focus, shortBreak
  
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  React.useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      // Play sound and logic to log to backend
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Deep Focus</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '48px' }}>Stay hydrated and eliminate distractions.</p>
      
      <div className="glass-panel" style={{ padding: '64px 32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
          <button 
            onClick={() => { setMode('focus'); setTimeLeft(25 * 60); setIsActive(false); }}
            className={`btn ${mode === 'focus' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Pomodoro (25m)
          </button>
          <button 
            onClick={() => { setMode('shortBreak'); setTimeLeft(5 * 60); setIsActive(false); }}
            className={`btn ${mode === 'shortBreak' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Short Break (5m)
          </button>
        </div>

        <div style={{ fontSize: '120px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '-4px', margin: '32px 0', textShadow: '0 0 40px rgba(99, 102, 241, 0.4)' }}>
          {formatTime(timeLeft)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
          <button onClick={toggleTimer} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)' }}>
            {isActive ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: '4px' }} />}
          </button>
          <button onClick={resetTimer} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid var(--glass-border)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(5px)' }}>
            <RefreshCw size={28} />
          </button>
        </div>
      </div>
      
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '12px 24px', borderRadius: '50px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <Award size={20} />
        <span style={{ fontWeight: '500' }}>Complete this session to earn 250 XP!</span>
      </div>
    </div>
  );
};

export default FocusMode;
