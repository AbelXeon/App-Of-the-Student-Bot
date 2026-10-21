import { corsHeaders, json, HttpError } from "./lib/util.js";
import { ensureTables, requestCode, verifyCode, authenticate, me, setCourse } from "./auth.js";
import { chapters, ask, quizStart, quizSubmit, flashcards } from "./study.js";
import { leaderboard } from "./leaderboard.js";

const PUBLIC = {
  "POST /auth/request-code": requestCode,
  "POST /auth/verify": verifyCode,
};

const PROTECTED = {
  "GET /me": me,
  "POST /course": setCourse,
  "GET /chapters": chapters,
  "POST /ask": ask,
  "POST /quiz/start": quizStart,
  "POST /quiz/submit": quizSubmit,
  "POST /flashcards": flashcards,
  "GET /leaderboard": leaderboard,
};

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    try {
      const url = new URL(request.url);
      const route = `${request.method} ${url.pathname}`;

      if (route === "GET /") return json({ ok: true, service: "study-app-api" }, 200, cors);

      const handler = PUBLIC[route] || PROTECTED[route];
      if (!handler) throw new HttpError(404, "Not found.", "not_found");
      if (!env.JWT_SECRET) throw new HttpError(500, "Server is missing JWT_SECRET.", "no_secret");

      await ensureTables(env);

      const data = PUBLIC[route]
        ? await handler(request, env)
        : await handler(request, env, await authenticate(request, env));
      return json(data, 200, cors);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status, cors);
      console.error("Unhandled error:", err);
      return json({ error: "Something went wrong. Please try again.", code: "server_error" }, 500, cors);
    }
  },
};
