import { neonQuery } from "./lib/neon.js";
import { generateAI, geminiEmbedBatch, parseJsonArray, parseFlashcardArray } from "./lib/ai.js";
import { COURSES, HttpError, readJson } from "./lib/util.js";

const QUIZ_COUNTS = { Quiz: [5, 10, 15], Exam: [20, 25, 30] };
const LETTERS = ["A", "B", "C", "D"];
const SESSION_MAX_AGE = 24 * 60 * 60;

const courseOf = (user) => user.course || COURSES[0];

function parseChapter(value) {
  if (value === "all") return "all";
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n < 0 || n > 9999) throw new HttpError(400, "Invalid chapter.", "bad_chapter");
  return n;
}

async function fetchCourseChunks(env, course, chapter, limit) {
  if (chapter === "all") {
    return neonQuery(env, `SELECT content FROM chunks WHERE course = $1 ORDER BY RANDOM() LIMIT $2`, [course, limit]);
  }
  return neonQuery(
    env,
    `SELECT content FROM chunks WHERE course = $1 AND COALESCE(chapter, 1) = $2 ORDER BY RANDOM() LIMIT $3`,
    [course, chapter, limit]
  );
}

// GET /chapters
export async function chapters(_request, env, user) {
  const course = courseOf(user);
  const rows = await neonQuery(
    env,
    `SELECT DISTINCT COALESCE(chapter, 1) as chapter FROM chunks WHERE course = $1 ORDER BY chapter ASC`,
    [course]
  );
  return { course, chapters: rows.map((r) => r.chapter) };
}

// ===== ASK QUESTION (RAG) =====
const IMAGE_REQUEST_PATTERNS = [
  /\b(generate|create|make|produce|render|paint)\s+(me\s+)?(an?\s+|the\s+|some\s+)?(new\s+)?(image|picture|photo|drawing|illustration|painting|artwork|logo|wallpaper)s?\b/i,
  /\bdraw\s+(me\s+)?(an?\s+|the\s+)?(picture|image|portrait|cartoon|painting|illustration|logo)\b/i,
  /\bshow\s+me\s+(an?\s+)(picture|photo|image)\s+of\b/i,
  /\bmake\s+me\s+(an?\s+)(picture|image|drawing)\b/i,
];
const isImageRequest = (text) => IMAGE_REQUEST_PATTERNS.some((re) => re.test(text));

// POST /ask  { question }
export async function ask(request, env, user) {
  const { question } = await readJson(request);
  const q = String(question || "").trim();
  if (!q) throw new HttpError(400, "Type a question first.", "empty");
  if (q.length > 3000) throw new HttpError(400, "Question is too long (max 3000 characters).", "too_long");

  const course = courseOf(user);

  if (isImageRequest(q)) {
    return {
      answer:
        "🎨 I can't create images — my creator Abel built me only to help you study your course material through text. Ask me anything about your textbook instead! 📚",
    };
  }

  await env.DB.prepare("INSERT INTO usage_log (chat_id, course, action) VALUES (?, ?, 'ask')")
    .bind(user.chat_id, course)
    .run()
    .catch(() => {});

  let rows;
  try {
    const qEmbedding = (await geminiEmbedBatch(env, [q]))[0];
    const vecLiteral = `[${qEmbedding.join(",")}]`;
    rows = await neonQuery(env, `SELECT content FROM chunks WHERE course = $1 ORDER BY embedding <=> $2 LIMIT 6`, [course, vecLiteral]);
  } catch (e) {
    console.error("ask retrieval error:", e.message);
    throw new HttpError(503, "Couldn't search the course material right now. Try again in a moment.", "retrieval_failed");
  }

  if (!rows.length) return { answer: `No material stored for ${course} yet.` };

  const context = rows.map((r, i) => `[Section ${i + 1}]\n${r.content}`).join("\n\n");
  const prompt = `You are an academic tutor bot built by Abel for the course "${course}".
Rules you must always follow:
- Answer using the CONTEXT below, which comes from the student's uploaded course material.
- The student may write long, detailed, or descriptive messages: explaining what they don't understand, pasting a part of their notes, describing a concept in their own words, or giving instructions about HOW they want the answer (simpler, step by step, with examples, shorter, in a table, etc.). ALL of that is normal studying. Treat it as an on-topic question about the course and answer it. NEVER refuse or warn the student just because their message is long, detailed, or directive.
- Follow the student's requested answer style (simple, detailed, step by step, examples, summary, etc.) as long as the facts come from the CONTEXT.
- Only decline when the student CLEARLY and DIRECTLY asks for something with no connection to studying this course at all (for example: casual chit-chat, personal advice, jokes, homework for a different subject). In that case reply briefly with: "My creator Abel built me only to help you study your course material — let's get back to it! 📚" and do not answer that off-topic request.
- When in doubt whether a message is about the course, assume it IS and try to answer from the CONTEXT.
- Never generate, describe, or offer to generate images.
- If the answer is not present in the CONTEXT, say clearly: "This topic is not covered in the uploaded course material."
- Do not invent facts or use outside knowledge beyond the CONTEXT.

CONTEXT:
${context}

QUESTION:
${q}`;

  try {
    return { answer: await generateAI(env, prompt, false) };
  } catch {
    throw new HttpError(503, "I'm having trouble reaching the AI right now. Please try again in a moment.", "ai_failed");
  }
}

