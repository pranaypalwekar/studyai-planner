import React, { useState } from 'react';
import { X, Plus, Clock, Calendar } from 'lucide-react';

const COLORS = [
  { name: 'Yellow', value: '#eab308' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Grey', value: '#64748b' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' }
];

const DEFAULT_TAGS = [
  { id: '1', name: 'Study', color: '#3b82f6' },
  { id: '2', name: 'Work', color: '#eab308' },
  { id: '3', name: 'Untagged', color: '#64748b' }
];

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const ScheduleModal = ({ isOpen, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [selectedTag, setSelectedTag] = useState(DEFAULT_TAGS[0].id);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [repeatDays, setRepeatDays] = useState([]);
  const [breakDuration, setBreakDuration] = useState('5');
  const [description, setDescription] = useState('');
  
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(COLORS[0].value);

  if (!isOpen) return null;

  const toggleDay = (idx) => {
    if (repeatDays.includes(idx)) {
      setRepeatDays(repeatDays.filter(d => d !== idx));
    } else {
      setRepeatDays([...repeatDays, idx]);
    }
  };

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const newTag = {
        id: Date.now().toString(),
        name: newTagName,
        color: newTagColor
      };
      setTags([...tags, newTag]);
      setSelectedTag(newTag.id);
      setIsAddingTag(false);
      setNewTagName('');
    }
  };

  const handleSave = () => {
    const data = {
      title,
      tag: tags.find(t => t.id === selectedTag),
      startTime,
      endTime,
      repeatDays,
      breakDuration,
      description
    };
    onSave(data);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel animate-fade-in" style={{ 
        width: '100%', maxWidth: '450px', padding: '24px', 
        maxHeight: '90vh', overflowY: 'auto', position: 'relative' 
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Create Schedule</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title */}
          <div>
            <label className="input-label">Title</label>
            <input type="text" className="input-base" placeholder="e.g. Evening Study" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Tags */}
          <div>
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Tag Selection
              <button onClick={() => setIsAddingTag(!isAddingTag)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                <Plus size={14} /> New Tag
              </button>
            </label>
            
            {isAddingTag && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                <input type="text" className="input-base" placeholder="Tag Name" value={newTagName} onChange={e => setNewTagName(e.target.value)} style={{ flex: 1, padding: '8px' }} />
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {COLORS.map(c => (
                    <div key={c.name} onClick={() => setNewTagColor(c.value)} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c.value, cursor: 'pointer', border: newTagColor === c.value ? '2px solid white' : 'none' }} />
                  ))}
                </div>
                <button onClick={handleAddTag} className="btn btn-primary" style={{ padding: '8px' }}>Add</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {tags.map(tag => (
                <div 
                  key={tag.id}
                  onClick={() => setSelectedTag(tag.id)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    border: `1px solid ${tag.id === selectedTag ? tag.color : 'var(--glass-border)'}`,
                    background: tag.id === selectedTag ? `${tag.color}20` : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: tag.color }} />
                  {tag.name}
                </div>
              ))}
            </div>
          </div>

          {/* Time Picker */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">Start Time (From)</label>
              <div style={{ position: 'relative' }}>
                <Clock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input type="time" className="input-base" style={{ paddingLeft: '36px' }} value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label className="input-label">End Time (To)</label>
              <div style={{ position: 'relative' }}>
                <Clock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input type="time" className="input-base" style={{ paddingLeft: '36px' }} value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Repeat */}
          <div>
            <label className="input-label">Repeat</label>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {DAYS.map((day, idx) => {
                const isActive = repeatDays.includes(idx);
                return (
                  <div 
                    key={idx} 
                    onClick={() => toggleDay(idx)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--glass-border)',
                      fontWeight: isActive ? 'bold' : 'normal'
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Break Duration */}
          <div>
            <label className="input-label">Break Duration</label>
            <select className="input-base" value={breakDuration} onChange={e => setBreakDuration(e.target.value)}>
              <option value="0">No breaks</option>
              <option value="5">5 mins every hour</option>
              <option value="10">10 mins every hour</option>
              <option value="15">15 mins every hour</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="input-label">Description</label>
            <textarea className="input-base" rows="3" placeholder="Add notes..." value={description} onChange={e => setDescription(e.target.value)}></textarea>
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSave} 
            className="btn btn-primary" 
            style={{ width: '100%', borderRadius: '30px', padding: '14px', fontSize: '16px', fontWeight: 'bold', marginTop: '8px' }}
          >
            Save Schedule
          </button>

        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
