/* agent-fleet / chat — application logic.
   Everything local: conversations in localStorage, inference in a Web Worker,
   models from the HF CDN cached by the browser. No servers involved.
*/

const $ = (id) => document.getElementById(id);

const LS_KEY = "agent-fleet-chat:v1";

const state = {
  models: {},
  currentModel: "qwen3_17b",
  loadedModel: null,
  conversations: [],   // [{id, title, created, messages:[{role, content, stats?}], system}]
  activeId: null,
  generating: false,
  worker: null,
  settings: { system: "", temperature: 0.7, max_tokens: 768 },
};

/* ---------------- persistence ---------------- */

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.conversations = data.conversations || [];
      state.activeId = data.activeId || null;
      state.currentModel = data.currentModel || state.currentModel;
      state.settings = Object.assign(state.settings, data.settings || {});
    }
  } catch (_) { /* corrupted storage — start fresh */ }
}

function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      conversations: state.conversations,
      activeId: state.activeId,
      currentModel: state.currentModel,
      settings: state.settings,
    }));
  } catch (_) { /* storage full — keep working in-memory */ }
}

/* ---------------- worker ---------------- */

function spawnWorker() {
  if (state.worker) state.worker.terminate();
  state.worker = new Worker("chat-worker.js", { type: "module" });
  state.worker.onmessage = (ev) => handleWorkerMsg(ev.data);
  state.worker.postMessage({ cmd: "models" });
}

function handleWorkerMsg(m) {
  switch (m.cmd) {
    case "models": {
      state.models = m.models;
      buildModelSelect();
      setStatus("idle");
      ensureModelLoaded();
      break;
    }
    case "progress": {
      const pct = m.total ? Math.round((m.loaded / m.total) * 100) : 0;
      $("dl-progress").hidden = false;
      $("dl-fill").style.width = pct + "%";
      $("dl-text").textContent =
        `Downloading ${state.models[m.model]?.label || "model"} — ` +
        `${(m.loaded / 1048576).toFixed(0)} / ${(m.total / 1048576).toFixed(0)} MB (${pct}%)`;
      setStatus("loading", `downloading ${pct}%`);
      break;
    }
    case "ready": {
      state.loadedModel = m.model;
      $("dl-progress").hidden = true;
      setStatus("idle");
      updateCtxNote();
      if (state.pendingGenerate) { const g = state.pendingGenerate; state.pendingGenerate = null; generate(g); }
      break;
    }
    case "tok": { appendToken(m.v); break; }
    case "done": { finishGeneration(m.stats); break; }
    case "error": {
      console.error("[worker]", m.error);
      if (state.generating) finishGeneration(null, m.error);
      else { setStatus("error", "error"); toast("Model error: " + m.error); }
      $("dl-progress").hidden = true;
      break;
    }
  }
}

function ensureModelLoaded() {
  if (state.loadedModel !== state.currentModel) {
    setStatus("loading", "loading model");
    state.worker.postMessage({ cmd: "load", model: state.currentModel });
  }
}

/* ---------------- generation ---------------- */

function activeConv() { return state.conversations.find((c) => c.id === state.activeId); }

function send() {
  const input = $("input");
  const text = input.value.trim();
  if (!text || state.generating) return;
  input.value = "";
  autosize(input);

  let conv = activeConv();
  if (!conv) conv = newConversation();
  conv.messages.push({ role: "user", content: text });
  if (conv.messages.length === 1) {
    conv.title = text.length > 42 ? text.slice(0, 42) + "…" : text;
    renderConvList();
  }
  renderMessages();
  save();
  generate({ convId: conv.id });
}

function generate({ convId }) {
  const conv = state.conversations.find((c) => c.id === convId);
  if (!conv) return;

  if (state.loadedModel !== state.currentModel) {
    // model swap requested mid-flight — queue generation for when it's ready
    state.pendingGenerate = { convId };
    ensureModelLoaded();
    return;
  }

  state.generating = true;
  setStatus("generating", "generating");
  $("btn-send").hidden = true;
  $("btn-stop").hidden = false;

  const messages = trimToContext(conv.messages, state.models[state.currentModel]);
  state.streamConvId = convId;
  state.streamText = "";
  conv.messages.push({ role: "assistant", content: "" });
  renderMessages(true);

  state.worker.postMessage({
    cmd: "gen",
    messages,
    system: state.settings.system || null,
    opts: { temperature: state.settings.temperature, max_tokens: state.settings.max_tokens },
  });
}

