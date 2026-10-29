/**
 * Apple App Attest: proves a request comes from a genuine copy of Mealz on a
 * real iPhone. Each install makes a key in the Secure Enclave, Apple attests it
 * once (`verifyAttestation`), and every scan is signed with it
 * (`verifyAssertion`). The app hashes each challenge string with SHA-256
 * before signing, as `@expo/app-integrity` does.
 * See https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
 */
import { createHash, randomBytes, verify, X509Certificate } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

/** https://www.apple.com/certificateauthority/Apple_App_Attestation_Root_CA.pem */
export const APPLE_APP_ATTEST_ROOT = `-----BEGIN CERTIFICATE-----
MIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYw
JAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwK
QXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNa
Fw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlv
biBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9y
bmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdh
NbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9au
Yen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/
MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYw
CgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn
53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijV
oyFraWVIyd/dganmrduC1bmTBGwD
-----END CERTIFICATE-----`;

/** The certificate extension holding the attestation nonce. */
const NONCE_OID = Buffer.from('06092a864886f763640802', 'hex'); // 1.2.840.113635.100.8.2
const AAGUID_PRODUCTION = Buffer.concat([Buffer.from('appattest'), Buffer.alloc(7)]);
const AAGUID_DEVELOPMENT = Buffer.from('appattestdevelop');

export class AttestError extends Error {}

const sha256 = (...parts: Buffer[]) => {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(part);
  return hash.digest();
};
const fail = (reason: string): never => {
  throw new AttestError(reason);
};

export type AttestConfig = {
  /** `<Team ID>.<bundle ID>`, e.g. `ABCDE12345.com.bitcli.mealz`. */
  appId: string;
  roots?: string[];
  now?: Date;
};

export type AttestedKey = { publicKey: string; environment: 'production' | 'development' };

/** Checks a key's attestation from Apple and returns the key to store. */
export function verifyAttestation(
  attestationBase64: string,
  keyIdBase64: string,
  challenge: string,
  { appId, roots = [APPLE_APP_ATTEST_ROOT], now = new Date() }: AttestConfig,
): AttestedKey {
  const object = decodeCbor(Buffer.from(attestationBase64, 'base64')) as {
    fmt?: unknown;
    attStmt?: { x5c?: unknown };
    authData?: unknown;
  };
  if (object?.fmt !== 'apple-appattest') fail('format');
  const x5c = object.attStmt?.x5c;
  const authData = object.authData;
  if (!Array.isArray(x5c) || x5c.length < 2 || !Buffer.isBuffer(authData)) fail('format');
  const [leaf, intermediate] = (x5c as Buffer[]).map((der) => new X509Certificate(der));

  // 1. The certificates chain up to Apple's App Attest root and are current.
  const trusted = roots.map((pem) => new X509Certificate(pem));
  const current = (c: X509Certificate) =>
    new Date(c.validFrom) <= now && now <= new Date(c.validTo);
  if (!leaf.checkIssued(intermediate) || !leaf.verify(intermediate.publicKey)) fail('chain');
  if (
    !trusted.some((root) => intermediate.checkIssued(root) && intermediate.verify(root.publicKey))
  ) {
    fail('chain');
  }
  if (!current(leaf) || !current(intermediate)) fail('expired');

  // 2. The nonce in the certificate covers this authData and this challenge.
  const clientDataHash = sha256(Buffer.from(challenge));
  const nonce = sha256(authData as Buffer, clientDataHash);
  if (!nonce.equals(certificateNonce(leaf.raw))) fail('nonce');

  // 3. The certified public key is the key the app named.
  const keyId = Buffer.from(keyIdBase64, 'base64');
  const jwk = leaf.publicKey.export({ format: 'jwk' });
  const rawKey = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(jwk.x ?? '', 'base64url'),
    Buffer.from(jwk.y ?? '', 'base64url'),
  ]);
  if (!sha256(rawKey).equals(keyId)) fail('key_id');

  // 4. The authenticator data is for this app, fresh, and for this key.
  const data = parseAuthData(authData as Buffer, appId);
  if (data.counter !== 0) fail('counter');
  const aaguid = (authData as Buffer).subarray(37, 53);
  const environment = aaguid.equals(AAGUID_PRODUCTION)
    ? 'production'
    : aaguid.equals(AAGUID_DEVELOPMENT)
      ? 'development'
      : fail('aaguid');
  const idLength = (authData as Buffer).readUInt16BE(53);
  if (!(authData as Buffer).subarray(55, 55 + idLength).equals(keyId)) fail('credential_id');

  return {
    publicKey: leaf.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    environment,
  };
}

/** Checks a signed request; returns the key's new counter. */
export function verifyAssertion(
  assertionBase64: string,
  clientData: string,
  key: { publicKey: string; counter: number },
  appId: string,
): number {
  const object = decodeCbor(Buffer.from(assertionBase64, 'base64')) as {
    signature?: unknown;
    authenticatorData?: unknown;
  };
  const { signature, authenticatorData } = object ?? {};
  if (!Buffer.isBuffer(signature) || !Buffer.isBuffer(authenticatorData)) fail('format');

  const nonce = sha256(authenticatorData as Buffer, sha256(Buffer.from(clientData)));
  if (!verify('sha256', nonce, key.publicKey, signature as Buffer)) fail('signature');
  const { counter } = parseAuthData(authenticatorData as Buffer, appId);
  if (counter <= key.counter) fail('counter');
  return counter;
}

