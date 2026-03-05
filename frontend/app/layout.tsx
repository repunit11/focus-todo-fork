import './globals.css';
import Link from 'next/link';
import { Crown, Gauge, Settings, Sprout, Users } from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar-user">kenken22352235</div>
            <div className="sidebar-search">検索</div>
            <nav className="sidebar-nav">
              <Link href="/" className="active">今日</Link>
              <Link href="/tasks">タスク</Link>
              <Link href="/stats">今週</Link>
              <Link href="/settings">設定</Link>
            </nav>
          </aside>

          <section className="workspace">
            <header className="topbar">
              <Crown size={18} />
              <Users size={18} />
              <Sprout size={18} />
              <Gauge size={18} />
              <Settings size={18} />
            </header>
            <main className="page">{children}</main>
          </section>
        </div>
      </body>
    </html>
  );
}