/* Rough context budgeting: ~3.6 chars/token heuristic, keep the newest turns. */
function trimToContext(messages, model) {
  const budget = (model ? model.n_ctx : 2048) - 384 - state.settings.max_tokens;
  let chars = 0;
  const kept = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    chars += m.content.length / 3.6;
    if (chars > budget && kept.length >= 2) break;
    kept.unshift(m);
  }
  return kept;
}

function appendToken(v) {
  state.streamText += v;
  const conv = state.conversations.find((c) => c.id === state.streamConvId);
  if (!conv) return;
  const last = conv.messages[conv.messages.length - 1];
  if (last && last.role === "assistant") last.content = state.streamText;
  updateStreamingBubble(state.streamText);
  save();
}

function finishGeneration(stats, error) {
  state.generating = false;
  $("btn-send").hidden = false;
  $("btn-stop").hidden = true;
  setStatus("idle");

  const conv = state.conversations.find((c) => c.id === state.streamConvId);
  if (conv) {
    const last = conv.messages[conv.messages.length - 1];
    if (last && last.role === "assistant") {
      if (error) {
        last.content = last.content || `⚠ ${error}`;
        last.error = true;
      } else if (stats) {
        last.stats = stats;
      }
    }
  }
  state.streamText = "";
  state.streamConvId = null;
  renderMessages();
  save();
}

/* Stop = terminate worker, respawn, hot-reload the model from browser cache. */
function stopGeneration() {
  if (!state.generating) return;
  const conv = state.conversations.find((c) => c.id === state.streamConvId);
  state.generating = false;
  state.streamText = "";
  state.streamConvId = null;
  $("btn-send").hidden = false;
  $("btn-stop").hidden = true;
  spawnWorker();
  setStatus("loading", "reloading model");
  state.loadedModel = null;
  state.worker.postMessage({ cmd: "load", model: state.currentModel });
  renderMessages();
  save();
  toast("Generation stopped");
  if (conv && conv.messages.length && conv.messages[conv.messages.length - 1].role === "assistant"
      && !conv.messages[conv.messages.length - 1].content) {
    conv.messages.pop(); // remove empty assistant bubble
    renderMessages();
    save();
  }
}

