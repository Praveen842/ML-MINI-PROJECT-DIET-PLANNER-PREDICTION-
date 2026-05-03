import React, { useState } from 'react';
import { predictDiet } from '../api';
import { Send, Activity } from 'lucide-react';

const InputForm = ({ onPredictionResult }) => {
  const [formData, setFormData] = useState({
    Age: 25,
    Gender: 'Male',
    Height: 175,
    Weight: 70,
    'Activity Level': 'Medium',
    'Sleep Hours': 7,
    'Water Intake': 2.5,
    Goal: 'Weight Loss',
    Region: 'North India',
    Duration: 7
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await predictDiet(formData);
      onPredictionResult(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get prediction. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel">
      <div style={{ marginBottom: '2rem' }}>
        <h2><Activity style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Enter Health Profile</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Provide your details for a personalized diet recommendation.</p>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '0.5rem', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-2">
        <div className="form-group">
          <label className="form-label">Age</label>
          <input type="number" name="Age" value={formData.Age} onChange={handleChange} className="form-control" required min="10" max="100" />
        </div>

        <div className="form-group">
          <label className="form-label">Gender</label>
          <select name="Gender" value={formData.Gender} onChange={handleChange} className="form-control">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Height (cm)</label>
          <input type="number" name="Height" value={formData.Height} onChange={handleChange} className="form-control" required min="100" max="250" />
        </div>

        <div className="form-group">
          <label className="form-label">Weight (kg)</label>
          <input type="number" name="Weight" value={formData.Weight} onChange={handleChange} className="form-control" required min="30" max="300" step="0.1" />
        </div>

        <div className="form-group">
          <label className="form-label">Activity Level</label>
          <select name="Activity Level" value={formData['Activity Level']} onChange={handleChange} className="form-control">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Sleep Hours</label>
          <input type="number" name="Sleep Hours" value={formData['Sleep Hours']} onChange={handleChange} className="form-control" required min="1" max="24" step="0.5" />
        </div>

        <div className="form-group">
          <label className="form-label">Water Intake (Liters)</label>
          <input type="number" name="Water Intake" value={formData['Water Intake']} onChange={handleChange} className="form-control" required min="0.5" max="10" step="0.1" />
        </div>

        <div className="form-group">
          <label className="form-label">Goal</label>
          <select name="Goal" value={formData.Goal} onChange={handleChange} className="form-control">
            <option value="Weight Loss">Weight Loss</option>
            <option value="Maintain">Maintain Weight / Balanced</option>
            <option value="Weight Gain">Weight Gain</option>
            <option value="Bodybuilding">Bodybuilding / Muscle Gain</option>
            <option value="General Health">General Health / Wellness</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Regional Diet Preference</label>
          <select name="Region" value={formData.Region} onChange={handleChange} className="form-control">
            <option value="North India">North India</option>
            <option value="South India">South India</option>
            <option value="East India">East India</option>
            <option value="West India">West India</option>
          </select>
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Plan Duration</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            {[7, 14, 30].map(days => (
              <button
                type="button"
                key={days}
                className="btn"
                style={{ 
                  flex: 1, 
                  background: formData.Duration === days ? 'var(--accent-primary)' : 'rgba(15, 23, 42, 0.6)',
                  color: formData.Duration === days ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${formData.Duration === days ? 'var(--accent-primary)' : 'var(--glass-border)'}`
                }}
                onClick={() => setFormData(prev => ({ ...prev, Duration: days }))}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Analyzing...' : <><Send size={18} /> Generate Diet Plan</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputForm;
