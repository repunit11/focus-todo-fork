'use client';

import { FormEvent, useEffect, useState } from 'react';

type Settings = { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakInterval: number };

export function SettingsFeaturePage() {
  const [settings, setSettings] = useState<Settings>({ focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 4 });

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((j) => {
      if (j.settings) setSettings(j.settings);
    });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    await fetch('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings) });
  }

  return (
    <div className="card">
      <h2>Pomodoro Settings</h2>
      <form onSubmit={save} className="row">
        <label>Focus<input type="number" value={settings.focusMinutes} onChange={(e) => setSettings({ ...settings, focusMinutes: Number(e.target.value) })} /></label>
        <label>Short break<input type="number" value={settings.shortBreakMinutes} onChange={(e) => setSettings({ ...settings, shortBreakMinutes: Number(e.target.value) })} /></label>
        <label>Long break<input type="number" value={settings.longBreakMinutes} onChange={(e) => setSettings({ ...settings, longBreakMinutes: Number(e.target.value) })} /></label>
        <label>Interval<input type="number" value={settings.longBreakInterval} onChange={(e) => setSettings({ ...settings, longBreakInterval: Number(e.target.value) })} /></label>
        <button className="button" type="submit">Save</button>
      </form>
    </div>
  );
}

export default SettingsFeaturePage;
