"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AppShell, { useUser } from "@/components/AppShell";
import { Spinner, ErrorNote } from "@/components/ui";
import { IconBook, IconGlobe, IconMedal, IconTrophy, IconUser } from "@/components/Icons";

function Board() {
  const { user } = useUser();
  const [scope, setScope] = useState("course");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    api
      .leaderboard(scope)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [scope, user.course]);

  return (
    <div className="stack">
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={scope === "course"} className={scope === "course" ? "on" : ""} onClick={() => setScope("course")}>
          <IconBook size={16} />
          This course
        </button>
        <button role="tab" aria-selected={scope === "all"} className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>
          <IconGlobe size={16} />
          Global
        </button>
      </div>

      <ErrorNote>{error}</ErrorNote>
      {!data && !error && (
        <div className="card">
          <Spinner label="Loading…" />
        </div>
      )}

      {data && (
        <>
          <div className="muted small center">
            {scope === "course" ? data.course : "All courses"} · 1 point per correct answer
          </div>
          <div className="card list">
            {data.rows.length === 0 && (
              <p className="muted center">
                No scores yet. Finish a quiz or exam to take the #1 spot! <IconTrophy size={16} />
              </p>
            )}
            {data.rows.map((r) => (
              <div key={r.rank} className={`lb-row ${r.isYou ? "you" : ""}`}>
                <span className={`lb-rank ${r.rank <= 3 ? `rank-${r.rank}` : ""}`}>
                  {r.rank <= 3 ? <IconMedal size={19} /> : `#${r.rank}`}
                </span>
                <span className="lb-name">
                  {r.name}
                  {r.isYou && <span className="tag">you</span>}
                </span>
                <span className="lb-points">{r.points} pts</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="label">
              <IconUser size={15} />
              Your standing
            </div>
            <div className="stats flat">
              <div className="stat">
                <div className="stat-n">{data.me.points}</div>
                <div className="stat-l">Points</div>
              </div>
              <div className="stat">
                <div className="stat-n">{data.me.sessions}</div>
                <div className="stat-l">Sessions</div>
              </div>
              <div className="stat">
                <div className="stat-n">{data.me.accuracy}%</div>
                <div className="stat-l">Accuracy</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <AppShell title="Leaderboard">
      <Board />
    </AppShell>
  );
}