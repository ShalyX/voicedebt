import { createServer } from "node:http";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const APP_PORT = 3187;
const MOCK_PORT = 3188;

const mock = createServer(async (req, res) => {
  if (req.url === "/asr") {
    for await (const _ of req) {}
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ text: "I quit my job. Are you free Saturday? Please send the Airbnb link. My interview is Tuesday." }));
  }
  if (req.url === "/chat") {
    for await (const _ of req) {}
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        person: "Amaka",
        summary: "She quit her job and has an interview Tuesday.",
        debt: [
          { text: "Confirm whether you're free Saturday", kind: "plan" },
          { text: "Send the Airbnb link", kind: "send" }
        ],
        remember: ["Interview is Tuesday"],
        reply: "YES I'm free Saturday 😭 Sending the Airbnb now — and good luck Tuesday ❤️",
        vibe: "career chaos + plans"
      }) } }]
    }));
  }
  res.writeHead(404).end();
});

await new Promise((resolve) => mock.listen(MOCK_PORT, "127.0.0.1", resolve));
const app = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("..", import.meta.url).pathname,
  env: {
    ...process.env,
    PORT: String(APP_PORT),
    HF_TOKEN: "test-token",
    HF_WHISPER_ENDPOINT: `http://127.0.0.1:${MOCK_PORT}/asr`,
    HF_CHAT_ENDPOINT: `http://127.0.0.1:${MOCK_PORT}/chat`,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

async function waitForApp() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${APP_PORT}/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("VoiceDebt test server did not start");
}

try {
  await waitForApp();
  const home = await fetch(`http://127.0.0.1:${APP_PORT}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /VoiceDebt/);

  const form = new FormData();
  form.append("person", "Amaka");
  form.append("audio", new File([new Uint8Array([82, 73, 70, 70])], "note.wav", { type: "audio/wav" }));
  const response = await fetch(`http://127.0.0.1:${APP_PORT}/api/analyze`, { method: "POST", body: form });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.person, "Amaka");
  assert.equal(body.debt.length, 2);
  assert.equal(body.debt[1].kind, "send");
  assert.match(body.transcript, /free Saturday/);
  console.log("✓ VoiceDebt upload → Whisper → Gemma → debt-card API flow passes");
} finally {
  app.kill("SIGTERM");
  await new Promise((resolve) => mock.close(resolve));
}
