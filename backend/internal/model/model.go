package model

import "time"

type PomodoroSettings struct {
	FocusMinutes      int32
	ShortBreakMinutes int32
	LongBreakMinutes  int32
	LongBreakInterval int32
}

type TimerSession struct {
	ID                       string
	Phase                    string
	Status                   string
	StartedAt                *time.Time
	RunningSince             *time.Time
	PauseAccumulationSeconds int64
	CycleIndex               int32
	ElapsedSeconds           int64
}

type Task struct {
	ID                string
	Title             string
	Note              string
	EstimatedPomodoros int32
	Completed         bool
	Tags              []string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type StatsPoint struct {
	Label             string
	FocusSeconds      int64
	CompletedPomodoros int32
	CompletedTasks    int32
}
