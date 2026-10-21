const BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "sb_token";
const ME_KEY = "sb_me";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t) {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {}
}
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ME_KEY);
  } catch {}
  resetCache();
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ---------- small cache so switching pages feels instant ----------
const ME_TTL = 60 * 1000; // profile: re-check at most once a minute
const CHAPTERS_TTL = 5 * 60 * 1000; // chapter list: 5 minutes
const LEADERBOARD_TTL = 30 * 1000; // leaderboard: 30 seconds

const cache = { me: null, meAt: 0, mePromise: null, chapters: null, leaderboard: {} };

function resetCache() {
  cache.me = null;
  cache.meAt = 0;
  cache.mePromise = null;
  cache.chapters = null;
  cache.leaderboard = {};
}

function saveMe(user) {
  cache.me = user;
  cache.meAt = Date.now();
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(user));
  } catch {}
}

// In-memory only: safe to call while rendering.
export function getCachedMe() {
  return cache.me;
}

// Profile saved from the last visit. Call from useEffect, not during render.
export function readStoredMe() {
  if (!cache.me) {
    try {
      const raw = localStorage.getItem(ME_KEY);
      if (raw) cache.me = JSON.parse(raw);
    } catch {}
  }
  return cache.me;
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection.", 0, "network");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    if (auth && (res.status === 401 || data?.code === "revoked" || data?.code === "suspended")) {
      clearToken();
      if (typeof window !== "undefined") window.location.replace("/login");
    }
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.code);
  }
  return data;
}

export const api = {
  requestCode: (username) => request("/auth/request-code", { method: "POST", body: { username }, auth: false }),
  verifyCode: (username, code) => request("/auth/verify", { method: "POST", body: { username, code }, auth: false }),

  me: () => {
    if (cache.me && Date.now() - cache.meAt < ME_TTL) return Promise.resolve(cache.me);
    if (cache.mePromise) return cache.mePromise;
    cache.mePromise = request("/me")
      .then((d) => {
        saveMe(d);
        return d;
      })
      .finally(() => {
        cache.mePromise = null;
      });
    return cache.mePromise;
  },

  setCourse: (course) =>
    request("/course", { method: "POST", body: { course } }).then((u) => {
      saveMe(u);
      cache.chapters = null;
      cache.leaderboard = {};
      return u;
    }),

  chapters: () => {
    const course = cache.me?.course || "";
    const c = cache.chapters;
    if (c && c.course === course && Date.now() - c.at < CHAPTERS_TTL) return Promise.resolve(c.data);
    return request("/chapters").then((d) => {
      cache.chapters = { course: d.course, at: Date.now(), data: d };
      return d;
    });
  },

  ask: (question) => request("/ask", { method: "POST", body: { question } }),
  quizStart: (payload) => request("/quiz/start", { method: "POST", body: payload }),

  quizSubmit: (payload) =>
    request("/quiz/submit", { method: "POST", body: payload }).then((r) => {
      cache.leaderboard = {}; // new score, so the old leaderboard is out of date
      return r;
    }),

  flashcards: (payload) => request("/flashcards", { method: "POST", body: payload }),

  leaderboard: (scope) => {
    const key = `${scope}:${cache.me?.course || ""}`;
    const hit = cache.leaderboard[key];
    if (hit && Date.now() - hit.at < LEADERBOARD_TTL) return Promise.resolve(hit.data);
    return request(`/leaderboard?scope=${scope}`).then((d) => {
      cache.leaderboard[key] = { at: Date.now(), data: d };
      return d;
    });
  },
};