/** Models the assistant can run on the phone. URLs and sizes checked against Hugging Face (Oct 2026). */
export type ModelSpec = {
  id: string;
  name: string;
  maker: string;
  blurb: string;
  file: string;
  url: string;
  bytes: number;
  ramHint: string;
  license: string;
  recommended?: boolean;
};

export const MODELS: ModelSpec[] = [
  {
    id: 'qwen2.5-1.5b',
    name: 'Qwen2.5 1.5B Instruct',
    maker: 'Alibaba Qwen',
    blurb: 'Best at understanding loose requests. Good on most phones from the last few years.',
    file: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    bytes: 1_117_320_736,
    ramHint: 'Needs about 2 GB of free memory',
    license: 'Apache 2.0',
    recommended: true,
  },
  {
    id: 'lfm2.5-1.2b',
    name: 'LFM2.5 1.2B Instruct',
    maker: 'Liquid AI',
    blurb: 'Built for phones: quick to answer and lighter on memory.',
    file: 'LFM2.5-1.2B-Instruct-Q4_K_M.gguf',
    url: 'https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF/resolve/main/LFM2.5-1.2B-Instruct-Q4_K_M.gguf',
    bytes: 730_895_168,
    ramHint: 'Needs about 1.2 GB of free memory',
    license: 'LFM Open License 1.0',
  },
  {
    id: 'qwen2.5-0.5b',
    name: 'Qwen2.5 0.5B Instruct',
    maker: 'Alibaba Qwen',
    blurb: 'Small and fast for older phones. Handles simple requests well.',
    file: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    bytes: 491_400_032,
    ramHint: 'Needs about 800 MB of free memory',
    license: 'Apache 2.0',
  },
];

export const modelById = (id: string | null | undefined) => MODELS.find((m) => m.id === id) ?? null;

export function formatBytes(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${Math.round(n / 1e6)} MB`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} KB`;
  return `${n} B`;
}
