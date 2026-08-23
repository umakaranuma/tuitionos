"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function PageShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Every protected page renders through here, so this is the one place
  // that needs to gate on auth — previously nothing did, and the reactive
  // 401-redirect in api.ts skipped entirely when there was no token to
  // begin with, so a logged-out visitor could sit on any admin page.
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      setAuthed(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!authed) return null;

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
