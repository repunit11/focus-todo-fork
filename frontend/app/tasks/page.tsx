'use client';

import { FormEvent, useEffect, useState } from 'react';

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
  useEffect(() => { load(); }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, note, estimatedPomodoros: 1, tags: tags.split(',').map((x) => x.trim()).filter(Boolean) })
    });
    setTitle(''); setNote(''); setTags('');
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
    <div>
      <div className="card">
        <h2>Task Manager</h2>
        <form onSubmit={create} className="row">
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <input placeholder="tag1, tag2" value={tags} onChange={(e) => setTags(e.target.value)} />
          <button className="button" type="submit">Add Task</button>
        </form>
      </div>
      {tasks.map((t) => (
        <div className="card" key={t.id}>
          <div className="row"><strong>{t.title}</strong><span>{t.completed ? 'done' : 'open'}</span></div>
          <p>{t.note}</p>
          <p>Tags: {t.tags.join(', ') || '-'}</p>
          <div className="row">
            {!t.completed && <button className="button secondary" onClick={() => complete(t.id)}>Complete</button>}
            <button className="button secondary" onClick={() => remove(t.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
