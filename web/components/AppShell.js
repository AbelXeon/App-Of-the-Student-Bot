"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, clearToken } from "@/lib/api";
import { Spinner } from "./ui";
import { IconCards, IconChat, IconExam, IconHome, IconQuiz, IconTrophy } from "./Icons";

const UserCtx = createContext(null);
export const useUser = () => useContext(UserCtx);

const TABS = [
  { href: "/dashboard", Icon: IconHome, label: "Home" },
  { href: "/ask", Icon: IconChat, label: "Ask" },
  { href: "/quiz", Icon: IconQuiz, label: "Quiz" },
  { href: "/exam", Icon: IconExam, label: "Exam" },
  { href: "/flashcards", Icon: IconCards, label: "Cards" },
  { href: "/leaderboard", Icon: IconTrophy, label: "Ranks" },
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
          {TABS.map(({ href, Icon, label }) => (
            <Link key={href} href={href} className={`tab ${path === href ? "active" : ""}`}>
              <span className="tab-icon" aria-hidden="true">
                <Icon size={21} />
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </UserCtx.Provider>
  );
}