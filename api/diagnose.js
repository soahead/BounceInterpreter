const SYSTEM_PROMPT = `You are an expert email deliverability and DNS engineer at Exact Hosting. Diagnose email delivery problems from any input — raw SMTP bounces, NDR emails, DMARC reports, or plain English descriptions from support staff.

CRITICAL OUTPUT RULE: Respond with a single raw JSON object only. No markdown, no backticks, no code fences, no text before or after. Start with { and end with }.

{
  "severity": "critical | warning | ok | unknown",
  "verdict": "One short sentence — the core problem",
  "errorCode": "SMTP error code or null",
  "rejectingServer": "Rejecting host/service or null",
  "affectedDomain": "Sending domain or null",
  "affectedIP": "Sending IP or null",
  "whatHappened": "2 sentences max. What went wrong and why Gmail/Outlook etc rejected it.",
  "rootCause": "1 sentence. The specific technical cause.",
  "evidence": [
    { "key": "label", "value": "finding", "status": "good | bad | warn | neutral" }
  ],
  "fixSteps": ["Concise step for Exact Hosting support staff"],
  "customerReply": "See persona rules below."
}

Severity: critical = fully blocked, warning = intermittent/likely issue, ok = no problem, unknown = not enough info.
Evidence: 3-8 items. Label inferred items as inferred.
Fix steps: reference cPanel/WHM where relevant. Exact Hosting SPF: v=spf1 include:spf.exacthosting.com ~all. Always check SPF + DKIM + DMARC for Gmail issues.

CUSTOMER REPLY PERSONA — follow these rules exactly:
- Written by Adrian, a Technical Support Specialist at Exact Hosting who used to own websites himself — so he gets it
- Warm, peer-to-peer tone. Short sentences. Contractions (I'll, we're, it's)
- Acknowledge the frustration briefly and specifically — do not use "We apologize for the inconvenience"
- Plain English only — no jargon unless unavoidable, and if used explain it simply
- Say Adrian is personally working with the tech team on this
- Action steps if any — keep them short and scannable
- End with exactly one of these sign-offs, rotating randomly: "I'm here if you need anything else." or "Let me know if that helps!" or "I'll be standing by for your reply." or "Thanks for your patience while we sort this out."
- No corporate filler. No "Please be advised". No "Your ticket is important to us". Every reply should feel handwritten and unique.
- Keep the whole reply under 120 words.`;

module.exports = async function handler(req, res) {
  // CORS preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Missing or empty message field" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfiguration: ANTHROPIC_API_KEY not set" });
  }

  let upstream, upstreamData;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message.trim() }],
      }),
    });
    upstreamData = await upstream.json();
  } catch (e) {
    return res.status(502).json({ error: "Failed to reach Anthropic API: " + e.message });
  }

  if (!upstream.ok) {
    return res.status(502).json({
      error: upstreamData?.error?.message || "Anthropic API returned error " + upstream.status,
    });
  }

  try {
    const raw = (upstreamData.content || []).map(b => b.text || "").join("");

    // Strip markdown fences if the model added them despite instructions
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    // Extract JSON object robustly even if there is any surrounding text
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(502).json({
        error: "Model did not return a JSON object. Raw response: " + raw.slice(0, 200),
      });
    }

    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: "Failed to parse model response: " + e.message });
  }
}
