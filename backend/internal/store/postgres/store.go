package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kenta/focus-todo-fork/backend/internal/model"
)

type Store struct {
	pool *pgxpool.Pool
}

func New(ctx context.Context, dbURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		return nil, err
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() {
	s.pool.Close()
}

func (s *Store) GetSettings(ctx context.Context) (model.PomodoroSettings, error) {
	var out model.PomodoroSettings
	err := s.pool.QueryRow(ctx, `SELECT focus_minutes, short_break_minutes, long_break_minutes, long_break_interval FROM pomodoro_settings WHERE id=1`).
		Scan(&out.FocusMinutes, &out.ShortBreakMinutes, &out.LongBreakMinutes, &out.LongBreakInterval)
	return out, err
}

func (s *Store) UpdateSettings(ctx context.Context, in model.PomodoroSettings) (model.PomodoroSettings, error) {
	_, err := s.pool.Exec(ctx, `UPDATE pomodoro_settings SET focus_minutes=$1, short_break_minutes=$2, long_break_minutes=$3, long_break_interval=$4, updated_at=NOW() WHERE id=1`, in.FocusMinutes, in.ShortBreakMinutes, in.LongBreakMinutes, in.LongBreakInterval)
	if err != nil {
		return model.PomodoroSettings{}, err
	}
	return s.GetSettings(ctx)
}

func (s *Store) ActiveSession(ctx context.Context) (model.TimerSession, error) {
	var out model.TimerSession
	var startedAt, runningSince *time.Time
	err := s.pool.QueryRow(ctx, `SELECT id, phase, status, started_at, running_since, pause_accumulation_seconds, cycle_index, elapsed_seconds FROM timer_sessions WHERE status IN ('running','paused') ORDER BY updated_at DESC LIMIT 1`).
		Scan(&out.ID, &out.Phase, &out.Status, &startedAt, &runningSince, &out.PauseAccumulationSeconds, &out.CycleIndex, &out.ElapsedSeconds)
	if err != nil {
		return model.TimerSession{}, err
	}
	out.StartedAt = startedAt
	out.RunningSince = runningSince
	return out, nil
}

func (s *Store) UpsertSession(ctx context.Context, in model.TimerSession) (model.TimerSession, error) {
	if in.ID == "" {
		in.ID = uuid.NewString()
	}
	_, err := s.pool.Exec(ctx, `INSERT INTO timer_sessions (id, phase, status, started_at, running_since, pause_accumulation_seconds, cycle_index, elapsed_seconds, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
    ON CONFLICT (id) DO UPDATE SET phase=EXCLUDED.phase, status=EXCLUDED.status, started_at=EXCLUDED.started_at, running_since=EXCLUDED.running_since,
    pause_accumulation_seconds=EXCLUDED.pause_accumulation_seconds, cycle_index=EXCLUDED.cycle_index, elapsed_seconds=EXCLUDED.elapsed_seconds, updated_at=NOW()`,
		in.ID, in.Phase, in.Status, in.StartedAt, in.RunningSince, in.PauseAccumulationSeconds, in.CycleIndex, in.ElapsedSeconds)
	return in, err
}

func (s *Store) ResetActiveSession(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `UPDATE timer_sessions
SET status='idle',
    phase='focus',
    started_at=NULL,
    running_since=NULL,
    pause_accumulation_seconds=0,
    elapsed_seconds=0,
    updated_at=NOW()
WHERE id IN (
  SELECT id FROM timer_sessions
  WHERE status IN ('running','paused')
  ORDER BY updated_at DESC
  LIMIT 1
)`)
	return err
}

func (s *Store) CreateTask(ctx context.Context, in model.Task) (model.Task, error) {
	in.ID = uuid.NewString()
	now := time.Now().UTC()
	in.CreatedAt, in.UpdatedAt = now, now
	_, err := s.pool.Exec(ctx, `INSERT INTO tasks (id, title, note, estimated_pomodoros, completed, created_at, updated_at) VALUES ($1,$2,$3,$4,false,$5,$6)`, in.ID, in.Title, in.Note, in.EstimatedPomodoros, in.CreatedAt, in.UpdatedAt)
	if err != nil {
		return model.Task{}, err
	}
	if err := s.replaceTags(ctx, in.ID, in.Tags); err != nil {
		return model.Task{}, err
	}
	return s.GetTask(ctx, in.ID)
}

func (s *Store) GetTask(ctx context.Context, id string) (model.Task, error) {
	var out model.Task
	err := s.pool.QueryRow(ctx, `SELECT id, title, note, estimated_pomodoros, completed, created_at, updated_at FROM tasks WHERE id=$1`, id).
		Scan(&out.ID, &out.Title, &out.Note, &out.EstimatedPomodoros, &out.Completed, &out.CreatedAt, &out.UpdatedAt)
	if err != nil {
		return model.Task{}, err
	}
	tags, err := s.tagsByTask(ctx, out.ID)
	if err != nil {
		return model.Task{}, err
	}
	out.Tags = tags
	return out, nil
}

