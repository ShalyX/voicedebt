import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";
import process from "node:process";

const PORT = Number(process.env.PORT || 3000);
const ROOT = join(process.cwd(), "public");
const MAX_AUDIO_BYTES = 18 * 1024 * 1024;

const SYSTEM_PROMPT = `You are VoiceDebt, an assistant that helps someone understand and reply thoughtfully to a voice note from any sender.
Return ONLY valid JSON with this exact shape:
{
  "person": "string",
  "summary": "2-4 concise sentences capturing the actual story, with natural language rather than sterile meeting notes",
  "debt": [{"text":"specific thing the listener should answer/do","kind":"question|promise|plan|send|call"}],
  "remember": ["specific detail worth acknowledging later"],
  "reply": "a warm, casual reply that acknowledges the important parts without sounding AI-generated",
  "vibe": "3-7 word description of the voice note's mood"
}
Rules:
- "debt" is ALWAYS from the listener's perspective: only include things the listener personally owes the sender.
- Include a debt only when the sender explicitly asks the listener a question, requests an action, asks for a decision/confirmation, or refers to a clear promise the listener previously made.
- NEVER turn the sender's own promise, task, deadline, follow-up, refund, delivery, update, or responsibility into listener debt.
- If the sender says they will do something later ("I'll refund you tomorrow", "I'll call you", "I'll send it"), put that in "remember" when useful, not in "debt".
- It is completely valid for "debt" to be an empty array. Do not manufacture an obligation just because a reply could be polite.
- Requests like "call me when you can" are listener debt. Statements like "I'll call you tomorrow" are not.
- "remember" is for meaningful personal details, dates, milestones, gossip, or sender commitments that the listener may want to remember.
- Summaries must stay faithful to the transcript. Do not add outcomes, certainty, or causal claims the sender did not explicitly state.\n- If part of the transcript is garbled, contradictory, or semantically unclear, do not promote that phrase into the summary as if it were reliable. Omit it or describe only the surrounding high-confidence meaning.
- preserve proper nouns and ambiguous words exactly as they appear in the transcript; do not silently "correct" names, places, or products.
- preserve slang/emojis only when supported by the transcript's tone.
- never invent facts.
- if the sender's name or role is unknown, use "The sender".
- the reply should sound like a real text message, not customer support or generic AI enthusiasm.
- avoid filler like "That's huge!", "So exciting!", "You'll crush it!" unless that tone is strongly supported by the transcript.
- cover every genuine item in debt naturally and acknowledge at least one meaningful remember detail when appropriate.
- if debt is empty, the reply can simply acknowledge the message; do not create a new commitment or ask unless it is useful and natural.
- prefer contractions, concise phrasing, and the sender/listener's casual tone.
- keep the reply under 90 words.`;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": data.length,
    "cache-control": "no-store",
  });
  res.end(data);
}

function parseModelJson(content) {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  const validKinds = new Set(["question", "promise", "plan", "send", "call"]);
  return {
    person: typeof parsed.person === "string" ? parsed.person : "Your friend",
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    debt: Array.isArray(parsed.debt)
      ? parsed.debt.slice(0, 6).filter((item) => item && typeof item.text === "string").map((item) => ({
          text: item.text,
          kind: validKinds.has(item.kind) ? item.kind : "question",
        }))
      : [],
    remember: Array.isArray(parsed.remember) ? parsed.remember.filter((x) => typeof x === "string").slice(0, 6) : [],
    reply: typeof parsed.reply === "string" ? parsed.reply : "",
    vibe: typeof parsed.vibe === "string" ? parsed.vibe : "voice note lore",
  };
}

async function transcribeWithWhisper(audio, token) {
  const model = process.env.HF_WHISPER_MODEL || "openai/whisper-large-v3";
  const endpoint = process.env.HF_WHISPER_ENDPOINT || `https://router.huggingface.co/hf-inference/models/${model}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": audio.type || "application/octet-stream",
    },
    body: Buffer.from(await audio.arrayBuffer()),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Whisper failed (${response.status}): ${text.slice(0, 240)}`);
  const data = JSON.parse(text);
  if (!data?.text?.trim()) throw new Error("Whisper returned an empty transcript.");
  return data.text.trim();
}

async function analyzeWithGemma(transcript, person, token) {
  const model = process.env.HF_GEMMA_MODEL || "google/gemma-3-12b-it";
  const endpoint = process.env.HF_CHAT_ENDPOINT || "https://router.huggingface.co/v1/chat/completions";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `${person ? `The sender's name is ${person}.\n` : ""}Analyze this voice-note transcript:\n\n${transcript}`,
        },
      ],
      max_tokens: 900,
      temperature: 0.35,
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Gemma failed (${response.status}): ${text.slice(0, 240)}`);
  const data = JSON.parse(text);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Gemma returned an empty analysis.");
  return parseModelJson(content);
}

async function handleAnalyze(req, res) {
  const token = process.env.HF_TOKEN;
  if (!token) return json(res, 503, { error: "HF_TOKEN is not configured on the server." });
  try {
    const url = `http://${req.headers.host || `localhost:${PORT}`}${req.url}`;
    const webRequest = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: Readable.toWeb(req),
      duplex: "half",
    });
    const form = await webRequest.formData();
    const audio = form.get("audio");
    const person = String(form.get("person") || "").trim();
    if (!(audio instanceof File)) return json(res, 400, { error: "Attach an audio file first." });
    if (audio.size > MAX_AUDIO_BYTES) return json(res, 413, { error: "Keep the demo voice note under 18MB." });
    if (!audio.type.startsWith("audio/") && !/\.(m4a|mp3|wav|ogg|webm)$/i.test(audio.name)) {
      return json(res, 415, { error: "That doesn't look like an audio file." });
    }

    const transcript = await transcribeWithWhisper(audio, token);
    const analysis = await analyzeWithGemma(transcript, person, token);
    if (person) analysis.person = person;
    return json(res, 200, { ...analysis, transcript });
  } catch (error) {
    console.error("VoiceDebt analyze error", error);
    return json(res, 500, { error: error instanceof Error ? error.message : "Analysis failed." });
  }
}

async function serveStatic(req, res) {
  let pathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
  if (pathname === "/") pathname = "/index.html";
  const safePath = normalize(pathname).replace(/^([.][.][/\\])+/, "");
  const filePath = join(ROOT, safePath);
  if (!filePath.startsWith(ROOT)) return json(res, 403, { error: "Forbidden" });
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=300",
    });
    if (req.method === "HEAD") return res.end();
    res.end(data);
  } catch {
    if (!extname(pathname)) {
      const data = await readFile(join(ROOT, "index.html"));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
      if (req.method === "HEAD") return res.end();
      return res.end(data);
    }
    json(res, 404, { error: "Not found" });
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, {
      ok: true,
      app: "VoiceDebt",
      inferenceConfigured: Boolean(process.env.HF_TOKEN),
      whisperModel: process.env.HF_WHISPER_MODEL || "openai/whisper-large-v3",
      gemmaModel: process.env.HF_GEMMA_MODEL || "google/gemma-3-12b-it",
    });
  }
  if (req.method === "POST" && req.url === "/api/analyze") return handleAnalyze(req, res);
  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);
  json(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`VoiceDebt running on http://localhost:${PORT}`);
});
