package api

import (
	"testing"
	"time"

	"github.com/kenta/focus-todo-fork/backend/internal/model"
)

func TestViewSession_RunningAddsLiveElapsed(t *testing.T) {
	now := time.Date(2026, 3, 5, 12, 0, 10, 0, time.UTC)
	runningSince := now.Add(-10 * time.Second)
	in := model.TimerSession{
		ID:           "s1",
		Phase:        "focus",
		Status:       "running",
		RunningSince: &runningSince,
		ElapsedSeconds: 120,
	}

	out := viewSession(in, now)
	if out.ElapsedSeconds != 130 {
		t.Fatalf("expected 130, got %d", out.ElapsedSeconds)
	}
}

func TestViewSession_PausedDoesNotAddLiveElapsed(t *testing.T) {
	now := time.Date(2026, 3, 5, 12, 0, 10, 0, time.UTC)
	runningSince := now.Add(-10 * time.Second)
	in := model.TimerSession{
		ID:             "s2",
		Phase:          "focus",
		Status:         "paused",
		RunningSince:   &runningSince,
		ElapsedSeconds: 120,
	}

	out := viewSession(in, now)
	if out.ElapsedSeconds != 120 {
		t.Fatalf("expected 120, got %d", out.ElapsedSeconds)
	}
}
