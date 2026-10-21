"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "@/lib/api";
import { ErrorNote } from "@/components/ui";
import { IconBook } from "@/components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState("username"); // username | code
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
      return;
    }
    try {
      const saved = localStorage.getItem("sb_username");
      if (saved) setUsername(saved);
    } catch {}
  }, [router]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendCode(e) {
    e?.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await api.requestCode(username);
      setStep("code");
      setCode("");
      setWait(60);
    } catch (err) {
      if (err.code === "too_soon") {
        setStep("code"); // a code was already sent a moment ago
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function verify(value) {
    setError("");
    setBusy(true);
    try {
      const d = await api.verifyCode(username, value);
      setToken(d.token);
      try {
        localStorage.setItem("sb_username", username.replace(/^@/, ""));
      } catch {}
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message);
      setCode("");
      setBusy(false);
    }
  }

  function onCodeChange(e) {
    const v = e.target.value.replace(/\D/g, "").slice(0, 5);
    setCode(v);
    if (v.length === 5) verify(v);
  }

  return (
    <div className="center-screen">
      <div className="login">
        <div className="logo" aria-hidden="true">
          <IconBook size={30} />
        </div>
        <h1 className="login-title">Study Bot</h1>
        <p className="muted center">Log in with your Telegram account. The code arrives in the bot.</p>

        {step === "username" ? (
          <form className="stack card" onSubmit={sendCode}>
            <label className="label" htmlFor="u">
              Telegram username
            </label>
            <div className="input-wrap">
              <span className="prefix">@</span>
              <input
                id="u"
                className="input with-prefix"
                value={username.replace(/^@/, "")}
                onChange={(e) => setUsername(e.target.value.replace(/^@/, "").trim())}
                placeholder="username"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                spellCheck={false}
                autoFocus
              />
            </div>
            <ErrorNote>{error}</ErrorNote>
            <button className="btn btn-primary btn-lg" disabled={busy || username.length < 3}>
              {busy ? "Sending…" : "Send me a code"}
            </button>
            <p className="muted small center">
              New here? Open the bot in Telegram, press <b>/start</b> and wait until you're approved.
            </p>
          </form>
        ) : (
          <div className="stack card">
            <label className="label" htmlFor="c">
              Enter the 5-digit code sent to @{username.replace(/^@/, "")} in Telegram
            </label>
            <input
              id="c"
              className="input code-input"
              value={code}
              onChange={onCodeChange}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="•••••"
              maxLength={5}
              disabled={busy}
              autoFocus
            />
            <ErrorNote>{error}</ErrorNote>
            <div className="row">
              <button
                className="btn"
                onClick={() => {
                  setStep("username");
                  setError("");
                }}
              >
                Change
              </button>
              <button className="btn grow" disabled={busy || wait > 0} onClick={sendCode}>
                {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}