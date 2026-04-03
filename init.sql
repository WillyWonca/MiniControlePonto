CREATE TABLE IF NOT EXISTS timesheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  weekday VARCHAR(20) NOT NULL,
  jornada TIME DEFAULT '08:00:00',
  period1_start TIME,
  period1_end TIME,
  period2_start TIME,
  period2_end TIME,
  extra1_start TIME,
  extra1_end TIME,
  extra2_start TIME,
  extra2_end TIME,
  extra3_start TIME,
  extra3_end TIME,
  total_hours INTERVAL,
  overtime_hours INTERVAL,
  activity_description TEXT
);
