import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You classify email domains for a Lead CSV Processor. For each candidate domain, return ONE verdict:
- "blacklist" — NOT a real business contact email; should be filtered out.
- "keep" — could plausibly be a real business contact email; leave it alone.

BLACKLIST these categories:
1. Domain registrars / WHOIS proxies (godaddy.com, namecheap.com, domainsbyproxy.com, whoisguard.com).
2. Website builder / hosting platform addresses (wixpress.com, squarespace-mail.com, weebly.com, jimdo.com, site123.com).
3. Generic transactional / no-reply sender domains (sendgrid.net, mailgun.org, mandrillapp.com, amazonses.com, postmarkapp.com).
4. Security / infra / monitoring senders (sentry.io, pagerduty.com, letsencrypt.org).
5. Marketing automation platform domains (hubspot.com, mailchimp.com, constantcontact.com, activecampaign.com).
6. CDN / placeholder / example domains (example.com, example.org, test.com, localhost, yourdomain.com).

NEVER blacklist:
1. Free email providers (gmail.com, yahoo.com, outlook.com, hotmail.com, aol.com, icloud.com, protonmail.com, live.com, me.com, msn.com). Small businesses USE these.
2. Regional / country webmail (yandex.ru, qq.com, 163.com, web.de, gmx.de, mail.ru).
3. Anything that could be a real business website (acmeplumbing.com, joes-diner.net, unfamiliar brand names).
4. Unknown / ambiguous domains. When in doubt, KEEP. False positives cost more than false negatives.
5. Professional-service TLDs (.law, .dental, .clinic, .agency, .studio).

RULES:
- Decide per-domain. Do not infer from siblings.
- For every "blacklist" verdict, provide one short plain-English sentence in "reasoning".
- For "keep", reasoning can be empty string.
- Output STRICT JSON only, no markdown fences, no prose.
- Bias toward "keep". Err on the side of caution.
- Do not invent domains. Only classify what the caller sent.

Schema:
{"results":[{"domain":"<lowercase-domain>","verdict":"blacklist"|"keep","reasoning":"<short sentence or empty>"}]}`;

type Verdict = { domain: string; verdict: "blacklist" | "keep"; reasoning: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const { domains } = (await req.json()) as { domains?: unknown };
    if (!Array.isArray(domains)) {
      return json({ error: "Body must be { domains: string[] }" }, 400);
    }

    const normalized = Array.from(
      new Set(
        domains
          .map((d) => (typeof d === "string" ? d.trim().toLowerCase() : ""))
          .filter((d) => d.length > 0 && d.includes("."))
      )
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existing, error: readErr } = await supabase
      .from("blacklisted_domains")
      .select("domain,status");
    if (readErr) throw readErr;

    const knownDomains = new Set((existing ?? []).map((r) => r.domain));
    const activeBlacklist = new Set(
      (existing ?? []).filter((r) => r.status === "active").map((r) => r.domain)
    );

    const alreadyBlacklisted = (d: string): boolean => {
      for (const bad of activeBlacklist) {
        if (d === bad || d.endsWith(`.${bad}`)) return true;
      }
      return false;
    };

    const candidates = normalized.filter(
      (d) => !knownDomains.has(d) && !alreadyBlacklisted(d)
    );

    if (candidates.length === 0) {
      return json({ added: [], scanned: 0, skipped: normalized.length });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    }

    const BATCH_SIZE = 75;
    const batches: string[][] = [];
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      batches.push(candidates.slice(i, i + BATCH_SIZE));
    }

    const verdicts: Verdict[] = [];
    for (const batch of batches) {
      const batchVerdicts = await classifyBatch(batch, apiKey);
      verdicts.push(...batchVerdicts);
    }

    const toInsert = verdicts
      .filter((v) => v.verdict === "blacklist")
      .filter((v) => candidates.includes(v.domain.toLowerCase()))
      .map((v) => ({
        domain: v.domain.toLowerCase(),
        source: "llm",
        status: "active",
        reasoning: (v.reasoning ?? "").slice(0, 500),
      }));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from("blacklisted_domains")
        .upsert(toInsert, { onConflict: "domain" });
      if (insErr) throw insErr;
    }

    return json({
      added: toInsert,
      scanned: candidates.length,
      skipped: normalized.length - candidates.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function classifyBatch(batch: string[], apiKey: string): Promise<Verdict[]> {
  const userMessage = `Classify these domains. Return only the JSON object described in the system prompt.\n\n${JSON.stringify({ domains: batch })}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error: ${errText}`);
  }

  const body = await res.json();
  const textBlock = (body.content ?? []).find(
    (b: { type: string }) => b.type === "text"
  );
  const rawText: string = textBlock?.text ?? "";

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  const extracted = extractJsonObject(cleaned);

  let parsed: { results?: Verdict[] };
  try {
    parsed = JSON.parse(extracted);
  } catch {
    throw new Error(
      `Model returned non-JSON output for batch of ${batch.length} domains`
    );
  }

  return (parsed.results ?? []).filter(
    (v) =>
      v &&
      typeof v.domain === "string" &&
      (v.verdict === "blacklist" || v.verdict === "keep")
  );
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}
