/* Shared model catalog. The page paints the picker from this file.
   The worker imports the same list, so labels and repos cannot drift. */

export const MODELS = {
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
