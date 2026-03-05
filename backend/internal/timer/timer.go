package timer

import (
	"errors"
	"time"
)

type Phase string

const (
	PhaseFocus      Phase = "focus"
	PhaseShortBreak Phase = "short_break"
	PhaseLongBreak  Phase = "long_break"
)

type State struct {
	Phase             Phase
	Status            string
	StartedAt         time.Time
	RunningSince      time.Time
	PausedAt          *time.Time
	PauseAccumulation time.Duration
	CycleIndex        int
	FocusDuration     time.Duration
	ShortBreak        time.Duration
	LongBreak         time.Duration
	LongBreakInterval int
}

type Command string

const (
	CommandStart  Command = "start"
	CommandPause  Command = "pause"
	CommandResume Command = "resume"
	CommandStop   Command = "stop"
)

func Apply(current State, cmd Command, now time.Time) (State, time.Duration, error) {
	next := current
	switch cmd {
	case CommandStart:
		if current.Status == "running" {
			return current, 0, errors.New("already running")
		}
		next.Status = "running"
		next.StartedAt = now
		next.RunningSince = now
		next.PausedAt = nil
		next.PauseAccumulation = 0
		if next.Phase == "" {
			next.Phase = PhaseFocus
		}
		return next, 0, nil
	case CommandPause:
		if current.Status != "running" {
			return current, 0, errors.New("not running")
		}
		delta := now.Sub(current.RunningSince)
		next.Status = "paused"
		next.PausedAt = &now
		next.PauseAccumulation += delta
		return next, delta, nil
	case CommandResume:
		if current.Status != "paused" || current.PausedAt == nil {
			return current, 0, errors.New("not paused")
		}
		next.Status = "running"
		next.RunningSince = now
		next.PausedAt = nil
		return next, 0, nil
	case CommandStop:
		if current.Status != "running" {
			return current, 0, errors.New("not running")
		}
		delta := now.Sub(current.RunningSince)
		next.Status = "idle"
		next.StartedAt = time.Time{}
		next.RunningSince = time.Time{}
		next.PausedAt = nil
		if current.Phase == PhaseFocus {
			next.CycleIndex++
			if next.LongBreakInterval > 0 && next.CycleIndex%next.LongBreakInterval == 0 {
				next.Phase = PhaseLongBreak
			} else {
				next.Phase = PhaseShortBreak
			}
		} else {
			next.Phase = PhaseFocus
		}
		return next, delta, nil
	default:
		return current, 0, errors.New("unknown command")
	}
}
