/* agent-fleet / chat — model worker.
   Runs llama.cpp via WebAssembly (wllama) inside a Web Worker so the UI
   thread never blocks. One model loaded at a time; the UI swaps models by
   asking for a reload. Weights stream from the HF CDN once, then come from
   the browser cache.

   Protocol (UI -> worker):
     { cmd: "load", model: <id> }
     { cmd: "gen", messages: [{role, content}...], system, opts }
   Protocol (worker -> UI):
     { cmd: "progress", loaded, total, model }   // download bytes
     { cmd: "ready", model }
     { cmd: "tok", v }                            // streamed token
     { cmd: "done", stats }
     { cmd: "error", error }
*/
import { Wllama } from "https://cdn.jsdelivr.net/npm/@wllama/wllama@3.6.1/esm/index.min.js";

const CDN = "https://cdn.jsdelivr.net/npm/@wllama/wllama@3.6.1/esm";
const CONFIG_PATHS = { default: `${CDN}/wasm/wllama.wasm` };

const MODELS = {
  qwen3_06b: {
    repo: "bartowski/Qwen_Qwen3-0.6B-GGUF",
    file: "Qwen_Qwen3-0.6B-Q4_K_M.gguf",
    n_ctx: 2048,
    family: "qwen3",
    label: "Qwen3 0.6B",
    size: "397 MB",
    note: "Fastest — snappy short answers",
  },
  qwen3_17b: {
    repo: "unsloth/Qwen3-1.7B-GGUF",
    file: "Qwen3-1.7B-Q4_K_M.gguf",
    n_ctx: 4096,
    family: "qwen3",
    label: "Qwen3 1.7B",
    size: "1.1 GB",
    note: "Best quality — recommended",
  },
  qwen25_15b: {
    repo: "bartowski/Qwen2.5-1.5B-Instruct-GGUF",
    file: "Qwen2.5-1.5B-Instruct-Q4_K_M.gguf",
    n_ctx: 4096,
    family: "chatml",
    label: "Qwen2.5 1.5B",
    size: "1.0 GB",
    note: "Balanced instruct model",
  },
  qwen25_05b: {
    repo: "bartowski/Qwen2.5-0.5B-Instruct-GGUF",
    file: "Qwen2.5-0.5B-Instruct-Q4_K_M.gguf",
    n_ctx: 2048,
    family: "chatml",
    label: "Qwen2.5 0.5B",
    size: "400 MB",
    note: "Ultra-light assistant",
  },
  llama32_1b: {
    repo: "unsloth/Llama-3.2-1B-Instruct-GGUF",
    file: "Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    n_ctx: 4096,
    family: "llama3",
    label: "Llama 3.2 1B",
    size: "808 MB",
    note: "Meta's edge model",
  },
};

let wllama = null;
let loadedKey = null;

const post = (msg) => self.postMessage(msg);

/* ---- prompt templates per model family ---- */

function tplQwen(messages, system, noThink) {
  let out = "";
  if (system) out += `<|im_start|>system\n${system}<|im_end|>\n`;
  for (const m of messages) {
    let content = m.content;
    if (noThink && m === messages[messages.length - 1] && m.role === "user") {
      content += " /no_think";
    }
    out += `<|im_start|>${m.role}\n${content}<|im_end|>\n`;
  }
  out += `<|im_start|>assistant\n`;
  return { prompt: out, stop: ["<|im_end|>"] };
}

function tplLlama(messages, system) {
  let out = "<|begin_of_text|>";
  if (system) {
    out += `<|start_header_id|>system<|end_header_id|>\n\n${system}<|eot_id|>`;
  }
  for (const m of messages) {
    out += `<|start_header_id|>${m.role}<|end_header_id|>\n\n${m.content}<|eot_id|>`;
  }
  out += `<|start_header_id|>assistant<|end_header_id|>\n\n`;
  return { prompt: out, stop: ["<|eot_id|>", "<|start_header_id|>"] };
}

function buildPrompt(model, messages, system) {
  if (model.family === "llama3") return tplLlama(messages, system);
  return tplQwen(messages, system, model.family === "qwen3");
}

self.onmessage = async (ev) => {
  const { cmd } = ev.data;

  if (cmd === "models") {
    post({ cmd: "models", models: MODELS });
    return;
  }

  if (cmd === "load") {
    const key = ev.data.model;
    const model = MODELS[key];
    if (!model) { post({ cmd: "error", error: `unknown model ${key}` }); return; }
    try {
      if (wllama && loadedKey === key) { post({ cmd: "ready", model: key }); return; }
      if (wllama) { try { await wllama.exit(); } catch (_) {} wllama = null; }
      wllama = new Wllama(CONFIG_PATHS, { parallelDownloads: 3 });
      await wllama.loadModelFromHF(
        { repo: model.repo, file: model.file },
        {
          n_ctx: model.n_ctx,
          log_level: 4,
          progressCallback: ({ loaded, total }) => {
            post({ cmd: "progress", loaded, total, model: key });
          },
        },
      );
      loadedKey = key;
      post({ cmd: "ready", model: key });
    } catch (e) {
      wllama = null; loadedKey = null;
      post({ cmd: "error", error: String((e && e.message) || e) });
    }
    return;
  }

  if (cmd === "gen") {
    if (!wllama || !loadedKey) { post({ cmd: "error", error: "model not loaded" }); return; }
    const model = MODELS[loadedKey];
    const { messages, system, opts } = ev.data;
    const { prompt, stop } = buildPrompt(model, messages, system || model.defaultSystem);
    const t0 = performance.now();
    let ttfb = null, nTok = 0;
    try {
      await wllama.createCompletion({
        prompt,
        stream: true,
        max_tokens: (opts && opts.max_tokens) || 768,
        temperature: (opts && opts.temperature) ?? 0.7,
        top_p: 0.9,
        stop,
        onData: (chunk) => {
          const piece = (chunk.choices && chunk.choices[0] && chunk.choices[0].text) || "";
          if (!piece) return;
          if (ttfb === null) ttfb = (performance.now() - t0) / 1000;
          nTok += 1;
          post({ cmd: "tok", v: piece });
        },
      });
      const dt = (performance.now() - t0) / 1000;
      post({
        cmd: "done",
        stats: {
          ttfb_s: Math.round((ttfb ?? dt) * 1000) / 1000,
          tok_s: dt > 0 ? Math.round((nTok / dt) * 10) / 10 : 0,
          n_tok: nTok,
          elapsed_s: Math.round(dt * 10) / 10,
        },
      });
    } catch (e) {
      post({ cmd: "error", error: String((e && e.message) || e) });
    }
    return;
  }
};
