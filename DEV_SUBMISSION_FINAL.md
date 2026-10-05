# VoiceDebt: the voice-note inbox for people with good intentions

> Hacktoberfest Weekend Challenge: Build for a Friend

#devchallenge #weekendchallenge #hf26challenge

## What I Built

My friend sends voice notes like podcasts.

Eight minutes. Twelve minutes. Long enough that I can listen with every intention of replying properly — and still finish with three questions unanswered, one link unsent, and a detail I absolutely meant to acknowledge.

That became VoiceDebt.

**VoiceDebt turns the voice notes you keep meaning to reply to into the things you actually owe the sender.**

Not just a summary.

It separates a voice note into four useful layers:

- **THE ACTUAL STORY** — what happened
- **YOU OWE THEM** — the questions, promises, decisions, calls, or things you actually need to send back
- **DO NOT FORGET** — dates, personal details, sender commitments, and context worth remembering
- **SUGGESTED REPLY** — a concise reply that covers the important bits

The key word is **owe**.

A friend can tell me they quit their job, ask if I am free Saturday, remind me to send an Airbnb link, mention an interview on Tuesday, and then spend another five minutes on unrelated lore.

A normal summary compresses that into one paragraph.

VoiceDebt tries to preserve the social obligations hiding inside it.

## The Bug That Defined the Product

The synthetic demo worked.

The first real voice note was more useful.

I uploaded a 23-second message from a sales rep explaining that an address could not be edited after payment and that **they** would process a refund the next morning.

VoiceDebt understood the story, but the first version produced this under **YOU OWE THEM**:

> Confirm when the refund will be processed tomorrow morning.

That was backwards.

The sales rep owed **me** the refund.

That one mistake forced me to define the product more carefully:

> **Reply debt is always from the listener's perspective.**

After the fix, the exact same note correctly showed **NO DEBT**, while the promised refund timing moved into **DO NOT FORGET**.

A second real note exposed another boundary. Someone explained transport options, prices, drop-off points, and warnings. VoiceDebt initially turned "you'll need to find your way from the gate" into a task.

But that is not reply debt either.

It is logistics.

So the final rule became:

> VoiceDebt tracks social and communication obligations to the sender — not every task implied by a conversation.

That distinction is the heart of the product.

## Demo

**Live app:** https://voicedebt.onrender.com

**Source:** https://github.com/ShalyX/voicedebt

The core flow is deliberately small:

1. Drop in a voice note.
2. Whisper transcribes it.
3. Gemma separates the story from the listener's actual reply debt.
4. VoiceDebt surfaces the things worth remembering.
5. It drafts a reply.
6. Only notes with real listener obligations enter the Reply Debt inbox.
7. Send the reply and clear the debt.

The public app also includes a synthetic Amaka example so the interaction can be explored without exposing anyone else's private conversation.

## How I Built It

VoiceDebt is intentionally simple.

The frontend is plain HTML, CSS, and JavaScript. The backend is a small Node server using built-in APIs. There is no framework-heavy application layer and no server-side conversation database.

The AI path is:

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
   ├── actual story
   ├── listener obligations
   ├── do-not-forget context
   └── suggested reply
```

### Whisper for transcription

Audio is sent to `openai/whisper-large-v3` through Hugging Face Inference Providers.

The transcript remains visible in the UI because speech recognition is not perfect. Real testing already surfaced examples such as "Airbnb" becoming "urban" and "Lekki" becoming "Leckie."

Instead of pretending those errors do not happen, VoiceDebt keeps the source transcript inspectable and tells the reasoning model not to turn garbled or uncertain phrases into confident facts.

### Gemma for reply-debt reasoning

The transcript is then sent to `google/gemma-3-12b-it`.

Gemma returns a strict structure containing:

- `summary`
- `debt[]`
- `remember[]`
- `reply`
- `vibe`

The interesting part was not getting an LLM to write a reply.

The interesting part was teaching it what **counts as debt**.

The final reasoning rules are conservative:

- an explicit question can be debt
- "send me X" can be debt
- "call me when you can" can be debt
- a promise the listener previously made can be debt
- a sender promising a refund is **not** listener debt
- advice is not debt
- a price is not debt
- a transport recommendation is not debt
- something the listener may need to do for themselves is not automatically debt
- when the obligation is ambiguous, omit it instead of manufacturing one

And zero debt is a completely valid result.

### A local Reply Debt inbox

The analyzed inbox lives in the browser with `localStorage`.

VoiceDebt itself does not persist uploaded audio or transcripts in a server-side history.

Only notes with actual listener obligations count toward the Reply Debt inbox. Informational notes can still be analyzed and remembered without making the user feel artificially behind.

### Render

Render hosts the public Node application and the server-side inference flow.

The repository includes a `render.yaml` Blueprint with:

- the Node runtime
- the health endpoint
- Whisper and Gemma model configuration
- a secret Hugging Face token supplied through Render rather than committed to source

That made it easy to keep the repo reproducible while still deploying a real working inference path.

## Why Open Innovation Matters

Voice notes are unusually personal data.

They contain family updates, work problems, money, addresses, relationships, jokes, plans, names, and all the context people do not usually put into polished text.

Using open models matters here for more than putting an "open" badge on the stack.

Whisper and Gemma keep the intelligence-heavy parts of VoiceDebt replaceable and inspectable.

I can change the speech model.

I can swap the reasoning model.

I can change the exact semantics of "reply debt" in my own prompt and application logic.

And the product can evolve toward more local inference without needing to be redesigned around one proprietary assistant.

The current demo uses Hugging Face-hosted inference, so I do **not** claim that audio stays entirely on-device.

VoiceDebt keeps no server-side conversation history, while the analyzed inbox is stored locally in the browser.

That distinction matters to me.

"Open" should describe the actual architecture, not become vague privacy marketing.

## What I Learned

The best part of this build was that the hardest problem was not technical plumbing.

Whisper worked.

Gemma worked.

Render worked.

The harder problem was deciding what the product actually means by **debt**.

Real voice notes forced that definition to get sharper:

- someone else's promise is not your task
- useful advice is not automatically an obligation
- context and action are different
- a model should be allowed to say "nothing you owe them right now"

That is what made VoiceDebt feel less like an audio summarizer and more like a product.

## Current Limitations

Whisper can still mishear proper nouns, accents, or casual speech.

The inbox is browser-local, so it does not sync across devices.

And VoiceDebt is intentionally not trying to ingest WhatsApp, Telegram, iMessage, contacts, or entire messaging histories in this weekend version.

The goal was to get one small behavior right:

**I listened to your voice note. What do I actually need to reply to?**

## Prize Categories

### Best Use of Gemma

Gemma is the reasoning core of VoiceDebt. It turns an unstructured transcript into listener-specific reply debt, memorable context, and a reply draft while enforcing the directionality and ambiguity rules that emerged from real-world testing.

### Best Use of Render

Render hosts the complete public VoiceDebt application and its server-side inference path, with environment-managed secrets and the repository's Blueprint configuration.

## Links

- **Live demo:** https://voicedebt.onrender.com
- **GitHub:** https://github.com/ShalyX/voicedebt
