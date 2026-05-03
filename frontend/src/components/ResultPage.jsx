import React, { useMemo } from 'react';
import { CalendarDays, CheckCircle, ChevronLeft, Droplets, Flame, Activity as ActivityIcon, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#60a5fa', '#34d399', '#f87171']; // Protein (Blue), Carbs (Green), Fats (Red)

const MealCard = ({ meal }) => {
  if (!meal || typeof meal === 'string') return <span>{meal}</span>;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{meal.name}</span>
      <div className="nutrient-container">
        <span className="nutrient-pill np-cal"><Flame size={10} style={{marginRight: '2px'}}/> {meal.calories} kcal</span>
        <span className="nutrient-pill np-pro"><ActivityIcon size={10} style={{marginRight: '2px'}}/> {meal.protein}g Pro</span>
        <span className="nutrient-pill np-carb"><ActivityIcon size={10} style={{marginRight: '2px'}}/> {meal.carbs}g Carb</span>
        <span className="nutrient-pill np-fat"><Droplets size={10} style={{marginRight: '2px'}}/> {meal.fats}g Fat</span>
      </div>
    </div>
  );
};

const ResultPage = ({ result, onReset }) => {
  if (!result) return null;

  const { diet, duration, confidence, timetable } = result;

  // Process data for charts
  const { macroData, calorieData } = useMemo(() => {
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    const calData = [];

    timetable.forEach(day => {
      let dailyCals = 0;
      ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
        const meal = day[mealType];
        if (meal && typeof meal !== 'string') {
          totalProtein += meal.protein;
          totalCarbs += meal.carbs;
          totalFats += meal.fats;
          dailyCals += meal.calories;
        }
      });
      calData.push({ day: day.day, Calories: dailyCals });
    });

    const mData = [
      { name: 'Protein', value: totalProtein },
      { name: 'Carbs', value: totalCarbs },
      { name: 'Fats', value: totalFats }
    ];

    return { macroData: mData, calorieData: calData };
  }, [timetable]);

  return (
    <div className="glass-panel" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <button className="btn" onClick={onReset} style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
        <ChevronLeft size={18} /> Back to Profile
      </button>

      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Your Recommended Plan</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>Powered by Ensemble Learning & Regional ML Recommendations.</p>
      </div>

      <div className="grid grid-cols-2" style={{ marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
          <div className="metric-label" style={{ color: '#34d399' }}>Diet Category</div>
          <div className="metric-value" style={{ color: '#10b981' }}>{diet}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <CheckCircle size={16} color="#34d399" />
            AI Confidence: {(confidence * 100).toFixed(1)}%
          </div>
        </div>

        <div className="glass-panel" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
          <div className="metric-label" style={{ color: '#60a5fa' }}>Duration</div>
          <div className="metric-value" style={{ color: '#3b82f6' }}>{duration} Days</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <CalendarDays size={16} color="#60a5fa" />
            Period-based structured plan
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <PieChartIcon size={18} color="var(--accent-primary)" /> Overall Macronutrients
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Total distribution of Protein, Carbs, and Fats for this {duration}-day plan.
          </p>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={18} color="var(--accent-secondary)" /> Daily Calorie Trend
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Visualizes the consistency of your daily caloric intake.
          </p>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={calorieData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="var(--text-secondary)" style={{ fontSize: '0.75rem' }} />
                <YAxis stroke="var(--text-secondary)" domain={['auto', 'auto']} style={{ fontSize: '0.75rem' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem' }} />
                <Line type="monotone" dataKey="Calories" stroke="var(--accent-secondary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent-secondary)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CalendarDays size={20} color="var(--accent-primary)" />
        ML-Generated Day-wise Timetable
      </h3>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '10%' }}>Day</th>
              <th style={{ width: '30%' }}>Breakfast</th>
              <th style={{ width: '30%' }}>Lunch</th>
              <th style={{ width: '30%' }}>Dinner</th>
            </tr>
          </thead>
          <tbody>
            {timetable.map((dayPlan, index) => (
              <tr key={index}>
                <td style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>{dayPlan.day}</td>
                <td><MealCard meal={dayPlan.breakfast} /></td>
                <td><MealCard meal={dayPlan.lunch} /></td>
                <td><MealCard meal={dayPlan.dinner} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultPage;
