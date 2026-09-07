// functions/api/stats.js
// Cloudflare Pages Function — returns full accounting figures for the
// admin dashboard. Protected by ADMIN_SECRET (set as an environment
// variable in the Cloudflare Pages project settings — never hardcode
// it here or in the repo).
//
// Called as: GET /api/stats?key=YOUR_SECRET&range=week|month|year

// Real production cost per bottle size, from HYP3's own pricing sheet.
// These are fixed regardless of the selling price — update here if
// your production costs change.
const COGS_PER_SIZE = {
  "30 ML": 43.65,
  "50 ML": 65.15,
};

function extractSize(name) {
  const match = /\((30|50) ML\)/.exec(name || "");
  return match ? `${match[1]} ML` : null;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const key = url.searchParams.get("key") || "";
  if (!env.ADMIN_SECRET || key !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const range = url.searchParams.get("range") || "month";
  const days = range === "week" ? 7 : range === "year" ? 365 : 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  try {
    const visitRow = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM visits WHERE ts >= ?"
    ).bind(since).first();

    const orderResult = await env.DB.prepare(
      "SELECT * FROM orders WHERE ts >= ? ORDER BY ts DESC"
    ).bind(since).all();
    const orders = orderResult.results || [];

    const expenseResult = await env.DB.prepare(
      "SELECT * FROM expenses WHERE ts >= ? ORDER BY ts DESC"
    ).bind(since).all();
    const expenses = expenseResult.results || [];

    // --- accounting math ---
    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalDiscount = orders.reduce((sum, o) => sum + (o.discount || 0), 0);
    const totalShipping = orders.reduce((sum, o) => sum + (o.shipping || 0), 0);

    let cogs = 0;
    let unknownCostItems = 0;
    for (const order of orders) {
      let lineItems = [];
      try { lineItems = JSON.parse(order.items_json || "[]"); } catch (e) { lineItems = []; }

      if (lineItems.length > 0) {
        for (const li of lineItems) {
          const size = li.size || extractSize(li.name);
          const unitCost = COGS_PER_SIZE[size];
          if (unitCost != null) {
            cogs += unitCost * (li.qty || 1);
          } else {
            unknownCostItems++;
          }
        }
      } else {
        // older orders logged before items_json existed — cost unknown
        unknownCostItems++;
      }
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return new Response(JSON.stringify({
      ok: true,
      range,
      since,
      visitCount: visitRow ? visitRow.count : 0,
      orderCount: orders.length,
      revenue,
      totalDiscount,
      totalShipping,
      cogs,
      unknownCostItems,
      totalExpenses,
      grossProfit,
      netProfit,
      orders,
      expenses,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
