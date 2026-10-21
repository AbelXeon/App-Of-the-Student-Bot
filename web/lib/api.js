const BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "sb_token";

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
  } catch {}
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
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
  me: () => request("/me"),
  setCourse: (course) => request("/course", { method: "POST", body: { course } }),
  chapters: () => request("/chapters"),
  ask: (question) => request("/ask", { method: "POST", body: { question } }),
  quizStart: (payload) => request("/quiz/start", { method: "POST", body: payload }),
  quizSubmit: (payload) => request("/quiz/submit", { method: "POST", body: payload }),
  flashcards: (payload) => request("/flashcards", { method: "POST", body: payload }),
  leaderboard: (scope) => request(`/leaderboard?scope=${scope}`),
};
