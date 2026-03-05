'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronDown, CircleDot, Play, Plus } from 'lucide-react';
import { useRef } from 'react';

type Settings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
};

type Task = {
  id: string;
  title: string;
  note: string;
  estimatedPomodoros: number;
  completed: boolean;
  tags: string[];
};

type TimerStore = {
  elapsedByTask: Record<string, number>;
  pomodoroCount: number;
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

function formatClock(now: Date): string {
  return now.toLocaleTimeString('ja-JP', { hour12: false });
}

const STORAGE_KEY = 'focus_todo_task_timers_v1';

export default function TodayPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [elapsedByTask, setElapsedByTask] = useState<Record<string, number>>({});
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [clockNow, setClockNow] = useState(new Date());
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [noiseEnabled, setNoiseEnabled] = useState(false);
  const noiseRef = useRef<HTMLAudioElement | null>(null);

  async function loadTasks() {
    const resp = await fetch('/api/tasks');
    const json = await resp.json();
    setTasks((json.tasks ?? []).filter((t: Task) => !t.completed));
  }

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => {
        if (j.settings) setSettings(j.settings);
      })
      .catch(() => {});

    loadTasks().catch(() => {});

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as TimerStore;
        setElapsedByTask(parsed.elapsedByTask ?? {});
        setPomodoroCount(parsed.pomodoroCount ?? 0);
      } catch {
        // ignore broken local data
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ elapsedByTask, pomodoroCount } satisfies TimerStore)
    );
  }, [elapsedByTask, pomodoroCount]);

  useEffect(() => {
    const id = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const audio = new Audio('/audio/white-noise.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    noiseRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
      noiseRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = noiseRef.current;
    if (!audio) return;
    if (status === 'running' && noiseEnabled) {
      audio.play().catch(() => {});
      return;
    }
    audio.pause();
    audio.currentTime = 0;
  }, [status, noiseEnabled]);

  useEffect(() => {
    if (status !== 'running' || !activeTaskId) return;
    const id = setInterval(() => {
      setElapsedByTask((prev) => ({
        ...prev,
        [activeTaskId]: (prev[activeTaskId] ?? 0) + 1
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [status, activeTaskId]);

  const focusSeconds = settings.focusMinutes * 60;
  const activeElapsedSeconds = activeTaskId ? elapsedByTask[activeTaskId] ?? 0 : 0;

  useEffect(() => {
    if (status !== 'running' || !activeTaskId) return;
    if (activeElapsedSeconds < focusSeconds) return;

    fetch('/api/stats/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ focusSeconds, completedPomodoro: true })
    }).catch(() => {});

    setPomodoroCount((v) => v + 1);
    setElapsedByTask((prev) => ({ ...prev, [activeTaskId]: 0 }));
  }, [activeElapsedSeconds, focusSeconds, status, activeTaskId]);

  const totalFocusMinutes = useMemo(() => {
    const sum = Object.values(elapsedByTask).reduce((acc, sec) => acc + sec, 0);
    return Math.floor(sum / 60);
  }, [elapsedByTask]);

  async function addTask(e: FormEvent) {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;

    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, note: '', estimatedPomodoros: 1, tags: [] })
    });

    setNewTaskTitle('');
    await loadTasks();
  }

  function startTask(taskId: string) {
    setActiveTaskId(taskId);
    setStatus('idle');
    setIsTimerModalOpen(true);
  }

  function pauseTask() {
    if (status === 'running') setStatus('paused');
  }

  function resumeTask() {
    if (status === 'paused') setStatus('running');
  }

  function deleteActiveTaskTimer() {
    if (!activeTaskId) return;
    setElapsedByTask((prev) => ({ ...prev, [activeTaskId]: 0 }));
    setStatus('idle');
    setActiveTaskId(null);
    setIsTimerModalOpen(false);
    stopNoise();
  }

  function stopNoise() {
    const audio = noiseRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  function toggleNoise() {
    setNoiseEnabled((v) => !v);
  }

  function minimizeModal() {
    setIsTimerModalOpen(false);
    stopNoise();
  }

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;
  const remainingSeconds = focusSeconds - activeElapsedSeconds;
  const progressRatio = Math.min(1, Math.max(0, activeElapsedSeconds / focusSeconds));
  const progressDeg = progressRatio * 360;
  const showLargeTimer = !!activeTask && isTimerModalOpen;
  const showMiniDock = !!activeTask && !isTimerModalOpen;

  return (
    <div>
      <h1 className="today-title">今日</h1>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{settings.focusMinutes}</div>
          <div className="stat-label">予定時間</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{tasks.length}</div>
          <div className="stat-label">未完了のタスク</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalFocusMinutes}</div>
          <div className="stat-label">実行済みの時間</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pomodoroCount}</div>
          <div className="stat-label">完了済のポモドーロ</div>
        </div>
      </section>

      <form className="quick-add" onSubmit={addTask}>
        <Plus size={14} style={{ verticalAlign: 'middle' }} />{' '}
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="タスク名を入力して Enter"
          style={{ border: 'none', outline: 'none', background: 'transparent', width: '80%', color: '#7f7f93' }}
        />
      </form>

      <section className="task-board">
        <strong>タスク・{totalFocusMinutes}分</strong>
        {tasks.length === 0 && (
          <div className="task-row">
            <div>タスクはまだありません</div>
          </div>
        )}
        {tasks.map((task) => {
          const elapsed = elapsedByTask[task.id] ?? 0;
          return (
            <div className="task-row" key={task.id}>
              <div className="task-row-main">
                <button
                  type="button"
                  className="task-start"
                  onClick={() => startTask(task.id)}
                  title="このタスクを開始"
                >
                  <Play size={14} />
                </button>
                <div>
                  <div>{task.title}</div>
                  <div className="task-meta"><CircleDot size={12} style={{ verticalAlign: 'middle' }} /> {formatMMSS(elapsed)}</div>
                </div>
              </div>
              <div>{task.note || '-'}</div>
            </div>
          );
        })}
      </section>

      {showLargeTimer && (
        <div className="timer-modal-backdrop" onDoubleClick={minimizeModal}>
          <div className="timer-fullscreen" onDoubleClick={(e) => e.stopPropagation()}>
            <section className="timer-left">
              <div className="timer-floating-task">
                <div className="timer-floating-title">{activeTask?.title}</div>
                <button
                  type="button"
                  className="timer-close-mini"
                  onClick={minimizeModal}
                  title="縮小"
                >
                  <ChevronDown size={20} />
                </button>
              </div>

              <div className="timer-ring-wrap">
                <div className="timer-ring-track" />
                <div
                  className="timer-ring-progress"
                  style={{
                    background: `conic-gradient(#fd6f66 ${progressDeg}deg, rgba(232,236,248,0.35) ${progressDeg}deg)`
                  }}
                />
                <div className="timer-big-time">{formatMMSS(remainingSeconds)}</div>
              </div>

              <div className="timer-main-actions">
                {status === 'idle' && (
                  <button type="button" className="button primary" onClick={() => setStatus('running')}>
                    集中スタート
                  </button>
                )}
                {status === 'running' && (
                  <button type="button" className="button" onClick={pauseTask}>
                    一時停止
                  </button>
                )}
                {status === 'paused' && (
                  <>
                    <button type="button" className="button primary" onClick={resumeTask}>
                      続く
                    </button>
                    <button type="button" className="button" onClick={deleteActiveTaskTimer}>
                      停止
                    </button>
                  </>
                )}
              </div>

              <div className="timer-bottom-modes">
                <div>全画面</div>
                <div>タイマーモード</div>
                <button type="button" className="button" onClick={toggleNoise}>
                  ホワイトノイズ {noiseEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </section>

            <aside className="timer-right">
              <div className="timer-info-card">
                <h4>本日のポモドーロ時間</h4>
                <div className="timer-info-value">{pomodoroCount * settings.focusMinutes}</div>
              </div>

              <div className="timer-info-card">
                <h4>今日</h4>
                <div className="timer-mini-task">{activeTask?.title}</div>
              </div>

              <div className="timer-info-card">
                <h4>今日の集中時間</h4>
                <div className="timer-time-line" />
                <div className="timer-time-label">{formatClock(clockNow)}</div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {showMiniDock && (
        <button type="button" className="timer-dock-mini" onClick={() => setIsTimerModalOpen(true)}>
          <span>{activeTask?.title}</span>
          <strong>{formatMMSS(remainingSeconds)}</strong>
        </button>
      )}
    </div>
  );
}
