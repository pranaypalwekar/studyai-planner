import React from 'react';
import { TrendingUp, BarChart2, Activity } from 'lucide-react';

const Analytics = () => {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Performance Analytics</h1>
        <p style={{ color: 'var(--text-muted)' }}>Visualize your progress and AI-predicted outcomes.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel text-center">
          <Activity size={24} className="text-secondary" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Predicted Pass Rate</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)', marginTop: '8px' }}>82%</div>
        </div>
        
        <div className="glass-panel text-center">
          <TrendingUp size={24} className="text-primary" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Average Focus Score</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px' }}>91 / 100</div>
        </div>

        <div className="glass-panel text-center">
          <BarChart2 size={24} className="text-yellow-400" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Weekly Study Hours</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px' }}>14.5 hr</div>
        </div>
      </div>

      <div className="glass-panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', padding: '32px' }}>
        <h2 style={{ fontSize: '20px', alignSelf: 'flex-start', marginBottom: '8px' }}>Continuous Trajectory Evaluator</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', alignSelf: 'flex-start', marginBottom: '48px' }}>Active Scikit-Learn algorithm interpolating current stamina (hours) against real-time probability curve.</p>
        
        <div style={{ position: 'relative', width: '100%', maxWidth: '700px', height: '250px', alignSelf: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
           <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
             {/* Grid */}
             <path d="M0,25 L100,25 M0,50 L100,50 M0,75 L100,75 M25,0 L25,100 M50,0 L50,100 M75,0 L75,100" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" fill="none" />
             
             {/* Trajectory Curve mapping from low hours (low score) to high hours (plateau) */}
             <path d="M0,90 Q40,50 60,30 T100,10" stroke="var(--primary)" strokeWidth="2.5" fill="none" />
             <path d="M0,90 Q40,50 60,30 T100,10 L100,100 L0,100 Z" fill="url(#grad)" opacity="0.2" />
             
             <defs>
               <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
                 <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
               </linearGradient>
             </defs>
             
             {/* Dynamic Coordinate Target representing the user's current exact state */}
             <circle cx="65" cy="27" r="2.5" fill="var(--danger)">
                <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
             </circle>
           </svg>
           
           <div style={{ position: 'absolute', top: '-15px', left: '-40px', fontSize: '11px', color: 'var(--text-muted)' }}>Outcome %</div>
           <div style={{ position: 'absolute', bottom: '-25px', right: '0', fontSize: '11px', color: 'var(--text-muted)' }}>Focus Hours Logged</div>
           
           {/* Animated Tooltip Marker */}
           <div style={{ position: 'absolute', left: '65%', top: '27%', fontSize: '12px', background: 'var(--danger)', color: 'white', padding: '4px 10px', borderRadius: '4px', transform: 'translate(-50%, -150%)', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' }}>
             You are here (82%)
           </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
