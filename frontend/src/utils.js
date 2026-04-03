export const calculateDuration = (start, end) => {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  
  const d1 = new Date(); d1.setHours(h1, m1, 0, 0);
  const d2 = new Date(); d2.setHours(h2, m2, 0, 0);
  
  if (d2 < d1) d2.setDate(d2.getDate() + 1); // crossing midnight
  return (d2 - d1) / (1000 * 60 * 60); // decimal hours
};

export const formatDuration = (decimalHours) => {
  if (!decimalHours || decimalHours <= 0) return '00:00';
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const calculateDailyTotals = (formData) => {
  let totalHours = 0;
  totalHours += calculateDuration(formData.period1_start, formData.period1_end);
  totalHours += calculateDuration(formData.period2_start, formData.period2_end);
  totalHours += calculateDuration(formData.extra1_start, formData.extra1_end);
  totalHours += calculateDuration(formData.extra2_start, formData.extra2_end);
  totalHours += calculateDuration(formData.extra3_start, formData.extra3_end);
  
  const expected = calculateDuration('00:00', formData.jornada || '08:00');
  let overtimeHours = totalHours > expected ? totalHours - expected : 0;
  
  return {
    total_hours: formatDuration(totalHours),
    overtime_hours: formatDuration(overtimeHours),
    decimal_total: totalHours,
    decimal_overtime: overtimeHours
  };
};
