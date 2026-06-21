module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const body = req.body;

  // ── Follow-up chat branch ──────────────────────────────────────────────
  if (body.chat === true) {
    const { context, messages } = body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Missing messages array" });
    }

    const systemPrompt = `You are an email deliverability expert assisting a support agent at Exact Hosting.
You have already diagnosed a bounce/NDR message. The full diagnosis JSON is provided as context.
Answer the agent's follow-up questions concisely and accurately.
If asked to redraft the customer reply, return JSON with keys "reply" (your answer) and "updatedCustomerReply" (the new reply text).
Otherwise return JSON with key "reply" only.
The customer reply should be warm, peer-to-peer, under 120 words, signed as Adrian, no corporate filler.
Start your response with { and end with }.`;

    const userContent = `Diagnosis context:\n${context}\n\nAgent question: ${messages[messages.length - 1].content}`;

    let anthropicRes;
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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
          messages: [{ role: "user", content: userContent }],
        }),
      });
    } catch (e) {
      return res.status(502).json({ error: "Failed to reach Anthropic API: " + e.message });
    }

    const rawText = await anthropicRes.text();
    if (!anthropicRes.ok) {
      let errMsg;
      try { errMsg = JSON.parse(rawText).error?.message || rawText.slice(0, 300); } catch { errMsg = rawText.slice(0, 300); }
      return res.status(502).json({ error: "Anthropic API error: " + errMsg });
    }

    let anthropicData;
    try { anthropicData = JSON.parse(rawText); } catch { return res.status(502).json({ error: "Non-JSON from Anthropic: " + rawText.slice(0, 300) }); }

    const content = (anthropicData.content || []).find(b => b.type === "text")?.text || "";
    const stripped = content.replace(/```json|```/g, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: "Could not parse chat response: " + stripped.slice(0, 300) });

    let parsed;
    try { parsed = JSON.parse(jsonMatch[0]); } catch { return res.status(502).json({ error: "Invalid JSON in chat response" }); }

    return res.status(200).json(parsed);
  }

  // ── Diagnosis branch ───────────────────────────────────────────────────
  const { message, base64Image, imageMediaType } = body;

  if (!message && !base64Image) {
    return res.status(400).json({ error: "Provide a message or a screenshot image" });
  }

  const systemPrompt = `You are an email deliverability expert assisting a support agent at Exact Hosting, a web and email hosting company.
Analyse the provided bounce message, NDR, SMTP error, or screenshot and return a structured JSON diagnosis.

Return ONLY valid JSON — no markdown fences, no preamble. Start your response with { and end with }.

JSON shape:
{
  "verdict": "short one-line summary of what went wrong",
  "severity": "critical|warning|ok|unknown",
  "errorCode": "SMTP code if present, e.g. 550 5.7.1",
  "rejectingServer": "hostname of the rejecting server if present",
  "affectedDomain": "sender domain if identifiable",
  "affectedIP": "sender IP if identifiable",
  "whatHappened": "2-3 sentence plain-English explanation",
  "rootCause": "one sentence pinpointing the root cause",
  "evidence": [
    { "key": "label", "value": "extracted value", "status": "good|bad|warn|neutral" }
  ],
  "fixSteps": ["step 1", "step 2"],
  "blacklists": [{ "name": "Spamhaus ZEN", "ip": "1.2.3.4" }],
  "customerReply": "warm customer-facing reply under 120 words, signed as Adrian, no corporate filler"
}

blacklists array: only populate if the error is a blacklist rejection. Otherwise return [].
If input is a screenshot, read all visible text and error codes from it before diagnosing.`;

  // Build the user message content array — image first if present, then text
  const userContentParts = [];

  if (base64Image) {
    userContentParts.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imageMediaType || "image/png",
        data: base64Image,
      },
    });
  }

  const textPart = message
    ? message
    : "Please diagnose the mail delivery error shown in the attached screenshot.";

  userContentParts.push({ type: "text", text: textPart });

  let anthropicRes;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userContentParts }],
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: "Failed to reach Anthropic API: " + e.message });
  }

  const rawText = await anthropicRes.text();
  if (!anthropicRes.ok) {
    let errMsg;
    try { errMsg = JSON.parse(rawText).error?.message || rawText.slice(0, 300); } catch { errMsg = rawText.slice(0, 300); }
    return res.status(502).json({ error: "Anthropic API error: " + errMsg });
  }

  let anthropicData;
  try { anthropicData = JSON.parse(rawText); } catch { return res.status(502).json({ error: "Non-JSON from Anthropic: " + rawText.slice(0, 300) }); }

  const content = (anthropicData.content || []).find(b => b.type === "text")?.text || "";
  const stripped = content.replace(/```json|```/g, "").trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return res.status(502).json({ error: "Could not parse diagnosis: " + stripped.slice(0, 300) });

  let parsed;
  try { parsed = JSON.parse(jsonMatch[0]); } catch { return res.status(502).json({ error: "Invalid JSON in diagnosis response" }); }

  if (!parsed.verdict) return res.status(502).json({ error: "Incomplete diagnosis response" });

  return res.status(200).json(parsed);
};
