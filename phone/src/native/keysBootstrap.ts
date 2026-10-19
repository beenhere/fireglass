/**
 * Starting the TV's key sender (contract: GET /api/keys/bootstrap, then run its `cmd` over the
 * TV's network ADB on `adb_port` with this phone's own RSA key). Fire OS refuses adb connections
 * made from the stick itself, so the phone does it, once per TV boot.
 *
 * Just enough of the ADB wire protocol: CNXN, AUTH (token signature, else offer our public key,
 * which makes the TV ask "Allow USB debugging?"), then OPEN "shell:<cmd>" and read until CLSE.
 */
import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import forge from 'node-forge';
import TcpSocket from 'react-native-tcp-socket';
import { secure } from './storage';

export const canBootstrapKeys = true;

export type BootstrapStatus = 'key' | 'connecting' | 'approve' | 'starting';

const CNXN = 0x4e584e43, AUTH = 0x48545541, OPEN = 0x4e45504f, OKAY = 0x59414b4f, CLSE = 0x45534c43, WRTE = 0x45545257;
const AUTH_TOKEN = 1, AUTH_SIGNATURE = 2, AUTH_RSAPUBLICKEY = 3;
const KEY_NAME = 'adb_private_key';

type Msg = { cmd: number; a0: number; a1: number; data: Buffer };

export async function bootstrapKeys(host: string, port: number, cmd: string,
                                    onStatus: (s: BootstrapStatus) => void = () => {}): Promise<void> {
  onStatus('key');
  const key = await loadKey();
  onStatus('connecting');
  const conn = await Conn.open(host, port);
  try {
    conn.send(CNXN, 0x01000000, 4096, Buffer.from('host::\0'));
    let tries = 0;
    for (;;) {
      const m = await conn.next(tries >= 2 ? 65_000 : 10_000);
      if (m.cmd === CNXN) break;
      if (m.cmd !== AUTH || m.a0 !== AUTH_TOKEN) continue;
      if (tries === 0) {
        conn.send(AUTH, AUTH_SIGNATURE, 0, sign(key, m.data));
      } else if (tries === 1) {
        // Not known to this TV yet: offer the key. The TV now asks the person to allow it.
        conn.send(AUTH, AUTH_RSAPUBLICKEY, 0, publicKey(key));
        onStatus('approve');
      } else {
        throw new Error('The TV didn’t accept this phone. Try again and choose Allow on the TV.');
      }
      tries++;
    }
    onStatus('starting');
    conn.send(OPEN, 1, 0, Buffer.from(`shell:${cmd}\0`));
    for (;;) {
      const m = await conn.next(15_000);
      if (m.cmd === WRTE) conn.send(OKAY, 1, m.a0, Buffer.alloc(0));
      else if (m.cmd === CLSE) { conn.send(CLSE, 1, m.a0, Buffer.alloc(0)); return; }
    }
  } finally {
    conn.close();
  }
}

// ---------------------------------------------------------------- crypto

/** This phone's adb key (RSA 2048), made once and kept in secure storage. */
async function loadKey(): Promise<forge.pki.rsa.PrivateKey> {
  const pem = await secure.get(KEY_NAME);
  if (pem) return forge.pki.privateKeyFromPem(pem);
  // Hermes has no secure RNG for forge; seed it from the platform's.
  (forge.random as unknown as { collect(bytes: string): void }).collect(Buffer.from(await Crypto.getRandomBytesAsync(64)).toString('binary'));
  const pair = await new Promise<forge.pki.rsa.KeyPair>((res, rej) =>
    // With a callback and no workers, forge generates in small steps and keeps the UI responsive.
    forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001, workers: -1 }, (err, kp) => (err ? rej(err) : res(kp))));
  await secure.set(KEY_NAME, forge.pki.privateKeyToPem(pair.privateKey));
  return pair.privateKey;
}

/** adbd checks the 20-byte token as if it were a SHA-1 digest: PKCS#1 v1.5 over its DigestInfo. */
function sign(key: forge.pki.rsa.PrivateKey, token: Buffer): Buffer {
  const md = { algorithm: 'sha1', digest: () => forge.util.createBuffer(token.toString('binary')) };
  return Buffer.from(key.sign(md as unknown as forge.md.MessageDigest), 'binary');
}

