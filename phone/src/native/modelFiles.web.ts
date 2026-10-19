import type { ModelSpec } from '@/lib/models';

// Web preview: models can't run in a browser. Everything reports "not downloaded".
export const modelPath = (m: ModelSpec) => m.file;
export const isDownloaded = (_m: ModelSpec) => false;
export const freeSpace = () => null as number | null;
export const pausedBytes = (_m: ModelSpec) => null as number | null;
export type Progress = { written: number; total: number };
export class ModelDownload {
  constructor(private m: ModelSpec, private onProgress: (p: Progress) => void) {}
  async run(): Promise<boolean> { throw new Error('Models download in the phone app, not on the web.'); }
  async pause() {}
  cancel() {}
}
export function deleteModel(_m: ModelSpec) {}
