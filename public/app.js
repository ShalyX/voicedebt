const DEMO = {
  id: "amaka-demo",
  person: "Amaka",
  age: "3 days",
  minutes: "8m 43s",
  transcript: "Okay so first of all I finally quit. My manager actually lost his mind when I gave notice... Also are you free Saturday? Send me that Airbnb link you mentioned. And what was that restaurant in Lekki? My interview is Tuesday, my sister is visiting, and apparently Daniel and Sarah broke up, which is insane.",
  summary: "She finally quit her job and her manager reacted badly when she gave notice. She has an interview on Tuesday, her sister is visiting, and the Daniel + Sarah situation has apparently exploded.",
  debt: [
    { text: "Send the Airbnb link", kind: "send" },
    { text: "Confirm whether you're free Saturday", kind: "plan" },
    { text: "Send the Lekki restaurant recommendation", kind: "question" },
  ],
  remember: ["Interview is Tuesday", "Her sister is visiting", "Daniel + Sarah apparently broke up 👀"],
  reply: "WAITTT Daniel and Sarah?? 😭 Yes I'm free Saturday — sending you that Airbnb now. And I remember the Lekki place, I'll send that too. Also good luck Tuesday, you're going to kill it ❤️",
  vibe: "career chaos + elite gossip",
};

const STARTER_DEBTS = [
  DEMO,
  { ...DEMO, id: "daniel-demo", person: "Daniel", age: "18 hours", minutes: "4m 12s", summary: "Trip logistics, a work update, and one direct question you still haven't answered.", debt: [{ text: "Confirm Friday dinner", kind: "plan" }], remember: ["Presentation went well"], reply: "Friday works for me. And congrats on the presentation — knew you'd smash it 🙌", vibe: "good news + logistics" },
  { ...DEMO, id: "mum-demo", person: "Mum", age: "5 hours", minutes: "2m 08s", summary: "A family update plus a reminder about something she asked you to bring.", debt: [{ text: "Confirm you'll bring the charger", kind: "promise" }], remember: ["Auntie is coming Sunday"], reply: "Yes, I'll bring the charger ❤️ And noted about Sunday.", vibe: "family admin" },
];

const processingLines = ["listening to the lore…", "detecting unanswered questions…", "finding promises you absolutely forgot…", "locating the gossip… 👀", "drafting a reply that sounds like a person…"];
const state = { screen: "home", file: null, duration: "", person: "", analysis: DEMO, debts: loadDebts(), processIndex: 0, error: "", copied: false };
const app = document.querySelector("#app");
let processTimer;

