'use client';

import { useEffect, useState } from 'react';

type Session = { id: string; phase: string; status: string; elapsedSeconds: number; cycleIndex: number };

export default function TodayPage() {
  const [session, setSession] = useState<Session | null>(null);

  async function load() {
    const resp = await fetch('/api/timer/active');
    const json = await resp.json();
    setSession(json.session ?? null);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 1000);
    return () => clearInterval(id);
  }, []);

  async function run(path: string) {
    await fetch(path, { method: 'POST' });
    await load();
  }

  return (
    <div>
      <div className="card">
        <h2>Pomodoro Timer</h2>
        <p>Phase: {session?.phase ?? 'focus'}</p>
        <p>Status: {session?.status ?? 'idle'}</p>
        <p>Elapsed: {session?.elapsedSeconds ?? 0}s</p>
        <p>Cycle: {session?.cycleIndex ?? 0}</p>
        <div className="row">
          <button className="button" onClick={() => run('/api/timer/start')}>Start</button>
          <button className="button secondary" onClick={() => run('/api/timer/pause')}>Pause</button>
          <button className="button secondary" onClick={() => run('/api/timer/resume')}>Resume</button>
          <button className="button secondary" onClick={() => run('/api/timer/stop')}>Stop</button>
        </div>
      </div>
    </div>
  );
}
