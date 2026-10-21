"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AppShell, { useUser } from "@/components/AppShell";
import ChapterPicker from "@/components/ChapterPicker";
import { Spinner, ErrorNote } from "@/components/ui";
import { IconArrowLeft, IconArrowRight, IconHome, IconRefresh } from "@/components/Icons";

function Flashcards() {
  const { user } = useUser();
  const [chapters, setChapters] = useState(null);
  const [chapter, setChapter] = useState("all");
  const [cards, setCards] = useState([]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
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

  async function load(more) {
    setError("");
    setLoading(true);
    try {
      const { cards: fresh } = await api.flashcards({
        chapter,
        count: 5,
        avoid: more ? cards.map((c) => c.front) : [],
      });
      if (more) {
        setI(cards.length);
        setCards((c) => [...c, ...fresh]);
      } else {
        setCards(fresh);
        setI(0);
      }
      setFlipped(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function go(n) {
    setI(n);
    setFlipped(false);
  }

  if (cards.length === 0) {
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
        <ErrorNote>{error}</ErrorNote>
        {loading ? (
          <div className="card">
            <Spinner label="Preparing flashcards…" />
          </div>
        ) : (
          <button className="btn btn-primary btn-lg" disabled={!chapters || chapters.length === 0} onClick={() => load(false)}>
            Start flashcards
          </button>
        )}
      </div>
    );
  }

  const card = cards[i];
  const isLast = i === cards.length - 1;

  return (
    <div className="stack">
      <div className="muted small center">
        Card {i + 1} of {cards.length}
      </div>

      <button className={`flash ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((f) => !f)} aria-label="Flip card">
        <span className="flash-tag">{flipped ? "Answer" : "Question"}</span>
        <span className="flash-text">{flipped ? card.back : card.front}</span>
        <span className="flash-hint">Tap to {flipped ? "see the question" : "flip"}</span>
      </button>

      <ErrorNote>{error}</ErrorNote>

      <div className="row">
        <button className="btn" disabled={i === 0 || loading} onClick={() => go(i - 1)}>
          <IconArrowLeft size={17} />
          Prev
        </button>
        {isLast ? (
          <button className="btn btn-primary grow" disabled={loading} onClick={() => load(true)}>
            <IconRefresh size={17} />
            {loading ? "Loading…" : "More cards"}
          </button>
        ) : (
          <button className="btn btn-primary grow" onClick={() => go(i + 1)}>
            Next
            <IconArrowRight size={17} />
          </button>
        )}
      </div>
      <button
        className="btn btn-ghost"
        onClick={() => {
          setCards([]);
          setI(0);
          setFlipped(false);
        }}
      >
        <IconHome size={17} />
        End session
      </button>
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <AppShell title="Flashcards">
      <Flashcards />
    </AppShell>
  );
}