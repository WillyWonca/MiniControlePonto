const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/annual/:year', async (req, res) => {
    try {
        const { year } = req.params;
        const { rows } = await db.query(
            "SELECT * FROM timesheets WHERE EXTRACT(YEAR FROM date) = $1", 
            [year]
        );

        const monthlyStats = Array.from({length: 12}, (_, i) => ({
             month: i + 1, 
             name: new Date(year, i).toLocaleString('pt-BR', {month: 'short'}),
             total_hours_dec: 0, 
             overtime_hours_dec: 0 
        }));

        const parseInterval = (interval) => {
            if(!interval) return 0;
            if(typeof interval === 'string') {
               const parts = interval.split(':');
               return parseInt(parts[0]||0) + parseInt(parts[1]||0)/60;
            }
            return (interval.hours||0) + (interval.minutes||0)/60;
        };

        let highestOvertimeMonth = { month: '-', value: 0 };
        let mostProductiveMonth = { month: '-', value: 0 };
        
        let weekdayCounts = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 }; // 0: Sunday, 6: Saturday
        let weekdayOvertime = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 }; 

        rows.forEach(r => {
            const dateObj = new Date(r.date);
            const mIdx = dateObj.getMonth();
            const wIdx = dateObj.getDay();
            
            const th = parseInterval(r.total_hours);
            const oh = parseInterval(r.overtime_hours);
            
            monthlyStats[mIdx].total_hours_dec += th;
            monthlyStats[mIdx].overtime_hours_dec += oh;
            
            if(oh > 0) {
               weekdayCounts[wIdx]++;
               weekdayOvertime[wIdx] += oh;
            }
        });

        monthlyStats.forEach(m => {
            if(m.overtime_hours_dec > highestOvertimeMonth.value) {
                highestOvertimeMonth = { month: m.name, value: m.overtime_hours_dec };
            }
            if(m.total_hours_dec > mostProductiveMonth.value) {
                mostProductiveMonth = { month: m.name, value: m.total_hours_dec };
            }
        });

        const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        let peakOvertimeDay = '-';
        let maxOvertime = 0;
        for(let i=0; i<7; i++){
            if(weekdayOvertime[i] > maxOvertime) {
                maxOvertime = weekdayOvertime[i];
                peakOvertimeDay = weekdays[i];
            }
        }

        res.json({
            monthlyData: monthlyStats,
            highlights: {
                highestOvertimeMonth: highestOvertimeMonth.month,
                mostProductiveMonth: mostProductiveMonth.month,
                peakOvertimeDay: peakOvertimeDay,
                totalYearHours: monthlyStats.reduce((acc, m) => acc + m.total_hours_dec, 0),
                totalYearOvertime: monthlyStats.reduce((acc, m) => acc + m.overtime_hours_dec, 0)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error generating annual report' });
    }
});

module.exports = router;
