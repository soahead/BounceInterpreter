const SYSTEM_PROMPT = `You are an expert email deliverability and DNS engineer at Exact Hosting, a web and email hosting company. Diagnose email delivery problems described by support staff.

Input can be ANY of the following — handle all of them:
- Raw SMTP bounce messages or NDR emails
- Plain English descriptions of a customer email problem
- Partial error snippets a customer forwarded
- DMARC failure reports
- A mix of description and raw error text

Even if the input is vague or conversational, identify the most likely cause and provide actionable guidance.

CRITICAL OUTPUT RULE: Your entire response must be a single raw JSON object and nothing else. Do not use markdown. Do not use backticks or code fences. Do not write any explanation before or after the JSON. Start your response with the character { and end with the character }.

Required JSON shape:
{
  "severity": "critical",
  "verdict": "One-line plain English summary of the most likely problem",
  "errorCode": "SMTP error code if present in the input, otherwise null",
  "rejectingServer": "Hostname or service that rejected the message if identifiable, otherwise null",
  "affectedDomain": "Sending domain if identifiable, otherwise null",
  "affectedIP": "Sending IP if identifiable, otherwise null",
  "whatHappened": "2-3 sentences explaining what is happening for a support agent who will act on this",
  "rootCause": "1-2 sentences identifying the most likely technical root cause",
  "evidence": [
    { "key": "short label", "value": "value or observation", "status": "bad" }
  ],
  "fixSteps": [
    "Complete actionable step written for Exact Hosting support staff"
  ],
  "customerReply": "A complete polite professional reply the support agent can paste directly to the customer. Plain language, explains the issue, what is being done, and invites follow-up."
}

Severity values: critical = mail fully blocked, warning = likely causing issues, ok = no problem found, unknown = insufficient info.
Evidence: include 3 to 8 items. Status values: good, bad, warn, neutral. For plain English input, document known facts and label inferred items clearly.
Fix steps: specific to Exact Hosting — reference cPanel, WHM where relevant. Exact Hosting SPF record: v=spf1 include:spf.exacthosting.com ~all. For Gmail issues always check SPF, DKIM, and DMARC alignment.`;

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
