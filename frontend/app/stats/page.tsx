'use client';

import { useEffect, useState } from 'react';

type Stats = { totalFocusSeconds: number; totalCompletedPomodoros: number; totalCompletedTasks: number };

export default function StatsPage() {
  const [daily, setDaily] = useState<Stats | null>(null);
  const [weekly, setWeekly] = useState<Stats | null>(null);
  const [monthly, setMonthly] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats/daily').then((r) => r.json()),
      fetch('/api/stats/weekly').then((r) => r.json()),
      fetch('/api/stats/monthly').then((r) => r.json())
    ]).then(([d, w, m]) => {
      setDaily(d); setWeekly(w); setMonthly(m);
    });
  }, []);

  function card(title: string, data: Stats | null) {
    return (
      <div className="card">
        <h3>{title}</h3>
        <p>Focus: {data?.totalFocusSeconds ?? 0}s</p>
        <p>Pomodoros: {data?.totalCompletedPomodoros ?? 0}</p>
        <p>Tasks: {data?.totalCompletedTasks ?? 0}</p>
      </div>
    );
  }

  return <div>{card('Daily', daily)}{card('Weekly', weekly)}{card('Monthly', monthly)}</div>;
}
