import './globals.css';
import Link from 'next/link';

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
              <span>🏆</span>
              <span>👥</span>
              <span>🌱</span>
              <span>📈</span>
              <span>⚙️</span>
            </header>
            <main className="page">{children}</main>
          </section>
        </div>
      </body>
    </html>
  );
}
