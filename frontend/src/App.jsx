import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Upload, LineChart, Table, Plus, Minus } from 'lucide-react';
import Dashboard from './components/Dashboard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const calculateDuration = (start, end) => {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  const d1 = new Date(); d1.setHours(h1 || 0, m1 || 0, 0, 0);
  const d2 = new Date(); d2.setHours(h2 || 0, m2 || 0, 0, 0);
  if (d2 < d1) d2.setDate(d2.getDate() + 1);
  return (d2 - d1) / (1000 * 60 * 60);
};

const formatDuration = (decimalHours) => {
  if (!decimalHours || decimalHours <= 0) return '00:00';
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const parseHM = (str) => {
  if (!str) return 0;
  if (typeof str === 'object' && str.hours !== undefined) return (str.hours || 0) + (str.minutes || 0) / 60;
  if (typeof str === 'string' && str.includes(':')) {
    const parts = str.split(':');
    return parseInt(parts[0] || 0) + parseInt(parts[1] || 0) / 60;
  }
  return 0;
};

function App() {
  const [timesheets, setTimesheets] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3));
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTimesheets();
  }, [currentMonth]);

  const fetchTimesheets = async () => {
    try {
      const res = await fetch(`${API_URL}/timesheets`);
      if (res.ok) {
        const data = await res.json();
        const map = {};
        data.forEach(t => {
          const dateStr = t.date.split('T')[0];
          map[dateStr] = { ...t, date: dateStr };
        });
        setTimesheets(map);
      }
    } catch (err) {
      console.error('Error fetching timesheets:', err);
    }
  };

  const handleSave = async (dateStr, formData) => {
    try {
      await fetch(`${API_URL}/timesheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, date: dateStr, weekday: format(new Date(dateStr), 'EEEE', { locale: ptBR }) })
      });
    } catch (err) {
      console.error('Error saving timesheet:', err);
    }
  };

  const handleChange = (dateStr, field, value) => {
    setTimesheets(prev => {
      const current = prev[dateStr] || { jornada: '08:00' };
      const updated = { ...current, [field]: value };

      let totalHrs = 0;
      totalHrs += calculateDuration(updated.period1_start, updated.period1_end);
      totalHrs += calculateDuration(updated.period2_start, updated.period2_end);
      totalHrs += calculateDuration(updated.extra1_start, updated.extra1_end);
      totalHrs += calculateDuration(updated.extra2_start, updated.extra2_end);
      totalHrs += calculateDuration(updated.extra3_start, updated.extra3_end);

      const expected = calculateDuration('00:00', updated.jornada || '08:00');
      let overtimeHrs = totalHrs > expected ? totalHrs - expected : 0;

      updated.total_hours = formatDuration(totalHrs);
      updated.overtime_hours = formatDuration(overtimeHrs);

      return { ...prev, [dateStr]: updated };
    });
  };

  const handeBlur = (dateStr) => {
    if (timesheets[dateStr]) handleSave(dateStr, timesheets[dateStr]);
  };

  const handleClearAll = async () => {
    if (window.confirm("ATENÇÃO: Você tem certeza que deseja APAGAR TODOS os registros de ponto do banco de dados? Esta ação não pode ser desfeita.")) {
      try {
        await fetch(`${API_URL}/timesheets`, { method: 'DELETE' });
        fetchTimesheets(); // Reload empty
      } catch (err) {
        alert("Erro ao limpar registros.");
      }
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await fetch(`${API_URL}/excel/import`, { method: 'POST', body: formData });
      fetchTimesheets();
    } catch (err) {
      alert('Erro ao importar');
    }
  };

  const handleExport = () => {
    window.location.href = `${API_URL}/excel/export/${format(currentMonth, 'yyyy-MM')}`;
  };

  const [activeTab, setActiveTab] = useState('timesheet');
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (dateStr) => setExpandedRows(prev => ({ ...prev, [dateStr]: !prev[dateStr] }));

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });

  let totalHoursDec = 0;
  let totalOvertimeDec = 0;
  Object.values(timesheets).forEach(t => {
    const dStr = t.date;
    if (dStr && dStr.startsWith(format(currentMonth, 'yyyy-MM'))) {
      totalHoursDec += parseHM(t.total_hours);
      totalOvertimeDec += parseHM(t.overtime_hours);
    }
  });

  const InputCell = ({ val, field, dateStr }) => {
    let formatted = '';
    if (typeof val === 'string') formatted = val.substring(0, 5);
    else if (typeof val === 'object' && val !== null) {
      const h = String(val.hours || 0).padStart(2, '0');
      const m = String(val.minutes || 0).padStart(2, '0');
      formatted = `${h}:${m}`;
    } else if (val) {
      formatted = String(val);
    }

    return (
      <input
        type="time"
        className="inline-input"
        value={formatted}
        onChange={(e) => handleChange(dateStr, field, e.target.value)}
        onBlur={() => handeBlur(dateStr)}
      />
    );
  };

  return (
    <div className="app-container" style={{ maxWidth: 1400 }}>
      <header className="header" style={{ marginBottom: '1rem' }}>
        <div className="title-container">
          <h1>Controle de Ponto</h1>
          <p>Produtividade Pessoal & Gestão de Tempo</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '12px' }}>
          <button
            className="btn"
            style={{ background: activeTab === 'timesheet' ? 'var(--accent-color)' : 'transparent', boxShadow: activeTab === 'timesheet' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none' }}
            onClick={() => setActiveTab('timesheet')}
          >
            <Table size={16} /> Lançamentos
          </button>
          <button
            className="btn"
            style={{ background: activeTab === 'dashboard' ? 'var(--accent-color)' : 'transparent', boxShadow: activeTab === 'dashboard' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none' }}
            onClick={() => setActiveTab('dashboard')}
          >
            <LineChart size={16} /> Relatórios
          </button>
        </div>
      </header>

      {activeTab === 'dashboard' ? (
        <Dashboard year={currentMonth.getFullYear()} />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}> Mês {format(currentMonth, 'MM/yyyy')}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}><Upload size={16} /> Importar</button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx" onChange={handleImport} />

              <button className="btn btn-secondary" onClick={handleExport}><Download size={16} /> Exportar Mês</button>

              <span style={{ width: '2px', height: '20px', background: 'var(--border-color)', margin: '0 0.5rem' }}></span>
              <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem' }} onClick={() => window.location.href = `${API_URL}/excel/template/monthly/${format(currentMonth, 'yyyy-MM')}`}>Mod. Mensal</button>
              <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem' }} onClick={() => window.location.href = `${API_URL}/excel/template/annual/${currentMonth.getFullYear()}`}>Mod. Anual</button>

              <span style={{ width: '2px', height: '20px', background: 'var(--border-color)', margin: '0 0.5rem' }}></span>
              <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }} onClick={handleClearAll}>
                Limpar Tudo
              </button>

              <span style={{ width: '2px', height: '20px', background: 'var(--border-color)', margin: '0 0.5rem' }}></span>
              <button className="btn btn-secondary" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>&larr;</button>
              <button className="btn btn-secondary" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>&rarr;</button>
            </div>
          </div>

          <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', display: 'flex', gap: '3rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total de Horas no Mês</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatDuration(totalHoursDec)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Horas Extras no Mês</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalOvertimeDec > 0 ? 'var(--success-color)' : 'var(--text-primary)' }}>{formatDuration(totalOvertimeDec)}</div>
            </div>
          </div>

          <div className="glass-panel table-container">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th style={{ width: '100px' }}>Obrig.</th>
                  <th>Entrada 1</th>
                  <th>Saída 1</th>
                  <th>Entrada 2</th>
                  <th>Saída 2</th>
                  <th>Extra Início</th>
                  <th>Extra Fim</th>
                  <th>Total / Extra</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {days.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const log = timesheets[dateStr] || {};
                  const formatT = (val) => {
                    if (!val) return '-';
                    if (typeof val === 'string') return val.substring(0, 5);
                    if (typeof val === 'object') {
                      const h = String(val.hours || 0).padStart(2, '0');
                      const m = String(val.minutes || 0).padStart(2, '0');
                      return `${h}:${m}`;
                    }
                    return '-';
                  };

                  return (
                    <React.Fragment key={dateStr}>
                      <tr style={{ opacity: isWeekend ? 0.7 : 1, background: isWeekend ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <strong>{format(date, 'dd/MM')}</strong>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{format(date, 'EEEE', { locale: ptBR }).substring(0, 3)}</span>
                        </td>
                        <td>
                          <InputCell val={log.jornada || (isWeekend ? '' : '08:00')} field="jornada" dateStr={dateStr} />
                        </td>
                        <td><InputCell val={log.period1_start} field="period1_start" dateStr={dateStr} /></td>
                        <td><InputCell val={log.period1_end} field="period1_end" dateStr={dateStr} /></td>
                        <td><InputCell val={log.period2_start} field="period2_start" dateStr={dateStr} /></td>
                        <td><InputCell val={log.period2_end} field="period2_end" dateStr={dateStr} /></td>
                        <td><InputCell val={log.extra1_start} field="extra1_start" dateStr={dateStr} /></td>
                        <td><InputCell val={log.extra1_end} field="extra1_end" dateStr={dateStr} /></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600 }}>{formatT(log.total_hours)}</div>
                          <div style={{ fontSize: '0.75rem', color: log.overtime_hours && log.overtime_hours !== '00:00:00' && log.overtime_hours !== '00:00' ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                            {formatT(log.overtime_hours)}
                          </div>
                        </td>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="text"
                            className="desc-input"
                            placeholder="Sua atividade..."
                            value={log.activity_description || ''}
                            onChange={(e) => handleChange(dateStr, 'activity_description', e.target.value)}
                            onBlur={() => handeBlur(dateStr)}
                          />
                          <button className="btn" style={{ padding: '0.2rem' }} onClick={() => toggleRow(dateStr)} title="Adicionar Extras">
                            {expandedRows[dateStr] ? <Minus size={14} /> : <Plus size={14} />}
                          </button>
                        </td>
                      </tr>
                      {expandedRows[dateStr] && (
                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <td colSpan={2}></td>
                          <td colSpan={2} style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Extras Adicionais:</td>
                          <td><InputCell val={log.extra2_start} field="extra2_start" dateStr={dateStr} /></td>
                          <td><InputCell val={log.extra2_end} field="extra2_end" dateStr={dateStr} /></td>
                          <td><InputCell val={log.extra3_start} field="extra3_start" dateStr={dateStr} /></td>
                          <td><InputCell val={log.extra3_end} field="extra3_end" dateStr={dateStr} /></td>
                          <td colSpan={2}></td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <footer className="hacker-footer">
        <div>[SYSTEM PmsCompany] © 2026 Todos os direitos reservados.</div>
        <div className="version">Versão 1.0.0</div>
      </footer>
    </div>
  );
}

export default App;
