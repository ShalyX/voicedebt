# VoiceDebt

**Your voice notes have outstanding debt.**

VoiceDebt turns long voice notes into the things you actually need to reply to: questions, plans, promises, important details, and a reply draft that sounds human.

Built for the Hacktoberfest Weekend Challenge 2026.

## Core pipeline

1. Upload an audio voice note.
2. Open-source Whisper transcribes it through Hugging Face's HF Inference provider.
3. Gemma extracts reply debt, memorable context, and a concise story summary.
4. VoiceDebt drafts a reply and adds the note to a lightweight local inbox.

The app intentionally has **zero npm dependencies**. The browser UI, upload server, and model calls all run on Node's built-in APIs.

## Run locally

Requires Node.js 20+.

```bash
cp .env.example .env
# export the variables in .env (or configure them in your host)
npm start
```

Open http://localhost:3000.

## Environment variables

- `HF_TOKEN` — Hugging Face token with Inference Providers access.
- `HF_WHISPER_MODEL` — defaults to `openai/whisper-large-v3`.
- `HF_GEMMA_MODEL` — defaults to `google/gemma-2-2b-it`.
- `PORT` — defaults to `3000`.

Gemma access on Hugging Face may require accepting Google's model terms on the model page for the account behind your token.

## Verify the build

```bash
npm run check
npm test
```

The end-to-end test uses local mock model endpoints, so it verifies the full upload → transcription → analysis response path without spending inference credits.

## Deploy on Render

This repo includes `render.yaml`.

- Runtime: Node
- Build command: none required
- Start command: `npm start`
- Health check: `/health`
- Add `HF_TOKEN` as a secret environment variable

## MVP scope

- real audio upload
- real Whisper + Gemma analysis
- reply-debt extraction
- suggested reply
- local inbox / clear-debt interaction
- deterministic demo card for judging/demo resilience

No auth, no contact syncing, no background surveillance, no giant platform.
