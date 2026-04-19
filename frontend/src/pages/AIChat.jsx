import React, { useState } from 'react';
import { Send, Bot, User, Paperclip, FileText, X, Mic } from 'lucide-react';
import { useAuth } from '../App';

const AIChat = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hi there! I'm your StudyAI Tutor. What would you like to learn today?" }
  ]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = React.useRef(null);

  const toggleListen = () => {
    if (isListening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice dictation is only fully supported on Google Chrome or Edge browsers.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() && !file) return;

    let messageText = input;
    if (file) {
      messageText = `[Attached PDF: ${file.name}]\n` + messageText;
    }

    setMessages([...messages, { sender: 'user', text: messageText }]);
    setInput('');
    setFile(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: messageText })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { sender: 'ai', text: data.answer || data.error }]);
    } catch (error) {
      // Mock response fallback if backend / keys aren't active yet
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: `[Offline Mode] Server unreachable or invalid token. Simulate Answer: The area under the curve is represented by the integral.` 
        }]);
      }, 1000);
    }
  };

  return (
    <div className="animate-fade-in glass-panel" style={{ maxWidth: '800px', margin: '0 auto', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Bot size={28} className="text-primary" />
        <div>
          <h2 style={{ fontSize: '20px', margin: 0 }}>AI Tutor</h2>
          <span style={{ fontSize: '12px', color: 'var(--success)' }}>Online • Gemini Powered</span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '12px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
            }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {msg.sender === 'user' ? <User size={16} color="white" /> : <Bot size={16} className="text-primary" />}
              </div>
              <div style={{ 
                background: msg.sender === 'user' ? 'var(--primary)' : 'rgba(0,0,0,0.3)', 
                padding: '12px 16px', 
                borderRadius: '16px', 
                borderTopRightRadius: msg.sender === 'user' ? 0 : '16px',
                borderTopLeftRadius: msg.sender === 'ai' ? 0 : '16px',
                color: 'white',
                lineHeight: '1.5'
              }}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        {file && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid var(--primary)', borderRadius: '8px', marginBottom: '8px', width: 'fit-content' }}>
            <FileText size={16} color="var(--primary)" />
            <span style={{ fontSize: '13px', color: 'var(--text-active)' }}>{file.name}</span>
            <button type="button" onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', marginLeft: '8px' }}>
              <X size={14} />
            </button>
          </div>
        )}
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button" 
            onClick={() => fileInputRef.current.click()} 
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '0 16px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Attach Study Material (PDF)"
          >
            <Paperclip size={18} />
          </button>
          <button 
            type="button" 
            onClick={toggleListen}
            style={{ background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isListening ? 'var(--danger)' : 'var(--glass-border)'}`, borderRadius: '8px', padding: '0 16px', color: isListening ? 'var(--danger)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.3s ease' }}
            title="Voice Dictation"
          >
            <Mic size={18} className={isListening ? 'lucide-pulse' : ''} />
          </button>
          <input 
            type="file" 
            accept=".pdf" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            className="input-base" 
            placeholder="Ask a question about your study materials..." 
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;
