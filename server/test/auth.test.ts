import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { authFromEnv, flyIdentityToken } from '../src/auth.ts';

const servers: Server[] = [];
after(() => servers.forEach((s) => s.close()));

function serve(
  handle: (body: string, path: string) => { status: number; body: string },
  listenOn: string | number,
): Promise<Server> {
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const out = handle(body, req.url ?? '');
      res.writeHead(out.status).end(out.body);
    });
  });
  servers.push(server);
  return new Promise((resolve) => server.listen(listenOn, () => resolve(server)));
}

/** A stand-in for Fly's machine API socket that mints numbered tokens. */
async function fakeFly() {
  const socket = join(mkdtempSync(join(tmpdir(), 'fly-')), 'api.sock');
  const audiences: string[] = [];
  await serve((body, path) => {
    assert.equal(path, '/v1/tokens/oidc');
    audiences.push(JSON.parse(body).aud);
    return { status: 200, body: `header.claims-${audiences.length}.signature` };
  }, socket);
  return { socket, audiences };
}

test('asks Fly for an OIDC token with the audience', async () => {
  const fly = await fakeFly();
  assert.equal(
    await flyIdentityToken('https://api.anthropic.com', fly.socket),
    'header.claims-1.signature',
  );
  assert.deepEqual(fly.audiences, ['https://api.anthropic.com']);
});

test('fails when Fly does not return a token', async () => {
  const socket = join(mkdtempSync(join(tmpdir(), 'fly-')), 'api.sock');
  await serve(() => ({ status: 403, body: 'nope' }), socket);
  await assert.rejects(flyIdentityToken('x', socket), /status 403/);
});

test('prefers an API key, and needs federation settings otherwise', () => {
  assert.equal(authFromEnv({ ANTHROPIC_API_KEY: 'sk-test' })?.method, 'api-key');
  assert.equal(authFromEnv({}), null);
  assert.equal(
    authFromEnv({ ANTHROPIC_FEDERATION_RULE_ID: 'fdrl_1', ANTHROPIC_ORGANIZATION_ID: 'org' }),
    null,
  );
});

test('exchanges a fresh Fly token for a Claude API token', async () => {
  const fly = await fakeFly();
  const exchanges: Record<string, string>[] = [];
  const anthropic = await serve((body, path) => {
    assert.equal(path, '/v1/oauth/token');
    exchanges.push(JSON.parse(body));
    return {
      status: 200,
      body: JSON.stringify({
        access_token: `sk-ant-oat01-${exchanges.length}`,
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    };
  }, 0);

  const auth = authFromEnv(
    {
      ANTHROPIC_FEDERATION_RULE_ID: 'fdrl_rule',
      ANTHROPIC_ORGANIZATION_ID: '00000000-0000-0000-0000-000000000000',
      ANTHROPIC_SERVICE_ACCOUNT_ID: 'svac_scan',
      ANTHROPIC_WORKSPACE_ID: 'wrkspc_mealz',
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${(anthropic.address() as AddressInfo).port}`,
    },
    (audience) => flyIdentityToken(audience, fly.socket),
  );
  assert.equal(auth?.method, 'federation');
  const credentials = auth.options.credentials!;

  assert.equal((await credentials()).token, 'sk-ant-oat01-1');
  assert.equal((await credentials()).token, 'sk-ant-oat01-2');
  assert.deepEqual(fly.audiences, ['https://api.anthropic.com', 'https://api.anthropic.com']);
  assert.deepEqual(exchanges[0], {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: 'header.claims-1.signature',
    federation_rule_id: 'fdrl_rule',
    organization_id: '00000000-0000-0000-0000-000000000000',
    service_account_id: 'svac_scan',
    workspace_id: 'wrkspc_mealz',
  });
  // Each exchange uses a new Fly token, since Anthropic accepts each one only once.
  assert.equal(exchanges[1].assertion, 'header.claims-2.signature');
});
