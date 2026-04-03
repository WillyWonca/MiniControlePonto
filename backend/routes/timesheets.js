const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all timesheets
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM timesheets ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching timesheets' });
  }
});

// Create or update timesheet for a date
router.post('/', async (req, res) => {
  const { date, weekday, jornada, period1_start, period1_end, period2_start, period2_end, extra1_start, extra1_end, extra2_start, extra2_end, extra3_start, extra3_end, activity_description, total_hours, overtime_hours } = req.body;

  try {
    // Upsert logic
    const query = `
      INSERT INTO timesheets (
        date, weekday, jornada, period1_start, period1_end, period2_start, period2_end,
        extra1_start, extra1_end, extra2_start, extra2_end, extra3_start, extra3_end,
        activity_description, total_hours, overtime_hours
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      ON CONFLICT (date) DO UPDATE SET
        weekday = EXCLUDED.weekday,
        jornada = EXCLUDED.jornada,
        period1_start = EXCLUDED.period1_start,
        period1_end = EXCLUDED.period1_end,
        period2_start = EXCLUDED.period2_start,
        period2_end = EXCLUDED.period2_end,
        extra1_start = EXCLUDED.extra1_start,
        extra1_end = EXCLUDED.extra1_end,
        extra2_start = EXCLUDED.extra2_start,
        extra2_end = EXCLUDED.extra2_end,
        extra3_start = EXCLUDED.extra3_start,
        extra3_end = EXCLUDED.extra3_end,
        activity_description = EXCLUDED.activity_description,
        total_hours = EXCLUDED.total_hours,
        overtime_hours = EXCLUDED.overtime_hours
      RETURNING *;
    `;
    
    const values = [
      date, weekday, jornada, period1_start, period1_end, period2_start, period2_end,
      extra1_start, extra1_end, extra2_start, extra2_end, extra3_start, extra3_end,
      activity_description, total_hours, overtime_hours
    ];

    const { rows } = await db.query(query, values);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error saving timesheet' });
  }
});

// Clear all timesheets
router.delete('/', async (req, res) => {
  try {
    await db.query('DELETE FROM timesheets');
    res.json({ success: true, message: 'All records deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error clearing timesheets' });
  }
});

module.exports = router;
