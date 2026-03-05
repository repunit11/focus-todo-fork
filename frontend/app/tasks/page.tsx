'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

type Task = { id: string; title: string; note: string; estimatedPomodoros: number; completed: boolean; tags: string[] };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');

  async function load() {
    const r = await fetch('/api/tasks');
    const j = await r.json();
    setTasks(j.tasks ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, note, estimatedPomodoros: 1, tags: tags.split(',').map((x) => x.trim()).filter(Boolean) })
    });
    setTitle('');
    setNote('');
    setTags('');
    await load();
  }

  async function complete(id: string) {
    await fetch('/api/tasks', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    await load();
  }

  async function remove(id: string) {
    await fetch('/api/tasks', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-xl font-semibold text-slate-700">Task Manager</h2>
        <form onSubmit={create} className="grid gap-2">
          <input className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <input className="rounded-lg border border-slate-200 px-3 py-2" placeholder="tag1, tag2" value={tags} onChange={(e) => setTags(e.target.value)} />
          <button className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-white">
            <Plus size={16} /> Add Task
          </button>
        </form>
      </div>

      {tasks.map((t) => (
        <div className="rounded-xl border border-slate-200 bg-white p-4" key={t.id}>
          <div className="mb-2 flex items-center justify-between">
            <strong>{t.title}</strong>
            <span className="text-sm text-slate-400">{t.completed ? 'done' : 'open'}</span>
          </div>
          <p className="text-sm text-slate-600">{t.note || '-'}</p>
          <p className="mt-1 text-sm text-slate-400">Tags: {t.tags.join(', ') || '-'}</p>
          <div className="mt-3 flex gap-2">
            {!t.completed && (
              <button className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5" onClick={() => complete(t.id)}>
                <CheckCircle2 size={14} /> Complete
              </button>
            )}
            <button className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5" onClick={() => remove(t.id)}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
