import { Directory, DownloadTask, File, Paths, type DownloadPauseState } from 'expo-file-system';
import type { ModelSpec } from '@/lib/models';
import { readJson, writeJson } from './storage';

const dir = () => {
  const d = new Directory(Paths.document, 'models');
  if (!d.exists) d.create({ intermediates: true });
  return d;
};
const fileFor = (m: ModelSpec) => new File(dir(), m.file);

export const modelPath = (m: ModelSpec) => fileFor(m).uri;
export const isDownloaded = (m: ModelSpec) => {
  const f = fileFor(m);
  return f.exists && f.size === m.bytes;
};
export const freeSpace = () => {
  try { return Paths.availableDiskSpace; } catch { return null; }
};

type Saved = Record<string, { state: DownloadPauseState; bytes: number }>;
const SAVED = 'downloads.json';
const saved = () => readJson<Saved>(SAVED, {});
const save = (id: string, v: Saved[string] | null) => {
  const s = saved();
  if (v) s[id] = v; else delete s[id];
  writeJson(SAVED, s);
};

/** Bytes already fetched for a paused download, or null. */
export const pausedBytes = (m: ModelSpec) => saved()[m.id]?.bytes ?? null;

export type Progress = { written: number; total: number };

/**
 * One model download: start, pause (kept across app restarts), resume, cancel.
 * `done` resolves true when the file is in place, false when paused or cancelled.
 */
export class ModelDownload {
  private task: DownloadTask;
  private last: Progress;
  constructor(private m: ModelSpec, private onProgress: (p: Progress) => void) {
    const prior = saved()[m.id];
    this.last = { written: prior?.bytes ?? 0, total: m.bytes };
    const opts = {
      onProgress: ({ bytesWritten, totalBytes }: { bytesWritten: number; totalBytes: number }) => {
        this.last = { written: bytesWritten, total: totalBytes > 0 ? totalBytes : m.bytes };
        onProgress(this.last);
      },
    };
    this.task = prior
      ? DownloadTask.fromSavable(prior.state, opts)
      : File.createDownloadTask(m.url, fileFor(m), opts);
  }

  async run(): Promise<boolean> {
    const f = this.task.state === 'paused' ? await this.task.resumeAsync() : await this.task.downloadAsync();
    if (!f) return false; // paused
    save(this.m.id, null);
    if (f.size !== this.m.bytes) {
      try { f.delete(); } catch {}
      throw new Error('The download was incomplete. Try again.');
    }
    return true;
  }

  async pause() {
    await this.task.pauseAsync();
    try { save(this.m.id, { state: this.task.savable(), bytes: this.last.written }); } catch {}
  }

  cancel() {
    this.task.cancel();
    save(this.m.id, null);
    try { const f = fileFor(this.m); if (f.exists) f.delete(); } catch {}
  }
}

export function deleteModel(m: ModelSpec) {
  save(m.id, null);
  const f = fileFor(m);
  if (f.exists) f.delete();
}
