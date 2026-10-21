"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import AppShell, { useUser } from "@/components/AppShell";
import { ErrorNote } from "@/components/ui";

const TILES = [
  { href: "/ask", icon: "💬", title: "Ask Question", sub: "Answers from your material" },
  { href: "/quiz", icon: "📝", title: "Take Quiz", sub: "5, 10 or 15 questions" },
  { href: "/exam", icon: "🎓", title: "Take Exam", sub: "20, 25 or 30 questions" },
  { href: "/flashcards", icon: "🎴", title: "Flashcards", sub: "Flip and revise" },
  { href: "/leaderboard", icon: "🏆", title: "Leaderboard", sub: "See who's on top" },
];

function Dashboard() {
  const { user, setUser } = useUser();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .leaderboard("course")
      .then((d) => alive && setStats(d.me))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user.course]);

  async function changeCourse(e) {
    setError("");
    try {
      setUser(await api.setCourse(e.target.value));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <div>
        <h2 className="h1">Hi {user.first_name || user.username || "there"} 👋</h2>
        <p className="muted">Pick up where you left off.</p>
      </div>

      <div className="card stack-sm">
        <label className="label" htmlFor="course">
          📚 Active course
        </label>
        <select id="course" className="input" value={user.course} onChange={changeCourse}>
          {user.courses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <ErrorNote>{error}</ErrorNote>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-n">{stats ? stats.points : "–"}</div>
          <div className="stat-l">Points</div>
        </div>
        <div className="stat">
          <div className="stat-n">{stats ? stats.sessions : "–"}</div>
          <div className="stat-l">Sessions</div>
        </div>
        <div className="stat">
          <div className="stat-n">{stats ? `${stats.accuracy}%` : "–"}</div>
          <div className="stat-l">Accuracy</div>
        </div>
      </div>

      <div className="grid">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="tile">
            <span className="tile-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="tile-title">{t.title}</span>
            <span className="muted small">{t.sub}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <Dashboard />
    </AppShell>
  );
}
