/**
 * App Attest checks against a stand-in for Apple: a root, intermediate and
 * leaf certificate made with openssl, shaped like Apple's.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  createHash,
  generateKeyPairSync,
  sign,
  X509Certificate,
  type KeyObject,
} from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { before, test } from 'node:test';

import { createApp } from '../src/app.ts';
import {
  AttestError,
  AttestStore,
  decodeCbor,
  verifyAssertion,
  verifyAttestation,
} from '../src/attest.ts';
import { ScanCounter } from '../src/limits.ts';

const APP_ID = 'TEAM123456.com.bitcli.mealz';
const sha256 = (...parts: Buffer[]) => {
  const h = createHash('sha256');
  parts.forEach((p) => h.update(p));
  return h.digest();
};

/** A minimal CBOR encoder for building test objects. */
function cbor(value: unknown): Buffer {
  const head = (major: number, n: number) =>
    n < 24
      ? Buffer.from([(major << 5) | n])
      : n < 256
        ? Buffer.from([(major << 5) | 24, n])
        : n < 65536
          ? Buffer.from([(major << 5) | 25, n >> 8, n & 255])
          : Buffer.concat([
              Buffer.from([(major << 5) | 26]),
              Buffer.from(new Uint32Array([n]).buffer).reverse(),
            ]);
  if (typeof value === 'number') return head(0, value);
  if (Buffer.isBuffer(value)) return Buffer.concat([head(2, value.length), value]);
  if (typeof value === 'string') {
    const b = Buffer.from(value);
    return Buffer.concat([head(3, b.length), b]);
  }
  if (Array.isArray(value)) return Buffer.concat([head(4, value.length), ...value.map(cbor)]);
  const entries = Object.entries(value as object);
  return Buffer.concat([
    head(5, entries.length),
    ...entries.flatMap(([k, v]) => [cbor(k), cbor(v)]),
  ]);
}

const openssl = (dir: string, ...args: string[]) =>
  execFileSync('openssl', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });

type Device = {
  rootPem: string;
  keyId: string;
  privateKey: KeyObject;
  attest: (challenge: string, options?: { aaguid?: Buffer; appId?: string }) => string;
  assert: (clientData: string, counter: number, appId?: string) => string;
};

let dir: string;
let device: Device;

/** A stand-in for a device's Secure Enclave key, attested by a fake Apple CA. */
function makeDevice(): Device {
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  writeFileSync(join(dir, 'leaf.key'), keys.privateKey.export({ type: 'pkcs8', format: 'pem' }));
  const jwk = keys.publicKey.export({ format: 'jwk' });
  const rawKey = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(jwk.x!, 'base64url'),
    Buffer.from(jwk.y!, 'base64url'),
  ]);
  const keyIdBytes = sha256(rawKey);
  const rootPem = new X509Certificate(openssl(dir, 'x509', '-in', 'root.pem')).toString();
  const intermediate = new X509Certificate(openssl(dir, 'x509', '-in', 'inter.pem'));

  return {
    rootPem,
    keyId: keyIdBytes.toString('base64'),
    privateKey: keys.privateKey,
    attest(challenge, { aaguid = Buffer.from('appattestdevelop'), appId = APP_ID } = {}) {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(keyIdBytes.length);
      const authData = Buffer.concat([
        sha256(Buffer.from(appId)),
        Buffer.from([0x40]),
        Buffer.alloc(4), // counter 0
        aaguid,
        length,
        keyIdBytes,
      ]);
      const nonce = sha256(authData, sha256(Buffer.from(challenge)));
      writeFileSync(
        join(dir, 'leaf.cnf'),
        `1.2.840.113635.100.8.2=DER:3024a1220420${nonce.toString('hex')}\n`,
      );
      openssl(dir, 'req', '-new', '-key', 'leaf.key', '-subj', '/CN=leaf', '-out', 'leaf.csr');
      openssl(
        dir,
        'x509',
        '-req',
        '-in',
        'leaf.csr',
        '-CA',
        'inter.pem',
        '-CAkey',
        'inter.key',
        '-CAcreateserial',
        '-days',
        '30',
        '-extfile',
        'leaf.cnf',
        '-out',
        'leaf.pem',
      );
      const leaf = new X509Certificate(openssl(dir, 'x509', '-in', 'leaf.pem'));
      return cbor({
        fmt: 'apple-appattest',
        attStmt: { x5c: [leaf.raw, intermediate.raw], receipt: Buffer.from('receipt') },
        authData,
      }).toString('base64');
    },
    assert(clientData, counter, appId = APP_ID) {
      const count = Buffer.alloc(4);
      count.writeUInt32BE(counter);
      const authenticatorData = Buffer.concat([
        sha256(Buffer.from(appId)),
        Buffer.from([0x40]),
        count,
      ]);
      const nonce = sha256(authenticatorData, sha256(Buffer.from(clientData)));
      return cbor({
        signature: sign('sha256', nonce, keys.privateKey),
        authenticatorData,
      }).toString('base64');
    },
  };
}

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'attest-'));
  writeFileSync(
    join(dir, 'ca.cnf'),
    'basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign\n',
  );
  openssl(dir, 'ecparam', '-name', 'secp384r1', '-genkey', '-noout', '-out', 'root.key');
  openssl(
    dir,
    'req',
    '-x509',
    '-new',
    '-key',
    'root.key',
    '-subj',
    '/CN=Test Root',
    '-days',
    '365',
    '-addext',
    'basicConstraints=critical,CA:TRUE',
    '-addext',
    'keyUsage=critical,keyCertSign',
    '-out',
    'root.pem',
  );
  openssl(dir, 'ecparam', '-name', 'secp384r1', '-genkey', '-noout', '-out', 'inter.key');
  openssl(
    dir,
    'req',
    '-new',
    '-key',
    'inter.key',
    '-subj',
    '/CN=Test Intermediate',
    '-out',
    'inter.csr',
  );
  openssl(
    dir,
    'x509',
    '-req',
    '-in',
    'inter.csr',
    '-CA',
    'root.pem',
    '-CAkey',
    'root.key',
    '-CAcreateserial',
    '-days',
    '365',
    '-extfile',
    'ca.cnf',
    '-out',
    'inter.pem',
  );
  device = makeDevice();
});

