export const config = { runtime: "edge" };

const SYSTEM_PROMPT = `You are an expert email deliverability and DNS engineer at Exact Hosting, a web and email hosting company. Diagnose email delivery failures from bounce messages, NDR emails, SMTP errors, or any delivery failure output pasted by support staff.

Respond ONLY with a valid JSON object. No markdown, no backticks, no preamble. Exact structure:

{
  "severity": "critical" | "warning" | "ok" | "unknown",
  "verdict": "One-line plain English summary of the core problem",
  "errorCode": "SMTP error code string or null",
  "rejectingServer": "Hostname or service that rejected, or null",
  "affectedDomain": "Sending domain if identifiable, or null",
  "affectedIP": "Sending IP if identifiable, or null",
  "whatHappened": "2-3 sentences explaining what happened for a support agent",
  "rootCause": "1-2 sentences on the specific technical root cause",
  "evidence": [
    { "key": "short label", "value": "extracted value", "status": "good" | "bad" | "warn" | "neutral" }
  ],
  "fixSteps": ["Step 1 as a complete actionable sentence", "Step 2..."],
  "customerReply": "Full polite professional reply the support agent can paste to the customer."
}

Evidence: 3-8 items. Extract error codes, IPs, domains, SPF/DKIM/DMARC results, blacklist names.
Fix steps: specific to Exact Hosting — cPanel, WHM, Exact Hosting SPF: v=spf1 include:spf.exacthosting.com ~all.
If input is not a delivery failure, return severity "unknown" with helpful guidance in whatHappened.`;

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

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message.trim() }],
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "Upstream API error" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const raw = (data.content || []).map(b => b.text || "").join("");
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Diagnosis failed: " + e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
