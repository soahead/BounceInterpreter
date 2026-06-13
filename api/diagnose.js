module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const body = req.body;

  // ── Chat mode ────────────────────────────────────────────────────
  if (body.chat === true) {
    const { context, messages } = body;

    if (!context || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "chat mode requires context and messages" });
    }

    const systemPrompt = `You are a senior email deliverability and DNS specialist at Exact Hosting, assisting a support technician with a follow-up conversation about a bounce message diagnosis.

The original diagnosis is provided below as JSON context. Use it to answer questions accurately and specifically — refer to the actual error codes, IPs, domains, and fix steps from the diagnosis rather than speaking generically.

DIAGNOSIS CONTEXT:
${context}

BEHAVIOUR:
- Be concise, direct, and technical where needed but explain jargon when useful.
- If asked to redraft the customer reply, write a new version and include it in the "updatedCustomerReply" field of your JSON response. Match the voice: warm, peer-to-peer, short sentences, contractions, signed as Adrian, under 120 words, no corporate filler.
- If NOT asked for a redraft, leave "updatedCustomerReply" as null.
- Always respond in valid JSON with this exact shape:
  { "reply": "<your response as plain text>", "updatedCustomerReply": "<new reply text or null>" }
- Start your response with { and end with }. No markdown fences, no preamble.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
    });

    const rawText = await anthropicRes.text();
    if (!anthropicRes.ok) {
      let errMsg;
      try { errMsg = JSON.parse(rawText).error?.message || rawText.slice(0, 300); } catch { errMsg = rawText.slice(0, 300); }
      return res.status(500).json({ error: "Anthropic API error: " + errMsg });
    }

    let anthropicData;
    try { anthropicData = JSON.parse(rawText); } catch {
      return res.status(500).json({ error: "Non-JSON from Anthropic: " + rawText.slice(0, 300) });
    }

    const content = (anthropicData.content || []).map(b => b.text || "").join("");
    const stripped = content.trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Could not parse chat response: " + stripped.slice(0, 200) });
    }

    let parsed;
    try { parsed = JSON.parse(jsonMatch[0]); } catch {
      return res.status(500).json({ error: "Invalid JSON in chat response" });
    }

    return res.status(200).json(parsed);
  }

  // ── Diagnosis mode ───────────────────────────────────────────────
  const { message } = body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message field required" });
  }

  const systemPrompt = `You are a senior email deliverability and DNS specialist at Exact Hosting. Analyse the bounce message, NDR, or SMTP error provided and return a structured JSON diagnosis.

Return ONLY valid JSON — no markdown fences, no preamble. Start with { and end with }.

JSON shape:
{
  "verdict": "Short one-line summary of what went wrong",
  "severity": "critical | warning | ok | unknown",
  "errorCode": "SMTP code if present, else null",
  "rejectingServer": "hostname of rejecting server if identifiable, else null",
  "affectedDomain": "sender domain if identifiable, else null",
  "affectedIP": "sending IP if present, else null",
  "whatHappened": "Plain English explanation (2-3 sentences)",
  "rootCause": "Specific root cause sentence, or null",
  "evidence": [{ "key": "Label", "value": "Value", "status": "good|bad|warn|neutral" }],
  "fixSteps": ["Step 1", "Step 2"],
  "customerReply": "Warm, peer-to-peer reply signed as Adrian. Under 120 words. Short sentences. Contractions. No corporate filler. Explain jargon simply.",
  "blacklists": [{ "name": "Blacklist name", "ip": "IP if known" }]
}

blacklists should only be populated when the bounce explicitly names a blacklist. Otherwise return [].`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    }),
  });

  const rawText = await anthropicRes.text();
  if (!anthropicRes.ok) {
    let errMsg;
    try { errMsg = JSON.parse(rawText).error?.message || rawText.slice(0, 300); } catch { errMsg = rawText.slice(0, 300); }
    return res.status(500).json({ error: "Anthropic API error: " + errMsg });
  }

  let anthropicData;
  try { anthropicData = JSON.parse(rawText); } catch {
    return res.status(500).json({ error: "Non-JSON from Anthropic: " + rawText.slice(0, 300) });
  }

  const content = (anthropicData.content || []).map(b => b.text || "").join("");
  const stripped = content.trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return res.status(500).json({ error: "Could not parse diagnosis: " + stripped.slice(0, 200) });
  }

  let parsed;
  try { parsed = JSON.parse(jsonMatch[0]); } catch {
    return res.status(500).json({ error: "Invalid JSON in diagnosis response" });
  }

  if (!parsed.verdict) {
    return res.status(500).json({ error: "Unexpected response shape — missing verdict" });
  }

  return res.status(200).json(parsed);
};
