export const COURSES = [
  "Introduction to AI",
  "Computer Security",
  "System and Network Administration",
  "Compiler Design",
  "Real-Time Embedded Systems",
];
export const GEMINI_MODEL = "gemini-3.5-flash-lite";
export const EMBED_MODEL = "gemini-embedding-001";

export class HttpError extends Error {
  constructor(status, message, code = "error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

export async function readJson(request) {
  try {
    return (await request.json()) || {};
  } catch {
    throw new HttpError(400, "Invalid request body.", "bad_json");
  }
}
