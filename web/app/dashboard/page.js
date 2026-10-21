"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import AppShell, { useUser } from "@/components/AppShell";
import { ErrorNote } from "@/components/ui";
import {
  IconBook,
  IconCards,
  IconChat,
  IconChevronRight,
  IconExam,
  IconQuiz,
  IconSparkle,
  IconTrophy,
} from "@/components/Icons";

const TILES = [
  { href: "/ask", Icon: IconChat, title: "Ask Question", sub: "Answers from your material", tone: "tone-teal" },
  { href: "/quiz", Icon: IconQuiz, title: "Take Quiz", sub: "5, 10 or 15 questions", tone: "tone-violet" },
  { href: "/exam", Icon: IconExam, title: "Take Exam", sub: "20, 25 or 30 questions", tone: "tone-amber" },
  { href: "/flashcards", Icon: IconCards, title: "Flashcards", sub: "Flip and revise", tone: "tone-sky" },
  { href: "/leaderboard", Icon: IconTrophy, title: "Leaderboard", sub: "See who's on top", tone: "tone-rose" },
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
        <h2 className="h1">
          Hi {user.first_name || user.username || "there"}
          <IconSparkle size={18} className="greet-icon" />
        </h2>
        <p className="muted">Pick up where you left off.</p>
      </div>

      <div className="card stack-sm">
        <label className="label" htmlFor="course">
          <IconBook size={15} />
          Active course
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
        {TILES.map(({ href, Icon, title, sub, tone }) => (
          <Link key={href} href={href} className={`tile ${tone}`}>
            <span className="tile-icon" aria-hidden="true">
              <Icon size={21} />
            </span>
            <span className="tile-title">{title}</span>
            <span className="muted small">{sub}</span>
            <IconChevronRight size={16} className="tile-arrow" />
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