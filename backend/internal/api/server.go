package api

import (
	"context"
	"time"

	focusv1 "github.com/kenta/focus-todo-fork/backend/gen/focus_todo/v1"
	"github.com/kenta/focus-todo-fork/backend/internal/model"
	"github.com/kenta/focus-todo-fork/backend/internal/store/postgres"
	"github.com/kenta/focus-todo-fork/backend/internal/timer"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Server struct {
	focusv1.UnimplementedTimerServiceServer
	focusv1.UnimplementedTaskServiceServer
	focusv1.UnimplementedStatsServiceServer
	focusv1.UnimplementedSettingsServiceServer
	store *postgres.Store
}

func New(store *postgres.Store) *Server {
	return &Server{store: store}
}

func (s *Server) StartSession(ctx context.Context, _ *focusv1.StartSessionRequest) (*focusv1.SessionResponse, error) {
	_, err := s.store.ActiveSession(ctx)
	if err == nil {
		return nil, status.Error(codes.AlreadyExists, "active session exists")
	}
	settings, err := s.store.GetSettings(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	now := time.Now().UTC()
	st, _, _ := timer.Apply(timer.State{
		Status:            "idle",
		Phase:             timer.PhaseFocus,
		FocusDuration:     time.Duration(settings.FocusMinutes) * time.Minute,
		ShortBreak:        time.Duration(settings.ShortBreakMinutes) * time.Minute,
		LongBreak:         time.Duration(settings.LongBreakMinutes) * time.Minute,
		LongBreakInterval: int(settings.LongBreakInterval),
	}, timer.CommandStart, now)
	stored, err := s.store.UpsertSession(ctx, toModelSession("", st, 0))
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &focusv1.SessionResponse{Session: fromModelSession(stored)}, nil
}

func (s *Server) PauseSession(ctx context.Context, _ *focusv1.SessionActionRequest) (*focusv1.SessionResponse, error) {
	return s.applySessionAction(ctx, timer.CommandPause)
}

func (s *Server) ResumeSession(ctx context.Context, _ *focusv1.SessionActionRequest) (*focusv1.SessionResponse, error) {
	return s.applySessionAction(ctx, timer.CommandResume)
}

func (s *Server) StopSession(ctx context.Context, _ *focusv1.SessionActionRequest) (*focusv1.SessionResponse, error) {
	return s.applySessionAction(ctx, timer.CommandStop)
}

func (s *Server) ResetSession(ctx context.Context, _ *focusv1.SessionActionRequest) (*focusv1.SessionResponse, error) {
	_, err := s.store.ActiveSession(ctx)
	if err != nil {
		return &focusv1.SessionResponse{}, nil
	}
	if err := s.store.ResetActiveSession(ctx); err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &focusv1.SessionResponse{}, nil
}

func (s *Server) GetActiveSession(ctx context.Context, _ *focusv1.GetActiveSessionRequest) (*focusv1.SessionResponse, error) {
	active, err := s.store.ActiveSession(ctx)
	if err != nil {
		return &focusv1.SessionResponse{}, nil
	}
	return &focusv1.SessionResponse{Session: fromModelSession(viewSession(active, time.Now().UTC()))}, nil
}

func (s *Server) applySessionAction(ctx context.Context, cmd timer.Command) (*focusv1.SessionResponse, error) {
	active, err := s.store.ActiveSession(ctx)
	if err != nil {
		return nil, status.Error(codes.NotFound, "no active session")
	}
	settings, err := s.store.GetSettings(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	state := toTimerState(active, settings)
	next, delta, err := timer.Apply(state, cmd, time.Now().UTC())
	if err != nil {
		return nil, status.Error(codes.FailedPrecondition, err.Error())
	}
	completedPomodoros := int32(0)
	if cmd == timer.CommandStop && state.Phase == timer.PhaseFocus && delta > 0 {
		completedPomodoros = 1
	}
	if delta > 0 {
		if err := s.store.AddFocusDelta(ctx, time.Now().UTC(), int64(delta.Seconds()), completedPomodoros); err != nil {
			return nil, status.Error(codes.Internal, err.Error())
		}
	}
	stored, err := s.store.UpsertSession(ctx, toModelSession(active.ID, next, active.ElapsedSeconds+int64(delta.Seconds())))
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &focusv1.SessionResponse{Session: fromModelSession(stored)}, nil
}

func (s *Server) CreateTask(ctx context.Context, req *focusv1.CreateTaskRequest) (*focusv1.TaskResponse, error) {
	if req.GetTitle() == "" {
		return nil, status.Error(codes.InvalidArgument, "title required")
	}
	task, err := s.store.CreateTask(ctx, model.Task{Title: req.GetTitle(), Note: req.GetNote(), EstimatedPomodoros: req.GetEstimatedPomodoros(), Tags: req.GetTags()})
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &focusv1.TaskResponse{Task: fromModelTask(task)}, nil
}

func (s *Server) ListTasks(ctx context.Context, req *focusv1.ListTasksRequest) (*focusv1.ListTasksResponse, error) {
	tasks, err := s.store.ListTasks(ctx, req.GetIncludeCompleted())
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	resp := &focusv1.ListTasksResponse{Tasks: make([]*focusv1.Task, 0, len(tasks))}
	for _, t := range tasks {
		resp.Tasks = append(resp.Tasks, fromModelTask(t))
	}
	return resp, nil
}

func (s *Server) UpdateTask(ctx context.Context, req *focusv1.UpdateTaskRequest) (*focusv1.TaskResponse, error) {
	task, err := s.store.UpdateTask(ctx, model.Task{ID: req.GetId(), Title: req.GetTitle(), Note: req.GetNote(), EstimatedPomodoros: req.GetEstimatedPomodoros(), Tags: req.GetTags()})
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &focusv1.TaskResponse{Task: fromModelTask(task)}, nil
}

func (s *Server) CompleteTask(ctx context.Context, req *focusv1.CompleteTaskRequest) (*focusv1.TaskResponse, error) {
	task, err := s.store.CompleteTask(ctx, req.GetId())
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &focusv1.TaskResponse{Task: fromModelTask(task)}, nil
}

func (s *Server) DeleteTask(ctx context.Context, req *focusv1.DeleteTaskRequest) (*focusv1.DeleteTaskResponse, error) {
	ok, err := s.store.DeleteTask(ctx, req.GetId())
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &focusv1.DeleteTaskResponse{Deleted: ok}, nil
}

func (s *Server) GetDailyStats(ctx context.Context, _ *focusv1.GetStatsRequest) (*focusv1.StatsResponse, error) {
	return s.statsByRange(ctx, 0)
}

func (s *Server) GetWeeklyStats(ctx context.Context, _ *focusv1.GetStatsRequest) (*focusv1.StatsResponse, error) {
	return s.statsByRange(ctx, 6)
}

func (s *Server) GetMonthlyStats(ctx context.Context, _ *focusv1.GetStatsRequest) (*focusv1.StatsResponse, error) {
	return s.statsByRange(ctx, 29)
}

func (s *Server) LogFocusSession(ctx context.Context, req *focusv1.LogFocusSessionRequest) (*focusv1.LogFocusSessionResponse, error) {
	if req.GetFocusSeconds() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "focus_seconds must be positive")
	}
	completed := int32(0)
	if req.GetCompletedPomodoro() {
		completed = 1
	}
	if err := s.store.AddFocusDelta(ctx, time.Now().UTC(), req.GetFocusSeconds(), completed); err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &focusv1.LogFocusSessionResponse{Ok: true}, nil
}

func (s *Server) statsByRange(ctx context.Context, daysBack int) (*focusv1.StatsResponse, error) {
	to := time.Now().UTC()
	from := to.AddDate(0, 0, -daysBack)
	points, err := s.store.StatsRange(ctx, from, to)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	resp := &focusv1.StatsResponse{Points: make([]*focusv1.StatsPoint, 0, len(points))}
	for _, p := range points {
		resp.TotalFocusSeconds += p.FocusSeconds
		resp.TotalCompletedPomodoros += p.CompletedPomodoros
		resp.TotalCompletedTasks += p.CompletedTasks
		resp.Points = append(resp.Points, &focusv1.StatsPoint{Label: p.Label, FocusSeconds: p.FocusSeconds, CompletedPomodoros: p.CompletedPomodoros, CompletedTasks: p.CompletedTasks})
	}
	return resp, nil
}

func (s *Server) GetPomodoroSettings(ctx context.Context, _ *focusv1.GetPomodoroSettingsRequest) (*focusv1.PomodoroSettingsResponse, error) {
	settings, err := s.store.GetSettings(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &focusv1.PomodoroSettingsResponse{Settings: &focusv1.PomodoroSettings{
		FocusMinutes: settings.FocusMinutes, ShortBreakMinutes: settings.ShortBreakMinutes,
		LongBreakMinutes: settings.LongBreakMinutes, LongBreakInterval: settings.LongBreakInterval,
	}}, nil
}

func (s *Server) UpdatePomodoroSettings(ctx context.Context, req *focusv1.UpdatePomodoroSettingsRequest) (*focusv1.PomodoroSettingsResponse, error) {
	if req.GetFocusMinutes() <= 0 || req.GetShortBreakMinutes() <= 0 || req.GetLongBreakMinutes() <= 0 || req.GetLongBreakInterval() <= 0 {
		return nil, status.Error(codes.InvalidArgument, "all settings must be positive")
	}
	out, err := s.store.UpdateSettings(ctx, model.PomodoroSettings{
		FocusMinutes: req.GetFocusMinutes(), ShortBreakMinutes: req.GetShortBreakMinutes(),
		LongBreakMinutes: req.GetLongBreakMinutes(), LongBreakInterval: req.GetLongBreakInterval(),
	})
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &focusv1.PomodoroSettingsResponse{Settings: &focusv1.PomodoroSettings{
		FocusMinutes: out.FocusMinutes, ShortBreakMinutes: out.ShortBreakMinutes,
		LongBreakMinutes: out.LongBreakMinutes, LongBreakInterval: out.LongBreakInterval,
	}}, nil
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
	out := model.TimerSession{ID: id, Phase: string(in.Phase), Status: in.Status, PauseAccumulationSeconds: int64(in.PauseAccumulation.Seconds()), CycleIndex: int32(in.CycleIndex), ElapsedSeconds: elapsed}
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

func fromModelSession(in model.TimerSession) *focusv1.Session {
	out := &focusv1.Session{Id: in.ID, Phase: in.Phase, Status: in.Status, CycleIndex: in.CycleIndex, ElapsedSeconds: in.ElapsedSeconds}
	if in.StartedAt != nil {
		out.StartedAtUnix = in.StartedAt.Unix()
	}
	if in.RunningSince != nil {
		out.RunningSinceUnix = in.RunningSince.Unix()
	}
	return out
}

func fromModelTask(in model.Task) *focusv1.Task {
	return &focusv1.Task{Id: in.ID, Title: in.Title, Note: in.Note, EstimatedPomodoros: in.EstimatedPomodoros, Completed: in.Completed, Tags: in.Tags, CreatedAtUnix: in.CreatedAt.Unix(), UpdatedAtUnix: in.UpdatedAt.Unix()}
}
