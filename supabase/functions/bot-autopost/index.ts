// Auto-posts. Priority order:
//   1) Drain admin-curated bot_post_queue (one item per tick).
//   2) If queue empty AND queue_only = false, generate AI content
//      (campus themes + light news from glint.trade / X-Nitter, dedup by title hash).
// Honors bot_settings.interval_minutes (self-rate-limit on top of any cron).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THEMES = [
  { kind: "confession", prompt: "Write a raw anonymous confession a Nigerian university student might post. 2 short paragraphs, first-person. End with one question." },
  { kind: "debate", prompt: "Write a fresh campus debate starter. Take a clear stance. End with Yes/No question." },
  { kind: "kindness", prompt: "Short anonymous act-of-kindness story. Uplifting. End by inviting readers to share." },
  { kind: "relationship_drama", prompt: "Anonymous relationship-drama snippet from a Nigerian student. End with a question asking for advice." },
  { kind: "motivation", prompt: "Punchy original motivational post for Nigerian students. End with one question." },
  { kind: "money_tip", prompt: "Recommend ONE specific legitimate way a Nigerian student can earn now (real site or skill) and give 3 concrete first steps. Under 180 words." },
];

async function sha(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input.toLowerCase().replace(/[^a-z0-9 ]+/g, "").trim());
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function fetchGlintHeadlines(): Promise<string[]> {
  try {
    const r = await fetch("https://glint.trade", { headers: { "User-Agent": "Mozilla/5.0 CampusConnectBot" } });
    if (!r.ok) return [];
    const html = await r.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return [text.slice(0, 4000)];
  } catch { return []; }
}

async function fetchXTrends(): Promise<string[]> {
  const targets = ["https://nitter.net/search?q=%23Nigeria&f=tweets", "https://nitter.net/search?q=naija&f=tweets"];
  for (const t of targets) {
    try {
      const r = await fetch(t, { headers: { "User-Agent": "Mozilla/5.0 CampusConnectBot" } });
      if (!r.ok) continue;
      const html = await r.text();
      const text = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text.length > 200) return [text.slice(0, 4000)];
    } catch { /* try next */ }
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings } = await supa.from("bot_settings").select("*").eq("id", 1).maybeSingle();
    if (!settings?.enabled) return new Response(JSON.stringify({ skipped: "disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Self rate-limit by interval_minutes
    const intervalMin = Math.max(1, settings.interval_minutes ?? 5);
    if (settings.last_run_at) {
      const last = new Date(settings.last_run_at).getTime();
      const elapsedMin = (Date.now() - last) / 60000;
      if (elapsedMin + 0.2 < intervalMin) {
        return new Response(JSON.stringify({ skipped: "interval", next_in_min: (intervalMin - elapsedMin).toFixed(2) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let botUserId: string | null = settings.bot_user_id ?? null;
    if (!botUserId) {
      const { data: admin } = await supa.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
      botUserId = admin?.user_id ?? null;
    }
    if (!botUserId) return new Response(JSON.stringify({ error: "no admin user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // STEP 1: drain queue first
    const { data: queued } = await supa.from("bot_post_queue").select("*").eq("posted", false).order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (queued) {
      const titleHash = await sha(queued.title);
      const { data: ins, error: insErr } = await supa.from("posts").insert({
        user_id: botUserId,
        title: (queued.title || "Discussion").slice(0, 180),
        content: (queued.content || "").slice(0, 9500),
        is_anonymous: true,
        is_bot_post: true,
        approval_status: "approved",
      }).select("id").single();
      if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supa.from("bot_post_queue").update({ posted: true, posted_at: new Date().toISOString(), post_id: ins.id }).eq("id", queued.id);
      await supa.from("bot_post_history").insert({ post_id: ins.id, category: queued.category ?? "custom", title: queued.title, title_hash: titleHash, source: "admin_queue" });
      await supa.from("bot_settings").update({ last_run_at: new Date().toISOString() }).eq("id", 1);
      return new Response(JSON.stringify({ ok: true, source: "queue", post_id: ins.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (settings.queue_only) {
      return new Response(JSON.stringify({ skipped: "queue_empty_and_queue_only" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // STEP 2: AI generation
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500, headers: corsHeaders });

    const r = Math.random();
    let kind = "", prompt = "", source = "";
    if (r < 0.5) {
      const t = THEMES[Math.floor(Math.random() * THEMES.length)];
      kind = t.kind; prompt = t.prompt; source = "campus";
    } else if (r < 0.75) {
      const snippets = await fetchGlintHeadlines();
      if (snippets.length === 0) { const t = THEMES[0]; kind = t.kind; prompt = t.prompt; source = "campus"; }
      else { kind = "news_glint"; source = "glint.trade";
        prompt = `Using the following raw site text from glint.trade, write ONE fresh news/insight brief (100-160 words). Neutral, no fabrication. End with a question. RAW:\n${snippets[0]}`; }
    } else {
      const snippets = await fetchXTrends();
      if (snippets.length === 0) { const t = THEMES[1]; kind = t.kind; prompt = t.prompt; source = "campus"; }
      else { kind = "news_x_naija"; source = "x_twitter";
        prompt = `From the following raw X/Twitter Nigeria scrape, summarize ONE concrete trending local Nigerian story (100-160 words). Neutral, no fabrication. End with a question. RAW:\n${snippets[0]}`; }
    }

    const { data: recent } = await supa.from("bot_post_history").select("title").order("created_at", { ascending: false }).limit(50);
    const avoid = (recent ?? []).map((x: any) => `- ${x.title}`).join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You write engaging anonymous campus posts. Return strict JSON {"title": string max 80 chars unique, "content": string}. No markdown.\nAVOID titles similar to:\n${avoid || "(none)"}` },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai_failed", detail: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = await aiRes.json();
    const raw = aiJson.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    let post: { title: string; content: string };
    try { post = JSON.parse(cleaned); } catch { post = { title: kind.replace("_", " "), content: cleaned.slice(0, 5000) }; }

    const titleHash = await sha(post.title);
    const { data: dup } = await supa.from("bot_post_history").select("id").eq("title_hash", titleHash).maybeSingle();
    if (dup) return new Response(JSON.stringify({ skipped: "duplicate_title", category: kind }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: ins, error: insErr } = await supa.from("posts").insert({
      user_id: botUserId,
      title: (post.title || "Discussion").slice(0, 180),
      content: (post.content || "").slice(0, 9500),
      is_anonymous: true,
      is_bot_post: true,
      approval_status: "approved",
    }).select("id").single();
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supa.from("bot_post_history").insert({ post_id: ins.id, category: kind, title: post.title, title_hash: titleHash, source });
    await supa.from("bot_settings").update({ last_run_at: new Date().toISOString() }).eq("id", 1);
    return new Response(JSON.stringify({ ok: true, post_id: ins.id, category: kind, source }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
