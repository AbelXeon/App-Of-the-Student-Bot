import { COURSES } from "./lib/util.js";

// GET /leaderboard?scope=course|all
// Same ranking as the bot: 1 point per correct answer in quizzes and exams.
export async function leaderboard(request, env, user) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "all" ? "all" : "course";
  const isCourse = scope === "course";
  const course = user.course || COURSES[0];

  const res = await env.DB.prepare(
    `SELECT chat_id, username, first_name,
            COALESCE(SUM(correct), 0) AS total_correct,
            COALESCE(SUM(total), 0) AS total_questions,
            COUNT(*) AS quizzes_taken
     FROM quiz_results
     ${isCourse ? "WHERE course = ?" : ""}
     GROUP BY chat_id, username, first_name
     ORDER BY total_correct DESC, total_questions ASC
     LIMIT 10`
  )
    .bind(...(isCourse ? [course] : []))
    .all();

  const rows = (res?.results || []).map((r, i) => ({
    rank: i + 1,
    name: r.username ? `@${r.username}` : r.first_name || "Student",
    points: r.total_correct,
    isYou: String(r.chat_id) === String(user.chat_id),
  }));

  const mine = await env.DB.prepare(
    `SELECT COALESCE(SUM(correct), 0) AS correct, COALESCE(SUM(total), 0) AS total, COUNT(*) AS sessions
     FROM quiz_results WHERE chat_id = ? ${isCourse ? "AND course = ?" : ""}`
  )
    .bind(...(isCourse ? [user.chat_id, course] : [user.chat_id]))
    .first();

  return {
    scope,
    course,
    rows,
    me: {
      points: mine?.correct || 0,
      sessions: mine?.sessions || 0,
      accuracy: mine?.total ? Math.round((mine.correct / mine.total) * 100) : 0,
    },
  };
}
