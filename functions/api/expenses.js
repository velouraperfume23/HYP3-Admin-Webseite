// functions/api/expenses.js
// Cloudflare Pages Function — add a business expense (POST) or list
// recent ones (GET). Both require the same ADMIN_SECRET as stats.js.

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json().catch(() => ({}));

  if (!env.ADMIN_SECRET || body.key !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const category = String(body.category || "Other").slice(0, 100);
  const amount = Number(body.amount) || 0;
  const note = body.note ? String(body.note).slice(0, 500) : null;
  const ts = new Date().toISOString();

  try {
    await env.DB.prepare(
      "INSERT INTO expenses (ts, category, amount, note) VALUES (?, ?, ?, ?)"
    ).bind(ts, category, amount, note).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
