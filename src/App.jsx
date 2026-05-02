import { useState } from "react";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --c-primary:        #0A0F14;
    --c-secondary:      #4A5568;
    --c-tertiary:       #0052CC;
    --c-tertiary-dark:  #003D99;
    --c-neutral:        #F4F6F9;
    --c-surface:        #FFFFFF;
    --c-on-surface:     #0F1923;
    --c-border:         #E2E7EF;
    --c-border-md:      #CDD5E0;
    --c-green:          #00875A; --c-green-bg: #E3FCEF; --c-green-bd: #ABF5D1;
    --c-red:            #DE350B; --c-red-bg:   #FFEBE6; --c-red-bd:   #FFBDAD;
    --c-amber:          #974F0C; --c-amber-bg: #FFFAE6; --c-amber-bd: #FFE380;
    --c-blue:           #0052CC; --c-blue-bg:  #E6F0FF; --c-blue-bd:  #B3D4FF;

    --f-display: 'Syne', sans-serif;
    --f-body:    'DM Sans', sans-serif;
    --f-mono:    'DM Mono', monospace;

    --sp-xs: 4px; --sp-sm: 8px; --sp-md: 16px;
    --sp-lg: 24px; --sp-xl: 32px; --sp-2xl: 48px;
    --r-sm: 4px; --r-md: 8px; --r-lg: 12px;
  }

  body { background: var(--c-neutral); color: var(--c-on-surface); font-family: var(--f-body); font-size: 14px; line-height: 1.6; min-height: 100vh; }
  .app { max-width: 860px; margin: 0 auto; padding: var(--sp-xl) var(--sp-md) 80px; }

  .header { margin-bottom: var(--sp-xl); }
  .eyebrow { display: inline-flex; align-items: center; gap: var(--sp-xs); background: var(--c-blue-bg); border: 1px solid var(--c-blue-bd); border-radius: var(--r-sm); padding: var(--sp-xs) var(--sp-sm); margin-bottom: var(--sp-sm); font-family: var(--f-mono); font-size: 10px; font-weight: 500; color: var(--c-tertiary); letter-spacing: 0.12em; text-transform: uppercase; }
  .pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--c-tertiary); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
  h1 { font-family: var(--f-display); font-size: 30px; font-weight: 800; color: var(--c-primary); letter-spacing: -0.03em; line-height: 1.1; }
  .subtitle { font-size: 13px; color: var(--c-secondary); margin-top: var(--sp-xs); }

  .input-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r-md); padding: var(--sp-md); margin-bottom: var(--sp-md); }
  .field-label { display: block; font-family: var(--f-mono); font-size: 10px; font-weight: 500; color: var(--c-secondary); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: var(--sp-sm); }
  textarea { width: 100%; background: var(--c-neutral); border: 1.5px solid var(--c-border); border-radius: var(--r-sm); font-family: var(--f-mono); font-size: 11px; color: var(--c-on-surface); line-height: 1.6; padding: var(--sp-sm) var(--sp-md); outline: none; resize: vertical; min-height: 156px; transition: border-color 0.15s, background 0.15s; }
  textarea::placeholder { color: var(--c-border-md); }
  textarea:focus { border-color: var(--c-tertiary); background: var(--c-surface); }

  .chips { display: flex; flex-wrap: wrap; gap: var(--sp-xs); margin-top: var(--sp-sm); align-items: center; }
  .chip-lbl { font-family: var(--f-mono); font-size: 10px; color: var(--c-secondary); }
  .chip { background: var(--c-neutral); border: 1px solid var(--c-border); border-radius: var(--r-sm); font-family: var(--f-mono); font-size: 10px; color: var(--c-secondary); padding: var(--sp-xs) var(--sp-sm); cursor: pointer; transition: all 0.12s; }
  .chip:hover { border-color: var(--c-tertiary); color: var(--c-tertiary); background: var(--c-blue-bg); }

  .actions { display: flex; align-items: center; gap: var(--sp-sm); margin-top: var(--sp-sm); }
  .btn-primary { background: var(--c-tertiary); color: #fff; border: none; border-radius: var(--r-sm); font-family: var(--f-display); font-size: 13px; font-weight: 700; padding: 10px var(--sp-md); cursor: pointer; transition: background 0.15s; white-space: nowrap; }
  .btn-primary:hover:not(:disabled) { background: var(--c-tertiary-dark); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: var(--c-secondary); border: 1px solid var(--c-border); border-radius: var(--r-sm); font-family: var(--f-mono); font-size: 10px; font-weight: 500; padding: 10px var(--sp-md); cursor: pointer; transition: all 0.15s; }
  .btn-ghost:hover { border-color: var(--c-border-md); color: var(--c-on-surface); }
  .char-hint { margin-left: auto; font-family: var(--f-mono); font-size: 10px; color: var(--c-border-md); }

  .status { display: flex; align-items: center; gap: var(--sp-sm); padding: var(--sp-sm) var(--sp-md); margin-bottom: var(--sp-md); background: var(--c-blue-bg); border: 1px solid var(--c-blue-bd); border-radius: var(--r-sm); font-family: var(--f-mono); font-size: 11px; color: var(--c-blue); }
  .spinner { width: 12px; height: 12px; border: 2px solid var(--c-blue-bd); border-top-color: var(--c-blue); border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .err-bar { padding: var(--sp-sm) var(--sp-md); margin-bottom: var(--sp-md); background: var(--c-red-bg); border: 1px solid var(--c-red-bd); border-radius: var(--r-sm); font-family: var(--f-mono); font-size: 11px; color: var(--c-red); }

  .summary { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r-md); padding: var(--sp-md) var(--sp-lg); margin-bottom: var(--sp-sm); display: flex; align-items: flex-start; gap: var(--sp-md); }
  .summary.critical { border-left: 4px solid var(--c-red); }
  .summary.warning  { border-left: 4px solid var(--c-amber); }
  .summary.ok       { border-left: 4px solid var(--c-green); }
  .summary.unknown  { border-left: 4px solid var(--c-border-md); }
  .badge { font-family: var(--f-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; padding: var(--sp-xs) var(--sp-sm); border-radius: var(--r-sm); white-space: nowrap; flex-shrink: 0; margin-top: 2px; }
  .badge.critical { background: var(--c-red-bg); color: var(--c-red); border: 1px solid var(--c-red-bd); }
  .badge.warning   { background: var(--c-amber-bg); color: var(--c-amber); border: 1px solid var(--c-amber-bd); }
  .badge.ok        { background: var(--c-green-bg); color: var(--c-green); border: 1px solid var(--c-green-bd); }
  .badge.unknown   { background: var(--c-neutral); color: var(--c-secondary); border: 1px solid var(--c-border); }
  .verdict { font-family: var(--f-display); font-size: 17px; font-weight: 700; color: var(--c-primary); line-height: 1.3; margin-bottom: var(--sp-xs); }
  .meta { display: flex; flex-wrap: wrap; gap: var(--sp-xs); margin-top: var(--sp-xs); }
  .pill { font-family: var(--f-mono); font-size: 10px; color: var(--c-secondary); background: var(--c-neutral); border: 1px solid var(--c-border); border-radius: var(--r-sm); padding: 2px var(--sp-sm); }
  .pill strong { color: var(--c-on-surface); font-weight: 500; }

  .sec { margin-bottom: var(--sp-sm); }
  .sec-hd { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-sm) var(--sp-md); background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r-md) var(--r-md) 0 0; cursor: pointer; user-select: none; transition: background 0.12s; }
  .sec-hd:hover { background: var(--c-neutral); }
  .sec-hd.closed { border-radius: var(--r-md); }
  .sec-title { font-family: var(--f-display); font-size: 13px; font-weight: 700; color: var(--c-primary); }
  .chev { font-size: 10px; color: var(--c-secondary); transition: transform 0.2s; }
  .chev.open { transform: rotate(180deg); }
  .sec-bd { background: var(--c-surface); border: 1px solid var(--c-border); border-top: none; border-radius: 0 0 var(--r-md) var(--r-md); overflow: hidden; }

  .prose { padding: var(--sp-md); font-size: 13px; color: var(--c-secondary); line-height: 1.7; }
  .prose-cause { font-size: 13px; color: var(--c-on-surface); font-weight: 500; margin-top: var(--sp-sm); line-height: 1.6; }

  .ev-wrap { padding: var(--sp-xs) var(--sp-md); }
  .ev-row { display: flex; gap: var(--sp-md); padding: var(--sp-xs) 0; border-bottom: 1px solid var(--c-border); align-items: flex-start; }
  .ev-row:last-child { border-bottom: none; }
  .ev-k { font-family: var(--f-mono); font-size: 10px; font-weight: 500; color: var(--c-tertiary); min-width: 96px; flex-shrink: 0; padding-top: 2px; }
  .ev-v { font-family: var(--f-mono); font-size: 11px; color: var(--c-on-surface); word-break: break-all; line-height: 1.5; }
  .ev-v.good { color: var(--c-green); } .ev-v.bad { color: var(--c-red); } .ev-v.warn { color: var(--c-amber); }

  .steps { padding: var(--sp-xs) var(--sp-md); list-style: none; }
  .step { display: flex; gap: var(--sp-sm); padding: var(--sp-sm) 0; border-bottom: 1px solid var(--c-border); font-size: 13px; color: var(--c-secondary); line-height: 1.6; align-items: flex-start; }
  .step:last-child { border-bottom: none; }
  .step-n { font-family: var(--f-mono); font-size: 10px; font-weight: 500; color: var(--c-tertiary); background: var(--c-blue-bg); border: 1px solid var(--c-blue-bd); border-radius: var(--r-sm); padding: 2px var(--sp-xs); flex-shrink: 0; margin-top: 2px; }

  .reply-wrap { padding: var(--sp-md); position: relative; }
  .reply-body { background: var(--c-neutral); border: 1px solid var(--c-border); border-radius: var(--r-sm); padding: var(--sp-md); font-size: 12px; color: var(--c-on-surface); line-height: 1.8; white-space: pre-wrap; font-family: var(--f-body); }
  .copy-btn { position: absolute; top: var(--sp-lg); right: var(--sp-lg); background: var(--c-surface); color: var(--c-tertiary); border: 1px solid var(--c-blue-bd); border-radius: var(--r-sm); font-family: var(--f-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; padding: var(--sp-xs) var(--sp-sm); cursor: pointer; transition: all 0.15s; }
  .copy-btn:hover { background: var(--c-blue-bg); }
  .copy-btn.copied { color: var(--c-green); border-color: var(--c-green-bd); background: var(--c-green-bg); }

  .history { margin-bottom: var(--sp-md); }
  .history-lbl { font-family: var(--f-mono); font-size: 10px; font-weight: 500; color: var(--c-secondary); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: var(--sp-xs); }
  .h-list { display: flex; flex-direction: column; gap: var(--sp-xs); }
  .h-row { display: flex; align-items: center; gap: var(--sp-sm); padding: var(--sp-sm) var(--sp-md); background: var(--c-surface); border: 1px solid var(--c-border); border-radius: var(--r-sm); cursor: pointer; transition: all 0.12s; }
  .h-row:hover { border-color: var(--c-blue-bd); background: var(--c-blue-bg); }
  .h-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .h-dot.critical { background: var(--c-red); } .h-dot.warning { background: var(--c-amber); } .h-dot.ok { background: var(--c-green); } .h-dot.unknown { background: var(--c-secondary); }
  .h-text { font-size: 12px; color: var(--c-on-surface); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .h-time { font-family: var(--f-mono); font-size: 10px; color: var(--c-secondary); flex-shrink: 0; }

  .empty { display: flex; flex-direction: column; align-items: center; padding: var(--sp-2xl) var(--sp-md); gap: var(--sp-sm); text-align: center; }
  .empty-icon { font-family: var(--f-mono); font-size: 26px; color: var(--c-border-md); }
  .empty-title { font-family: var(--f-display); font-size: 15px; font-weight: 700; color: var(--c-secondary); }
  .empty-sub { font-size: 12px; color: var(--c-border-md); max-width: 320px; line-height: 1.6; }

  @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.25s ease forwards; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--c-neutral); }
  ::-webkit-scrollbar-thumb { background: var(--c-border-md); border-radius: 2px; }
  @media (max-width: 600px) {
    .summary { flex-direction: column; gap: var(--sp-sm); }
    .copy-btn { position: static; margin-top: var(--sp-sm); }
  }
