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

function normalizeSession(raw: any): Session | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.id) return null;
  return {
    id: String(raw.id),
    phase: String(raw.phase || 'focus'),
    status: String(raw.status || 'idle'),
    elapsedSeconds: Number(raw.elapsedSeconds || 0),
    cycleIndex: Number(raw.cycleIndex || 0)
  };
}

export default function TodayPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [error, setError] = useState<string>('');

  async function load() {
    const [activeResp, settingsResp] = await Promise.all([fetch('/api/timer/active'), fetch('/api/settings')]);
    const activeJson = await activeResp.json();
    const settingsJson = await settingsResp.json();
    setSession(normalizeSession(activeJson.session));
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
    const json = await resp.json();
    if (!resp.ok) {
      setError(json.error ?? 'Timer action failed');
      await load();
      return;
    }
    setSession(normalizeSession(json.session));
    setError('');
  }

  async function action(kind: 'start' | 'pause' | 'resume' | 'stop' | 'reset') {
    const status = session?.status ?? 'idle';
    const hasSession = !!session?.id;

    if (kind === 'start') {
      if (!hasSession) {
        await run('/api/timer/start');
        return;
      }
      if (status === 'paused') {
        await run('/api/timer/resume');
        return;
      }
      setError('既に実行中です');
      return;
    }

    if (kind === 'pause') {
      if (status !== 'running') {
        setError('実行中のセッションがありません');
        return;
      }
      await run('/api/timer/pause');
      return;
    }

    if (kind === 'resume') {
      if (status !== 'paused') {
        setError('一時停止中のセッションがありません');
        return;
      }
      await run('/api/timer/resume');
      return;
    }

    if (kind === 'stop') {
      if (!hasSession) {
        setError('停止対象のセッションがありません');
        return;
      }
      await run('/api/timer/stop');
      return;
    }

    await run('/api/timer/reset');
    await load();
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
        {error && <p style={{ color: '#c0392b' }}>{error}</p>}
        <div className="row">
          <button className="button" onClick={() => action('start')}>
            Start
          </button>
          <button className="button secondary" onClick={() => action('pause')}>
            Pause
          </button>
          <button className="button secondary" onClick={() => action('resume')}>
            Resume
          </button>
          <button className="button secondary" onClick={() => action('stop')}>
            Stop
          </button>
          <button className="button secondary" onClick={() => action('reset')}>
            Reset
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
