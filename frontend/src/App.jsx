import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import InputForm from './components/InputForm';
import ResultPage from './components/ResultPage';
import { Activity, LayoutDashboard, UserPlus } from 'lucide-react';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [predictionResult, setPredictionResult] = useState(null);

  const handlePredictionResult = (result) => {
    setPredictionResult(result);
    setActiveTab('result');
  };

  const handleReset = () => {
    setPredictionResult(null);
    setActiveTab('input');
  };

  return (
    <div className="app-container">
      <header>
        <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <Activity size={48} color="var(--accent-primary)" />
          Diet AI Engine
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Personalized Diet Recommendation System using Ensemble Learning with Large-Scale Data Training.
        </p>
      </header>

      <div className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Model Dashboard
        </button>
        <button 
          className={`nav-tab ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          <UserPlus size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Get Recommendation
        </button>
        {predictionResult && (
          <button 
            className={`nav-tab ${activeTab === 'result' ? 'active' : ''}`}
            onClick={() => setActiveTab('result')}
          >
            <Activity size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Your Plan
          </button>
        )}
      </div>

      <main>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'input' && <InputForm onPredictionResult={handlePredictionResult} />}
        {activeTab === 'result' && <ResultPage result={predictionResult} onReset={handleReset} />}
      </main>
    </div>
  );
}

export default App;
