import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <TopNav />
        {children}
      </main>
    </div>
  );
}
