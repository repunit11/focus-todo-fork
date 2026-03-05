import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <main>
          <h1>FocusTodo Clone</h1>
          <nav className="nav">
            <Link href="/">Today</Link>
            <Link href="/tasks">Tasks</Link>
            <Link href="/stats">Stats</Link>
            <Link href="/settings">Settings</Link>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
