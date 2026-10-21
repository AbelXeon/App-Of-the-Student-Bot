"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import AppShell, { useUser } from "@/components/AppShell";

function Ask() {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const { answer } = await api.ask(q);
      setMessages((m) => [...m, { role: "bot", text: answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: `⚠️ ${err.message}`, failed: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="card center stack-sm">
            <div style={{ fontSize: 32 }}>💬</div>
            <p>
              Ask anything about <b>{user.course}</b>.
            </p>
            <p className="muted small">I answer strictly from the uploaded course material.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role} ${m.failed ? "failed" : ""}`}>
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="bubble bot">
            <span className="typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="chat-input" onSubmit={send}>
        <textarea
          className="input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
          placeholder="Type your question…"
          maxLength={3000}
        />
        <button className="btn btn-primary" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default function AskPage() {
  return (
    <AppShell title="Ask Question">
      <Ask />
    </AppShell>
  );
}
