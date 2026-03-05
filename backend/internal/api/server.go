package api

import (
	"context"
	"errors"

	focusv1 "github.com/kenta/focus-todo-fork/backend/gen/focus_todo/v1"
	"github.com/kenta/focus-todo-fork/backend/internal/model"
	"github.com/kenta/focus-todo-fork/backend/internal/usecase"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Server struct {
	focusv1.UnimplementedTimerServiceServer
	focusv1.UnimplementedTaskServiceServer
	focusv1.UnimplementedStatsServiceServer
	focusv1.UnimplementedSettingsServiceServer
	svc *usecase.Service
}

func New(svc *usecase.Service) *Server {
	return &Server{svc: svc}
}

func (s *Server) StartSession(ctx context.Context, _ *focusv1.StartSessionRequest) (*focusv1.SessionResponse, error) {
	out, err := s.svc.StartSession(ctx)
	if err != nil {
		return nil, mapError(err)
	}
	return &focusv1.SessionResponse{Session: fromModelSession(out)}, nil
}

func (s *Server) PauseSession(ctx context.Context, _ *focusv1.SessionActionRequest) (*focusv1.SessionResponse, error) {
	out, err := s.svc.PauseSession(ctx)
	if err != nil {
		return nil, mapError(err)
	}
	return &focusv1.SessionResponse{Session: fromModelSession(out)}, nil
}

func (s *Server) ResumeSession(ctx context.Context, _ *focusv1.SessionActionRequest) (*focusv1.SessionResponse, error) {
	out, err := s.svc.ResumeSession(ctx)
	if err != nil {
		return nil, mapError(err)
	}
	return &focusv1.SessionResponse{Session: fromModelSession(out)}, nil
}

func (s *Server) StopSession(ctx context.Context, _ *focusv1.SessionActionRequest) (*focusv1.SessionResponse, error) {
	out, err := s.svc.StopSession(ctx)
	if err != nil {
		return nil, mapError(err)
	}
	return &focusv1.SessionResponse{Session: fromModelSession(out)}, nil
}

func (s *Server) ResetSession(ctx context.Context, _ *focusv1.SessionActionRequest) (*focusv1.SessionResponse, error) {
	if err := s.svc.ResetSession(ctx); err != nil {
		return nil, mapError(err)
	}
	return &focusv1.SessionResponse{}, nil
}

func (s *Server) GetActiveSession(ctx context.Context, _ *focusv1.GetActiveSessionRequest) (*focusv1.SessionResponse, error) {
	out, err := s.svc.GetActiveSession(ctx)
	if err != nil {
		if errors.Is(err, usecase.ErrNotFound) {
			return &focusv1.SessionResponse{}, nil
		}
		return nil, mapError(err)
	}
	return &focusv1.SessionResponse{Session: fromModelSession(out)}, nil
}

func (s *Server) CreateTask(ctx context.Context, req *focusv1.CreateTaskRequest) (*focusv1.TaskResponse, error) {
	out, err := s.svc.CreateTask(ctx, model.Task{
		Title:              req.GetTitle(),
		Note:               req.GetNote(),
		EstimatedPomodoros: req.GetEstimatedPomodoros(),
		Tags:               req.GetTags(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &focusv1.TaskResponse{Task: fromModelTask(out)}, nil
}

func (s *Server) ListTasks(ctx context.Context, req *focusv1.ListTasksRequest) (*focusv1.ListTasksResponse, error) {
	tasks, err := s.svc.ListTasks(ctx, req.GetIncludeCompleted())
	if err != nil {
		return nil, mapError(err)
	}
	resp := &focusv1.ListTasksResponse{Tasks: make([]*focusv1.Task, 0, len(tasks))}
	for _, t := range tasks {
		resp.Tasks = append(resp.Tasks, fromModelTask(t))
	}
	return resp, nil
}

func (s *Server) UpdateTask(ctx context.Context, req *focusv1.UpdateTaskRequest) (*focusv1.TaskResponse, error) {
	out, err := s.svc.UpdateTask(ctx, model.Task{
		ID:                 req.GetId(),
		Title:              req.GetTitle(),
		Note:               req.GetNote(),
		EstimatedPomodoros: req.GetEstimatedPomodoros(),
		Tags:               req.GetTags(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &focusv1.TaskResponse{Task: fromModelTask(out)}, nil
}

func (s *Server) CompleteTask(ctx context.Context, req *focusv1.CompleteTaskRequest) (*focusv1.TaskResponse, error) {
	out, err := s.svc.CompleteTask(ctx, req.GetId())
	if err != nil {
		return nil, mapError(err)
	}
	return &focusv1.TaskResponse{Task: fromModelTask(out)}, nil
}

func (s *Server) DeleteTask(ctx context.Context, req *focusv1.DeleteTaskRequest) (*focusv1.DeleteTaskResponse, error) {
	ok, err := s.svc.DeleteTask(ctx, req.GetId())
	if err != nil {
		return nil, mapError(err)
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
	if err := s.svc.LogFocusSession(ctx, req.GetFocusSeconds(), req.GetCompletedPomodoro()); err != nil {
		return nil, mapError(err)
	}
	return &focusv1.LogFocusSessionResponse{Ok: true}, nil
}

func (s *Server) statsByRange(ctx context.Context, daysBack int) (*focusv1.StatsResponse, error) {
	points, err := s.svc.StatsByRange(ctx, daysBack)
	if err != nil {
		return nil, mapError(err)
	}
	resp := &focusv1.StatsResponse{Points: make([]*focusv1.StatsPoint, 0, len(points))}
	for _, p := range points {
		resp.TotalFocusSeconds += p.FocusSeconds
		resp.TotalCompletedPomodoros += p.CompletedPomodoros
		resp.TotalCompletedTasks += p.CompletedTasks
		resp.Points = append(resp.Points, &focusv1.StatsPoint{
			Label:              p.Label,
			FocusSeconds:       p.FocusSeconds,
			CompletedPomodoros: p.CompletedPomodoros,
			CompletedTasks:     p.CompletedTasks,
		})
	}
	return resp, nil
}

func (s *Server) GetPomodoroSettings(ctx context.Context, _ *focusv1.GetPomodoroSettingsRequest) (*focusv1.PomodoroSettingsResponse, error) {
	settings, err := s.svc.GetSettings(ctx)
	if err != nil {
		return nil, mapError(err)
	}
	return &focusv1.PomodoroSettingsResponse{Settings: &focusv1.PomodoroSettings{
		FocusMinutes:      settings.FocusMinutes,
		ShortBreakMinutes: settings.ShortBreakMinutes,
		LongBreakMinutes:  settings.LongBreakMinutes,
		LongBreakInterval: settings.LongBreakInterval,
	}}, nil
}

func (s *Server) UpdatePomodoroSettings(ctx context.Context, req *focusv1.UpdatePomodoroSettingsRequest) (*focusv1.PomodoroSettingsResponse, error) {
	out, err := s.svc.UpdateSettings(ctx, model.PomodoroSettings{
		FocusMinutes:      req.GetFocusMinutes(),
		ShortBreakMinutes: req.GetShortBreakMinutes(),
		LongBreakMinutes:  req.GetLongBreakMinutes(),
		LongBreakInterval: req.GetLongBreakInterval(),
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &focusv1.PomodoroSettingsResponse{Settings: &focusv1.PomodoroSettings{
		FocusMinutes:      out.FocusMinutes,
		ShortBreakMinutes: out.ShortBreakMinutes,
		LongBreakMinutes:  out.LongBreakMinutes,
		LongBreakInterval: out.LongBreakInterval,
	}}, nil
}

func fromModelSession(in model.TimerSession) *focusv1.Session {
	out := &focusv1.Session{
		Id:             in.ID,
		Phase:          in.Phase,
		Status:         in.Status,
		CycleIndex:     in.CycleIndex,
		ElapsedSeconds: in.ElapsedSeconds,
	}
	if in.StartedAt != nil {
		out.StartedAtUnix = in.StartedAt.Unix()
	}
	if in.RunningSince != nil {
		out.RunningSinceUnix = in.RunningSince.Unix()
	}
	return out
}

func fromModelTask(in model.Task) *focusv1.Task {
	return &focusv1.Task{
		Id:                 in.ID,
		Title:              in.Title,
		Note:               in.Note,
		EstimatedPomodoros: in.EstimatedPomodoros,
		Completed:          in.Completed,
		Tags:               in.Tags,
		CreatedAtUnix:      in.CreatedAt.Unix(),
		UpdatedAtUnix:      in.UpdatedAt.Unix(),
	}
}

func mapError(err error) error {
	switch {
	case errors.Is(err, usecase.ErrAlreadyExists):
		return status.Error(codes.AlreadyExists, err.Error())
	case errors.Is(err, usecase.ErrNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.Is(err, usecase.ErrInvalidArgument):
		return status.Error(codes.InvalidArgument, err.Error())
	case errors.Is(err, usecase.ErrFailedPrecondition):
		return status.Error(codes.FailedPrecondition, err.Error())
	default:
		return status.Error(codes.Internal, err.Error())
	}
}
