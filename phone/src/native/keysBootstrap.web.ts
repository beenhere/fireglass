/** Web preview: no raw TCP, so the TV's key sender can't be started from here. */
export const canBootstrapKeys = false;
export type BootstrapStatus = 'key' | 'connecting' | 'approve' | 'starting';

export async function bootstrapKeys(_host: string, _port: number, _cmd: string, _onStatus?: (s: BootstrapStatus) => void): Promise<void> {
  throw new Error('Starting key presses needs the phone app.');
}
