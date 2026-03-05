package timer

import "time"

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
	// red phase: intentionally incomplete behavior
	return current, 0, nil
}
