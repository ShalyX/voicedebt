# VoiceDebt — DEV Submission Draft

> Hacktoberfest Weekend Challenge: Build for a Friend

## What I Built

My friend sends voice notes like podcasts.

Eight minutes. Twelve minutes. Sometimes long enough that I start listening with every intention of replying properly — and by the end I've forgotten half the things I was supposed to answer.

That became the problem behind VoiceDebt.

**VoiceDebt turns the voice notes you keep meaning to reply to into the things you actually need to respond to.**

It doesn't just summarize a voice note. It separates four different kinds of information:

- what actually happened
- what you personally owe the sender
- details you should not forget
- a reply draft that covers the important parts

The distinction sounds small, but it changed the product.

A friend can say they have an interview Tuesday, ask whether I'm free Saturday, remind me to send a link, and then drop three minutes of unrelated lore. A normal summary compresses all of that together. VoiceDebt tries to preserve the social obligation hiding inside it.

And importantly, it understands direction.

During testing I uploaded a real 23-second note from a sales rep explaining that **they** would process a refund for me the next morning. An earlier version incorrectly turned that into something *I* owed them.

That bug forced me to sharpen the entire product model:

> reply debt is always from the listener's perspective.

After the fix, the same note correctly showed **NO DEBT**, while keeping the promised refund timing under **DO NOT FORGET**.

That was the moment VoiceDebt stopped feeling like "AI summary for audio" and started feeling like its own product.

## Demo

Live demo: https://voicedebt.onrender.com

Public repository: https://github.com/ShalyX/voicedebt

The strongest demo flow is:

1. Upload a real voice note.
2. Whisper transcribes it.
3. Gemma extracts the story, reply debt, memorable details, and a suggested reply.
4. Actionable notes enter the Reply Debt inbox.
5. Informational notes with zero listener obligations do not inflate the inbox.
6. Copy the reply, send it, and clear the debt.

The public app also includes a synthetic Amaka example so the core interaction is still easy to inspect without exposing anyone's private conversations.

## Code

Repository: https://github.com/ShalyX/voicedebt

VoiceDebt deliberately has almost no application-layer dependencies.

The server uses Node's built-in HTTP APIs. The browser UI is plain HTML, CSS, and JavaScript. The AI path is:

```
voice note
   ↓
Whisper large-v3
   ↓
transcript
   ↓
Gemma 3
   ↓
structured reply debt
   ├── story
   ├── listener obligations
   ├── do-not-forget details
   └── suggested reply
```

The app is deployed on Render and configured through the repository's `render.yaml`.

## How I Built It

### 1. Transcription with Whisper

Uploaded audio is sent to `openai/whisper-large-v3` through Hugging Face Inference Providers.

Whisper gives VoiceDebt the raw transcript. The app intentionally keeps the transcript visible because speech recognition is imperfect — especially with names, place names, accents, and casual speech.

### 2. Reasoning with Gemma

The transcript is sent to `google/gemma-3-12b-it`.

Gemma returns a strict structured object containing:

- `summary`
- `debt[]`
- `remember[]`
- `reply`
- `vibe`

The hardest part was not generating the reply. It was defining **debt** correctly.

The model is explicitly instructed that debt belongs only to the listener. If the sender promises a refund, callback, delivery, or update, that is the sender's responsibility and should become context — not a task for the listener.

Zero debt is a valid result.

### 3. A local reply-debt inbox

VoiceDebt does not maintain a server-side conversation database.

The user's analyzed inbox is stored in the browser with `localStorage`. Only notes with actionable listener debt count toward the Reply Debt inbox.

That keeps the hackathon version intentionally small and makes the product behavior easy to understand.

### 4. Render

Render hosts the Node application and provides the public demo runtime.

The repository includes a Render Blueprint with the Node runtime, health endpoint, and model configuration. The Hugging Face token is supplied as a secret environment variable rather than committed to the repository.

## Why Does Open Innovation Matter?

Voice notes are unusually personal data.

They contain family news, relationship drama, work problems, money, addresses, plans, jokes, names, and the context people do not usually put into polished text.

Using open models matters here for more than a badge on the stack.

Whisper and Gemma make the two intelligence-heavy parts of VoiceDebt replaceable and inspectable:

- speech recognition is not permanently tied to one proprietary transcription API
- the reasoning model can be swapped as better open models become available
- the prompt and debt semantics belong to the application instead of being hidden inside a closed product
- the app can evolve toward more local inference without redesigning the product around a proprietary assistant

The current demo uses Hugging Face-hosted inference, so I do **not** claim the audio stays entirely on-device. VoiceDebt itself keeps no server-side history; analyzed inbox state is stored locally in the browser.

That distinction matters to me. "Open" should describe the actual architecture, not become vague privacy marketing.

## What Changed After Real Testing

The first polished demo worked.

The first real voice note was more useful.

A sales rep sent me a short message explaining why an address could not be changed after payment and promising a refund the next morning.

VoiceDebt understood the story, but the first version produced:

> Confirm when the refund will be processed tomorrow morning.

That was backwards.

The sales rep owed *me* the refund.

I changed the reasoning rules so sender commitments can never silently become listener obligations. I also added a proper **NO DEBT** state and stopped zero-debt notes from increasing the Reply Debt inbox count.

That small test reshaped the product more than another feature would have.

## Current Limitations

Whisper can still mishear proper nouns or casual speech. In testing, "Airbnb" became "urban" and "Lekki" became "Leckie."

Rather than pretending those errors do not exist, VoiceDebt keeps the transcript visible and tells Gemma not to turn garbled or uncertain phrases into confident facts.

The inbox is also browser-local in this version, so it does not sync across devices.

Both are deliberate boundaries for a weekend build.

## Prize Categories

### Best Use of Gemma
Gemma is the reasoning core that turns an unstructured transcript into listener-specific reply debt, context, and a reply draft.

### Best Use of Render
Render hosts the complete public VoiceDebt application and its server-side inference flow.

## Links

- Live demo: https://voicedebt.onrender.com
- Code: https://github.com/ShalyX/voicedebt

## Before Publishing

Replace this section with one genuine reaction from the real person you built/tested VoiceDebt for. Do not invent it.

Suggested thing to ask them after they try it:
> "Would you actually use this after a long voice note, and what felt wrong or surprisingly useful?"
