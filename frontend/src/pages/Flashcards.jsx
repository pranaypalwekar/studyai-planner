import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Sparkles, Plus, Trash2, RotateCcw, ChevronLeft, ChevronRight, BookOpen, Brain, Lightbulb, CheckCircle, Clock, Target, Zap } from 'lucide-react';

const API = 'http://localhost:5000/api';

const Flashcards = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('decks');
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [masteredCards, setMasteredCards] = useState(new Set());
  
  // Create deck state
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckSubject, setNewDeckSubject] = useState('');
  const [newCards, setNewCards] = useState([{ front: '', back: '' }]);
  
  // AI generate state
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState(null);
  const [classroomNotes, setClassroomNotes] = useState([]);
  const [selectedNoteContext, setSelectedNoteContext] = useState(null);
  
  // Study tips state
  const [studyTips, setStudyTips] = useState(null);
  const [tipsSubject, setTipsSubject] = useState('');
  const [isLoadingTips, setIsLoadingTips] = useState(false);

  const fetchDecks = async () => {
    try {
      const res = await fetch(`${API}/flashcards/decks`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') setDecks(data.decks || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { 
    fetchDecks(); 
    fetchClassroomData();
  }, []);

  const fetchClassroomData = async () => {
    try {
      const res = await fetch(`${API}/classroom/data`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'success') {
        setClassroomNotes(data.notes || []);
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;
    
    const validCards = newCards.filter(c => c.front.trim() && c.back.trim());
    try {
      const res = await fetch(`${API}/flashcards/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: newDeckTitle, subject: newDeckSubject, cards: validCards })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDecks([...decks, data.deck]);
        setNewDeckTitle('');
        setNewDeckSubject('');
        setNewCards([{ front: '', back: '' }]);
        setActiveTab('decks');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteDeck = async (deckId) => {
    try {
      await fetch(`${API}/flashcards/decks/${deckId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDecks(decks.filter(d => d._id !== deckId));
      if (currentDeck?._id === deckId) {
        setCurrentDeck(null);
        setStudyMode(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleGenerateCards = async (e) => {
    e.preventDefault();
    if (!aiTopic.trim()) return;
    setIsGenerating(true);
    setGeneratedCards(null);
    
    try {
      const body = { 
        topic: aiTopic, 
        count: aiCount,
        context: selectedNoteContext ? selectedNoteContext.content_preview : null 
      };
      const res = await fetch(`${API}/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setGeneratedCards(data.cards);
      }
    } catch (err) { console.error(err); } finally {
      setIsGenerating(false);
    }
  };

  const saveGeneratedAsDeck = async () => {
    if (!generatedCards) return;
    try {
      const res = await fetch(`${API}/flashcards/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: `${aiTopic} - AI Generated`, subject: aiTopic, cards: generatedCards })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDecks([...decks, data.deck]);
        setGeneratedCards(null);
        setAiTopic('');
        setActiveTab('decks');
      }
    } catch (err) { console.error(err); }
  };

  const handleGetStudyTips = async (e) => {
    e.preventDefault();
    if (!tipsSubject.trim()) return;
    setIsLoadingTips(true);
    setStudyTips(null);
    
    try {
      const res = await fetch(`${API}/flashcards/study_tips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subject: tipsSubject })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStudyTips(data);
      }
    } catch (err) { console.error(err); } finally {
      setIsLoadingTips(false);
    }
  };

  const startStudy = (deck) => {
    setCurrentDeck(deck);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setMasteredCards(new Set());
    setStudyMode(true);
  };

  const nextCard = () => {
    if (currentDeck && currentCardIndex < currentDeck.cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const markMastered = () => {
    const newSet = new Set(masteredCards);
    newSet.add(currentCardIndex);
    setMasteredCards(newSet);
    nextCard();
  };

  const tabs = [
    { id: 'decks', label: 'My Decks', icon: <BookOpen size={16} /> },
    { id: 'create', label: 'Create Deck', icon: <Plus size={16} /> },
    { id: 'ai_generate', label: 'AI Generate', icon: <Sparkles size={16} /> },
    { id: 'techniques', label: 'Study Techniques', icon: <Brain size={16} /> }
  ];

  const techniqueIcons = [
    <Clock size={24} color="var(--danger)" />,
    <Brain size={24} color="var(--primary)" />,
    <RotateCcw size={24} color="#f59e0b" />,
    <Lightbulb size={24} color="var(--success)" />
  ];

  // ─── STUDY MODE VIEW ──────────────────────────
  if (studyMode && currentDeck) {
    const card = currentDeck.cards[currentCardIndex];
    const total = currentDeck.cards.length;
    const progress = ((currentCardIndex + 1) / total) * 100;
    
    return (
      <div className="animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto', paddingBottom: '64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => setStudyMode(false)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <ChevronLeft size={16} /> Back to Decks
          </button>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {masteredCards.size} / {total} mastered
          </div>
        </div>

        <h2 style={{ fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>{currentDeck.title}</h2>
        
        {/* Progress Bar */}
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginBottom: '32px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', transition: 'width 0.3s ease', borderRadius: '3px' }} />
        </div>

        {/* Flashcard */}
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          style={{
            perspective: '1000px',
            cursor: 'pointer',
            marginBottom: '32px',
            height: '320px'
          }}
        >
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}>
            {/* Front */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%',
              backfaceVisibility: 'hidden',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(244, 63, 94, 0.1))',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '32px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600', marginBottom: '16px', letterSpacing: '1px' }}>QUESTION</div>
              <div style={{ fontSize: '20px', fontWeight: '500', lineHeight: '1.5' }}>{card?.front}</div>
              <div style={{ position: 'absolute', bottom: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>Click to flip</div>
            </div>

            {/* Back */}
            <div style={{
              position: 'absolute', width: '100%', height: '100%',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(14, 165, 233, 0.1))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '32px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600', marginBottom: '16px', letterSpacing: '1px' }}>ANSWER</div>
              <div style={{ fontSize: '18px', lineHeight: '1.6', color: 'var(--text-active)' }}>{card?.back}</div>
              <div style={{ position: 'absolute', bottom: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>Click to flip back</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
          <button onClick={prevCard} disabled={currentCardIndex === 0} className="btn btn-secondary" style={{ padding: '12px 20px' }}>
            <ChevronLeft size={20} />
          </button>
          
          <span style={{ fontSize: '16px', fontWeight: '600', minWidth: '80px', textAlign: 'center' }}>
            {currentCardIndex + 1} / {total}
          </span>
          
          <button onClick={nextCard} disabled={currentCardIndex >= total - 1} className="btn btn-secondary" style={{ padding: '12px 20px' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
          <button onClick={markMastered} className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }}>
            <CheckCircle size={16} /> Mark Mastered
          </button>
          <button onClick={() => { setCurrentCardIndex(0); setIsFlipped(false); setMasteredCards(new Set()); }} className="btn btn-secondary" style={{ padding: '10px 24px', fontSize: '14px' }}>
            <RotateCcw size={16} /> Restart
          </button>
        </div>

        {/* Completion */}
        {masteredCards.size === total && (
          <div className="animate-fade-in glass-panel" style={{ marginTop: '32px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h3 style={{ color: 'var(--success)', marginBottom: '8px' }}>Deck Completed!</h3>
            <p style={{ color: 'var(--text-muted)' }}>You've mastered all {total} cards. Great job!</p>
          </div>
        )}
      </div>
    );
  }

  // ─── MAIN VIEW ────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '64px' }}>
      <header style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Zap size={28} color="var(--primary)" /> Flashcards & Study Tools
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Create, study, and master with AI-powered flashcards and proven study techniques.</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '13px',
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

      {/* MY DECKS */}
      {activeTab === 'decks' && (
        <div className="animate-fade-in">
          {decks.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
              <BookOpen size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '16px' }} />
              <h3 style={{ marginBottom: '8px' }}>No Flashcard Decks Yet</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Create a deck manually or generate one with AI.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => setActiveTab('create')} className="btn btn-primary"><Plus size={16} /> Create Deck</button>
                <button onClick={() => setActiveTab('ai_generate')} className="btn btn-secondary"><Sparkles size={16} /> AI Generate</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {decks.map(deck => (
                <div key={deck._id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{deck.title}</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{deck.subject}</span>
                    </div>
                    <button onClick={() => handleDeleteDeck(deck._id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    <span>{deck.cards?.length || 0} cards</span>
                    {deck.last_studied && <span>Last: {new Date(deck.last_studied).toLocaleDateString()}</span>}
                  </div>
                  <button 
                    onClick={() => startStudy(deck)} 
                    disabled={!deck.cards?.length}
                    className="btn btn-primary" 
                    style={{ marginTop: 'auto', width: '100%', padding: '10px' }}
                  >
                    <Target size={16} /> Study Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE DECK */}
      {activeTab === 'create' && (
        <div className="animate-fade-in">
          <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} color="var(--primary)" /> Create Flashcard Deck
            </h2>
            <form onSubmit={handleCreateDeck}>
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Deck Title</label>
                <input type="text" className="input-base" placeholder="e.g. Calculus Formulas" value={newDeckTitle} onChange={e => setNewDeckTitle(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Subject</label>
                <input type="text" className="input-base" placeholder="e.g. Mathematics" value={newDeckSubject} onChange={e => setNewDeckSubject(e.target.value)} />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Cards
                  <button type="button" onClick={() => setNewCards([...newCards, { front: '', back: '' }])} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px' }}>+ Add Card</button>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {newCards.map((card, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <input type="text" className="input-base" placeholder="Question (Front)" value={card.front} 
                          onChange={e => { const updated = [...newCards]; updated[idx].front = e.target.value; setNewCards(updated); }} 
                          style={{ marginBottom: '6px' }} />
                        <input type="text" className="input-base" placeholder="Answer (Back)" value={card.back} 
                          onChange={e => { const updated = [...newCards]; updated[idx].back = e.target.value; setNewCards(updated); }} />
                      </div>
                      {newCards.length > 1 && (
                        <button type="button" onClick={() => setNewCards(newCards.filter((_, i) => i !== idx))} 
                          style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '8px', color: 'var(--danger)', cursor: 'pointer', marginTop: '4px' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>
                <CheckCircle size={18} /> Create Deck ({newCards.filter(c => c.front && c.back).length} cards)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI GENERATE */}
      {activeTab === 'ai_generate' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="glass-panel" style={{ alignSelf: 'start' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="var(--secondary)" /> AI Flashcard Generator
            </h2>
            <form onSubmit={handleGenerateCards}>
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Topic</label>
                <textarea className="input-base" rows="3" placeholder="e.g. Photosynthesis, Binary Search Trees, World War II causes..." 
                  value={aiTopic} onChange={e => setAiTopic(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Number of Cards</label>
                <input type="number" className="input-base" min="3" max="15" value={aiCount} onChange={e => setAiCount(parseInt(e.target.value))} />
              </div>

              {classroomNotes.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <label className="input-label">Use Classroom Note (Optional)</label>
                  <select 
                    className="input-base" 
                    onChange={e => {
                      const note = classroomNotes.find(n => n.id === e.target.value);
                      setSelectedNoteContext(note || null);
                      if (note) setAiTopic(note.title);
                    }}
                    value={selectedNoteContext?.id || ''}
                  >
                    <option value="">-- Select a synced note --</option>
                    {classroomNotes.map(n => (
                      <option key={n.id} value={n.id}>[{n.course_name}] {n.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <button type="submit" disabled={isGenerating} className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>
                <Sparkles size={18} /> {isGenerating ? 'Generating with Gemini AI...' : 'Generate Flashcards'}
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ alignSelf: 'start', minHeight: '350px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Generated Cards</h2>
            {!generatedCards && !isGenerating ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px', color: 'var(--text-muted)', textAlign: 'center' }}>
                <Sparkles size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
                <p>Your AI-generated flashcards will appear here.</p>
              </div>
            ) : isGenerating ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px', color: 'var(--primary)' }}>
                <Sparkles size={32} style={{ animation: 'spin 2s linear infinite', marginBottom: '16px' }} />
                Generating with Gemini AI...
              </div>
            ) : (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px', marginBottom: '16px' }}>
                  {generatedCards.map((card, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', borderLeft: '3px solid var(--primary)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600', marginBottom: '4px' }}>Q:</div>
                      <div style={{ fontSize: '14px', marginBottom: '8px' }}>{card.front}</div>
                      <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600', marginBottom: '4px' }}>A:</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{card.back}</div>
                    </div>
                  ))}
                </div>
                <button onClick={saveGeneratedAsDeck} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                  <CheckCircle size={16} /> Save as Deck ({generatedCards.length} cards)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STUDY TECHNIQUES */}
      {activeTab === 'techniques' && (
        <div className="animate-fade-in">
          <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto 28px' }}>
            <form onSubmit={handleGetStudyTips} style={{ display: 'flex', gap: '12px' }}>
              <input type="text" className="input-base" placeholder="Enter subject for personalized tips (e.g. Physics, Calculus)..." 
                value={tipsSubject} onChange={e => setTipsSubject(e.target.value)} style={{ flex: 1 }} required />
              <button type="submit" className="btn btn-primary" disabled={isLoadingTips} style={{ whiteSpace: 'nowrap' }}>
                <Brain size={16} /> {isLoadingTips ? 'Loading...' : 'Get Tips'}
              </button>
            </form>
          </div>

          {studyTips && (
            <div className="animate-fade-in">
              {/* Technique Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                {studyTips.techniques?.map((tech, idx) => (
                  <div key={idx} className="glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {techniqueIcons[idx % techniqueIcons.length]}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', margin: 0 }}>{tech.name}</h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tech.time_needed}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>{tech.description}</p>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)', marginBottom: '8px' }}>Steps:</div>
                    <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {tech.steps.map((step, si) => (
                        <li key={si} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{step}</li>
                      ))}
                    </ol>
                    <div style={{ marginTop: '12px', fontSize: '12px', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: '6px', color: 'var(--text-muted)' }}>
                      <strong>Best for:</strong> {tech.best_for}
                    </div>
                  </div>
                ))}
              </div>

              {/* Daily Routine */}
              {studyTips.daily_routine && (
                <div className="glass-panel" style={{ marginBottom: '20px', borderLeft: '4px solid var(--primary)' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} color="var(--primary)" /> Recommended Daily Routine
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{studyTips.daily_routine}</p>
                </div>
              )}

              {/* Motivation */}
              {studyTips.motivation && (
                <div className="glass-panel" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(244,63,94,0.08))' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>💪</div>
                  <p style={{ fontSize: '15px', fontStyle: 'italic', color: 'var(--text-active)', lineHeight: '1.6', margin: 0 }}>
                    "{studyTips.motivation}"
                  </p>
                </div>
              )}
            </div>
          )}

          {!studyTips && !isLoadingTips && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {[
                { name: "Pomodoro Technique", desc: "25-min focused sessions with breaks", icon: <Clock size={24} color="var(--danger)" />, color: 'rgba(239,68,68,0.1)' },
                { name: "Active Recall", desc: "Test yourself instead of re-reading", icon: <Brain size={24} color="var(--primary)" />, color: 'rgba(139,92,246,0.1)' },
                { name: "Spaced Repetition", desc: "Review at increasing intervals", icon: <RotateCcw size={24} color="#f59e0b" />, color: 'rgba(245,158,11,0.1)' },
                { name: "Feynman Technique", desc: "Explain concepts in simple terms", icon: <Lightbulb size={24} color="var(--success)" />, color: 'rgba(16,185,129,0.1)' }
              ].map((tech, idx) => (
                <div key={idx} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: tech.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {tech.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>{tech.name}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{tech.desc}</p>
                  </div>
                </div>
              ))}
              <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                <p style={{ margin: 0 }}>Enter a subject above to get personalized study techniques with AI-powered recommendations.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Flashcards;
