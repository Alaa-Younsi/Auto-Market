// Supabase Edge Function: e-mail the shop team when an order comes in.
//
// Deploy (dashboard): Edge Functions → Deploy a new function → "Via editor",
// name it exactly `notify`, paste this file, Deploy.
// Secrets (Edge Functions → Secrets):
//   RESEND_API_KEY   required — from resend.com → API Keys
//   RESEND_FROM      optional — "Auto Market <commandes@auto-market.shop>" once
//                    the domain is verified in Resend. Until then the sandbox
//                    sender only delivers to the Resend account's own e-mail.
//   SITE_ADMIN_URL   optional — default https://www.auto-market.shop/admin/orders
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// Called by the shopper's browser right after place_order succeeds (anon key),
// so it trusts nothing in the body except an order number, and the claim RPC
// returns each order AT MOST ONCE (and only within an hour of its creation):
// replays, duplicates and guessed numbers all get the same "nothing to do".
// Every exit path logs one line — the caller ignores the response, so the
// function log is the only diagnostic.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ORDER_RE = /^AM-\d{8}-[0-9A-F]{5,10}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(v: unknown): string {
  const n = Math.round(Number(v) || 0);
  return `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} DA`;
}

/** Quotes pasted around the value in the dashboard become part of it → resend_422. */
function fromAddress(): string {
  let v = (Deno.env.get("RESEND_FROM") ?? "").trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v || "Auto Market <onboarding@resend.dev>";
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("missing RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromAddress(), to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`resend_${res.status}: ${(await res.text()).slice(0, 200)}`);
}

interface ClaimedOrder {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  wilaya: string;
  city: string;
  delivery_type: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  items: {
    name: string;
    quantity: number;
    price: number;
    color: string | null;
    size: string | null;
    variants: { name_fr: string; value: string }[] | null;
  }[];
  created_at: string;
}

function orderEmail(o: ClaimedOrder) {
  const adminUrl = Deno.env.get("SITE_ADMIN_URL") ?? "https://www.auto-market.shop/admin/orders";
  const phoneIntl = o.customer_phone.replace(/^0/, "213");
  const lines = o.items.map((it) => {
    const opts = [it.color, it.size, ...(it.variants ?? []).map((v) => `${v.name_fr}: ${v.value}`)]
      .filter(Boolean)
      .join(" · ");
    return { label: `${it.quantity} × ${it.name}${opts ? ` (${opts})` : ""}`, amount: money(it.price * it.quantity) };
  });
  const delivery = o.delivery_type === "office" ? "Bureau (stop desk)" : "À domicile";
  const subject = `Nouvelle commande ${o.order_number} — ${money(o.total)}`;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#71717a;width:120px">${k}</td><td style="padding:6px 0;color:#18181b;font-weight:600">${v}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#ffffff;border-radius:14px;padding:24px;border:1px solid #e4e4e7">
    <p style="margin:0;color:#71717a;font-size:13px">Auto Market</p>
    <h1 style="margin:6px 0 18px;font-size:20px;color:#18181b">Nouvelle commande ${esc(o.order_number)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${row("Client", esc(o.customer_name))}
      ${row("Téléphone", `<a href="tel:+${esc(phoneIntl)}" style="color:#2563eb">${esc(o.customer_phone)}</a> · <a href="https://wa.me/${esc(phoneIntl)}" style="color:#16a34a">WhatsApp</a>`)}
      ${row("Wilaya", esc(o.wilaya))}
      ${row("Commune", esc(o.city))}
      ${row("Livraison", delivery)}
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;border-top:1px solid #e4e4e7">
      ${lines.map((l) => `<tr><td style="padding:8px 0;color:#18181b">${esc(l.label)}</td><td style="padding:8px 0;text-align:right;color:#18181b;white-space:nowrap">${esc(l.amount)}</td></tr>`).join("")}
      ${Number(o.discount) > 0 ? `<tr><td style="padding:4px 0;color:#16a34a">Remise</td><td style="padding:4px 0;text-align:right;color:#16a34a">-${money(o.discount)}</td></tr>` : ""}
      <tr><td style="padding:4px 0;color:#71717a">Livraison</td><td style="padding:4px 0;text-align:right;color:#71717a">${money(o.shipping)}</td></tr>
      <tr><td style="padding:10px 0;font-weight:700;color:#18181b;border-top:1px solid #e4e4e7">Total à encaisser</td><td style="padding:10px 0;text-align:right;font-weight:700;color:#18181b;border-top:1px solid #e4e4e7;white-space:nowrap">${money(o.total)}</td></tr>
    </table>
    <a href="${esc(adminUrl)}" style="display:inline-block;margin-top:18px;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px">Ouvrir les commandes</a>
  </div>
</div></body></html>`;
  const text = [
    `Nouvelle commande ${o.order_number}`,
    `Client : ${o.customer_name} — ${o.customer_phone}`,
    `Wilaya : ${o.wilaya}, ${o.city} (${delivery})`,
    ...lines.map((l) => `${l.label} — ${l.amount}`),
    `Total à encaisser : ${money(o.total)}`,
    adminUrl,
  ].join("\n");
  return { subject, html, text };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ code: "method_not_allowed" }, 405);

  let body: { kind?: unknown; order_number?: unknown };
  try {
    body = await req.json();
  } catch {
    console.log("bad request: body is not JSON");
    return json({ code: "bad_request" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    console.log("misconfigured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
    return json({ ok: false }, 500);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Admin-only "send me a test e-mail" from Mon compte.
  if (body.kind === "test") {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (!user) return json({ code: "unauthorized" }, 401);
    const { data: isAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!isAdmin) return json({ code: "forbidden" }, 403);
    const { data: prefs } = await admin
      .from("admin_notification_prefs")
      .select("notify_email")
      .eq("user_id", user.id)
      .maybeSingle();
    const to = prefs?.notify_email;
    if (!to) {
      console.log("test: no notification e-mail saved for this account");
      return json({ code: "no_email" }, 400);
    }
    try {
      await sendEmail(
        to,
        "Test — notifications Auto Market",
        `<p style="font-family:Arial,sans-serif">Les notifications de commande fonctionnent. Vous recevrez un e-mail à chaque nouvelle commande.</p>`,
        "Les notifications de commande fonctionnent. Vous recevrez un e-mail à chaque nouvelle commande."
      );
      console.log("test: sent");
      return json({ ok: true });
    } catch (e) {
      console.log(`test: send failed: ${(e as Error).message}`);
      return json({ code: "send_failed", detail: (e as Error).message.slice(0, 120) }, 502);
    }
  }

  if (body.kind !== "order" || typeof body.order_number !== "string" || !ORDER_RE.test(body.order_number)) {
    console.log("bad request: unknown kind or malformed order number");
    return json({ code: "bad_request" }, 400);
  }

  const { data: claimed, error: claimError } = await admin.rpc("claim_order_notification", {
    p_order_number: body.order_number,
  });
  if (claimError) {
    console.log(`claim failed: ${claimError.message}`);
    return json({ ok: true });
  }
  const order = (claimed as ClaimedOrder[] | null)?.[0];
  if (!order) {
    console.log("nothing to claim");
    return json({ ok: true });
  }

  const [{ data: prefs, error: prefsError }, { data: admins }] = await Promise.all([
    admin.from("admin_notification_prefs").select("user_id, notify_email").eq("email_enabled", true),
    admin.from("admin_users").select("user_id"),
  ]);
  if (prefsError) {
    console.log(`recipients query failed: ${prefsError.message}`);
    return json({ ok: true });
  }
  const adminIds = new Set(((admins ?? []) as { user_id: string }[]).map((a) => a.user_id));
  const recipients: string[] = [];
  for (const p of (prefs ?? []) as { user_id: string; notify_email: string | null }[]) {
    if (p.notify_email && adminIds.has(p.user_id) && !recipients.includes(p.notify_email)) {
      recipients.push(p.notify_email);
    }
  }
  if (recipients.length === 0) {
    console.log("no recipient has email notifications enabled");
    return json({ ok: true });
  }

  const mail = orderEmail(order);
  const results = await Promise.allSettled(recipients.map((to) => sendEmail(to, mail.subject, mail.html, mail.text)));
  const sent = results.filter((r) => r.status === "fulfilled").length;
  for (const r of results) if (r.status === "rejected") console.log(`send failed: ${(r.reason as Error).message}`);
  console.log(`sent ${sent}/${recipients.length} for ${order.order_number}`);
  return json({ ok: true });
});
