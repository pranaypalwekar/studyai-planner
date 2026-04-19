import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { DownloadCloud, CheckCircle, RefreshCw, BookOpen } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

const SettingsPage = () => {
  const { user, setUser, token } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [profilePic, setProfilePic] = useState(user?.picture || user?.profilePic || null);
  const fileInputRef = React.useRef(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedData, setSyncedData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleConnect = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/google');
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError('Failed to start Google login');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/classroom/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSyncedData(data.synced);
      } else {
        setError(data.detail || 'Sync failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, picture: profilePic })
      });
      if (res.ok) {
        setUser({ ...user, name, picture: profilePic, profilePic });
        alert('Profile saved successfully!');
      } else {
        alert('Failed to save profile');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving profile');
    }
  };

  const handlePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Profile Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your personal information and preferences.</p>
      </header>

      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Public Profile</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '32px', overflow: 'hidden' }}>
              {profilePic ? <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name?.charAt(0) || 'U')}
            </div>
            <div>
              <button onClick={() => fileInputRef.current.click()} className="btn btn-secondary">Upload Picture</button>
              <input type="file" ref={fileInputRef} onChange={handlePicUpload} accept="image/*" style={{ display: 'none' }} />
            </div>
          </div>
          <div>
            <label className="input-label">Full Name</label>
            <input type="text" className="input-base" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="input-label">Email Address</label>
            <input type="email" className="input-base" defaultValue="you@example.com" disabled style={{ opacity: 0.6 }} />
          </div>
          <button onClick={handleSave} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Save Changes</button>
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
           Integrations
        </h2>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
           <div>
             <div style={{ fontWeight: '500', marginBottom: '4px' }}>Google Classroom</div>
             <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sync your active courses, assignments, and notes to your AI Tutor automatically.</p>
           </div>
           
           {!user?.google_connected ? (
             <button onClick={handleConnect} className="btn btn-primary">Connect Account</button>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: '500', fontSize: '14px' }}>
                 <CheckCircle size={16} /> Connected to Google
               </div>
               <button onClick={handleSync} disabled={isSyncing} className="btn btn-secondary">
                 {isSyncing ? <><RefreshCw size={16} className="lucide-spin" /> Syncing API...</> : <><DownloadCloud size={16} /> Sync Materials</>}
               </button>
             </div>
           )}
        </div>

        {syncedData && (
          <div className="animate-fade-in" style={{ marginTop: '16px', padding: '16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--success)', marginBottom: '8px' }}>Successfully Synchronized!</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-active)' }}>
              Found {syncedData.courses} courses, {syncedData.assignments} assignments, and downloaded {syncedData.materials} teacher attachments into your AI Tutor's repository context.
            </p>
          </div>
        )}
      </div>
      
      <div className="glass-panel text-center">
        <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--danger)' }}>Danger Zone</h2>
        <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Delete Account</button>
      </div>
    </div>
  );
};

export default SettingsPage;
