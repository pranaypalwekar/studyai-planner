import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import {
  RefreshCw, BookOpen, FileText, Clock, User, CheckCircle,
  AlertTriangle, ChevronDown, ChevronUp, Calendar, Download,
  Sparkles, ExternalLink, LogIn, AlertCircle, X, Eye,
  MessageSquare, Send, Zap, Loader, ChevronLeft, Bot
} from 'lucide-react';

const API = 'http://localhost:5000/api';

// ─── Helper: extract Drive fileId from alternateLink or driveLink ──────────────
function extractFileId(url = '') {
  // Handle /file/d/{id}/ patterns
  const match = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (match) return match[1];
  // Handle ?id= patterns
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (idMatch) return idMatch[1];
  return null;
}

// ─── FileViewer Component ──────────────────────────────────────────────────────
const FileViewer = ({ file, token, onClose }) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const chatEndRef = useRef(null);

  const fileId = file.fileId || extractFileId(file.url);
  const previewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendAIQuery = async (question, action = 'chat') => {
    if (!fileId) {
      setChatMessages(prev => [...prev, {
        role: 'ai', text: '⚠️ No file ID found. Cannot extract content for this file.'
      }]);
      return;
    }

    setIsLoadingAI(true);
    setIsLoadingContent(action === 'chat');

    const userMsg = action === 'chat' ? question : {
      summarize: '📋 Summarize Notes',
      key_points: '🔑 Key Points',
      explain_simply: '🧒 Explain Simply',
    }[action] || question;

    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);

    try {
      const res = await fetch(`${API}/file/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ file_id: fileId, question, action }),
      });

      const data = await res.json();
      if (data.status === 'success') {
        setChatMessages(prev => [...prev, { role: 'ai', text: data.answer }]);
      } else {
        setChatMessages(prev => [...prev, {
          role: 'ai', text: `Error: ${data.detail || 'Could not get AI response.'}`
        }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Network error. Please try again.' }]);
    } finally {
      setIsLoadingAI(false);
      setIsLoadingContent(false);
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoadingAI) return;
    sendAIQuery(chatInput.trim());
    setChatInput('');
  };

  const handleDownload = async () => {
    if (!fileId) {
      window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank');
      return;
    }

    setDownloadStatus('downloading');
    try {
      const res = await fetch(`${API}/file/download/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Download failed');

      const contentType = res.headers.get('content-type') || '';
      // Check if backend returned a fallback URL
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
          setDownloadStatus('done');
          return;
        }
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDownloadStatus('done');
    } catch (err) {
      // Fallback to direct Drive link
      window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank');
      setDownloadStatus('done');
    }
    setTimeout(() => setDownloadStatus(null), 2500);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8, 10, 18, 0.95)',
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.2s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 20px',
        background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid var(--glass-border)',
        flexShrink: 0,
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.07)', border: '1px solid var(--glass-border)',
          borderRadius: '8px', padding: '7px 14px', color: 'var(--text-active)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
        }}>
          <ChevronLeft size={15} /> Back
        </button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: '600', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {file.name || 'File Viewer'}
          </div>
          {fileId && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Drive ID: {fileId}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {fileId && (
            <button
              onClick={handleDownload}
              disabled={downloadStatus === 'downloading'}
              style={{
                background: downloadStatus === 'done' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)',
                border: `1px solid ${downloadStatus === 'done' ? 'rgba(16,185,129,0.4)' : 'rgba(139,92,246,0.4)'}`,
                borderRadius: '8px', padding: '7px 14px',
                color: downloadStatus === 'done' ? 'var(--success)' : 'var(--primary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
              }}
            >
              {downloadStatus === 'downloading' ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> :
               downloadStatus === 'done' ? <CheckCircle size={14} /> : <Download size={14} />}
              {downloadStatus === 'downloading' ? 'Downloading...' : downloadStatus === 'done' ? 'Downloaded!' : 'Download'}
            </button>
          )}
          {file.url && (
            <a href={file.url} target="_blank" rel="noreferrer" style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
              borderRadius: '8px', padding: '7px 14px', color: 'var(--text-muted)',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
            }}>
              <ExternalLink size={14} /> Open in Drive
            </a>
          )}
        </div>
      </div>

      {/* Main body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* File Preview Panel */}
        <div style={{ flex: 1, position: 'relative', background: '#0a0a0a' }}>
          {previewUrl && !previewError ? (
            <iframe
              src={previewUrl}
              title={file.name}
              onError={() => setPreviewError(true)}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="autoplay"
            />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--text-muted)', gap: '16px', padding: '32px'
            }}>
              <FileText size={64} style={{ opacity: 0.2 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-active)' }}>
                  {previewError ? 'Preview Unavailable' : 'No Preview Available'}
                </div>
                <div style={{ fontSize: '14px', maxWidth: '380px', lineHeight: '1.6' }}>
                  {fileId
                    ? 'This file may not support embedded preview. You can still download it or ask the AI Tutor about it.'
                    : 'No Drive file ID found for this attachment. Only link-type attachments may not be previewable here.'}
                </div>
              </div>
              {file.url && (
                <a href={file.url} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)',
                  borderRadius: '10px', padding: '10px 20px', color: 'var(--primary)',
                  textDecoration: 'none', fontSize: '14px'
                }}>
                  <ExternalLink size={16} /> Open in Google Drive
                </a>
              )}
            </div>
          )}
        </div>

        {/* AI Chat Panel */}
        <div style={{
          width: '380px', flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: 'rgba(11, 15, 25, 0.9)',
          borderLeft: '1px solid var(--glass-border)',
        }}>
          {/* AI Panel Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Bot size={16} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>AI Tutor</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {fileId ? 'Reading this file...' : 'Ask anything'}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ padding: '12px', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { label: '📋 Summarize', action: 'summarize' },
              { label: '🔑 Key Points', action: 'key_points' },
              { label: '🧒 Explain Simply', action: 'explain_simply' },
            ].map(({ label, action }) => (
              <button
                key={action}
                onClick={() => sendAIQuery(label, action)}
                disabled={isLoadingAI || !fileId}
                style={{
                  background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: '20px', padding: '5px 12px', color: 'var(--primary)',
                  cursor: isLoadingAI || !fileId ? 'not-allowed' : 'pointer',
                  fontSize: '12px', fontWeight: '500',
                  opacity: !fileId ? 0.4 : 1,
                  transition: 'all 0.15s'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '32px' }}>
                <Sparkles size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  {fileId
                    ? 'Ask me anything about this file, or use the quick actions above!'
                    : 'No Drive file ID detected for this attachment.'}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', gap: '8px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                animation: 'fadeIn 0.2s ease'
              }}>
                {msg.role === 'ai' && (
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Bot size={13} color="white" />
                  </div>
                )}
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.07)',
                  color: 'var(--text-active)', fontSize: '13px', lineHeight: '1.6',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoadingAI && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Bot size={13} color="white" />
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: '18px 18px 18px 4px',
                  background: 'rgba(255,255,255,0.07)', fontSize: '13px', display: 'flex', gap: '4px', alignItems: 'center'
                }}>
                  <span style={{ animation: 'pulse 1s infinite' }}>●</span>
                  <span style={{ animation: 'pulse 1s 0.2s infinite' }}>●</span>
                  <span style={{ animation: 'pulse 1s 0.4s infinite' }}>●</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleChatSubmit} style={{
            padding: '12px 16px', borderTop: '1px solid var(--glass-border)',
            display: 'flex', gap: '8px'
          }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={fileId ? 'Ask about this file...' : 'No file ID available'}
              disabled={isLoadingAI || !fileId}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.07)',
                border: '1px solid var(--glass-border)', borderRadius: '10px',
                padding: '10px 14px', color: 'var(--text-active)', fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isLoadingAI || !fileId}
              style={{
                background: 'var(--primary)', border: 'none', borderRadius: '10px',
                padding: '10px 14px', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: (!chatInput.trim() || isLoadingAI || !fileId) ? 0.5 : 1,
                transition: 'opacity 0.15s'
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── AttachmentRow: render a single attachment with preview + download ────────
const AttachmentRow = ({ att, courseColor, token, onPreview }) => {
  const fileId = att.fileId || extractFileId(att.url) || extractFileId(att.driveLink);
  const isDrive = att.type === 'drive' || !!fileId;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.06)'
    }}>
      <FileText size={14} color={courseColor} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-active)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {att.name}
      </span>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {isDrive && (
          <button
            onClick={() => onPreview({ ...att, fileId })}
            title="Preview in app"
            style={{
              background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: 'var(--primary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <Eye size={12} /> Preview
          </button>
        )}
        <a
          href={att.url || att.driveLink || '#'}
          target="_blank"
          rel="noreferrer"
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
            borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: 'var(--text-muted)',
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
};

// ─── Main Classroom Component ─────────────────────────────────────────────────
const Classroom = () => {
  const { token, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [expandedAssignment, setExpandedAssignment] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [savedNotes, setSavedNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedNotes') || '[]'); } catch { return []; }
  });

  // FileViewer state
  const [viewingFile, setViewingFile] = useState(null);

  const fetchClassroomData = async () => {
    try {
      const res = await fetch(`${API}/classroom/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
        setAssignments(data.assignments || []);
        setNotes(data.notes || []);
        if (data.courses?.length > 0) setSynced(true);
      }
    } catch (err) {
      console.error('Failed to fetch classroom data:', err);
    }
  };

  useEffect(() => {
    if (token) fetchClassroomData();
  }, [token]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const res = await fetch(`${API}/classroom/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncError(data.detail || data.error || 'Sync failed.');
        return;
      }
      setSyncMessage(data.message || 'Synced successfully!');
      fetchClassroomData();
      setSynced(true);
    } catch (err) {
      setSyncError('Network error. Make sure the backend is running.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveNote = (note) => {
    const updated = [...savedNotes, { ...note, saved_at: new Date().toISOString() }];
    setSavedNotes(updated);
    localStorage.setItem('savedNotes', JSON.stringify(updated));
  };
  const isNoteSaved = id => savedNotes.some(n => n.id === id);
  const handleRemoveSavedNote = id => {
    const updated = savedNotes.filter(n => n.id !== id);
    setSavedNotes(updated);
    localStorage.setItem('savedNotes', JSON.stringify(updated));
  };

  const handleGenerateSchedule = async () => {
    setIsScheduling(true);
    try {
      const res = await fetch(`${API}/classroom/schedule_from_assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignments, daily_hours: 4 }),
      });
      const data = await res.json();
      if (data.status === 'success') setScheduleData(data.schedule);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScheduling(false);
    }
  };

  const getDaysText = dateStr => {
    if (!dateStr) return { text: 'No due date', color: 'var(--text-muted)' };
    const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    if (days <= 0) return { text: 'Overdue', color: 'var(--danger)' };
    if (days === 1) return { text: 'Due Tomorrow', color: 'var(--danger)' };
    if (days <= 3) return { text: `${days} days left`, color: '#f59e0b' };
    return { text: `${days} days left`, color: 'var(--success)' };
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/google');
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setSyncError('Failed to start Google login');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Classroom?')) return;
    try {
      await fetch(`${API}/classroom/auth/disconnect`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      window.location.reload();
    } catch {}
  };

  const filteredAssignments = selectedCourse ? assignments.filter(a => a.course_id === selectedCourse) : assignments;
  const filteredNotes = selectedCourse ? notes.filter(n => n.course_id === selectedCourse) : notes;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BookOpen size={16} /> },
    { id: 'assignments', label: `Assignments (${assignments.length})`, icon: <FileText size={16} /> },
    { id: 'notes', label: `Materials (${notes.length})`, icon: <Download size={16} /> },
    { id: 'schedule', label: 'Study Schedule', icon: <Calendar size={16} /> },
    { id: 'saved', label: `Saved (${savedNotes.length})`, icon: <CheckCircle size={16} /> },
  ];

  // ── Loading state ───────────────────────────────────────────────────────────
  if (!user || user.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', opacity: 0.5 }} />
      </div>
    );
  }

  // ── Not connected ───────────────────────────────────────────────────────────
  if (!user.google_connected) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto', paddingBottom: '64px' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>📚</span> Google Classroom
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Connect to sync your courses, assignments &amp; materials.</p>
        </header>
        {syncError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px', marginBottom: '24px', color: 'var(--danger)', fontSize: '14px' }}>
            <AlertCircle size={18} style={{ verticalAlign: 'text-bottom', marginRight: '8px' }} />{syncError}
          </div>
        )}
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <BookOpen size={36} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>Connect Google Classroom</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.6', maxWidth: '460px', margin: '0 auto 24px' }}>
            Sign in with your Google account to access your <strong>real courses, assignments, and notes</strong> from Google Classroom.
          </p>
          <button onClick={handleGoogleLogin} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
            Connect Google Classroom
          </button>
        </div>
      </div>
    );
  }

  // ── Main connected view ─────────────────────────────────────────────────────
  return (
    <>
      {/* FILE VIEWER OVERLAY */}
      {viewingFile && (
        <FileViewer file={viewingFile} token={token} onClose={() => setViewingFile(null)} />
      )}

      <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '64px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>📚</span> Google Classroom
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Synced from your real Google Classroom account.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSync} disabled={isSyncing} className="btn btn-primary" style={{ minWidth: '130px' }}>
              {isSyncing ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Syncing...</> : <><RefreshCw size={16} /> Sync Now</>}
            </button>
            <button onClick={handleDisconnect} className="btn btn-secondary" style={{ padding: '10px 14px', color: 'var(--text-muted)' }} title="Disconnect">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Sync Messages */}
        {syncError && (
          <div className="animate-fade-in" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'start', gap: '10px' }}>
            <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, fontSize: '14px', color: 'var(--danger)' }}>{syncError}</div>
            <button onClick={() => setSyncError('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={16} /></button>
          </div>
        )}
        {synced && syncMessage && (
          <div className="animate-fade-in" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={18} color="var(--success)" />
            <span style={{ color: 'var(--success)', fontWeight: '500', fontSize: '14px' }}>{syncMessage}</span>
          </div>
        )}
        {isSyncing && !synced && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
            <RefreshCw size={36} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: '8px' }}>Syncing with Google Classroom...</h3>
            <p style={{ color: 'var(--text-muted)' }}>Fetching courses, assignments, and materials.</p>
          </div>
        )}
        {!isSyncing && !synced && !syncError && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', marginTop: '24px' }}>
            <BookOpen size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: '8px' }}>Ready to Sync</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Connected! Click "Sync Now" to fetch your classes.</p>
            <button onClick={handleSync} className="btn btn-primary" style={{ padding: '12px 24px' }}>
              <RefreshCw size={16} /> Sync Classroom Now
            </button>
          </div>
        )}

        {/* Main Content */}
        {synced && (
          <>
            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px' }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '13px',
                    background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                    color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Course Filter */}
            {(activeTab === 'assignments' || activeTab === 'notes') && courses.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button onClick={() => setSelectedCourse(null)} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px', background: !selectedCourse ? 'var(--primary)' : undefined, color: !selectedCourse ? 'white' : undefined }}>
                  All Courses
                </button>
                {courses.map(c => (
                  <button key={c.id} onClick={() => setSelectedCourse(c.id)} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px', borderLeft: `3px solid ${c.color}`, background: selectedCourse === c.id ? 'rgba(255,255,255,0.1)' : undefined }}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* ── OVERVIEW TAB ────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="animate-fade-in">
                {courses.length === 0 ? (
                  <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
                    <BookOpen size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '16px' }} />
                    <h3 style={{ marginBottom: '8px' }}>No Active Courses Found</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Your Google Classroom account doesn't have active courses or needs additional permissions.</p>
                  </div>
                ) : (
                  <>
                    <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Your Courses ({courses.length})</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                      {courses.map(course => (
                        <div key={course.id} className="glass-panel" style={{ borderTop: `4px solid ${course.color}`, padding: '20px' }}>
                          <h3 style={{ fontSize: '16px', marginBottom: '8px', color: course.color }}>{course.name}</h3>
                          {course.section && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{course.section}</div>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${course.color}22`, color: course.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', overflow: 'hidden' }}>
                              {course.teacher?.photoUrl ? <img src={course.teacher.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (course.teacher?.avatar || 'T')}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '500' }}>{course.teacher?.name || 'Your Teacher'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setSelectedCourse(course.id); setActiveTab('assignments'); }} className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>Assignments</button>
                            <button onClick={() => { setSelectedCourse(course.id); setActiveTab('notes'); }} className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>Materials</button>
                            {course.alternateLink && (
                              <a href={course.alternateLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '8px', fontSize: '12px' }} title="Open in Classroom">
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      {[
                        { label: 'Urgent', value: assignments.filter(a => getDaysText(a.due_date).color === 'var(--danger)').length, color: 'var(--danger)' },
                        { label: 'Assignments', value: assignments.length, color: 'var(--primary)' },
                        { label: 'Materials', value: notes.length, color: '#f59e0b' },
                        { label: 'Saved', value: savedNotes.length, color: 'var(--success)' },
                      ].map(s => (
                        <div key={s.label} className="glass-panel" style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '28px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── ASSIGNMENTS TAB ─────────────────────────────────── */}
            {activeTab === 'assignments' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredAssignments.length === 0 ? (
                  <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <h3>No Assignments Found</h3>
                  </div>
                ) : filteredAssignments.map(asgn => {
                  const due = getDaysText(asgn.due_date);
                  const isExpanded = expandedAssignment === asgn.id;
                  const courseColor = courses.find(c => c.id === asgn.course_id)?.color || 'var(--primary)';
                  return (
                    <div key={asgn.id} className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                      <div
                        onClick={() => setExpandedAssignment(isExpanded ? null : asgn.id)}
                        style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', background: `${courseColor}33`, color: courseColor, padding: '3px 10px', borderRadius: '20px', fontWeight: '500' }}>
                              {asgn.course_name}
                            </span>
                            <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '20px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                              {(asgn.type || 'assignment').replace('_', ' ')}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{asgn.title}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                            <span><User size={12} style={{ verticalAlign: 'text-bottom' }} /> {asgn.teacher || asgn.course_name}</span>
                            {asgn.max_points > 0 && <span>{asgn.max_points} pts</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: due.color }}>{due.text}</div>
                            {asgn.due_date && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {new Date(asgn.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="animate-fade-in" style={{ padding: '0 20px 20px', borderTop: '1px solid var(--glass-border)' }}>
                          {asgn.description && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', margin: '16px 0', whiteSpace: 'pre-wrap' }}>{asgn.description}</p>
                          )}

                          {asgn.attachments?.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-active)' }}>
                                📎 Attachments ({asgn.attachments.length})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {asgn.attachments.map((att, i) => (
                                  <AttachmentRow
                                    key={i}
                                    att={att}
                                    courseColor={courseColor}
                                    token={token}
                                    onPreview={setViewingFile}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <a href="/chat" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}>
                              <Sparkles size={14} /> Get AI Help
                            </a>
                            {asgn.alternateLink && (
                              <a href={asgn.alternateLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}>
                                <ExternalLink size={14} /> Open in Classroom
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── MATERIALS / NOTES TAB ───────────────────────────── */}
            {activeTab === 'notes' && (
              <div className="animate-fade-in">
                {filteredNotes.length === 0 ? (
                  <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <Download size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <h3>No Materials Found</h3>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {filteredNotes.map(note => {
                      const courseColor = courses.find(c => c.id === note.course_id)?.color || 'var(--primary)';
                      const saved = isNoteSaved(note.id);
                      return (
                        <div key={note.id} className="glass-panel" style={{ borderLeft: `4px solid ${courseColor}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', background: `${courseColor}33`, color: courseColor, padding: '3px 10px', borderRadius: '20px', fontWeight: '500' }}>
                              {note.course_name}
                            </span>
                            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '20px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                              {(note.type || 'material').replace('_', ' ')}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>{note.title}</h3>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            <User size={12} style={{ verticalAlign: 'text-bottom' }} /> {note.teacher}
                          </div>
                          {note.content_preview && (
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '12px', maxHeight: '72px', overflow: 'hidden' }}>
                              {note.content_preview}
                            </p>
                          )}

                          {/* Attachments with preview+download */}
                          {note.attachments?.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                              {note.attachments.map((att, i) => (
                                <AttachmentRow
                                  key={i}
                                  att={att}
                                  courseColor={courseColor}
                                  token={token}
                                  onPreview={setViewingFile}
                                />
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => !saved && handleSaveNote(note)}
                              disabled={saved}
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '8px', fontSize: '12px', color: saved ? 'var(--success)' : undefined }}
                            >
                              {saved ? <><CheckCircle size={14} /> Saved</> : <><Download size={14} /> Save</>}
                            </button>
                            <a href="/notes" className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px', textDecoration: 'none', textAlign: 'center' }}>
                              <Sparkles size={14} /> AI Summary
                            </a>
                            {note.alternateLink && (
                              <a href={note.alternateLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '8px', fontSize: '12px' }} title="Open in Classroom">
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── STUDY SCHEDULE TAB ──────────────────────────────── */}
            {activeTab === 'schedule' && (
              <div className="animate-fade-in">
                {!scheduleData ? (
                  <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
                    <Calendar size={48} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '16px' }} />
                    <h3 style={{ marginBottom: '8px' }}>Generate Study Schedule</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
                      Analyze your {assignments.length} assignments and create an optimized daily study plan.
                    </p>
                    <button onClick={handleGenerateSchedule} disabled={isScheduling || assignments.length === 0} className="btn btn-primary" style={{ padding: '14px 32px' }}>
                      <Sparkles size={18} /> {isScheduling ? 'Generating...' : 'Generate Study Schedule'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ fontSize: '20px' }}>Your Study Plan</h2>
                      <button onClick={handleGenerateSchedule} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                        <RefreshCw size={14} /> Regenerate
                      </button>
                    </div>
                    {scheduleData.map((item, idx) => {
                      const urgColors = { urgent: 'var(--danger)', medium: '#f59e0b', low: 'var(--success)' };
                      return (
                        <div key={idx} className="glass-panel" style={{ borderLeft: `4px solid ${urgColors[item.urgency]}`, padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <h3 style={{ fontSize: '15px', margin: 0 }}>{item.assignment}</h3>
                                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', background: `${urgColors[item.urgency]}22`, color: urgColors[item.urgency], padding: '2px 8px', borderRadius: '4px' }}>
                                  {item.urgency}
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.course}</div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '600', color: urgColors[item.urgency] }}>
                              {item.days_remaining} day{item.days_remaining !== 1 ? 's' : ''} left
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '13px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 14px', borderRadius: '8px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Daily: </span>
                              <span style={{ fontWeight: '600' }}>{item.daily_hours_needed}h</span>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 14px', borderRadius: '8px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Total: </span>
                              <span style={{ fontWeight: '600' }}>{item.total_hours_estimate}h</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── SAVED NOTES TAB ─────────────────────────────────── */}
            {activeTab === 'saved' && (
              <div className="animate-fade-in">
                {savedNotes.length === 0 ? (
                  <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
                    <Download size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '16px' }} />
                    <h3 style={{ marginBottom: '8px' }}>No Saved Notes</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Go to Materials and save notes from your teachers.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {savedNotes.map((note, idx) => (
                      <div key={idx} className="glass-panel" style={{ borderLeft: '4px solid var(--success)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '500' }}>Saved</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(note.saved_at).toLocaleDateString()}</span>
                            <button onClick={() => handleRemoveSavedNote(note.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                        <h3 style={{ fontSize: '15px', marginBottom: '6px' }}>{note.title}</h3>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                          <User size={12} style={{ verticalAlign: 'text-bottom' }} /> {note.teacher} | {note.course_name}
                        </div>
                        {note.content_preview && (
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                            {note.content_preview.substring(0, 150)}{note.content_preview.length > 150 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </>
  );
};

export default Classroom;