const config = () => ({ appId: APP_ID, roots: [device.rootPem] });
const rejects = (fn: () => unknown, reason: string) =>
  assert.throws(fn, (e: unknown) => e instanceof AttestError && e.message === reason);

test('accepts a genuine attestation and reports its environment', () => {
  const dev = verifyAttestation(device.attest('c1'), device.keyId, 'c1', config());
  assert.equal(dev.environment, 'development');
  assert.match(dev.publicKey, /BEGIN PUBLIC KEY/);
  const aaguid = Buffer.concat([Buffer.from('appattest'), Buffer.alloc(7)]);
  const prod = verifyAttestation(device.attest('c2', { aaguid }), device.keyId, 'c2', config());
  assert.equal(prod.environment, 'production');
});

test('rejects attestations that do not match', () => {
  const attestation = device.attest('c1');
  rejects(() => verifyAttestation(attestation, device.keyId, 'other', config()), 'nonce');
  rejects(() => verifyAttestation(attestation, device.keyId, 'c1', { appId: APP_ID }), 'chain');
  rejects(
    () =>
      verifyAttestation(attestation, sha256(Buffer.from('x')).toString('base64'), 'c1', config()),
    'key_id',
  );
  rejects(
    () =>
      verifyAttestation(device.attest('c3', { appId: 'OTHER.app' }), device.keyId, 'c3', config()),
    'app_id',
  );
  rejects(
    () =>
      verifyAttestation(
        device.attest('c4', { aaguid: Buffer.alloc(16) }),
        device.keyId,
        'c4',
        config(),
      ),
    'aaguid',
  );
  rejects(
    () =>
      verifyAttestation(attestation, device.keyId, 'c1', {
        ...config(),
        now: new Date('2099-01-01'),
      }),
    'expired',
  );
  rejects(() => verifyAttestation('bm90IGNib3I=', device.keyId, 'c1', config()), 'cbor');
  rejects(
    () =>
      verifyAttestation(cbor({ fmt: 'packed' }).toString('base64'), device.keyId, 'c1', config()),
    'format',
  );
});

