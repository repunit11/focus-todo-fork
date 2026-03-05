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
		if err := requireStatus(current, "idle", "paused"); err != nil {
			return current, 0, err
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
		if err := requireStatus(current, "running"); err != nil {
			return current, 0, err
		}
		delta := now.Sub(current.RunningSince)
		next.Status = "paused"
		next.PausedAt = &now
		next.PauseAccumulation += delta
		return next, delta, nil
	case CommandResume:
		if err := requireStatus(current, "paused"); err != nil || current.PausedAt == nil {
			if err == nil {
				err = errors.New("not paused")
			}
			return current, 0, err
		}
		next.Status = "running"
		next.RunningSince = now
		next.PausedAt = nil
		return next, 0, nil
	case CommandStop:
		if err := requireStatus(current, "running", "paused"); err != nil {
			return current, 0, err
		}
		delta := time.Duration(0)
		if current.Status == "running" {
			delta = now.Sub(current.RunningSince)
		}
		next.Status = "idle"
		next.StartedAt = time.Time{}
		next.RunningSince = time.Time{}
		next.PausedAt = nil
		next.Phase = nextPhase(current)
		if current.Phase == PhaseFocus {
			next.CycleIndex++
		}
		return next, delta, nil
	default:
		return current, 0, errors.New("unknown command")
	}
}

func nextPhase(st State) Phase {
	if st.Phase != PhaseFocus {
		return PhaseFocus
	}
	cycle := st.CycleIndex + 1
	if st.LongBreakInterval > 0 && cycle%st.LongBreakInterval == 0 {
		return PhaseLongBreak
	}
	return PhaseShortBreak
}

func requireStatus(st State, allowed ...string) error {
	for _, s := range allowed {
		if st.Status == s {
			return nil
		}
	}
	return errors.New("invalid status")
}
