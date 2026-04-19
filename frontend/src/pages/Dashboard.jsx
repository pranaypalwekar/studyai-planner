import React from 'react';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import { Award, Flame, BookOpen, Clock, Target, Video, Copy, Bell, CalendarClock } from 'lucide-react';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [meetLink, setMeetLink] = React.useState(null);
  const [isCreatingMeet, setIsCreatingMeet] = React.useState(false);
  const [syncStats, setSyncStats] = React.useState({ assignments: 0, notes: 0, courses: 0 });
  const [upcomingAssignments, setUpcomingAssignments] = React.useState([]);
  const [coachSummary, setCoachSummary] = React.useState("Analyzing your academic performance...");
  
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/classroom/data', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.status === 'success') {
          const assignments = data.assignments || [];
          setSyncStats({
            assignments: assignments.length,
            notes: data.notes?.length || 0,
            courses: data.courses?.length || 0
          });
          
          // Process upcoming assignments
          const now = new Date();
          const filtered = assignments
            .filter(asgn => asgn.due_date && new Date(asgn.due_date) > now)
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .slice(0, 3);
            
          setUpcomingAssignments(filtered);
        }
      } catch (err) { console.error(err); }
    };

    const fetchCoachSummary = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/ai/coach_summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.answer) {
          setCoachSummary(data.answer);
        }
      } catch (err) { console.error(err); }
    };

    if (token) {
      fetchStats();
      fetchCoachSummary();
    }
  }, [token]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgency = (dateString) => {
    const diff = new Date(dateString) - new Date();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 2) return { label: 'URGENT', color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.2)' };
    if (days < 5) return { label: 'UPCOMING', color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.2)' };
    return { label: 'ON TRACK', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.2)' };
  };
  
  const handleCreateMeet = async () => {
    setIsCreatingMeet(true);
    try {
      const response = await fetch('http://localhost:5000/api/meet/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMeetLink(data.data.meet_url);
      }
    } catch (err) {
      console.error(err);
      // Fallback for UI if backend is offline
      setTimeout(() => {
        setMeetLink("https://meet.google.com/mock-abc-xyz");
      }, 1000);
    } finally {
      setIsCreatingMeet(false);
    }
  };

  const stats = [
    { label: "Study Streak", value: `${user?.streak || 1} Days`, icon: <Flame className="text-orange-500" fill="currentColor" />, color: "rgba(249, 115, 22, 0.2)" },
    { label: "Classroom Courses", value: syncStats.courses, icon: <BookOpen className="text-blue-400" />, color: "rgba(59, 130, 246, 0.2)" },
    { label: "Active Assignments", value: syncStats.assignments, icon: <Target className="text-red-400" />, color: "rgba(239, 68, 68, 0.2)" },
    { label: "Synced Materials", value: syncStats.notes, icon: <BookOpen className="text-green-400" />, color: "rgba(16, 185, 129, 0.2)" },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Welcome back, <span style={{ color: 'var(--primary)' }}>{user?.name || "Student"}</span>! 🚀</h1>
          <p style={{ color: 'var(--text-muted)' }}>Ready to crush your goals today?</p>
        </div>
        <div className="glass-panel" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Award size={32} color="#ec4899" />
          <div>
            <div style={{ fontWeight: 'bold' }}>Level {user?.level || 1}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{user?.xp || 0} XP • Scholar</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '48px' }}>
        {stats.map((stat, i) => (
          <div key={i} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{stat.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '24px' }}>
        <div className="glass-panel">
          <h2 style={{ fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Bell size={20} className="text-secondary" /> Upcoming Deadlines & Revisions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.map((asgn, idx) => {
                const urgency = getUrgency(asgn.due_date);
                return (
                  <div key={asgn.id || idx} style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', borderLeft: `4px solid ${urgency.color}`, display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                         {urgency.label === 'URGENT' ? <CalendarClock size={16} color={urgency.color} /> : <Clock size={16} color={urgency.color} />} 
                         {asgn.title}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        {asgn.course_name} • Due: {formatDate(asgn.due_date)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', background: urgency.bg, color: urgency.color, padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', display: 'inline-block' }}>
                        {urgency.label}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                <Target size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p>No upcoming deadlines. Great job staying ahead! 🌟</p>
                <Link to="/classroom" style={{ color: 'var(--primary)', fontSize: '14px', marginTop: '8px', display: 'inline-block' }}>Sync Classroom Data</Link>
              </div>
            )}

          </div>
        </div>

        <div className="glass-panel">
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>AI Tutor Summary</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '14px' }}>
            "{coachSummary}"
          </p>
          <Link to="/chat" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }}>Ask AI Tutor &rarr;</Link>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Integrations</h2>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: syncStats.courses > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <BookOpen size={32} color={syncStats.courses > 0 ? "var(--success)" : "var(--danger)"} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              {syncStats.courses > 0 ? (
                <>Your <strong>Google Classroom</strong> accounts are connected and assignments are synced.</>
              ) : (
                <>Sync assignments & notes directly from <strong>Google Classroom</strong>.</>
              )}
            </p>
            <Link to="/classroom" className={`btn ${syncStats.courses > 0 ? 'btn-secondary' : 'btn-primary'}`} style={{ width: '100%' }}>
              {syncStats.courses > 0 ? 'Manage Sync' : 'Setup Sync'}
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Virtual Study Group</h2>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Video size={32} color="var(--primary)" />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Create a secure <strong>Google Meet</strong> dynamic link to study with your friends online.
            </p>
            {meetLink ? (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', width: '100%' }}>
                <div style={{ color: 'var(--success)', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>Room Provisioned</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px' }}>
                  <a href={meetLink} target="_blank" rel="noreferrer" style={{ fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meetLink}</a>
                  <button onClick={() => navigator.clipboard.writeText(meetLink)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Copy size={16} /></button>
                </div>
              </div>
            ) : (
              <button onClick={handleCreateMeet} disabled={isCreatingMeet} className="btn btn-primary" style={{ width: '100%' }}>
                {isCreatingMeet ? 'Provisioning...' : 'Start Video Call Session'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
