import React, { useState, useEffect } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Plus, LogOut, Check, X } from 'lucide-react';
import { calculateDailyTotals } from '../utils';

export default function DailyLogModal({ isOpen, onClose, initialData, onSave }) {
  const [formData, setFormData] = useState(initialData || { jornada: '08:00', activity_description: '' });
  
  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      const totals = calculateDailyTotals(updated);
      return { ...updated, total_hours: totals.total_hours, overtime_hours: totals.overtime_hours };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ background: 'var(--bg-color)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Registro de Ponto - {formData.date ? format(new Date(formData.date), 'dd/MM/yyyy') : ''}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-2">
              <div className="form-group">
                <label>Jornada (Horas Previstas)</label>
                <input type="time" name="jornada" className="form-control" value={formData.jornada || ''} onChange={handleChange} />
              </div>
            </div>

            <div className="section-title">Ponto Diário</div>
            <div className="grid-2">
              <div className="form-group">
                <label>Início (1º Período)</label>
                <input type="time" name="period1_start" className="form-control" value={formData.period1_start || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Fim (1º Período)</label>
                <input type="time" name="period1_end" className="form-control" value={formData.period1_end || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Início (2º Período)</label>
                <input type="time" name="period2_start" className="form-control" value={formData.period2_start || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Fim (2º Período)</label>
                <input type="time" name="period2_end" className="form-control" value={formData.period2_end || ''} onChange={handleChange} />
              </div>
            </div>

            <div className="section-title">Atividade Extra</div>
            <div className="grid-2">
              <div className="form-group">
                <label>Início Extra 1</label>
                <input type="time" name="extra1_start" className="form-control" value={formData.extra1_start || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Fim Extra 1</label>
                <input type="time" name="extra1_end" className="form-control" value={formData.extra1_end || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Início Extra 2</label>
                <input type="time" name="extra2_start" className="form-control" value={formData.extra2_start || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Fim Extra 2</label>
                <input type="time" name="extra2_end" className="form-control" value={formData.extra2_end || ''} onChange={handleChange} />
              </div>
            </div>

            <div className="section-title">Descrição / Organização</div>
            <div className="form-group">
              <textarea name="activity_description" className="form-control" rows="3" value={formData.activity_description || ''} onChange={handleChange} placeholder="Descreva as atividades do dia..."></textarea>
            </div>
            
            <div className="grid-2" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Horas</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-color)' }}>{formData.total_hours || '00:00'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Horas Extras</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: formData.overtime_hours && formData.overtime_hours !== '00:00' ? 'var(--success-color)' : 'var(--text-primary)' }}>{formData.overtime_hours || '00:00'}</div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn"><Check size={18} /> Salvar Registro</button>
          </div>
        </form>
      </div>
    </div>
  );
}