function loadDebts() {
  try { return JSON.parse(localStorage.getItem("voicedebt-inbox")) || STARTER_DEBTS; } catch { return STARTER_DEBTS; }
}
function saveDebts() { localStorage.setItem("voicedebt-inbox", JSON.stringify(state.debts)); }
function esc(value = "") { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function openDebts() { return state.debts.filter(item => !item.cleared && Array.isArray(item.debt) && item.debt.length > 0); }
function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}m ${secs}s`;
}
function readDuration(file) {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => { const value = formatDuration(audio.duration); URL.revokeObjectURL(url); resolve(value); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(""); };
    audio.src = url;
  });
}
function waveform(active = false) { return `<div class="waveform ${active ? "active" : ""}" aria-hidden="true">${Array.from({length:34}, (_,i)=>`<span style="height:${18 + ((i*17)%54)}%;animation-delay:${(i%8)*70}ms"></span>`).join("")}</div>`; }
function nav() {
  return `<nav class="nav shell">
    <button class="brand" data-action="home"><span class="brand-mark"><i></i><i></i><i></i></span><span>VoiceDebt</span></button>
    <div class="nav-right">
      <div class="privacy">WHISPER × GEMMA</div>
      <button class="ghost" data-action="inbox">Reply debt <span>${openDebts().length}</span></button>
    </div>
  </nav>`;
}

function heroVisual() {
  return `<div class="hero-visual" aria-label="VoiceDebt turns a voice note into reply debt">
    <div class="visual-label"><span class="live-dot"></span> LIVE EXTRACTION</div>
    <div class="voice-card motion-card">
      <div class="voice-card-top"><div class="mini-avatar">A</div><div><strong>Amaka</strong><small>8m 43s voice note</small></div><span>0:38</span></div>
      ${waveform(true)}
      <div class="transcript-peek">"...are you <mark>free Saturday?</mark> Send me that <mark>Airbnb link</mark>... my interview is Tuesday..."</div>
    </div>
    <div class="extract-card extract-one">
      <span>YOU OWE THEM</span>
      <strong>Confirm Saturday</strong>
      <small>plan</small>
    </div>
    <div class="extract-card extract-two">
      <span>YOU OWE THEM</span>
      <strong>Send Airbnb link</strong>
      <small>send</small>
    </div>
    <div class="memory-slip">
      <span>DO NOT FORGET</span>
      <strong>Interview · Tuesday</strong>
    </div>
    <div class="stage-arrow">↘</div>
  </div>`;
}

function renderHome() {
  return `${nav()}
  <section class="hero shell">
    <div class="hero-copy">
      <div class="eyebrow"><span>01</span> THE REPLY-DEBT LEDGER</div>
      <h1>Your voice notes have <em>outstanding debt.</em></h1>
      <p class="lead">Drop the voice note you meant to reply to three days ago. VoiceDebt finds the asks, promises, plans and tiny details you actually need to respond to.</p>
      <div class="hero-actions">
        <button class="primary" data-action="analyze">${state.file ? "Analyze this note ↗" : "Drop a voice note ↗"}</button>
        <button class="text-button" data-action="demo">See Amaka’s 8m 43s disaster</button>
      </div>
      <div class="home-proof">
        <span>OPEN MODELS</span><b>Whisper → Gemma</b>
        <span>STORAGE</span><b>Local inbox only</b>
      </div>
    </div>
    ${heroVisual()}
  </section>
  <section class="input-dock shell">
    <div class="dock-heading"><span>ADD A NOTE</span><small>m4a · mp3 · wav · up to 18MB</small></div>
    <div class="dropzone ${state.file ? "has-file" : ""}" id="dropzone">
      <input id="audioInput" type="file" accept="audio/*,.m4a" hidden>
      <div class="mic">↗</div>
      <div class="file-copy"><strong>${state.file ? esc(state.file.name) : "Drop it here"}</strong><span>${state.file ? `${(state.file.size/1024/1024).toFixed(1)} MB · ${state.duration || "reading duration…"}` : "or click to choose a voice note"}</span></div>
      ${waveform(Boolean(state.file))}
    </div>
    ${state.file ? `<div class="name-row"><label>Who’s talking? <span>optional</span></label><input id="personInput" value="${esc(state.person)}" placeholder="e.g. Amaka"></div>` : ""}
    ${state.error ? `<div class="error">${esc(state.error)}</div>` : ""}
    <p class="trust">Audio is processed through Hugging Face inference. VoiceDebt keeps no server-side history.</p>
  </section>`;
}

function renderProcessing() {
  return `${nav()}<section class="processing shell narrow">
    <div class="processing-index">VOICE NOTE → REPLY DEBT</div>
    <div class="processing-orb"><div class="ring"></div><span>●</span></div>
    <div class="eyebrow"><span>02</span> ANALYZING ${esc((state.person || "VOICE NOTE").toUpperCase())}</div>
    <h2>${processingLines[state.processIndex]}</h2>
    ${waveform(true)}
    <div class="processing-steps"><span class="${state.processIndex > 0 ? "done" : "active"}">TRANSCRIBE</span><i>→</i><span class="${state.processIndex > 1 ? "done" : state.processIndex === 1 ? "active" : ""}">UNDERSTAND</span><i>→</i><span class="${state.processIndex > 3 ? "done" : state.processIndex >= 2 ? "active" : ""}">EXTRACT DEBT</span></div>
  </section>`;
}

function renderResult() {
  const a = state.analysis;
  return `${nav()}<section class="result shell"><div class="result-top"><button class="back" data-action="home">← another note</button><span class="vibe">${esc(a.vibe)}</span></div><div class="debt-card"><header class="debt-header"><div><div class="avatar">${esc(a.person.slice(0,1).toUpperCase())}</div><div><h2>${esc(a.person)}</h2><p>${esc(a.minutes)} · ${esc(a.age)}</p></div></div>${a.debt.length ? `<div class="status overdue">OUTSTANDING</div>` : `<div class="status">NO DEBT</div>`}</header>
  <div class="card-section story"><span>THE ACTUAL STORY</span><p>${esc(a.summary)}</p></div>
  <div class="card-section"><span>YOU OWE THEM</span><div class="checklist">${a.debt.length ? a.debt.map(item=>`<label><input type="checkbox"><b>${esc(item.text)}</b><small>${esc({question:"answer",promise:"promise",plan:"plan",send:"send",call:"call"}[item.kind] || item.kind)}</small></label>`).join("") : `<p class="muted">Nothing you owe them right now.</p>`}</div></div>
  <div class="card-section"><span>DO NOT FORGET</span><div class="remember-grid">${a.remember.map((item,i)=>`<div><i>${i===0?"✦":i===1?"◌":"👀"}</i>${esc(item)}</div>`).join("")}</div></div>
  <div class="reply-box"><div class="reply-label"><span>SUGGESTED REPLY</span><button data-action="copy">${state.copied ? "Copied ✓" : "Copy"}</button></div><p>${esc(a.reply)}</p></div><div class="card-actions"><button class="primary" data-action="copy">${state.copied ? "Copied to clipboard ✓" : "Copy reply"}</button>${a.debt.length ? `<button class="clear" data-action="clear" data-id="${esc(a.id)}">Clear debt ✓</button>` : `<button class="clear" data-action="clear" data-id="${esc(a.id)}">Archive note ✓</button>`}</div></div><details class="transcript"><summary>See transcript</summary><p>${esc(a.transcript)}</p></details></section>`;
}

function renderInbox() {
  const open = openDebts();
  const obligations = open.reduce((sum,item)=>sum+item.debt.length,0);
  if (!open.length) {
    return `${nav()}<section class="empty-inbox shell">
      <div class="empty-stamp">0</div>
      <div class="eyebrow"><span>00</span> REPLY DEBT</div>
      <h1>Inbox clear.<br><em>You are free.</em></h1>
      <p>No unanswered questions. No links you forgot to send. No “call me when you can” hanging over your head.</p>
      <button class="primary" data-action="home">Add another voice note ↗</button>
    </section>`;
  }
  return `${nav()}<section class="inbox shell">
    <div class="inbox-heading">
      <div><div class="eyebrow"><span>${String(open.length).padStart(2,"0")}</span> REPLY DEBT</div><h1>You owe ${open.length} ${open.length===1?"person":"people"} replies.</h1></div>
      <div class="ledger-total"><span>OPEN OBLIGATIONS</span><strong>${obligations}</strong></div>
    </div>
    <div class="debt-list">${open.map((item,index)=>`<article data-action="open" data-id="${esc(item.id)}">
      <div class="ledger-no">${String(index+1).padStart(2,"0")}</div>
      <div class="avatar">${esc(item.person.slice(0,1).toUpperCase())}</div>
      <div class="list-main"><div><h3>${esc(item.person)}</h3><span>${esc(item.minutes)}</span></div><p>${esc(item.summary)}</p><div class="chips">${item.debt.slice(0,3).map(d=>`<span>${esc(d.text)}</span>`).join("")}</div></div>
      <div class="age ${item.age.includes("days")?"danger":""}">${esc(item.age)}</div>
    </article>`).join("")}</div>
    <div class="inbox-foot"><span>VOICEDEBT LEDGER</span><b>${obligations} unresolved obligation${obligations===1?"":"s"}</b><button class="primary small" data-action="home">+ Add note</button></div>
  </section>`;
}

function render() {
  clearInterval(processTimer);
  document.body.dataset.screen = state.screen;
  app.innerHTML = state.screen === "home" ? renderHome() : state.screen === "processing" ? renderProcessing() : state.screen === "result" ? renderResult() : renderInbox();
  bind();
  if (state.screen === "processing") processTimer = setInterval(()=>{ state.processIndex=(state.processIndex+1)%processingLines.length; render(); },1250);
}

async function selectFile(file) {
  if (!file) return;
  state.file=file;
  state.duration="";
  state.error="";
  render();
  state.duration=await readDuration(file);
  render();
}
async function analyze() {
  if (!state.file) { document.querySelector("#audioInput")?.click(); return; }
  state.error=""; state.processIndex=0; state.screen="processing"; render();
  try {
    const form = new FormData(); form.append("audio", state.file); if (state.person.trim()) form.append("person", state.person.trim());
    const response = await fetch("/api/analyze", { method:"POST", body:form });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "Analysis failed");
    const next = { ...data, id: crypto.randomUUID(), age:"just now", minutes: state.duration || "new note", cleared: !Array.isArray(data.debt) || data.debt.length === 0 };
    state.analysis=next; state.debts=[next,...state.debts.filter(i=>i.id!=="amaka-demo")]; saveDebts(); state.screen="result";
  } catch (error) { state.error=error instanceof Error ? error.message : "Analysis failed"; state.screen="home"; }
  render();
}
async function copyReply() { await navigator.clipboard.writeText(state.analysis.reply); state.copied=true; render(); setTimeout(()=>{state.copied=false;render();},1500); }
function clearDebt(id) { state.debts=state.debts.map(item=>item.id===id?{...item,cleared:true}:item); saveDebts(); state.screen="inbox"; render(); }

function bind() {
  document.querySelectorAll("[data-action]").forEach(el=>el.addEventListener("click",()=>{
    const action=el.dataset.action;
    if(action==="home"){state.screen="home";render();}
    if(action==="inbox"){state.screen="inbox";render();}
    if(action==="demo"){state.error="";state.analysis=DEMO;state.screen="result";render();}
    if(action==="analyze") analyze();
    if(action==="copy") copyReply();
    if(action==="clear") clearDebt(el.dataset.id);
    if(action==="open"){const item=state.debts.find(x=>x.id===el.dataset.id);if(item){state.analysis=item;state.screen="result";render();}}
  }));
  const input=document.querySelector("#audioInput"); if(input) input.addEventListener("change",e=>selectFile(e.target.files?.[0]));
  const drop=document.querySelector("#dropzone"); if(drop){drop.addEventListener("click",()=>input?.click());drop.addEventListener("dragover",e=>e.preventDefault());drop.addEventListener("drop",e=>{e.preventDefault();selectFile(e.dataTransfer.files?.[0]);});}
  const person=document.querySelector("#personInput"); if(person) person.addEventListener("input",e=>{state.person=e.target.value;});
}
render();
