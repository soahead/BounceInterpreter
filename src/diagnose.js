export const config = { runtime: "edge" };

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
Evidence: include 3 to 8 items. Status values: good, bad, warn, neutral. For plain English input, document known facts and label inferred items clearly as inferred.
Fix steps: be specific to Exact Hosting — reference cPanel, WHM where relevant. The correct Exact Hosting SPF record is: v=spf1 include:spf.exacthosting.com ~all. For Gmail delivery issues always investigate SPF, DKIM, and DMARC alignment.`;

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message } = body;
  if (!message || typeof message !== "string" || !message.trim()) {
    return new Response(JSON.stringify({ error: "Missing message field" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server configuration error: API key missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let upstream, data;
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
    data = await upstream.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to reach Anthropic API: " + e.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: data?.error?.message || "Anthropic API error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const raw = (data.content || []).map(b => b.text || "").join("");

    // Strip any markdown fences the model may have added despite instructions
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    // Extract the JSON object even if there is any surrounding text
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) {
      return new Response(JSON.stringify({ error: "Model did not return a valid JSON object" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(match[0]);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Failed to parse model response: " + e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
