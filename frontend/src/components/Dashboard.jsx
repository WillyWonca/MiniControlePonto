import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Award, Clock, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const formatDecimalTime = (decimalHours) => {
  if (!decimalHours || decimalHours <= 0) return '00:00';
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export default function Dashboard({ year }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch(`${API_URL}/reports/annual/${year}`);
        const json = await res.json();
        // Transform for recharts
        const chartData = json.monthlyData.map(m => ({
           name: m.name,
           'Horas Regulares': parseFloat((m.total_hours_dec - m.overtime_hours_dec).toFixed(2)),
           'Horas Extras': parseFloat(m.overtime_hours_dec.toFixed(2))
        }));
        
        setData({ chartData, highlights: json.highlights });
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    fetchReports();
  }, [year]);

  const handleAnnualExport = () => {
    window.location.href = `${API_URL}/excel/export-annual/${year}`;
  };

  if (loading || !data) return <div style={{padding: '2rem', textAlign: 'center'}}>Carregando dashboard...</div>;

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Visão Geral Anual: {year}</h2>
        <button className="btn" onClick={handleAnnualExport}>
          <Download size={16} /> Exportar Relatório Anual (XLSX)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px', color: 'var(--accent-color)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Foco Total</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatDecimalTime(data.highlights.totalYearHours)} hrs</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '12px', color: 'var(--success-color)' }}>
            <Award size={24} /> // Fix this icon below
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mês Produtivo</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'capitalize' }}>{data.highlights.mostProductiveMonth}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '12px', color: 'var(--warning-color)' }}>
              <Clock size={24} />
           </div>
           <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pico de Extras</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'capitalize' }}>{data.highlights.highestOvertimeMonth}</div>
           </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <div style={{ background: 'rgba(167, 139, 250, 0.1)', padding: '0.75rem', borderRadius: '12px', color: '#a78bfa' }}>
              <Calendar size={24} />
           </div>
           <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dia + Extras</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'capitalize' }}>{data.highlights.peakOvertimeDay}</div>
           </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', height: '400px' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
           Distribuição de Horas (Regulares X Extras)
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
            <YAxis stroke="var(--text-secondary)" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
            <Tooltip 
               contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
               itemStyle={{ color: 'var(--text-primary)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="Horas Regulares" stackId="a" fill="var(--accent-color)" radius={[0, 0, 4, 4]} />
            <Bar dataKey="Horas Extras" stackId="a" fill="var(--success-color)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
