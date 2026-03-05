'use client';

import { useEffect, useMemo, useState } from 'react';

type Settings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
};

const defaultSettings: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4
};

function formatMMSS(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export default function TodayPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [phase, setPhase] = useState<'focus' | 'short_break' | 'long_break'>('focus');
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(0);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => {
        if (j.settings) setSettings(j.settings);
      })
      .catch(() => {
        // keep defaults on network errors
      });
  }, []);

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  const phaseDurationSeconds = useMemo(() => {
    if (phase === 'short_break') return settings.shortBreakMinutes * 60;
    if (phase === 'long_break') return settings.longBreakMinutes * 60;
    return settings.focusMinutes * 60;
  }, [phase, settings]);

  useEffect(() => {
    if (status !== 'running') return;
    if (elapsedSeconds < phaseDurationSeconds) return;

    if (phase === 'focus') {
      fetch('/api/stats/log', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ focusSeconds: phaseDurationSeconds, completedPomodoro: true })
      }).catch(() => {
        // keep timer UX responsive even if logging fails
      });
    }

    if (phase === 'focus') {
      const nextCycle = cycleIndex + 1;
      setCycleIndex(nextCycle);
      const isLong = nextCycle % settings.longBreakInterval === 0;
      setPhase(isLong ? 'long_break' : 'short_break');
    } else {
      setPhase('focus');
    }

    setElapsedSeconds(0);
    setStatus('running');
  }, [elapsedSeconds, phaseDurationSeconds, phase, cycleIndex, settings.longBreakInterval, status]);

  function onStart() {
    setStatus('running');
  }

  function onPause() {
    if (status !== 'running') return;
    setStatus('paused');
  }

  function onDelete() {
    setStatus('idle');
    setPhase('focus');
    setElapsedSeconds(0);
    setCycleIndex(0);
  }

  const remainingSeconds = phaseDurationSeconds - elapsedSeconds;
  const showTimer = status !== 'idle';

  return (
    <div>
      <div className="card">
        <h2>Today</h2>
        <p>Phase: {phase}</p>
        <p>Status: {status}</p>
        <p>Cycle: {cycleIndex}</p>
        <div className="row">
          <button className="button" onClick={onStart}>
            Start
          </button>
          <button className="button secondary" onClick={onPause}>
            Pause
          </button>
          <button className="button secondary" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      {showTimer && (
        <>
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 8 }}>Timer</p>
            <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: 2 }}>{formatMMSS(remainingSeconds)}</div>
            <p style={{ opacity: 0.8 }}>Elapsed: {formatMMSS(elapsedSeconds)}</p>
          </div>

          <div
            style={{
              position: 'fixed',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1f1a16',
              color: '#fff',
              borderRadius: 14,
              padding: '12px 18px',
              minWidth: 280,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
          >
            <span>{phase}</span>
            <strong>{formatMMSS(remainingSeconds)}</strong>
          </div>
        </>
      )}
    </div>
  );
}
