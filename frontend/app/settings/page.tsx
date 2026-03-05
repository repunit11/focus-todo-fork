'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';

type Settings = { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakInterval: number };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 4 });

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => {
        if (j.settings) setSettings(j.settings);
      });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    await fetch('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings) });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-xl font-semibold text-slate-700">Pomodoro Settings</h2>
      <form onSubmit={save} className="grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Focus
          <input className="rounded-lg border border-slate-200 px-3 py-2" type="number" value={settings.focusMinutes} onChange={(e) => setSettings({ ...settings, focusMinutes: Number(e.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm">
          Short break
          <input className="rounded-lg border border-slate-200 px-3 py-2" type="number" value={settings.shortBreakMinutes} onChange={(e) => setSettings({ ...settings, shortBreakMinutes: Number(e.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm">
          Long break
          <input className="rounded-lg border border-slate-200 px-3 py-2" type="number" value={settings.longBreakMinutes} onChange={(e) => setSettings({ ...settings, longBreakMinutes: Number(e.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm">
          Interval
          <input className="rounded-lg border border-slate-200 px-3 py-2" type="number" value={settings.longBreakInterval} onChange={(e) => setSettings({ ...settings, longBreakInterval: Number(e.target.value) })} />
        </label>
        <button className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-white">
          <Save size={15} /> Save
        </button>
      </form>
    </div>
  );
}
