CREATE TABLE IF NOT EXISTS pomodoro_settings (
  id BIGSERIAL PRIMARY KEY,
  focus_minutes INT NOT NULL DEFAULT 25,
  short_break_minutes INT NOT NULL DEFAULT 5,
  long_break_minutes INT NOT NULL DEFAULT 15,
  long_break_interval INT NOT NULL DEFAULT 4,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO pomodoro_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  estimated_pomodoros INT NOT NULL DEFAULT 1,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS timer_sessions (
  id UUID PRIMARY KEY,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  running_since TIMESTAMPTZ,
  pause_accumulation_seconds BIGINT NOT NULL DEFAULT 0,
  cycle_index INT NOT NULL DEFAULT 0,
  elapsed_seconds BIGINT NOT NULL DEFAULT 0,
  task_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timer_sessions_status ON timer_sessions(status);

CREATE TABLE IF NOT EXISTS stats_daily (
  day DATE PRIMARY KEY,
  focus_seconds BIGINT NOT NULL DEFAULT 0,
  completed_pomodoros INT NOT NULL DEFAULT 0,
  completed_tasks INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
