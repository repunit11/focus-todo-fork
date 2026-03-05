package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/kenta/focus-todo-fork/backend/internal/model"
	"github.com/kenta/focus-todo-fork/backend/internal/timer"
)

type Repository interface {
	GetSettings(context.Context) (model.PomodoroSettings, error)
	UpdateSettings(context.Context, model.PomodoroSettings) (model.PomodoroSettings, error)
	ActiveSession(context.Context) (model.TimerSession, error)
	UpsertSession(context.Context, model.TimerSession) (model.TimerSession, error)
	ResetActiveSession(context.Context) error
	CreateTask(context.Context, model.Task) (model.Task, error)
	ListTasks(context.Context, bool) ([]model.Task, error)
	UpdateTask(context.Context, model.Task) (model.Task, error)
	CompleteTask(context.Context, string) (model.Task, error)
	DeleteTask(context.Context, string) (bool, error)
	AddFocusDelta(context.Context, time.Time, int64, int32) error
	StatsRange(context.Context, time.Time, time.Time) ([]model.StatsPoint, error)
}

type Service struct {
	repo Repository
	now  func() time.Time
}

func New(repo Repository) *Service {
	return &Service{
		repo: repo,
		now:  func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) StartSession(ctx context.Context) (model.TimerSession, error) {
	if _, err := s.repo.ActiveSession(ctx); err == nil {
		return model.TimerSession{}, ErrAlreadyExists
	}

	settings, err := s.repo.GetSettings(ctx)
	if err != nil {
		return model.TimerSession{}, err
	}

	now := s.now()
	st, _, _ := timer.Apply(timer.State{
		Status:            "idle",
		Phase:             timer.PhaseFocus,
		FocusDuration:     time.Duration(settings.FocusMinutes) * time.Minute,
		ShortBreak:        time.Duration(settings.ShortBreakMinutes) * time.Minute,
		LongBreak:         time.Duration(settings.LongBreakMinutes) * time.Minute,
		LongBreakInterval: int(settings.LongBreakInterval),
	}, timer.CommandStart, now)

	out, err := s.repo.UpsertSession(ctx, toModelSession("", st, 0))
	if err != nil {
		return model.TimerSession{}, err
	}
	return out, nil
}

func (s *Service) PauseSession(ctx context.Context) (model.TimerSession, error) {
	return s.applySessionAction(ctx, timer.CommandPause)
}

func (s *Service) ResumeSession(ctx context.Context) (model.TimerSession, error) {
	return s.applySessionAction(ctx, timer.CommandResume)
}

func (s *Service) StopSession(ctx context.Context) (model.TimerSession, error) {
	return s.applySessionAction(ctx, timer.CommandStop)
}

func (s *Service) ResetSession(ctx context.Context) error {
	_, err := s.repo.ActiveSession(ctx)
	if err != nil {
		return nil
	}
	return s.repo.ResetActiveSession(ctx)
}

func (s *Service) GetActiveSession(ctx context.Context) (model.TimerSession, error) {
	active, err := s.repo.ActiveSession(ctx)
	if err != nil {
		return model.TimerSession{}, ErrNotFound
	}
	return viewSession(active, s.now()), nil
}

func (s *Service) CreateTask(ctx context.Context, in model.Task) (model.Task, error) {
	if in.Title == "" {
		return model.Task{}, ErrInvalidArgument
	}
	return s.repo.CreateTask(ctx, in)
}

func (s *Service) ListTasks(ctx context.Context, includeCompleted bool) ([]model.Task, error) {
	return s.repo.ListTasks(ctx, includeCompleted)
}

func (s *Service) UpdateTask(ctx context.Context, in model.Task) (model.Task, error) {
	return s.repo.UpdateTask(ctx, in)
}

func (s *Service) CompleteTask(ctx context.Context, id string) (model.Task, error) {
	return s.repo.CompleteTask(ctx, id)
}

func (s *Service) DeleteTask(ctx context.Context, id string) (bool, error) {
	return s.repo.DeleteTask(ctx, id)
}

func (s *Service) LogFocusSession(ctx context.Context, focusSeconds int64, completedPomodoro bool) error {
	if focusSeconds <= 0 {
		return ErrInvalidArgument
	}
	completed := int32(0)
	if completedPomodoro {
		completed = 1
	}
	return s.repo.AddFocusDelta(ctx, s.now(), focusSeconds, completed)
}

func (s *Service) StatsByRange(ctx context.Context, daysBack int) ([]model.StatsPoint, error) {
	to := s.now()
	from := to.AddDate(0, 0, -daysBack)
	return s.repo.StatsRange(ctx, from, to)
}

func (s *Service) GetSettings(ctx context.Context) (model.PomodoroSettings, error) {
	return s.repo.GetSettings(ctx)
}

func (s *Service) UpdateSettings(ctx context.Context, in model.PomodoroSettings) (model.PomodoroSettings, error) {
	if in.FocusMinutes <= 0 || in.ShortBreakMinutes <= 0 || in.LongBreakMinutes <= 0 || in.LongBreakInterval <= 0 {
		return model.PomodoroSettings{}, ErrInvalidArgument
	}
	return s.repo.UpdateSettings(ctx, in)
}

func (s *Service) applySessionAction(ctx context.Context, cmd timer.Command) (model.TimerSession, error) {
	active, err := s.repo.ActiveSession(ctx)
	if err != nil {
		return model.TimerSession{}, ErrNotFound
	}
	settings, err := s.repo.GetSettings(ctx)
	if err != nil {
		return model.TimerSession{}, err
	}
	state := toTimerState(active, settings)
	now := s.now()
	next, delta, err := timer.Apply(state, cmd, now)
	if err != nil {
		return model.TimerSession{}, errors.Join(ErrFailedPrecondition, err)
	}
	completedPomodoros := int32(0)
	if cmd == timer.CommandStop && state.Phase == timer.PhaseFocus && delta > 0 {
		completedPomodoros = 1
	}
	if delta > 0 {
		if err := s.repo.AddFocusDelta(ctx, now, int64(delta.Seconds()), completedPomodoros); err != nil {
			return model.TimerSession{}, err
		}
	}
	stored, err := s.repo.UpsertSession(ctx, toModelSession(active.ID, next, active.ElapsedSeconds+int64(delta.Seconds())))
	if err != nil {
		return model.TimerSession{}, err
	}
	return stored, nil
}

func viewSession(in model.TimerSession, now time.Time) model.TimerSession {
	out := in
	if in.Status == "running" && in.RunningSince != nil {
		delta := int64(now.Sub(*in.RunningSince).Seconds())
		if delta > 0 {
			out.ElapsedSeconds = in.ElapsedSeconds + delta
		}
	}
	return out
}

func toTimerState(in model.TimerSession, settings model.PomodoroSettings) timer.State {
	st := timer.State{
		Phase:             timer.Phase(in.Phase),
		Status:            in.Status,
		PauseAccumulation: time.Duration(in.PauseAccumulationSeconds) * time.Second,
		CycleIndex:        int(in.CycleIndex),
		FocusDuration:     time.Duration(settings.FocusMinutes) * time.Minute,
		ShortBreak:        time.Duration(settings.ShortBreakMinutes) * time.Minute,
		LongBreak:         time.Duration(settings.LongBreakMinutes) * time.Minute,
		LongBreakInterval: int(settings.LongBreakInterval),
	}
	if in.StartedAt != nil {
		st.StartedAt = *in.StartedAt
	}
	if in.RunningSince != nil {
		st.RunningSince = *in.RunningSince
	}
	return st
}

func toModelSession(id string, in timer.State, elapsed int64) model.TimerSession {
	out := model.TimerSession{
		ID:                       id,
		Phase:                    string(in.Phase),
		Status:                   in.Status,
		PauseAccumulationSeconds: int64(in.PauseAccumulation.Seconds()),
		CycleIndex:               int32(in.CycleIndex),
		ElapsedSeconds:           elapsed,
	}
	if !in.StartedAt.IsZero() {
		t := in.StartedAt
		out.StartedAt = &t
	}
	if !in.RunningSince.IsZero() {
		t := in.RunningSince
		out.RunningSince = &t
	}
	return out
}
