'use client';

import { useEffect, useMemo, useState } from 'react';

type Session = {
  id: string;
  phase: 'focus' | 'short_break' | 'long_break' | string;
  status: 'idle' | 'running' | 'paused' | string;
  elapsedSeconds: number;
  cycleIndex: number;
};

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
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  async function load() {
    const [activeResp, settingsResp] = await Promise.all([fetch('/api/timer/active'), fetch('/api/settings')]);
    const activeJson = await activeResp.json();
    const settingsJson = await settingsResp.json();
    setSession(activeJson.session ?? null);
    if (settingsJson.settings) {
      setSettings(settingsJson.settings);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 1000);
    return () => clearInterval(id);
  }, []);

  async function run(path: string) {
    const resp = await fetch(path, { method: 'POST' });
    if (!resp.ok) {
      await load();
      return;
    }
    const json = await resp.json();
    setSession(json.session ?? null);
  }

  const phaseDurationSeconds = useMemo(() => {
    if (!session) return settings.focusMinutes * 60;
    if (session.phase === 'short_break') return settings.shortBreakMinutes * 60;
    if (session.phase === 'long_break') return settings.longBreakMinutes * 60;
    return settings.focusMinutes * 60;
  }, [session, settings]);

  const remainingSeconds = phaseDurationSeconds - (session?.elapsedSeconds ?? 0);
  const showTimer = !!session && session.status !== 'idle';

  return (
    <div>
      <div className="card">
        <h2>Today</h2>
        <p>Phase: {session?.phase ?? 'focus'}</p>
        <p>Status: {session?.status ?? 'idle'}</p>
        <p>Cycle: {session?.cycleIndex ?? 0}</p>
        <div className="row">
          <button className="button" onClick={() => run('/api/timer/start')}>
            Start
          </button>
          <button className="button secondary" onClick={() => run('/api/timer/pause')}>
            Pause
          </button>
          <button className="button secondary" onClick={() => run('/api/timer/resume')}>
            Resume
          </button>
          <button className="button secondary" onClick={() => run('/api/timer/stop')}>
            Stop
          </button>
        </div>
      </div>

      {showTimer && (
        <>
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 8 }}>Timer</p>
            <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: 2 }}>{formatMMSS(remainingSeconds)}</div>
            <p style={{ opacity: 0.8 }}>Elapsed: {formatMMSS(session?.elapsedSeconds ?? 0)}</p>
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
            <span>{session?.phase ?? 'focus'}</span>
            <strong>{formatMMSS(remainingSeconds)}</strong>
          </div>
        </>
      )}
    </div>
  );
}
