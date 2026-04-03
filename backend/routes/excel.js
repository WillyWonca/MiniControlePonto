const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const db = require('../db');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Assuming first sheet is the one (e.g. '202604')
    const sheet = workbook.Sheets[sheetName];
    // Convert to JSON, but the specific file format has headers on row 2 (index 1)
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // We must find the rows that actually correspond to dates.
    // In "Apontamento Mensal", rows with dates usually start at index 2 (row 3).
    // Column 0: Weekday, Column 1: Date, Col 2: Jornada, Col 3: Início, Col 4: Fim...
    const toTime = (val) => {
        if (!val) return null;
        if (typeof val === 'number') {
            // Excel time decimal (fraction of a day)
            const totalSeconds = Math.round(val * 24 * 60 * 60);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`;
        }
        if (typeof val === 'string' && val.includes(':')) return val.substring(0,8);
        return null; // fallback
    };

    for (let i = 2; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        let rawDate = row[1];
        if (!rawDate) continue; // Total row or empty row
        
        // Handle Excel date serial or JS Date
        let dateVal = null;
        if (typeof rawDate === 'number') {
            dateVal = new Date((rawDate - (25567 + 1)) * 86400 * 1000); // Excel dates origin bug adjust
        } else if (rawDate instanceof Date) {
            dateVal = rawDate;
        } else if (typeof rawDate === 'string') {
            let pDate = new Date(rawDate);
            if(!isNaN(pDate.getTime())) dateVal = pDate;
        }

        if (dateVal && dateVal.getFullYear() > 2000) {
            const dateStr = dateVal.toISOString().split('T')[0];
            const weekday = row[0] || '';
            const jornada = toTime(row[2]) || '08:00:00';
            const period1_start = toTime(row[3]);
            const period1_end = toTime(row[4]);
            const period2_start = toTime(row[5]);
            const period2_end = toTime(row[6]);
            const extra1_start = toTime(row[7]);
            const extra1_end = toTime(row[8]);
            const extra2_start = toTime(row[9]);
            const extra2_end = toTime(row[10]);
            const extra3_start = toTime(row[11]);
            const extra3_end = toTime(row[12]);
            const total_hours = toTime(row[15]);
            const overtime_hours = toTime(row[16]);
            const activity_description = row[17] || '';

            const query = `
            INSERT INTO timesheets (
                date, weekday, jornada, period1_start, period1_end, period2_start, period2_end,
                extra1_start, extra1_end, extra2_start, extra2_end, extra3_start, extra3_end,
                total_hours, overtime_hours, activity_description
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            ) ON CONFLICT (date) DO UPDATE SET
                weekday = EXCLUDED.weekday, jornada = EXCLUDED.jornada,
                period1_start = EXCLUDED.period1_start, period1_end = EXCLUDED.period1_end,
                period2_start = EXCLUDED.period2_start, period2_end = EXCLUDED.period2_end,
                extra1_start = EXCLUDED.extra1_start, extra1_end = EXCLUDED.extra1_end,
                extra2_start = EXCLUDED.extra2_start, extra2_end = EXCLUDED.extra2_end,
                extra3_start = EXCLUDED.extra3_start, extra3_end = EXCLUDED.extra3_end,
                total_hours = EXCLUDED.total_hours, overtime_hours = EXCLUDED.overtime_hours,
                activity_description = EXCLUDED.activity_description;
            `;
            await db.query(query, [
                dateStr, weekday, jornada, period1_start, period1_end, period2_start, period2_end,
                extra1_start, extra1_end, extra2_start, extra2_end, extra3_start, extra3_end,
                total_hours || '00:00:00', overtime_hours || '00:00:00', activity_description
            ]);
        }
    }
    res.json({ success: true, message: 'Planilha importada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar planilha' });
  }
});

router.get('/export/:yearMonth', async (req, res) => {
    try {
        const { yearMonth } = req.params; // Format: YYYY-MM
        const [year, month] = yearMonth.split('-');
        
        const { rows } = await db.query(
            "SELECT * FROM timesheets WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2 ORDER BY date ASC",
            [year, month]
        );

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(`${year}${month}`);

        // Build the Headers
        sheet.addRow(['Configurações', '', '', 'Ponto Diário', '', '', '', 'Atividade Extra', '', '', '', '', '', '', '', 'Totais diários', '', 'Organização']);
        sheet.addRow(['Dia Da Semana', 'Data', 'Jornada', 'Início', 'Fim', 'Início', 'Fim', 'Início', 'Fim', 'Início', 'Fim', 'Início', 'Fim', 'Início', 'Fim', 'Qtde Horas', 'Horas Extras', 'Atividade']);

        // Merge headers like the original template
        sheet.mergeCells('D1:G1'); // Ponto Diário
        sheet.mergeCells('H1:O1'); // Atividade Extra
        sheet.mergeCells('P1:Q1'); // Totais diários

        // Populate rows
        let totalHours = 0;
        let totalOvertime = 0;

        const parseInterval = (interval) => {
            if(!interval) return 0;
            if(typeof interval === 'string') {
               const parts = interval.split(':');
               return parseInt(parts[0]||0) + parseInt(parts[1]||0)/60;
            }
            return (interval.hours||0) + (interval.minutes||0)/60;
        };

        const formatExcelTime = (timeStr) => {
            if (!timeStr) return '';
            const t = typeof timeStr === 'string' ? timeStr : timeStr.hours ? `${timeStr.hours}:${timeStr.minutes}` : null;
            if(!t) return '';
            const [h, m] = t.split(':');
            return new Date(0, 0, 0, h, m, 0); 
        };

        rows.forEach(r => {
            const dateObj = new Date(r.date);
            totalHours += parseInterval(r.total_hours);
            totalOvertime += parseInterval(r.overtime_hours);

            sheet.addRow([
                r.weekday,
                dateObj,
                formatExcelTime(r.jornada),
                formatExcelTime(r.period1_start),
                formatExcelTime(r.period1_end),
                formatExcelTime(r.period2_start),
                formatExcelTime(r.period2_end),
                formatExcelTime(r.extra1_start),
                formatExcelTime(r.extra1_end),
                formatExcelTime(r.extra2_start),
                formatExcelTime(r.extra2_end),
                formatExcelTime(r.extra3_start),
                formatExcelTime(r.extra3_end),
                '', '',
                formatExcelTime(r.total_hours),
                formatExcelTime(r.overtime_hours),
                r.activity_description
            ]);
        });

        // Add Total Row
        const totalRow = sheet.addRow(['', '', '', '', '', '', '', 'TOTAL', '', '', '', '', '', '', '', 
            Math.floor(totalHours)+':'+Math.round((totalHours%1)*60), 
            Math.floor(totalOvertime)+':'+Math.round((totalOvertime%1)*60), 
            ''
        ]);
        totalRow.font = { bold: true };

        // Enhance Styles: Column Widths
        sheet.getColumn(1).width = 15; // Dia da Semana
        sheet.getColumn(2).width = 15; // Data
        sheet.getColumn(3).width = 12; // Jornada
        for(let i=4; i<=15; i++) sheet.getColumn(i).width = 10; // Times
        sheet.getColumn(16).width = 14; // Qtde Horas
        sheet.getColumn(17).width = 14; // Extras
        sheet.getColumn(18).width = 40; // Atividade

        // Apply Styles to Headers (Rows 1 and 2)
        [1, 2].forEach(rowNum => {
            const row = sheet.getRow(rowNum);
            row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.alignment = { vertical: 'middle', horizontal: 'center' };
            row.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF0EA5E9' } // Sky blue
                };
                cell.border = {
                    top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                };
            });
        });

        // Apply alignment and border to data rows
        for(let i=3; i <= sheet.rowCount; i++) {
             const row = sheet.getRow(i);
             row.alignment = { vertical: 'middle', horizontal: 'center' };
             // align description left
             const descCell = row.getCell(18);
             if(descCell) descCell.alignment = { vertical: 'middle', horizontal: 'left' };
             
             row.eachCell(cell => {
                 cell.border = {
                    top: {style:'thin', color:{argb:'FFD1D5DB'}}, 
                    left: {style:'thin', color:{argb:'FFD1D5DB'}}, 
                    bottom: {style:'thin', color:{argb:'FFD1D5DB'}}, 
                    right: {style:'thin', color:{argb:'FFD1D5DB'}}
                 };
             });
        }

        const timeColFormat = { numFmt: 'hh:mm' };
        sheet.getColumn(2).numFmt = 'dd/mm/yyyy'; // date
        sheet.getColumn(3).numFmt = 'hh:mm'; // jornada
        sheet.columns.forEach((c, i) => {
            if (i >= 2 && i <= 16) c.numFmt = 'hh:mm';
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Apontamento_${year}_${month}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro na exportação Excel' });
    }
});

router.get('/export-annual/:year', async (req, res) => {
    try {
        const { year } = req.params;
        
        const { rows } = await db.query(
            "SELECT * FROM timesheets WHERE EXTRACT(YEAR FROM date) = $1 ORDER BY date ASC",
            [year]
        );

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(`Relatório Anual ${year}`);

        sheet.addRow(['Resumo Anual', year]);
        sheet.addRow(['Mês', 'Total Horas Regulares', 'Total Horas Extras', 'Dias Trabalhados']);

        const parseInterval = (interval) => {
            if(!interval) return 0;
            if(typeof interval === 'string') {
               const parts = interval.split(':');
               return parseInt(parts[0]||0) + parseInt(parts[1]||0)/60;
            }
            return (interval.hours||0) + (interval.minutes||0)/60;
        };

        const monthlyData = Array.from({length: 12}, (_, i) => ({
             monthStr: new Date(year, i).toLocaleString('pt-BR', {month: 'long'}),
             totalHrs: 0,
             overtimeHrs: 0,
             daysWorked: 0
        }));

        rows.forEach(r => {
            const mIdx = new Date(r.date).getMonth();
            const th = parseInterval(r.total_hours);
            const oh = parseInterval(r.overtime_hours);
            monthlyData[mIdx].totalHrs += th;
            monthlyData[mIdx].overtimeHrs += oh;
            if(th > 0) monthlyData[mIdx].daysWorked++;
        });

        const formatDec = (dec) => {
            if(dec <= 0) return '00:00';
            const h = Math.floor(dec);
            const m = Math.round((dec-h)*60);
            return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        };

        let grandTotal = 0;
        let grandOvertime = 0;

        monthlyData.forEach(m => {
            sheet.addRow([
                m.monthStr.charAt(0).toUpperCase() + m.monthStr.slice(1),
                formatDec(m.totalHrs),
                formatDec(m.overtimeHrs),
                m.daysWorked
            ]);
            grandTotal += m.totalHrs;
            grandOvertime += m.overtimeHrs;
        });

        const totalRow = sheet.addRow(['TOTAL ANUAL', formatDec(grandTotal), formatDec(grandOvertime), '']);
        totalRow.font = { bold: true };

        // Polish styling for Annual Export
        sheet.getColumn(1).width = 20;
        sheet.getColumn(2).width = 25;
        sheet.getColumn(3).width = 25;
        sheet.getColumn(4).width = 20;

        // Header Styling
        [1, 2].forEach(rowNum => {
            const row = sheet.getRow(rowNum);
            row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.alignment = { vertical: 'middle', horizontal: 'center' };
            row.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF0EA5E9' } // Sky Blue matching frontend
                };
                cell.border = {
                    top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                };
            });
        });

        // Merging first row title across all 4 cols
        sheet.mergeCells('A1:D1');
        sheet.getCell('A1').value = `Resumo Executivo Anual - ${year}`;

        // Data Row Styling
        for (let i = 3; i <= sheet.rowCount; i++) {
             const row = sheet.getRow(i);
             row.alignment = { vertical: 'middle', horizontal: 'center' };
             
             // Month column left-aligned
             const monthCell = row.getCell(1);
             if (monthCell && i < sheet.rowCount) monthCell.alignment = { vertical: 'middle', horizontal: 'left' };

             row.eachCell(cell => {
                 cell.border = {
                    top: {style:'thin', color:{argb:'FFD1D5DB'}}, 
                    left: {style:'thin', color:{argb:'FFD1D5DB'}}, 
                    bottom: {style:'thin', color:{argb:'FFD1D5DB'}}, 
                    right: {style:'thin', color:{argb:'FFD1D5DB'}}
                 };
             });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Relatorio_Anual_${year}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro na exportação anual Excel' });
    }
});

router.get('/template/:type/:period', async (req, res) => {
    try {
        const { type, period } = req.params; // 'monthly' or 'annual'
        let startDate, endDate;
        
        if (type === 'monthly') {
            const [y, m] = period.split('-');
            startDate = new Date(y, parseInt(m)-1, 1);
            endDate = new Date(y, parseInt(m), 0);
        } else if (type === 'annual') {
            const y = parseInt(period);
            startDate = new Date(y, 0, 1);
            endDate = new Date(y, 11, 31);
        } else {
            return res.status(400).json({error: 'Tipo inválido'});
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(`Modelo ${type === 'monthly' ? period : period}`);

        sheet.addRow(['Configurações', '', '', 'Ponto Diário', '', '', '', 'Atividade Extra', '', '', '', '', '', '', '', 'Totais diários', '', 'Organização']);
        sheet.addRow(['Dia Da Semana', 'Data', 'Jornada', 'Início', 'Fim', 'Início', 'Fim', 'Início', 'Fim', 'Início', 'Fim', 'Início', 'Fim', 'Início', 'Fim', 'Qtde Horas', 'Horas Extras', 'Atividade']);

        sheet.mergeCells('D1:G1'); 
        sheet.mergeCells('H1:O1'); 
        sheet.mergeCells('P1:Q1'); 

        const ptBRWeekdays = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

        let curr = new Date(startDate);
        while (curr <= endDate) {
            sheet.addRow([
                ptBRWeekdays[curr.getDay()],
                new Date(curr),
                (curr.getDay() === 0 || curr.getDay() === 6) ? '' : new Date(0,0,0,8,0,0), // 08:00 Jornada for weekdays
                '','','','','','','','','','','','',
                '','',''
            ]);
            curr.setDate(curr.getDate() + 1);
        }

        sheet.getColumn(1).width = 15;
        sheet.getColumn(2).width = 15;
        sheet.getColumn(3).width = 12;
        for(let i=4; i<=15; i++) sheet.getColumn(i).width = 10;
        sheet.getColumn(16).width = 14;
        sheet.getColumn(17).width = 14;
        sheet.getColumn(18).width = 40;

        [1, 2].forEach(rowNum => {
            const row = sheet.getRow(rowNum);
            row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.alignment = { vertical: 'middle', horizontal: 'center' };
            row.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF0EA5E9' }
                };
                cell.border = {
                    top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                };
            });
        });

        for(let i=3; i <= sheet.rowCount; i++) {
             const row = sheet.getRow(i);
             row.alignment = { vertical: 'middle', horizontal: 'center' };
             const descCell = row.getCell(18);
             if(descCell) descCell.alignment = { vertical: 'middle', horizontal: 'left' };
             
             row.eachCell(cell => {
                 cell.border = {
                    top: {style:'thin', color:{argb:'FFD1D5DB'}}, 
                    left: {style:'thin', color:{argb:'FFD1D5DB'}}, 
                    bottom: {style:'thin', color:{argb:'FFD1D5DB'}}, 
                    right: {style:'thin', color:{argb:'FFD1D5DB'}}
                 };
             });
        }

        sheet.getColumn(2).numFmt = 'dd/mm/yyyy'; // date
        sheet.getColumn(3).numFmt = 'hh:mm'; // jornada
        sheet.columns.forEach((c, i) => {
            if (i >= 2 && i <= 16) c.numFmt = 'hh:mm';
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Modelo_${type}_${period}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Erro na geração de modelo excel' });
    }
});

module.exports = router;
