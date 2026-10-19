import { Platform } from 'react-native';
import { initLlama, type LlamaContext } from 'llama.rn';

let ctx: LlamaContext | null = null;
let loadedPath: string | null = null;
let loading: Promise<LlamaContext> | null = null;

export const llmAvailable = true;

/** Loads (or reuses) the model at `path`. `onProgress` gets 0..100. */
export async function loadModel(path: string, onProgress?: (pct: number) => void): Promise<void> {
  if (ctx && loadedPath === path) return;
  if (loading && loadedPath === path) { await loading; return; }
  await unloadModel();
  loadedPath = path;
  loading = initLlama(
    {
      model: path,
      n_ctx: 2048,
      n_batch: 512,
      // Metal on iOS; CPU on Android (OpenCL only helps on recent Adreno GPUs and can misbehave elsewhere).
      n_gpu_layers: Platform.OS === 'ios' ? 99 : 0,
      use_mlock: false,
      use_mmap: true,
    },
    onProgress,
  );
  try {
    ctx = await loading;
  } catch (e) {
    loadedPath = null;
    throw e;
  } finally {
    loading = null;
  }
}

export async function unloadModel() {
  const c = ctx;
  ctx = null;
  loadedPath = null;
  if (c) await c.release();
}

export const loadedModelPath = () => (ctx ? loadedPath : null);

/** One grammar-constrained chat completion. Returns the raw text. */
export async function complete(system: string, user: string, grammar: string): Promise<{ text: string; ms: number }> {
  if (!ctx) throw new Error('No model loaded');
  const t0 = Date.now();
  const res = await ctx.completion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    grammar,
    n_predict: 120,
    temperature: 0,
    top_k: 1,
    enable_thinking: false,
    stop: ['<|im_end|>', '<|endoftext|>', '<|eot_id|>', '<|end_of_text|>'],
  });
  return { text: res.text ?? '', ms: Date.now() - t0 };
}
