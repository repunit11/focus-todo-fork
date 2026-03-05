import './globals.css';
import Link from 'next/link';
import { Crown, Gauge, Settings, Sprout, Users } from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
          <aside className="hidden border-r border-slate-200 bg-white p-4 lg:flex lg:flex-col lg:gap-4">
            <div className="px-2 py-1 text-xl text-slate-500">kenken22352235</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400">検索</div>
            <nav className="flex flex-col gap-1 text-slate-600">
              <Link href="/" className="rounded-xl bg-slate-100 px-3 py-2">今日</Link>
              <Link href="/tasks" className="rounded-xl px-3 py-2 hover:bg-slate-100">タスク</Link>
              <Link href="/stats" className="rounded-xl px-3 py-2 hover:bg-slate-100">今週</Link>
              <Link href="/settings" className="rounded-xl px-3 py-2 hover:bg-slate-100">設定</Link>
            </nav>
          </aside>

          <section className="flex min-w-0 flex-col">
            <header className="flex h-[72px] items-center justify-end gap-4 border-b border-slate-200 bg-white px-6 text-slate-500">
              <Crown size={18} />
              <Users size={18} />
              <Sprout size={18} />
              <Gauge size={18} />
              <Settings size={18} />
            </header>
            <main className="px-4 pb-24 pt-6 lg:px-6">{children}</main>
          </section>
        </div>
      </body>
    </html>
  );
}