func (s *Store) ListTasks(ctx context.Context, includeCompleted bool) ([]model.Task, error) {
	q := `SELECT id, title, note, estimated_pomodoros, completed, created_at, updated_at FROM tasks ORDER BY created_at DESC`
	args := []any{}
	if !includeCompleted {
		q = `SELECT id, title, note, estimated_pomodoros, completed, created_at, updated_at FROM tasks WHERE completed=false ORDER BY created_at DESC`
	}
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.Task, 0)
	for rows.Next() {
		var t model.Task
		if err := rows.Scan(&t.ID, &t.Title, &t.Note, &t.EstimatedPomodoros, &t.Completed, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tags, err := s.tagsByTask(ctx, t.ID)
		if err != nil {
			return nil, err
		}
		t.Tags = tags
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *Store) UpdateTask(ctx context.Context, in model.Task) (model.Task, error) {
	_, err := s.pool.Exec(ctx, `UPDATE tasks SET title=$2, note=$3, estimated_pomodoros=$4, updated_at=NOW() WHERE id=$1`, in.ID, in.Title, in.Note, in.EstimatedPomodoros)
	if err != nil {
		return model.Task{}, err
	}
	if err := s.replaceTags(ctx, in.ID, in.Tags); err != nil {
		return model.Task{}, err
	}
	return s.GetTask(ctx, in.ID)
}

func (s *Store) CompleteTask(ctx context.Context, id string) (model.Task, error) {
	_, err := s.pool.Exec(ctx, `UPDATE tasks SET completed=true, completed_at=NOW(), updated_at=NOW() WHERE id=$1`, id)
	if err != nil {
		return model.Task{}, err
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO stats_daily (day, completed_tasks, updated_at) VALUES (CURRENT_DATE, 1, NOW()) ON CONFLICT(day) DO UPDATE SET completed_tasks = stats_daily.completed_tasks + 1, updated_at=NOW()`)
	if err != nil {
		return model.Task{}, err
	}
	return s.GetTask(ctx, id)
}

func (s *Store) DeleteTask(ctx context.Context, id string) (bool, error) {
	cmd, err := s.pool.Exec(ctx, `DELETE FROM tasks WHERE id=$1`, id)
	if err != nil {
		return false, err
	}
	return cmd.RowsAffected() > 0, nil
}

func (s *Store) AddFocusDelta(ctx context.Context, day time.Time, seconds int64, completedPomodoros int32) error {
	_, err := s.pool.Exec(ctx, `INSERT INTO stats_daily (day, focus_seconds, completed_pomodoros, updated_at) VALUES ($1, $2, $3, NOW())
ON CONFLICT(day) DO UPDATE SET focus_seconds=stats_daily.focus_seconds + EXCLUDED.focus_seconds,
completed_pomodoros=stats_daily.completed_pomodoros + EXCLUDED.completed_pomodoros, updated_at=NOW()`, day.Format("2006-01-02"), seconds, completedPomodoros)
	return err
}

func (s *Store) StatsRange(ctx context.Context, from, to time.Time) ([]model.StatsPoint, error) {
	rows, err := s.pool.Query(ctx, `SELECT day::text, focus_seconds, completed_pomodoros, completed_tasks FROM stats_daily WHERE day BETWEEN $1 AND $2 ORDER BY day ASC`, from.Format("2006-01-02"), to.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]model.StatsPoint, 0)
	for rows.Next() {
		var p model.StatsPoint
		if err := rows.Scan(&p.Label, &p.FocusSeconds, &p.CompletedPomodoros, &p.CompletedTasks); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) replaceTags(ctx context.Context, taskID string, tags []string) error {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `DELETE FROM task_tags WHERE task_id=$1`, taskID); err != nil {
		return err
	}
	for _, tag := range tags {
		tagID := uuid.NewString()
		if _, err := tx.Exec(ctx, `INSERT INTO tags (id, name) VALUES ($1,$2) ON CONFLICT(name) DO NOTHING`, tagID, tag); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO task_tags (task_id, tag_id) SELECT $1, id FROM tags WHERE name=$2 ON CONFLICT DO NOTHING`, taskID, tag); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *Store) tagsByTask(ctx context.Context, taskID string) ([]string, error) {
	rows, err := s.pool.Query(ctx, `SELECT t.name FROM tags t JOIN task_tags tt ON t.id=tt.tag_id WHERE tt.task_id=$1 ORDER BY t.name`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		tags = append(tags, name)
	}
	return tags, rows.Err()
}
