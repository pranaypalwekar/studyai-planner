import React, { useState } from 'react';
import { Sparkles, Calendar, BookOpen, Clock, Plus, DownloadCloud } from 'lucide-react';
import { useAuth } from '../App';
import ScheduleModal from '../components/ScheduleModal';

const Planner = () => {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [dailyHours, setDailyHours] = useState(3);
  const [targetDate, setTargetDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleData, setScheduleData] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [explanations, setExplanations] = useState({});

  const addSubject = () => {
    setSubjects([...subjects, { id: Date.now(), name: '', difficulty: 'Medium' }]);
  };
  
  const handleSubjectChange = (id, field, value) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  
  const removeSubject = (id) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const importFromClassroom = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('http://localhost:5000/api/classroom/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success' && data.assignments?.length > 0) {
        // Group by course name to create subjects
        const assignmentsByCourse = {};
        data.assignments.forEach(a => {
          if (!assignmentsByCourse[a.course_name]) assignmentsByCourse[a.course_name] = [];
          assignmentsByCourse[a.course_name].push(a);
        });

        const importedSubjects = Object.keys(assignmentsByCourse).map((courseName, idx) => {
          const courseAssignments = assignmentsByCourse[courseName];
          // Simple heuristic: if many assignments or recent ones, it's Hard
          const difficulty = courseAssignments.length > 3 ? 'Hard' : 'Medium';
          return { id: `classroom-${idx}`, name: courseName, difficulty };
        });

        setSubjects(importedSubjects);
        // Also set target date to the latest assignment if available
        const latestDue = data.assignments.reduce((latest, a) => {
          if (!a.due_date) return latest;
          return !latest || new Date(a.due_date) > new Date(latest) ? a.due_date : latest;
        }, null);
        if (latestDue) setTargetDate(latestDue.split('T')[0]);
      } else {
        alert("No synced Classroom assignments found. Please sync in the Classroom tab first.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/study/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subjects,
          daily_hours: dailyHours,
          exam_date: targetDate
        })
      });
      
      const resData = await response.json();
      if (resData.status === 'success') {
        setScheduleData(resData.schedule);
        setGenerated(true);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate schedule. Make sure backend is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExplain = async (subject, idx) => {
    setExplanations(prev => ({ ...prev, [idx]: { loading: true } }));
    try {
      const response = await fetch('http://localhost:5000/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: `Give me 2 bullet points on key concepts and 1 quick exam preparation tip for studying: ${subject}. Keep it very brief.` })
      });
      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      setExplanations(prev => ({ ...prev, [idx]: { loading: false, text: data.answer || data.error } }));
    } catch (err) {
      setExplanations(prev => ({ ...prev, [idx]: { loading: false, text: "Unable to reach AI tutor. Please check your connection." } }));
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customSchedules, setCustomSchedules] = useState([]);

  const handleSaveSchedule = (data) => {
    setCustomSchedules([...customSchedules, data]);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '64px' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Intelligent Planner</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure your constraints and let our algorithm optimize your schedule.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Create Custom Plan
        </button>
      </header>

      <ScheduleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveSchedule} />

      {customSchedules.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} className="text-secondary" /> My Custom Schedules
          </h2>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {customSchedules.map((sched, idx) => (
              <div key={idx} className="glass-panel" style={{ flex: '1 1 300px', padding: '16px', borderLeft: `4px solid ${sched.tag?.color || 'var(--primary)'}` }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>{sched.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', gap: '12px' }}>
                  <span><Clock size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {sched.startTime} - {sched.endTime}</span>
                  <span><BookOpen size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {sched.tag?.name}</span>
                </div>
                {sched.description && <p style={{ fontSize: '13px', margin: 0 }}>{sched.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
        {/* Input Settings Panel */}
        <div className="glass-panel" style={{ alignSelf: 'start' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} className="text-primary" /> Configuration
          </h2>
          
          <form onSubmit={handleGenerate}>
            <div style={{ marginBottom: '24px' }}>
              <label className="input-label">Target Exam Date</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input type="date" className="input-base" style={{ paddingLeft: '40px' }} value={targetDate} onChange={e => setTargetDate(e.target.value)} required />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="input-label">Daily Available Hours</label>
              <div style={{ position: 'relative' }}>
                <Clock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input type="number" min="1" max="16" value={dailyHours} onChange={e => setDailyHours(e.target.value)} className="input-base" style={{ paddingLeft: '40px' }} required />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Subjects
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={importFromClassroom} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DownloadCloud size={14} /> Import from Classroom
                  </button>
                  <button type="button" onClick={addSubject} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px' }}>+ Add</button>
                </div>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {subjects.map((sub, index) => (
                  <div key={sub.id} style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder="Subject Name" value={sub.name} onChange={e => handleSubjectChange(sub.id, 'name', e.target.value)} className="input-base" style={{ flex: 2 }} required />
                    <select className="input-base" value={sub.difficulty} onChange={e => handleSubjectChange(sub.id, 'difficulty', e.target.value)} style={{ flex: 1 }}>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                    {subjects.length > 1 && (
                      <button type="button" onClick={() => removeSubject(sub.id)} style={{ padding: '0 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
               <label className="input-label">Target Goal</label>
               <select className="input-base">
                  <option value="pass">Guarantee Pass</option>
                  <option value="high_score">Maximize Score</option>
               </select>
            </div>

            <button type="submit" disabled={isGenerating} className="btn btn-primary" style={{ width: '100%' }}>
              <Sparkles size={18} /> {isGenerating ? 'Optimizing Matrix...' : 'Generate Schedule'}
            </button>
          </form>
        </div>

        {/* Output Schedule View */}
        <div className="glass-panel" style={{ alignSelf: 'start', minHeight: '500px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} className="text-secondary" /> Optimized Schedule
          </h2>

          {!generated ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '350px', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Sparkles size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>Your optimized schedule will appear here.<br/>Adjust the configuration and click Generate.</p>
            </div>
          ) : (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                 <div style={{ fontWeight: '500' }}>{targetDate ? new Date(targetDate).toLocaleDateString() : 'Target Date'} Analysis</div>
                 <div style={{ fontSize: '12px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px' }}>AI Ranked Priorities</div>
              </div>
              
              {scheduleData.map((item, idx) => {
                const borderColors = { 'Hard': 'var(--danger)', 'Medium': 'var(--primary)', 'Easy': 'var(--success)' };
                const exp = explanations[idx];
                return (
                  <div key={idx} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `4px solid ${borderColors[item.difficulty]}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 'bold' }}>{item.subject} ({item.difficulty})</div>
                      <div style={{ color: 'var(--text-muted)' }}>{item.formatted_time}</div>
                    </div>
                    
                    {exp ? (
                      <div className="animate-fade-in" style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        {exp.loading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--primary)' }}>
                            <Sparkles size={14} /> Gathering AI Study Tips...
                          </div>
                        ) : (
                           <div style={{ fontSize: '13px', color: 'var(--text-active)', lineHeight: '1.6' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>
                               <Sparkles size={14} /> AI Guidance
                             </div>
                             <div style={{ whiteSpace: 'pre-wrap' }}>{exp.text}</div>
                           </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '65%' }}>
                          {item.difficulty === 'Hard' ? 'Focus closely on weak sub-topics.' : 'Maintain current pace and review.'}
                        </p>
                        <button onClick={() => handleExplain(item.subject, idx)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={14} /> Explain
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              
              
              <button className="btn btn-secondary" style={{ marginTop: '24px' }}>Export to .ics</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple mock icon for Settings to avoid missing import errors
const Settings = ({ size, className }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

export default Planner;