// ===== QUIZ & EXAM =====
// POST /quiz/start  { type: "Quiz" | "Exam", chapter: "all" | number, count }
// Questions (with answers) are kept server-side in app_quiz_sessions, never in the bot's quiz_sessions,
// so the bot can't mistake app activity for a quiz in Telegram.
export async function quizStart(request, env, user) {
  const body = await readJson(request);
  const type = body.type === "Exam" ? "Exam" : body.type === "Quiz" ? "Quiz" : null;
  if (!type) throw new HttpError(400, "Invalid type.", "bad_type");
  const count = parseInt(body.count, 10);
  if (!QUIZ_COUNTS[type].includes(count)) throw new HttpError(400, "Invalid question count.", "bad_count");
  const chapter = parseChapter(body.chapter);
  const course = courseOf(user);
  const chText = chapter === "all" ? "All Chapters" : `Chapter ${chapter}`;

  const chunkLimit = Math.min(10, Math.max(3, Math.ceil(count * 0.7)));
  const rows = await fetchCourseChunks(env, course, chapter, chunkLimit);
  if (!rows.length) throw new HttpError(404, `No material found for ${course} (${chText}).`, "no_material");

  const context = rows.map((r) => (r.content || "").slice(0, 1500)).join("\n\n");
  const prompt = `You are an examination question writer for "${course}" (${chText}).
Generate EXACTLY ${count} multiple-choice questions based STRICTLY on the text below.

Respond with ONLY a raw JSON array matching this exact schema:
[
  {
    "question": "Question text?",
    "options": ["A) option", "B) option", "C) option", "D) option"],
    "answer": "A",
    "explanation": "One short sentence explaining why this is correct based on the text."
  }
]
Do not output markdown backticks. Do not include introductory text. Keep explanations to 1 short sentence.

COURSE TEXT:
${context}`;

  let raw;
  try {
    raw = await generateAI(env, prompt, true);
  } catch {
    throw new HttpError(503, "Couldn't generate questions right now. Please try again in a moment.", "ai_failed");
  }

  const questions = (parseJsonArray(raw) || [])
    .filter(
      (q) =>
        q &&
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        LETTERS.includes(String(q.answer || "").trim().toUpperCase().charAt(0))
    )
    .map((q) => ({
      question: q.question,
      options: q.options.map(String),
      answer: String(q.answer).trim().toUpperCase().charAt(0),
      explanation: q.explanation ? String(q.explanation) : "",
    }))
    .slice(0, count);

  if (!questions.length) throw new HttpError(502, "Failed to generate questions from the material. Please try again.", "bad_generation");

  const id = crypto.randomUUID();
  const t = Math.floor(Date.now() / 1000);
  // one open quiz per student; also sweep anything stale
  await env.DB.prepare("DELETE FROM app_quiz_sessions WHERE chat_id = ? OR created_at < ?").bind(user.chat_id, t - SESSION_MAX_AGE).run();
  await env.DB.prepare("INSERT INTO app_quiz_sessions (id, chat_id, data, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, user.chat_id, JSON.stringify({ type, course, chapter, questions }), t)
    .run();

  return {
    id,
    type,
    course,
    chapter,
    total: questions.length,
    questions: questions.map((q) => ({ question: q.question, options: q.options })),
  };
}

// POST /quiz/submit  { id, answers: ["A", "C", null, ...] }
export async function quizSubmit(request, env, user) {
  const { id, answers } = await readJson(request);
  if (!id || !Array.isArray(answers)) throw new HttpError(400, "Invalid submission.", "bad_submit");

  // Atomic claim: deleting the row first means a quiz can only be scored once.
  const row = await env.DB.prepare("DELETE FROM app_quiz_sessions WHERE id = ? AND chat_id = ? RETURNING data")
    .bind(String(id), user.chat_id)
    .first();
  if (!row) throw new HttpError(404, "This quiz was already submitted or has expired. Start a new one.", "no_session");

  const s = JSON.parse(row.data);
  const review = s.questions.map((q, i) => {
    const a = String(answers[i] || "").trim().toUpperCase().charAt(0);
    const userAnswer = LETTERS.includes(a) ? a : null;
    return {
      question: q.question,
      options: q.options,
      userAnswer,
      correctAnswer: q.answer,
      explanation: q.explanation,
      isCorrect: userAnswer === q.answer,
    };
  });
  const correct = review.filter((r) => r.isCorrect).length;
  const total = review.length;

  let saved = true;
  try {
    await env.DB.prepare(
      `INSERT INTO quiz_results (chat_id, username, first_name, course, type, correct, total) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(user.chat_id, user.username || null, user.first_name || null, s.course, s.type, correct, total)
      .run();
  } catch (err) {
    saved = false;
    console.error("Leaderboard score save error:", err);
  }

  return { type: s.type, course: s.course, chapter: s.chapter, correct, total, pct: Math.round((correct / total) * 100), saved, review };
}

// ===== FLASHCARDS =====
// POST /flashcards  { chapter, count?, avoid?: [fronts] }
export async function flashcards(request, env, user) {
  const body = await readJson(request);
  const chapter = parseChapter(body.chapter);
  const count = Math.min(10, Math.max(1, parseInt(body.count, 10) || 5));
  const avoid = Array.isArray(body.avoid) ? body.avoid.slice(-30).map((s) => String(s).slice(0, 200)) : [];
  const course = courseOf(user);

  const chunkLimit = Math.min(10, Math.max(3, count + 2));
  const rows = await fetchCourseChunks(env, course, chapter, chunkLimit);
  if (!rows.length) {
    const chText = chapter === "all" ? "All Chapters" : `Chapter ${chapter}`;
    throw new HttpError(404, `No material found for ${course} (${chText}).`, "no_material");
  }

  const context = rows.map((r) => (r.content || "").slice(0, 1500)).join("\n\n");
  const chText = chapter === "all" ? "All Chapters" : `Chapter ${chapter}`;
  const avoidLine = avoid.length ? `\nDo not repeat any of these existing flashcard fronts: ${avoid.join(" | ")}` : "";

  const prompt = `You are creating study flashcards for "${course}" (${chText}), based STRICTLY on the text below.
Generate EXACTLY ${count} flashcard${count > 1 ? "s" : ""}.${avoidLine}

Respond with ONLY a raw JSON array matching this schema:
[
  { "front": "A question or term from the text", "back": "A concise 1-2 sentence answer or definition, based only on the text." }
]
Do not output markdown backticks or any other text.

COURSE TEXT:
${context}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await generateAI(env, prompt, true);
      const cards = parseFlashcardArray(raw);
      if (cards && cards.length) {
        return { cards: cards.slice(0, count).map((c) => ({ front: String(c.front), back: String(c.back) })) };
      }
    } catch (err) {
      console.warn(`flashcard generation attempt ${attempt} failed:`, err.message);
    }
  }
  throw new HttpError(503, "Couldn't generate flashcards right now. Please try again in a moment.", "ai_failed");
}
