// The model only runs inside the phone app.
export const llmAvailable = false;
export async function loadModel(_path: string, _onProgress?: (pct: number) => void): Promise<void> {
  throw new Error('The assistant model runs in the phone app.');
}
export async function unloadModel() {}
export const loadedModelPath = () => null as string | null;
export async function complete(_s: string, _u: string, _g: string): Promise<{ text: string; ms: number }> {
  throw new Error('No model loaded');
}