test('accepts signed requests only with a rising counter', () => {
  const { publicKey } = verifyAttestation(device.attest('c1'), device.keyId, 'c1', config());
  const key = { publicKey, counter: 0 };
  assert.equal(verifyAssertion(device.assert('scan-1', 1), 'scan-1', key, APP_ID), 1);
  rejects(
    () => verifyAssertion(device.assert('scan-1', 1), 'scan-1', { publicKey, counter: 1 }, APP_ID),
    'counter',
  );
  rejects(() => verifyAssertion(device.assert('scan-1', 2), 'scan-2', key, APP_ID), 'signature');
  rejects(
    () => verifyAssertion(device.assert('scan-1', 2, 'OTHER.app'), 'scan-1', key, APP_ID),
    'app_id',
  );
  const stranger = makeDevice();
  rejects(() => verifyAssertion(stranger.assert('scan-1', 2), 'scan-1', key, APP_ID), 'signature');
  device = stranger;
});

test('decodes CBOR and rejects truncated input', () => {
  assert.deepEqual(decodeCbor(cbor({ a: [1, 'x', Buffer.from([1, 2])] })), {
    a: [1, 'x', Buffer.from([1, 2])],
  });
  rejects(() => decodeCbor(cbor({ a: 'hello' }).subarray(0, 5)), 'cbor');
});

test('challenges are single use and expire', () => {
  const store = new AttestStore(':memory:');
  const challenge = store.newChallenge(0)!;
  assert.equal(store.takeChallenge(challenge, 1000), true);
  assert.equal(store.takeChallenge(challenge, 1000), false);
  const old = store.newChallenge(0)!;
  assert.equal(store.takeChallenge(old, 10 * 60_000), false);
  assert.equal(store.takeChallenge('made-up'), false);
});

test('the API attests a key once, then serves only signed scans', async () => {
  const store = new AttestStore(':memory:');
  const logs: Record<string, unknown>[] = [];
  const app = createApp({
    read: async () => ({
      recipe: {
        title: 'Toast',
        description: null,
        servings: null,
        prepMinutes: null,
        cookMinutes: null,
        ingredients: ['1 slice bread'],
        steps: ['Toast the bread.'],
        notes: [],
      },
      usage: { inputTokens: 1, outputTokens: 1 },
    }),
    counter: new ScanCounter(':memory:'),
    limits: { perInstall: 1, total: 100 },
    enabled: () => true,
    attest: { store, appId: APP_ID, required: true, roots: [device.rootPem] },
    log: (entry) => logs.push(entry),
  });
  const post = (path: string, json: unknown) =>
    app.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(json),
    });
  const challenge = async () =>
    ((await (await post('/v1/attest/challenge', {})).json()) as { challenge: string }).challenge;
  const scan = (attest?: object) =>
    post('/v1/scan', {
      installId: 'install-0123456789abcdef',
      pages: [{ data: 'aGVsbG8=', mediaType: 'image/jpeg' }],
      text: 'Toast',
      attest,
    });

  assert.equal((await scan()).status, 401);

  const c1 = await challenge();
  const unknown = await scan({
    keyId: device.keyId,
    challenge: c1,
    assertion: device.assert(c1, 1),
  });
  assert.deepEqual(await unknown.json(), { error: 'unknown_key' });

  const c2 = await challenge();
  const attested = await post('/v1/attest', {
    keyId: device.keyId,
    challenge: c2,
    attestation: device.attest(c2),
  });
  assert.equal(attested.status, 200);
  const reused = await post('/v1/attest', {
    keyId: device.keyId,
    challenge: c2,
    attestation: device.attest(c2),
  });
  assert.equal(reused.status, 401);

  const c3 = await challenge();
  assert.equal(
    (await scan({ keyId: device.keyId, challenge: c3, assertion: device.assert(c3, 1) })).status,
    200,
  );
  // The same signed request can't be replayed.
  assert.equal(
    (await scan({ keyId: device.keyId, challenge: c3, assertion: device.assert(c3, 1) })).status,
    401,
  );
  // Limits count by key: a new install ID doesn't reset them.
  const c4 = await challenge();
  assert.equal(
    (await scan({ keyId: device.keyId, challenge: c4, assertion: device.assert(c4, 2) })).status,
    429,
  );

  assert.deepEqual(
    logs.map((l) => `${l.route} ${l.status} ${l.outcome}`),
    [
      'scan 401 unsigned',
      'scan 401 unknown_key',
      'attest 200 ok',
      'attest 401 challenge',
      'scan 200 ok',
      'scan 401 challenge',
      'scan 429 limit_install',
    ],
  );
});