function parseAuthData(authData: Buffer, appId: string) {
  if (authData.length < 37) fail('auth_data');
  if (!authData.subarray(0, 32).equals(sha256(Buffer.from(appId)))) fail('app_id');
  return { counter: authData.readUInt32BE(33) };
}

/** Reads the nonce from the leaf certificate's 1.2.840.113635.100.8.2 extension. */
function certificateNonce(der: Buffer): Buffer {
  const at = der.indexOf(NONCE_OID);
  if (at < 0) fail('nonce');
  let tlv = readTlv(der, at + NONCE_OID.length);
  if (tlv.tag === 0x01) tlv = readTlv(der, tlv.end); // the optional "critical" flag
  if (tlv.tag !== 0x04) fail('nonce');
  const sequence = readTlv(der, tlv.start); // SEQUENCE {
  const tagged = readTlv(der, sequence.start); //   [1] {
  const octets = readTlv(der, tagged.start); //     OCTET STRING nonce } }
  if (sequence.tag !== 0x30 || tagged.tag !== 0xa1 || octets.tag !== 0x04) fail('nonce');
  return der.subarray(octets.start, octets.end);
}

/** One DER tag-length-value: where its value starts and ends. */
function readTlv(buf: Buffer, offset: number) {
  const tag = buf[offset];
  let length = buf[offset + 1];
  let start = offset + 2;
  if (length & 0x80) {
    const bytes = length & 0x7f;
    if (bytes < 1 || bytes > 3) fail('der');
    length = buf.readUIntBE(start, bytes);
    start += bytes;
  }
  if (start + length > buf.length) fail('der');
  return { tag, start, end: start + length };
}

/** A minimal CBOR decoder: enough for App Attest's maps, arrays, strings and integers. */
export function decodeCbor(buf: Buffer): unknown {
  let pos = 0;
  const length = (info: number) => {
    if (info < 24) return info;
    const size = { 24: 1, 25: 2, 26: 4 }[info] ?? fail('cbor');
    if (pos + size > buf.length) fail('cbor');
    const value = buf.readUIntBE(pos, size);
    pos += size;
    return value;
  };
  const take = (n: number) => {
    if (pos + n > buf.length) fail('cbor');
    pos += n;
    return buf.subarray(pos - n, pos);
  };
  const item = (depth: number): unknown => {
    if (depth > 8 || pos >= buf.length) fail('cbor');
    const byte = buf[pos++];
    const n = length(byte & 0x1f);
    switch (byte >> 5) {
      case 0:
        return n;
      case 2:
        return Buffer.from(take(n));
      case 3:
        return take(n).toString('utf8');
      case 4:
        return Array.from({ length: n }, () => item(depth + 1));
      case 5: {
        const map: Record<string, unknown> = {};
        for (let i = 0; i < n; i++) map[String(item(depth + 1))] = item(depth + 1);
        return map;
      }
      default:
        return fail('cbor');
    }
  };
  try {
    return item(0);
  } catch (e) {
    if (e instanceof AttestError) throw e;
    throw new AttestError('cbor');
  }
}

const CHALLENGE_TTL_MS = 5 * 60_000;
/** Far above real use; stops anyone filling the database with challenges. */
const MAX_OPEN_CHALLENGES = 10_000;

/** One-time challenges and attested keys, in SQLite next to the scan counts. */
export class AttestStore {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS challenges (
        challenge TEXT PRIMARY KEY,
        expires INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_keys (
        key_id TEXT PRIMARY KEY,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL,
        environment TEXT NOT NULL,
        created TEXT NOT NULL
      )`);
  }

  /** A fresh single-use challenge, or null when too many are open. */
  newChallenge(now = Date.now()): string | null {
    const open = this.db
      .prepare('SELECT COUNT(*) AS n FROM challenges WHERE expires >= ?')
      .get(now) as { n: number };
    if (open.n >= MAX_OPEN_CHALLENGES) return null;
    const challenge = randomBytes(32).toString('base64url');
    this.db
      .prepare('INSERT INTO challenges (challenge, expires) VALUES (?, ?)')
      .run(challenge, now + CHALLENGE_TTL_MS);
    return challenge;
  }

  /** Uses up a challenge; true if it was issued here and hasn't expired. */
  takeChallenge(challenge: string, now = Date.now()): boolean {
    const row = this.db
      .prepare('DELETE FROM challenges WHERE challenge = ? RETURNING expires')
      .get(challenge) as { expires: number } | undefined;
    return row !== undefined && row.expires >= now;
  }

  saveKey(keyId: string, key: AttestedKey, now = new Date()) {
    this.db
      .prepare(
        `INSERT INTO app_keys (key_id, public_key, counter, environment, created)
         VALUES (?, ?, 0, ?, ?)
         ON CONFLICT (key_id) DO NOTHING`,
      )
      .run(keyId, key.publicKey, key.environment, now.toISOString());
  }

  getKey(keyId: string): { publicKey: string; counter: number } | null {
    const row = this.db
      .prepare('SELECT public_key, counter FROM app_keys WHERE key_id = ?')
      .get(keyId) as { public_key: string; counter: number } | undefined;
    return row ? { publicKey: row.public_key, counter: row.counter } : null;
  }

  setCounter(keyId: string, counter: number) {
    this.db.prepare('UPDATE app_keys SET counter = ? WHERE key_id = ?').run(counter, keyId);
  }

  prune(now = Date.now()) {
    this.db.prepare('DELETE FROM challenges WHERE expires < ?').run(now);
  }
}
