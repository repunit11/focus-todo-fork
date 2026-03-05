'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Play, Pause, Square } from 'lucide-react';

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
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ elapsedByTask, pomodoroCount } satisfies TimerStore));
  }, [elapsedByTask, pomodoroCount]);

  useEffect(() => {
    const id = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

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

  function openTaskTimer(taskId: string) {
    setActiveTaskId(taskId);
    setStatus('idle');
    setIsTimerModalOpen(true);
  }

  function startFocus() {
    if (!activeTaskId) return;
    setStatus('running');
  }

  function pauseFocus() {
    if (status === 'running') setStatus('paused');
  }

  function resumeFocus() {
    if (status === 'paused') setStatus('running');
  }

  function stopFocus() {
    if (!activeTaskId) return;
    setElapsedByTask((prev) => ({ ...prev, [activeTaskId]: 0 }));
    setStatus('idle');
    setActiveTaskId(null);
    setIsTimerModalOpen(false);
  }

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;
  const remainingSeconds = focusSeconds - activeElapsedSeconds;
  const showLargeTimer = !!activeTask && isTimerModalOpen;
  const showMiniDock = !!activeTask && !isTimerModalOpen;

  return (
    <div>
      <h1 className="mb-4 text-4xl font-medium text-slate-500">今日</h1>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { v: settings.focusMinutes, l: '予定時間' },
          { v: tasks.length, l: '未完了のタスク' },
          { v: totalFocusMinutes, l: '実行済みの時間' },
          { v: pomodoroCount, l: '完了済のポモドーロ' }
        ].map((item) => (
          <div key={item.l} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <div className="text-4xl font-semibold leading-none text-rose-500">{item.v}</div>
            <div className="mt-1 text-sm text-slate-400">{item.l}</div>
          </div>
        ))}
      </section>

      <form onSubmit={addTask} className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-400">
        ＋{' '}
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="タスク名を入力して Enter"
          className="w-[80%] border-none bg-transparent text-slate-500 outline-none"
        />
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <strong className="text-slate-600">タスク・{totalFocusMinutes}分</strong>
        {tasks.length === 0 && <div className="mt-3 rounded-lg border border-slate-100 p-3">タスクはまだありません</div>}
        <div className="space-y-3">
          {tasks.map((task) => {
            const elapsed = elapsedByTask[task.id] ?? 0;
            return (
              <div key={task.id} className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openTaskTimer(task.id)}
                    className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    title="このタスクを開始"
                  >
                    <Play size={14} />
                  </button>
                  <div>
                    <div>{task.title}</div>
                    <div className="text-xs text-rose-500">● {formatMMSS(elapsed)}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-400">{task.note || '-'}</div>
              </div>
            );
          })}
        </div>
      </section>

      {showLargeTimer && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(9,11,18,0.72)] backdrop-blur-sm" onDoubleClick={() => setIsTimerModalOpen(false)}>
          <div
            className="relative grid h-[min(760px,calc(100vh-24px))] w-[min(1240px,calc(100vw-32px))] grid-cols-1 gap-5 overflow-auto rounded-2xl p-6 text-white lg:grid-cols-[1fr_330px]"
            style={{
              background:
                'radial-gradient(circle at 30% 55%, rgba(0, 152, 131, 0.35), transparent 45%), radial-gradient(circle at 65% 30%, rgba(42, 87, 201, 0.22), transparent 45%), linear-gradient(120deg, #0f1423, #111827 55%, #0e1a2a)'
            }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xl hover:bg-white/20"
              onClick={() => setIsTimerModalOpen(false)}
              title="縮小"
            >
              <ChevronDown size={18} />
            </button>

            <section className="flex flex-col items-center justify-between">
              <div className="mt-2 flex w-full max-w-[520px] items-center justify-between rounded-xl bg-white/90 px-4 py-3 text-slate-600">
                <div className="text-2xl font-semibold">{activeTask?.title}</div>
              </div>

              <div className="relative grid h-[280px] w-[280px] place-items-center lg:h-[440px] lg:w-[440px]">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'repeating-conic-gradient(rgba(232,236,248,0.72) 0deg 2deg, transparent 2deg 5deg)',
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px))',
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px))'
                  }}
                />
                <div className="text-6xl font-medium tracking-wide lg:text-8xl">{formatMMSS(remainingSeconds)}</div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {status === 'idle' && (
                  <button type="button" className="rounded-full bg-white px-5 py-2 font-semibold text-slate-900" onClick={startFocus}>
                    集中スタート
                  </button>
                )}
                {status === 'running' && (
                  <button type="button" className="rounded-full border border-white/30 bg-white/10 px-4 py-2" onClick={pauseFocus}>
                    一時停止
                  </button>
                )}
                {status === 'paused' && (
                  <>
                    <button type="button" className="rounded-full bg-white px-5 py-2 font-semibold text-slate-900" onClick={resumeFocus}>
                      続く
                    </button>
                    <button type="button" className="rounded-full border border-white/30 bg-white/10 px-4 py-2" onClick={stopFocus}>
                      停止
                    </button>
                  </>
                )}
              </div>

              <div className="mb-2 flex gap-8 text-sm text-white/70">
                <div>全画面</div>
                <div>タイマーモード</div>
                <div>ホワイトノイズ</div>
              </div>
            </section>

            <aside className="flex flex-col gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#1c202fd9] p-4">
                <h4 className="mb-3 text-sm text-white/90">本日のポモドーロ時間</h4>
                <div className="text-5xl font-semibold text-rose-500">{pomodoroCount * settings.focusMinutes}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1c202fd9] p-4">
                <h4 className="mb-3 text-sm text-white/90">今日</h4>
                <div className="rounded-lg bg-white/5 p-3">{activeTask?.title}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1c202fd9] p-4">
                <h4 className="mb-3 text-sm text-white/90">今日の集中時間</h4>
                <div className="mb-4 h-2 rounded-full bg-white/20" />
                <div className="text-white/70">{formatClock(clockNow)}</div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {showMiniDock && (
        <button
          type="button"
          className="fixed bottom-4 left-1/2 z-30 flex min-w-[290px] -translate-x-1/2 items-center justify-between rounded-xl bg-[#151824] px-4 py-3 text-white shadow-2xl"
          onClick={() => setIsTimerModalOpen(true)}
        >
          <span>{activeTask?.title}</span>
          <strong>{formatMMSS(remainingSeconds)}</strong>
        </button>
      )}
    </div>
  );
}
