'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CalendarRange, Calendar } from 'lucide-react';

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
      setDaily(d);
      setWeekly(w);
      setMonthly(m);
    });
  }, []);

  function card(title: string, data: Stats | null, icon: React.ReactNode) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-slate-500">{icon}<h3 className="font-semibold">{title}</h3></div>
        <p>Focus: {data?.totalFocusSeconds ?? 0}s</p>
        <p>Pomodoros: {data?.totalCompletedPomodoros ?? 0}</p>
        <p>Tasks: {data?.totalCompletedTasks ?? 0}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {card('Daily', daily, <CalendarDays size={16} />)}
      {card('Weekly', weekly, <CalendarRange size={16} />)}
      {card('Monthly', monthly, <Calendar size={16} />)}
    </div>
  );
}