function regenerate() {
  const conv = activeConv();
  if (!conv || state.generating) return;
  const msgs = conv.messages;
  if (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return;
  renderMessages();
  save();
  generate({ convId: conv.id });
}

/* ---------------- conversations ---------------- */

function newConversation() {
  const conv = {
    id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title: "New chat",
    created: Date.now(),
    messages: [],
  };
  state.conversations.unshift(conv);
  state.activeId = conv.id;
  renderConvList();
  renderMessages();
  save();
  return conv;
}

function deleteConversation(id) {
  state.conversations = state.conversations.filter((c) => c.id !== id);
  if (state.activeId === id) state.activeId = state.conversations[0]?.id || null;
  renderConvList();
  renderMessages();
  save();
}

let renameTarget = null;
function startRename(id) {
  renameTarget = id;
  const conv = state.conversations.find((c) => c.id === id);
  $("rename-input").value = conv ? conv.title : "";
  $("rename-backdrop").hidden = false;
  $("rename").hidden = false;
  $("rename-input").focus();
  $("rename-input").select();
}
function closeRename() {
  $("rename-backdrop").hidden = true;
  $("rename").hidden = true;
  renameTarget = null;
}

function renderConvList() {
  const list = $("conv-list");
  list.innerHTML = "";
  for (const conv of state.conversations) {
    const row = document.createElement("div");
    row.className = "conv" + (conv.id === state.activeId ? " active" : "");
    row.innerHTML = `
      <span class="conv-title"></span>
      <span class="conv-actions">
        <button class="act-rename" title="Rename">✎</button>
        <button class="act-del danger" title="Delete">🗑</button>
      </span>`;
    row.querySelector(".conv-title").textContent = conv.title;
    row.addEventListener("click", (e) => {
      if (e.target.closest(".act-rename")) { startRename(conv.id); return; }
      if (e.target.closest(".act-del")) { deleteConversation(conv.id); return; }
      state.activeId = conv.id;
      renderConvList();
      renderMessages();
      save();
    });
    list.appendChild(row);
  }
}

/* ---------------- rendering ---------------- */

function renderMessages(streaming = false) {
  const wrap = $("messages");
  const conv = activeConv();
  wrap.innerHTML = "";

  if (!conv || !conv.messages.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.id = "empty-state";
    empty.innerHTML = `
      <div class="empty-glow"></div>
      <h1>Local AI. Zero setup.</h1>
      <p class="empty-byline">Anubhav Gain</p>
      <p>Pick a model and start talking. Weights download once from the Hugging Face CDN and are cached by your browser — after that, inference is instant.</p>
      <div class="empty-chips">
        <button class="chip" data-fill="Explain how transformers work, simply.">Explain transformers</button>
        <button class="chip" data-fill="Write a Python function that finds prime numbers.">Write code</button>
        <button class="chip" data-fill="Give me 5 ideas for a weekend project.">Brainstorm</button>
      </div>`;
    wrap.appendChild(empty);
    empty.querySelectorAll(".chip").forEach((chip) =>
      chip.addEventListener("click", () => { $("input").value = chip.dataset.fill; send(); }));
    return;
  }

  for (const m of conv.messages) {
    wrap.appendChild(buildMessageEl(m, streaming && m === conv.messages[conv.messages.length - 1]));
  }
  wrap.scrollTop = wrap.scrollHeight;
}

function buildMessageEl(m, isStreaming) {
  const el = document.createElement("div");
  el.className = "msg " + m.role;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = m.role === "user" ? "Y" : "◆";

  const body = document.createElement("div");
  body.className = "msg-body";

  const role = document.createElement("div");
  role.className = "msg-role";
  role.textContent = m.role === "user" ? "you" : "assistant";

  const content = document.createElement("div");
  content.className = "msg-content";
  if (m.role === "assistant") {
    content.innerHTML = renderMarkdown(m.content || "");
    if (isStreaming) {
      const cursor = document.createElement("span");
      cursor.className = "cursor";
      content.appendChild(cursor);
    }
  } else {
    const p = document.createElement("p");
    p.textContent = m.content;
    content.appendChild(p);
  }
  if (m.error) content.style.color = "var(--err)";

  body.appendChild(role);
  body.appendChild(content);

  if (m.role === "assistant" && !isStreaming) {
    const tools = document.createElement("div");
    tools.className = "msg-tools";
    if (m.stats) {
      const stats = document.createElement("span");
      stats.className = "msg-stats";
      stats.textContent = `${m.stats.tok_s} tok/s · ${m.stats.n_tok} tok · ttfb ${m.stats.ttfb_s}s`;
      tools.appendChild(stats);
    }
    const copy = document.createElement("button");
    copy.textContent = "copy";
    copy.addEventListener("click", () => {
      navigator.clipboard.writeText(m.content).then(() => toast("Copied"));
    });
    tools.appendChild(copy);
    if (m === activeConv()?.messages[activeConv().messages.length - 1]) {
      const regen = document.createElement("button");
      regen.textContent = "regenerate";
      regen.addEventListener("click", regenerate);
      tools.appendChild(regen);
    }
    body.appendChild(tools);
  }

  el.appendChild(avatar);
  el.appendChild(body);
  return el;
}

function updateStreamingBubble(text) {
  const wrap = $("messages");
  const bubbles = wrap.querySelectorAll(".msg.assistant .msg-content");
  const last = bubbles[bubbles.length - 1];
  if (!last) { renderMessages(true); return; }
  last.innerHTML = renderMarkdown(text);
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  last.appendChild(cursor);
  wrap.scrollTop = wrap.scrollHeight;
}

/* Minimal, safe markdown: escape first, then transform known constructs. */
function renderMarkdown(src) {
  const esc = src
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const codeBlocks = [];
  let text = esc.replace(/```(\w*)\n?([\s\S]*?)(```|$)/g, (_, lang, code) => {
    codeBlocks.push({ lang, code });
    return `\u0000CB${codeBlocks.length - 1}\u0000`;
  });

  text = text
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/^\s*\d+\. (.*)$/gm, "<li>$1</li>")
    .replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>")
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/\*([^*\n]+)\*/g, "<i>$1</i>")
    .replace(/`([^`\n]+)`/g, '<code class="inline">$1</code>')
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />");

  text = "<p>" + text + "</p>";
  text = text.replace(/<p><\/p>/g, "");

  text = text.replace(/\u0000CB(\d+)\u0000/g, (_, i) => {
    const { code } = codeBlocks[Number(i)];
    return `<pre><code>${code.replace(/\n$/, "")}</code></pre>`;
  });
  return text;
}

/* ---------------- model select ---------------- */

function buildModelSelect() {
  const sel = $("model-select");
  sel.innerHTML = "";
  for (const [key, m] of Object.entries(state.models)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${m.label} · ${m.size}`;
    sel.appendChild(opt);
  }
  sel.value = state.currentModel in state.models ? state.currentModel : "qwen3_17b";
  state.currentModel = sel.value;
  updateModelNote();
}

