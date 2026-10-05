# VoiceDebt Regression Checklist

Run these before recording the final demo.

## 1. Friend note with multiple asks
Expected:
- transcript is usable
- 2–4 real listener obligations appear under **YOU OWE THEM**
- personal details land under **DO NOT FORGET**
- reply covers the obligations without sounding generic
- note appears in the Reply Debt inbox

## 2. Informational / sender-owes-you note
Use the Sales rep refund note.

Expected:
- **NO DEBT**
- "Nothing you owe them right now."
- sender commitments appear under **DO NOT FORGET**
- note does **not** increase the Reply Debt inbox count
- summary does not promote garbled transcript fragments into facts

## 3. Direct callback request
Example content: sender gives an update and says "call me when you can."

Expected:
- a `call` obligation is extracted
- it appears in the inbox
- suggested reply acknowledges the update and the callback request

## 4. Noisy / imperfect transcription
Use a real phone voice note with names, Nigerian place names, or casual speech.

Expected:
- uncertain transcript phrases are not confidently invented into the summary
- proper nouns are preserved as heard
- analysis remains useful even when transcription is imperfect

## Product smoke test
- homepage loads
- audio picker + drag/drop works
- real duration appears
- processing animation runs
- result card renders
- Copy reply works
- Clear debt / Archive note works
- inbox count matches actionable debts only
- empty inbox state works
- /health returns ok + configured models

## Freeze rule
After these pass: no new features. Only blocker-level bug fixes.


## 5. Advice / logistics without a direct ask
Use a note where the sender explains options, prices, routes, warnings, or what the listener may need to do for themselves.

Expected:
- recommendations and logistics stay in **THE ACTUAL STORY** / **DO NOT FORGET**
- VoiceDebt does not invent a reply obligation from consequences
- "you'll need to find your way from the gate" is not debt unless the sender explicitly asks for confirmation or action back
- a direct imperative such as "send me X" or "call me when you can" can still be debt
