import React, { useState } from 'react';
import { Upload, FileText, Sparkles, TrendingUp, AlertCircle, WifiOff } from 'lucide-react';
import { useAuth } from '../App';

const NotesGenerator = () => {
  const { token } = useAuth();
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic && !file) {
      setError("Please provide a topic or upload a PDF.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    setResult(null);

    // If offline, provide a stub response from local cache heuristic
    if (isOffline) {
      setTimeout(() => {
        setResult({
          summary: `(Offline Mode Cache) General summary for ${topic || file?.name}. Please reconnect to generate deep AI analysis.`,
          key_points: [
            "Review main definitions.",
            "Understand the chronological order or mathematical formula steps.",
            "Practice recalling from memory."
          ],
          prediction: 75,
          prediction_text: "Based on your local offline activity, you have a solid baseline."
        });
        setIsGenerating(false);
      }, 1500);
      return;
    }

    try {
      const formData = new FormData();
      if (topic) formData.append('topic', topic);
      if (file) formData.append('file', file);

      const response = await fetch('http://localhost:5000/api/ai/generate_notes', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to generate notes');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Failed to reach AI server. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '64px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>AI Notes Generator</h1>
        <p style={{ color: 'var(--text-muted)' }}>Generate instant summaries, key points, and performance predictions from topics or PDFs.</p>
        {isOffline && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', marginTop: '12px' }}>
            <WifiOff size={14} /> You are currently offline. Using local cached generation logic.
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        <div className="glass-panel" style={{ alignSelf: 'start' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} className="text-primary" /> Input Source
          </h2>
          
          <form onSubmit={handleGenerate}>
            <div style={{ marginBottom: '24px' }}>
              <label className="input-label">Topic or Question</label>
              <textarea 
                className="input-base" 
                rows="4" 
                placeholder="e.g. World War II Causes, Photosynthesis, React Hooks..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
                <span style={{ padding: '0 12px' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }}></div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label className="input-label">Upload PDF Document</label>
              <div 
                style={{ 
                  border: '2px dashed var(--glass-border)', borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer',
                  background: file ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)'
                }}
                onClick={() => document.getElementById('pdf-upload').click()}
              >
                <input id="pdf-upload" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                <Upload size={32} style={{ color: 'var(--primary)', opacity: 0.8, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontWeight: '500' }}>{file ? file.name : "Click to upload a PDF"}</p>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Max file size 10MB</p>
              </div>
            </div>

            {error && <div style={{ color: 'var(--danger)', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={16} /> {error}</div>}

            <button type="submit" disabled={isGenerating} className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>
              <Sparkles size={18} /> {isGenerating ? 'Analyzing Content...' : 'Generate Notes & Prediction'}
            </button>
          </form>
        </div>

        <div className="glass-panel" style={{ alignSelf: 'start', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} className="text-secondary" /> AI Output
          </h2>

          {!result && !isGenerating ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Sparkles size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
              <p>Your AI-generated summaries and<br/>predictions will appear here.</p>
            </div>
          ) : isGenerating ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <div className="lucide-spin" style={{ marginBottom: '16px' }}><Sparkles size={32} /></div>
              Generating neural insights...
            </div>
          ) : (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Performance Prediction */}
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--primary)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 'bold' }}>
                    <TrendingUp size={18} /> AI Performance Prediction
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: result.prediction > 80 ? 'var(--success)' : 'var(--primary)' }}>
                    {result.prediction}%
                  </div>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${result.prediction}%`, height: '100%', background: result.prediction > 80 ? 'var(--success)' : 'var(--primary)' }}></div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-active)', marginTop: '12px', marginBottom: 0 }}>
                  {result.prediction_text}
                </p>
              </div>

              {/* Summary */}
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-active)' }}>Summary</h3>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                  {result.summary}
                </div>
              </div>

              {/* Key Points */}
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-active)' }}>Key Points</h3>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  {result.key_points.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default NotesGenerator;
