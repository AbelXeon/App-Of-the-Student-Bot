"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useUser } from "./AppShell";
import ChapterPicker from "./ChapterPicker";
import { Spinner, ErrorNote } from "./ui";

const COUNTS = { Quiz: [5, 10, 15], Exam: [20, 25, 30] };
const LETTERS = ["A", "B", "C", "D"];

export default function QuizFlow({ type }) {
  const { user } = useUser();
  const [stage, setStage] = useState("setup"); // setup | loading | playing | submitting | result
  const [chapters, setChapters] = useState(null);
  const [chapter, setChapter] = useState("all");
  const [count, setCount] = useState(COUNTS[type][0]);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setChapters(null);
    setChapter("all");
    api
      .chapters()
      .then((d) => alive && setChapters(d.chapters))
      .catch((e) => alive && (setError(e.message), setChapters([])));
    return () => {
      alive = false;
    };
  }, [user.course]);

  async function start() {
    setError("");
    setStage("loading");
    try {
      const s = await api.quizStart({ type, chapter, count });
      setSession(s);
      setAnswers(Array(s.total).fill(null));
      setIdx(0);
      setStage("playing");
    } catch (e) {
      setError(e.message);
      setStage("setup");
    }
  }

  async function finish() {
    setError("");
    setStage("submitting");
    try {
      const r = await api.quizSubmit({ id: session.id, answers });
      setResult(r);
      setStage("result");
    } catch (e) {
      setError(e.message);
      setStage(e.code === "no_session" ? "setup" : "playing");
    }
  }

  function reset() {
    setSession(null);
    setResult(null);
    setError("");
    setStage("setup");
  }

  const label = type === "Exam" ? "Exam" : "Quiz";

  if (stage === "setup") {
    return (
      <div className="stack">
        <div className="card stack">
          <h2 className="h2">Choose a chapter</h2>
          {chapters === null ? (
            <Spinner label="Loading chapters…" />
          ) : chapters.length === 0 ? (
            <p className="muted">No material uploaded for {user.course} yet.</p>
          ) : (
            <ChapterPicker chapters={chapters} value={chapter} onChange={setChapter} />
          )}
        </div>
        <div className="card stack">
          <h2 className="h2">How many questions?</h2>
          <div className="chips">
            {COUNTS[type].map((n) => (
              <button key={n} className={`chip ${count === n ? "on" : ""}`} onClick={() => setCount(n)}>
                {n} questions
              </button>
            ))}
          </div>
        </div>
        <ErrorNote>{error}</ErrorNote>
        <button className="btn btn-primary btn-lg" disabled={!chapters || chapters.length === 0} onClick={start}>
          Start {label}
        </button>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="card">
        <Spinner label={`Generating ${count} questions… this can take up to 30 seconds.`} />
      </div>
    );
  }

  if (stage === "playing" || stage === "submitting") {
    const q = session.questions[idx];
    const isLast = idx === session.total - 1;
    const unanswered = answers.filter((a) => !a).length;
    return (
      <div className="stack">
        <div className="progress" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${((idx + 1) / session.total) * 100}%` }} />
        </div>
        <div className="card stack">
          <div className="muted small">
            {label} · Question {idx + 1} of {session.total}
          </div>
          <h2 className="question">{q.question}</h2>
          <div className="stack-sm">
            {q.options.map((opt, i) => (
              <button
                key={i}
                className={`opt ${answers[idx] === LETTERS[i] ? "selected" : ""}`}
                onClick={() => setAnswers((a) => a.map((v, j) => (j === idx ? LETTERS[i] : v)))}
                disabled={stage === "submitting"}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <ErrorNote>{error}</ErrorNote>
        <div className="row">
          <button className="btn" disabled={idx === 0 || stage === "submitting"} onClick={() => setIdx(idx - 1)}>
            ← Back
          </button>
          {isLast ? (
            <button className="btn btn-primary grow" disabled={stage === "submitting"} onClick={finish}>
              {stage === "submitting" ? "Submitting…" : unanswered ? `Finish (${unanswered} unanswered)` : "Finish"}
            </button>
          ) : (
            <button className="btn btn-primary grow" onClick={() => setIdx(idx + 1)}>
              Next →
            </button>
          )}
        </div>
      </div>
    );
  }

  // result
  return (
    <div className="stack">
      <div className="card center stack">
        <div className="muted">
          🏁 {result.type} completed · {result.chapter === "all" ? "All chapters" : `Chapter ${result.chapter}`}
        </div>
        <div className="score">
          {result.correct}
          <span className="muted"> / {result.total}</span>
        </div>
        <div className="pct">{result.pct}%</div>
        {!result.saved && <div className="note error">Your score couldn't be saved to the leaderboard.</div>}
        <button className="btn btn-primary" onClick={reset}>
          Take another {label.toLowerCase()}
        </button>
      </div>

      <h2 className="h2">Detailed review</h2>
      {result.review.map((r, i) => (
        <div key={i} className="card stack">
          <div className="question">
            {i + 1}. {r.question}
          </div>
          <div className="stack-sm">
            {r.options.map((opt, j) => {
              const letter = LETTERS[j];
              const cls = letter === r.correctAnswer ? "correct" : letter === r.userAnswer ? "wrong" : "";
              return (
                <div key={j} className={`opt static ${cls}`}>
                  {opt}
                  {letter === r.userAnswer && <span className="tag">your answer</span>}
                </div>
              );
            })}
          </div>
          {!r.userAnswer && <div className="muted small">Not answered</div>}
          {r.explanation && <div className="explain">💡 {r.explanation}</div>}
        </div>
      ))}
      <button className="btn btn-primary" onClick={reset}>
        Take another {label.toLowerCase()}
      </button>
    </div>
  );
}
