import { GEMINI_MODEL, EMBED_MODEL } from "./util.js";

// ===== AI GENERATION ENGINE WITH RETRIES ACROSS ALL PROVIDERS (same as the bot) =====
export async function generateAI(env, prompt, asJson = false) {
  const attempts = [
    () => geminiGenerate(env, prompt, asJson, env.GEMINI_API_KEY),
    ...(env.GEMINI_API_KEY_2 ? [() => geminiGenerate(env, prompt, asJson, env.GEMINI_API_KEY_2)] : []),
    () => openrouterGenerate(env, prompt, "meta-llama/llama-3.3-70b-instruct:free"),
    () => openrouterGenerate(env, prompt, "google/gemini-2.0-flash-exp:free"),
    () => huggingfaceGenerate(env, prompt),
  ];

  let lastErr;
  for (let pass = 0; pass < 2; pass++) {
    if (pass > 0) await new Promise((r) => setTimeout(r, 4000));
    for (const attempt of attempts) {
      try {
        const text = await attempt();
        if (text && text.trim()) return text;
      } catch (err) {
        lastErr = err;
        console.warn(`AI attempt failed (pass ${pass}):`, err.message);
      }
    }
  }
  console.error("All AI providers failed after retries:", lastErr?.message);
  throw new Error("Unable to contact AI services right now.");
}

async function geminiGenerate(env, prompt, asJson = false, apiKey = env.GEMINI_API_KEY) {
  const key = apiKey || env.GEMINI_API_KEY;
  if (!key) throw new Error("no gemini key configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: asJson ? 4096 : 2048,
      temperature: 0.3,
      ...(asJson ? { responseMimeType: "application/json" } : {}),
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const executeFetch = async (bodyObj) => {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj),
      signal: AbortSignal.timeout(35000),
    });
  };

  let resp = await executeFetch(payload);

  if (resp.status === 429 || resp.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    resp = await executeFetch(payload);
  }

  if (!resp.ok && resp.status === 400) {
    delete payload.generationConfig.thinkingConfig;
    resp = await executeFetch(payload);
  }

  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join("\n") || parts[0]?.text;

  if (!text) throw new Error(data.error?.message || `empty gemini response (${resp.status})`);
  return text;
}

async function openrouterGenerate(env, prompt, model) {
  if (!env.OPENROUTER_API_KEY) throw new Error("no OPENROUTER_API_KEY configured");
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3000,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(data?.error?.message || `empty openrouter response (${model})`);
  return text;
}

async function huggingfaceGenerate(env, prompt) {
  if (!env.HF_TOKEN) throw new Error("no HF_TOKEN configured");
  const resp = await fetch("https://router.huggingface.co/hf-inference/models/meta-llama/Llama-3.2-3B-Instruct/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.HF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2500,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(data?.error?.message || "empty huggingface response");
  return text;
}

// ===== EMBEDDINGS (gemini-embedding-001 WITH FALLBACK TO KEY 2) =====
export async function geminiEmbedBatch(env, texts) {
  const callEmbed = async (apiKey) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${apiKey}`;
    const body = {
      requests: texts.map((t) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: t }] },
        outputDimensionality: 768,
      })),
    };
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await resp.json();
    if (!data.embeddings) throw new Error("embedding failed: " + JSON.stringify(data));
    return data.embeddings.map((e) => e.values);
  };

  try {
    return await callEmbed(env.GEMINI_API_KEY);
  } catch (err) {
    if (env.GEMINI_API_KEY_2) {
      console.warn("Primary embedding failed, trying GEMINI_API_KEY_2:", err.message);
      return await callEmbed(env.GEMINI_API_KEY_2);
    }
    throw err;
  }
}

// Robust JSON parser with 3 fallback layers (quiz/exam schema)
export function parseJsonArray(text) {
  if (!text) return null;

  let clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  clean = clean.replace(/,\s*([\]}])/g, "$1");

  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}

  const match = clean.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const fixed = match[0].replace(/,\s*([\]}])/g, "$1");
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }

  try {
    const objects = [];
    const objectRegex = /\{[\s\S]*?"question"[\s\S]*?"options"[\s\S]*?"answer"[\s\S]*?\}/g;
    let m;
    while ((m = objectRegex.exec(clean)) !== null) {
      try {
        const obj = JSON.parse(m[0].replace(/,\s*([\]}])/g, "$1"));
        if (obj.question && obj.options && obj.answer) objects.push(obj);
      } catch {}
    }
    if (objects.length > 0) return objects;
  } catch {}

  return null;
}

// Robust JSON parser with 3 fallback layers (flashcard schema)
export function parseFlashcardArray(text) {
  if (!text) return null;

  let clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  clean = clean.replace(/,\s*([\]}])/g, "$1");

  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const valid = parsed.filter((c) => c && c.front && c.back);
      if (valid.length) return valid;
    }
  } catch {}

  const match = clean.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const fixed = match[0].replace(/,\s*([\]}])/g, "$1");
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((c) => c && c.front && c.back);
        if (valid.length) return valid;
      }
    } catch {}
  }

  try {
    const objects = [];
    const objectRegex = /\{[\s\S]*?"front"[\s\S]*?"back"[\s\S]*?\}/g;
    let m;
    while ((m = objectRegex.exec(clean)) !== null) {
      try {
        const obj = JSON.parse(m[0].replace(/,\s*([\]}])/g, "$1"));
        if (obj.front && obj.back) objects.push(obj);
      } catch {}
    }
    if (objects.length > 0) return objects;
  } catch {}

  return null;
}
