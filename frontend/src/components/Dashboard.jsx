import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { Activity, BrainCircuit, RefreshCw } from 'lucide-react';
import { getMetrics, trainModels } from '../api';

const Dashboard = () => {
  const [metricsData, setMetricsData] = useState([]);
  const [rawMetrics, setRawMetrics] = useState({});
  const [bestModel, setBestModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await getMetrics();

      const formattedData = Object.keys(data.metrics).map(modelName => ({
        name: modelName,
        Accuracy: data.metrics[modelName].accuracy * 100,
        Precision: data.metrics[modelName].precision * 100,
        Recall: data.metrics[modelName].recall * 100,
        F1_Score: data.metrics[modelName].f1 * 100,
      }));

      setRawMetrics(data.metrics);
      setMetricsData(formattedData);
      setBestModel(data.best_model);
      setError('');
    } catch (err) {
      setError('Models not trained yet or server unreachable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleTrain = async () => {
    try {
      setTraining(true);
      await trainModels();
      await fetchMetrics();
    } catch (err) {
      setError('Error training models.');
    } finally {
      setTraining(false);
    }
  };

  if (loading && !metricsData.length) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
        <RefreshCw className="lucide-spin" size={48} color="var(--accent-primary)" style={{ animation: 'spin 2s linear infinite' }} />
        <h2 style={{ marginTop: '1rem' }}>Loading Models...</h2>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2><Activity style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> System Metrics</h2>
          <button className="btn btn-primary" onClick={handleTrain} disabled={training}>
            <BrainCircuit size={18} />
            {training ? 'Training...' : 'Retrain Models'}
          </button>
        </div>

        {error && (
          <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '0.5rem', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {bestModel && (
          <div className="grid grid-cols-3" style={{ marginBottom: '2rem' }}>
            <div className="glass-panel metric-card" style={{ gridColumn: 'span 3', background: 'rgba(59, 130, 246, 0.1)' }}>
              <div className="metric-label">Best Performing Model</div>
              <div className="metric-value">{bestModel}</div>
              <div className="badge badge-success">Deployed & Ready for Prediction</div>
            </div>
          </div>
        )}

        {metricsData.length > 0 && (
          <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
            <div className="glass-panel" style={{ height: '400px' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Performance Metrics Bar Chart</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={metricsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} />
                  <YAxis stroke="var(--text-secondary)" domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }} />
                  <Legend />
                  <Bar dataKey="Accuracy" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="F1_Score" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-panel" style={{ height: '400px' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Multi-Metric Radar Comparison</h3>
              <ResponsiveContainer width="100%" height="90%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={metricsData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="name" stroke="var(--text-secondary)" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.3)" />
                  <Radar name="Accuracy" dataKey="Accuracy" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.6} />
                  <Radar name="F1 Score" dataKey="F1_Score" stroke="var(--accent-secondary)" fill="var(--accent-secondary)" fillOpacity={0.6} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
