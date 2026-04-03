const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors());
app.use(express.json());

const timesheetsRouter = require('./routes/timesheets');
app.use('/api/timesheets', timesheetsRouter);

const excelRouter = require('./routes/excel');
app.use('/api/excel', excelRouter);

const reportsRouter = require('./routes/reports');
app.use('/api/reports', reportsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
