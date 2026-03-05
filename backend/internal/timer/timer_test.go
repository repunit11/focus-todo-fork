package timer

import (
	"testing"
	"time"
)

func TestApply_StartPauseResumeStop_ShouldAccumulateElapsed(t *testing.T) {
	t0 := time.Date(2026, 3, 5, 9, 0, 0, 0, time.UTC)
	cfg := State{
		Phase:             PhaseFocus,
		Status:            "idle",
		FocusDuration:     25 * time.Minute,
		ShortBreak:        5 * time.Minute,
		LongBreak:         15 * time.Minute,
		LongBreakInterval: 4,
	}

	s1, _, err := Apply(cfg, CommandStart, t0)
	if err != nil {
		t.Fatalf("start: %v", err)
	}
	if s1.Status != "running" {
		t.Fatalf("expected running, got %s", s1.Status)
	}

	t1 := t0.Add(10 * time.Minute)
	s2, delta1, err := Apply(s1, CommandPause, t1)
	if err != nil {
		t.Fatalf("pause: %v", err)
	}
	if delta1 != 10*time.Minute {
		t.Fatalf("expected 10m delta, got %s", delta1)
	}

	t2 := t1.Add(2 * time.Minute)
	s3, _, err := Apply(s2, CommandResume, t2)
	if err != nil {
		t.Fatalf("resume: %v", err)
	}

	t3 := t2.Add(5 * time.Minute)
	_, delta2, err := Apply(s3, CommandStop, t3)
	if err != nil {
		t.Fatalf("stop: %v", err)
	}
	if delta2 != 5*time.Minute {
		t.Fatalf("expected 5m delta, got %s", delta2)
	}
}

func TestApply_AdvancePhase_ToLongBreakOnFourthCycle(t *testing.T) {
	t0 := time.Date(2026, 3, 5, 9, 0, 0, 0, time.UTC)
	st := State{
		Phase:             PhaseFocus,
		Status:            "running",
		StartedAt:         t0,
		FocusDuration:     25 * time.Minute,
		ShortBreak:        5 * time.Minute,
		LongBreak:         15 * time.Minute,
		LongBreakInterval: 4,
		CycleIndex:        3,
	}

	s1, _, err := Apply(st, CommandStop, t0.Add(25*time.Minute))
	if err != nil {
		t.Fatalf("stop: %v", err)
	}
	if s1.Phase != PhaseLongBreak {
		t.Fatalf("expected long_break, got %s", s1.Phase)
	}
}

func TestApply_StopFromPaused_ShouldSucceedAndReturnZeroDelta(t *testing.T) {
	t0 := time.Date(2026, 3, 5, 9, 0, 0, 0, time.UTC)
	pausedAt := t0.Add(10 * time.Minute)
	st := State{
		Phase:             PhaseFocus,
		Status:            "paused",
		StartedAt:         t0,
		RunningSince:      t0,
		PausedAt:          &pausedAt,
		PauseAccumulation: 10 * time.Minute,
		CycleIndex:        0,
		FocusDuration:     25 * time.Minute,
		ShortBreak:        5 * time.Minute,
		LongBreak:         15 * time.Minute,
		LongBreakInterval: 4,
	}

	next, delta, err := Apply(st, CommandStop, pausedAt.Add(5*time.Minute))
	if err != nil {
		t.Fatalf("stop from paused should not fail: %v", err)
	}
	if delta != 0 {
		t.Fatalf("expected zero delta, got %s", delta)
	}
	if next.Status != "idle" {
		t.Fatalf("expected idle, got %s", next.Status)
	}
}