/** The key in adbd's format: Android's mincrypt RSAPublicKey struct, base64, then a name. */
function publicKey(key: forge.pki.rsa.PrivateKey): Buffer {
  const BI = forge.jsbn.BigInteger;
  const n = key.n;
  const r32 = BI.ONE.shiftLeft(32);
  const n0inv = r32.subtract(n.mod(r32).modInverse(r32)).mod(r32);
  const rr = BI.ONE.shiftLeft(4096).mod(n);
  const word = (x: forge.jsbn.BigInteger, i: number) => parseInt(x.shiftRight(32 * i).mod(r32).toString(16), 16) >>> 0;
  const b = Buffer.alloc(4 + 4 + 256 + 256 + 4);
  b.writeUInt32LE(64, 0);
  b.writeUInt32LE(word(n0inv, 0), 4);
  for (let i = 0; i < 64; i++) b.writeUInt32LE(word(n, i), 8 + 4 * i);
  for (let i = 0; i < 64; i++) b.writeUInt32LE(word(rr, i), 264 + 4 * i);
  b.writeUInt32LE(key.e.intValue(), 520);
  return Buffer.from(`${b.toString('base64')} tvhome-phone\0`);
}

// ---------------------------------------------------------------- socket

class Conn {
  private buf = Buffer.alloc(0);
  private waiting: { resolve: (m: Msg) => void; reject: (e: Error) => void } | null = null;
  private error: Error | null = null;

  private constructor(private sock: ReturnType<typeof TcpSocket.createConnection>) {
    sock.on('data', (d) => { this.buf = Buffer.concat([this.buf, typeof d === 'string' ? Buffer.from(d) : Buffer.from(d)]); this.pump(); });
    sock.on('error', (e) => this.fail(new Error(`Can’t reach the TV’s debugging port (${e.message})`)));
    sock.on('close', () => this.fail(new Error('The TV closed the connection')));
  }

  static open(host: string, port: number): Promise<Conn> {
    return new Promise((resolve, reject) => {
      const sock = TcpSocket.createConnection({ host, port }, () => resolve(conn));
      const conn = new Conn(sock);
      sock.once('error', reject);
    });
  }

  send(cmd: number, a0: number, a1: number, data: Buffer) {
    let sum = 0;
    for (const x of data) sum += x;
    const h = Buffer.alloc(24);
    h.writeUInt32LE(cmd, 0); h.writeUInt32LE(a0 >>> 0, 4); h.writeUInt32LE(a1 >>> 0, 8);
    h.writeUInt32LE(data.length, 12); h.writeUInt32LE(sum >>> 0, 16); h.writeUInt32LE((cmd ^ 0xffffffff) >>> 0, 20);
    this.sock.write(Buffer.concat([h, data]));
  }

  next(timeoutMs: number): Promise<Msg> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.waiting = null; reject(new Error('The TV didn’t answer in time')); }, timeoutMs);
      this.waiting = {
        resolve: (m) => { clearTimeout(t); resolve(m); },
        reject: (e) => { clearTimeout(t); reject(e); },
      };
      this.pump();
    });
  }

  close() { this.sock.destroy(); }

  private pump() {
    if (!this.waiting) return;
    if (this.buf.length >= 24) {
      const len = this.buf.readUInt32LE(12);
      if (this.buf.length >= 24 + len) {
        const m = { cmd: this.buf.readUInt32LE(0), a0: this.buf.readUInt32LE(4), a1: this.buf.readUInt32LE(8), data: this.buf.subarray(24, 24 + len) };
        this.buf = this.buf.subarray(24 + len);
        const w = this.waiting; this.waiting = null; w.resolve(m);
        return;
      }
    }
    if (this.error) { const w = this.waiting; this.waiting = null; w.reject(this.error); }
  }

  private fail(e: Error) { if (!this.error) this.error = e; this.pump(); }
}
