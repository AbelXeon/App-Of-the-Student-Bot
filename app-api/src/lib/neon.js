// Neon database query (same as the bot's)
export async function neonQuery(env, query, params = []) {
  const host = new URL(env.NEON_URL.replace(/^postgres(ql)?:\/\//i, "https://")).host;
  const resp = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": env.NEON_URL },
    body: JSON.stringify({ query, params }),
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) throw new Error(`Neon query failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  return data.rows || [];
}
