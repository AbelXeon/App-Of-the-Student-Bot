"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, clearToken } from "@/lib/api";
import { Spinner } from "./ui";

const UserCtx = createContext(null);
export const useUser = () => useContext(UserCtx);

const TABS = [
  { href: "/dashboard", icon: "🏠", label: "Home" },
  { href: "/ask", icon: "💬", label: "Ask" },
  { href: "/quiz", icon: "📝", label: "Quiz" },
  { href: "/exam", icon: "🎓", label: "Exam" },
  { href: "/flashcards", icon: "🎴", label: "Cards" },
  { href: "/leaderboard", icon: "🏆", label: "Ranks" },
];

export default function AppShell({ title, children }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    let alive = true;
    api
      .me()
      .then((d) => alive && setUser(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [router]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  if (error) {
    return (
      <div className="center-screen">
        <div className="card stack" style={{ maxWidth: 360 }}>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
          <button className="btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="center-screen">
        <Spinner label="Loading…" />
      </div>
    );
  }

  return (
    <UserCtx.Provider value={{ user, setUser }}>
      <div className="shell">
        <header className="topbar">
          <div>
            <h1 className="topbar-title">{title}</h1>
            <div className="topbar-sub">{user.course}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Log out
          </button>
        </header>
        <main className="content">{children}</main>
        <nav className="tabs" aria-label="Main">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={`tab ${path === t.href ? "active" : ""}`}>
              <span className="tab-icon" aria-hidden="true">
                {t.icon}
              </span>
              <span>{t.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </UserCtx.Provider>
  );
}