function updateModelNote() {
  const m = state.models[state.currentModel];
  $("model-note").textContent = m ? m.note : "";
}

function updateCtxNote() {
  const m = state.models[state.currentModel];
  if (m) $("ctx-note").textContent = `ctx ${m.n_ctx} · loaded`;
}

/* ---------------- status / toast ---------------- */

function setStatus(stateName, text) {
  const el = $("status");
  el.dataset.state = stateName;
  $("status-text").textContent = text || stateName;
}

let toastTimer = null;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

/* ---------------- export ---------------- */

function exportConversation() {
  const conv = activeConv();
  if (!conv || !conv.messages.length) { toast("Nothing to export"); return; }
  const model = state.models[state.currentModel]?.label || state.currentModel;
  let md = `# ${conv.title}\n\n> model: ${model} · exported ${new Date().toISOString().slice(0, 10)}\n\n`;
  if (state.settings.system) md += `**System:** ${state.settings.system}\n\n`;
  for (const m of conv.messages) {
    md += m.role === "user" ? `## You\n\n${m.content}\n\n` : `## Assistant\n\n${m.content}\n\n`;
  }
  const blob = new Blob([md], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = conv.title.replace(/[^\w\d -]/g, "").slice(0, 40).trim().replace(/\s+/g, "-") + ".md";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------- settings ---------------- */

function openSettings() {
  $("sys-prompt").value = state.settings.system;
  $("temp").value = state.settings.temperature;
  $("maxtok").value = state.settings.max_tokens;
  $("temp-val").textContent = state.settings.temperature;
  $("maxtok-val").textContent = state.settings.max_tokens;
  $("settings-backdrop").hidden = false;
  $("settings").hidden = false;
}
function closeSettings() {
  $("settings-backdrop").hidden = true;
  $("settings").hidden = true;
}

/* ---------------- input helpers ---------------- */

function autosize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 180) + "px";
}

/* ---------------- wire up ---------------- */

function init() {
  load();
  spawnWorker();

  $("btn-new").addEventListener("click", () => newConversation());
  $("btn-send").addEventListener("click", send);
  $("btn-stop").addEventListener("click", stopGeneration);
  $("btn-menu").addEventListener("click", () => $("sidebar").classList.toggle("collapsed"));
  $("btn-export").addEventListener("click", exportConversation);

  $("model-select").addEventListener("change", (e) => {
    state.currentModel = e.target.value;
    updateModelNote();
    updateCtxNote();
    save();
    if (!state.generating) ensureModelLoaded();
  });

  const input = $("input");
  input.addEventListener("input", () => autosize(input));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("settings").hidden) closeSettings();
      else if (!$("rename").hidden) closeRename();
      else if (state.generating) stopGeneration();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      newConversation();
    }
  });

  $("btn-settings").addEventListener("click", openSettings);
  $("btn-settings-close").addEventListener("click", closeSettings);
  $("settings-backdrop").addEventListener("click", closeSettings);
  $("btn-apply-settings").addEventListener("click", () => {
    state.settings.system = $("sys-prompt").value.trim();
    state.settings.temperature = parseFloat($("temp").value);
    state.settings.max_tokens = parseInt($("maxtok").value, 10);
    save();
    closeSettings();
    toast("Settings applied");
  });
  $("btn-reset-settings").addEventListener("click", () => {
    state.settings = { system: "", temperature: 0.7, max_tokens: 768 };
    save();
    openSettings();
    toast("Defaults restored");
  });
  $("temp").addEventListener("input", (e) => { $("temp-val").textContent = e.target.value; });
  $("maxtok").addEventListener("input", (e) => { $("maxtok-val").textContent = e.target.value; });

  $("btn-rename-save").addEventListener("click", () => {
    const conv = state.conversations.find((c) => c.id === renameTarget);
    if (conv && $("rename-input").value.trim()) {
      conv.title = $("rename-input").value.trim().slice(0, 80);
      renderConvList();
      save();
    }
    closeRename();
  });
  $("btn-rename-cancel").addEventListener("click", closeRename);
  $("rename-backdrop").addEventListener("click", closeRename);
  $("rename-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("btn-rename-save").click();
  });

  if (!state.conversations.length) newConversation();
  renderConvList();
  renderMessages();

  if (window.matchMedia && window.matchMedia("(max-width: 860px)").matches) {
    $("sidebar").classList.add("collapsed");
  }
}

init();
