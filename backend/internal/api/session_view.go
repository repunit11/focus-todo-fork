package api

import (
	"time"

	"github.com/kenta/focus-todo-fork/backend/internal/model"
)

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