`;

const EXAMPLES = [
  { label: "SPF fail", text: `550 5.7.23 The message was rejected because of Sender Policy Framework violation. The sending domain example.com does not designate the sending IP 203.0.113.42 as a permitted sender.` },
  { label: "Gmail 5.7.26", text: `550-5.7.26 This mail is unauthenticated, which poses a security risk to the\n550-5.7.26 sender and Gmail users, and has been blocked. The sender must\n550-5.7.26 authenticate with at least one of SPF or DKIM.` },
  { label: "Outlook blacklist", text: `550 5.7.1 Service unavailable; Client host [198.51.100.25] blocked using Spamhaus. To request removal from this list see https://www.spamhaus.org/lookup/ (S3140). [AM5EUR03FT045.eop-EUR03.prod.protection.outlook.com]` },
  { label: "DMARC report", text: `A message from your domain has failed DMARC evaluation.\n\nSource-IP: 203.0.113.10\nDomain: example.com\nDKIM: fail\nSPF: pass\nDMARC: fail (p=reject)\nDisposition: reject` },
];

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sec">
      <div className={"sec-hd" + (open ? "" : " closed")} onClick={() => setOpen(o => !o)}>
        <span className="sec-title">{title}</span>
        <span className={"chev" + (open ? " open" : "")}>▾</span>
      </div>
      {open && <div className="sec-bd">{children}</div>}
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className={"copy-btn" + (copied ? " copied" : "")} onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function DiagResult({ data }) {
  const sev = data.severity || "unknown";
  return (
    <div className="fade-up">
      <div className={"summary " + sev}>
        <span className={"badge " + sev}>{sev}</span>
        <div>
          <div className="verdict">{data.verdict}</div>
          <div className="meta">
            {data.errorCode       && <span className="pill">Code: <strong>{data.errorCode}</strong></span>}
            {data.rejectingServer && <span className="pill">Server: <strong>{data.rejectingServer}</strong></span>}
            {data.affectedDomain  && <span className="pill">Domain: <strong>{data.affectedDomain}</strong></span>}
            {data.affectedIP      && <span className="pill">IP: <strong>{data.affectedIP}</strong></span>}
          </div>
        </div>
      </div>
      <Section title="What Happened">
        <div className="prose">
          {data.whatHappened}
          {data.rootCause && <div className="prose-cause">{data.rootCause}</div>}
        </div>
      </Section>
      {data.evidence?.length > 0 && (
        <Section title="Evidence">
          <div className="ev-wrap">
            {data.evidence.map((e, i) => (
              <div className="ev-row" key={i}>
                <span className="ev-k">{e.key}</span>
                <span className={"ev-v" + (e.status === "good" ? " good" : e.status === "bad" ? " bad" : e.status === "warn" ? " warn" : "")}>{e.value}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
      {data.fixSteps?.length > 0 && (
        <Section title="Fix Steps">
          <ul className="steps">
            {data.fixSteps.map((s, i) => (
              <li className="step" key={i}>
                <span className="step-n">{String(i + 1).padStart(2, "0")}</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {data.customerReply && (
        <Section title="Customer-Ready Reply">
          <div className="reply-wrap">
            <CopyBtn text={data.customerReply} />
            <div className="reply-body">{data.customerReply}</div>
          </div>
        </Section>
      )}
    </div>
  );
}

export default function App() {
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState("");
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState("");
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(null);

  const displayed = histIdx !== null ? history[histIdx]?.result : result;

  async function diagnose() {
    if (!input.trim() || loading) return;
    setLoading(true); setResult(null); setError(""); setHistIdx(null);
    const steps = ["Parsing error message...", "Identifying rejection type...", "Checking SPF / DKIM / DMARC...", "Building diagnosis..."];
    let si = 0; setStatus(steps[0]);
    const iv = setInterval(() => { si = (si + 1) % steps.length; setStatus(steps[si]); }, 1300);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() })
      });
      // Read as text first so a non-JSON response (HTML error page) doesn't throw a cryptic parse error
      const rawText = await res.text();
      if (!res.ok) {
        // Try to extract a JSON error message, fall back to raw text (truncated)
        let errMsg;
        try { errMsg = JSON.parse(rawText).error; } catch { errMsg = rawText.slice(0, 300); }
        throw new Error("Server error " + res.status + ": " + errMsg);
      }
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("API returned non-JSON response: " + rawText.slice(0, 300));
      }
      if (!data || typeof data !== "object" || !data.verdict) {
        throw new Error("Unexpected response shape: " + rawText.slice(0, 300));
      }
      setResult(data);
      setHistory(h => [{ snippet: input.trim().slice(0, 72) + (input.length > 72 ? "\u2026" : ""), result: data, time: new Date() }, ...h].slice(0, 8));
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(iv); setLoading(false); setStatus("");
    }
  }

  function clear() { setInput(""); setResult(null); setError(""); setHistIdx(null); }

  return (
    <>
      <style>{STYLE}</style>
      <div className="app">
        <div className="header">
          <div className="eyebrow"><span className="pulse" /> Exact Hosting — Internal Tool</div>
          <h1>Bounce Interpreter</h1>
          <p className="subtitle">Paste any bounce message, NDR, or SMTP error — get a plain-English diagnosis and a customer-ready reply.</p>
        </div>

        <div className="input-card">
          <label className="field-label">Bounce message / NDR / SMTP error</label>
          <textarea
            placeholder={"Paste the full bounce message, SMTP error, or NDR body here…\n\nWorks with:\n• Raw SMTP 5xx errors   • Gmail / Outlook NDRs\n• DMARC failure reports  • Spamhaus / blacklist rejections"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) diagnose(); }}
          />
          <div className="chips">
            <span className="chip-lbl">Try:</span>
            {EXAMPLES.map((ex, i) => (
              <span key={i} className="chip" onClick={() => { setInput(ex.text); setResult(null); setHistIdx(null); }}>{ex.label}</span>
            ))}
          </div>
          <div className="actions">
            <button className="btn-primary" onClick={diagnose} disabled={!input.trim() || loading}>
              {loading ? "Diagnosing…" : "Diagnose"}
            </button>
            {(input || result) && <button className="btn-ghost" onClick={clear}>Clear</button>}
            <span className="char-hint">{input.length > 0 ? `${input.length} chars · Ctrl+Enter` : ""}</span>
          </div>
        </div>

        {loading && <div className="status fade-up"><span className="spinner" />{status}</div>}
        {error   && <div className="err-bar fade-up">{error}</div>}

        {history.length > 1 && (
          <div className="history fade-up">
            <div className="history-lbl">Session history</div>
            <div className="h-list">
              {history.slice(1).map((h, i) => (
                <div className="h-row" key={i} onClick={() => setHistIdx(i + 1)}>
                  <span className={"h-dot " + h.result.severity} />
                  <span className="h-text">{h.result.verdict}</span>
                  <span className="h-time">{h.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {displayed
          ? <DiagResult data={displayed} />
          : !loading && (
            <div className="empty">
              <div className="empty-icon">[!]</div>
              <div className="empty-title">No diagnosis yet</div>
              <div className="empty-sub">Paste a bounce message above and hit Diagnose, or try one of the quick examples.</div>
            </div>
          )
        }
      </div>
    </>
  );
}
