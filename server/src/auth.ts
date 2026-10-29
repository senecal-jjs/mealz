/**
 * How the server authenticates to the Claude API. On Fly.io it uses workload
 * identity federation: each machine asks Fly for a short-lived OIDC token and
 * exchanges it for a Claude API token, so no Anthropic key is stored anywhere.
 * An API key still works, for local development.
 */
import { request } from 'node:http';

import type { ClientOptions } from '@anthropic-ai/sdk';
import { oidcFederationProvider } from '@anthropic-ai/sdk/lib/credentials/oidc-federation';

/** Fly's machine-local API; see https://fly.io/docs/security/openid-connect/ */
export const FLY_API_SOCKET = '/.fly/api';

/**
 * Asks Fly for a fresh OIDC token for this machine. Called on every exchange:
 * each token carries a unique `jti` and Anthropic accepts it only once.
 */
export function flyIdentityToken(audience: string, socketPath = FLY_API_SOCKET): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        socketPath,
        path: '/v1/tokens/oidc',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        timeout: 10_000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => {
          const token = body.trim();
          if (res.statusCode !== 200 || token.split('.').length !== 3) {
            reject(new Error(`Fly OIDC token request failed with status ${res.statusCode}`));
          } else {
            resolve(token);
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Fly OIDC token request timed out')));
    req.on('error', reject);
    req.end(JSON.stringify({ aud: audience }));
  });
}

type Env = Record<string, string | undefined>;

export type Auth = { method: 'api-key' | 'federation'; options: ClientOptions };

/** Picks the API key when one is set, else federation; returns null when neither is configured. */
export function authFromEnv(env: Env, identityToken = flyIdentityToken): Auth | null {
  if (env.ANTHROPIC_API_KEY) return { method: 'api-key', options: {} };

  const federationRuleId = env.ANTHROPIC_FEDERATION_RULE_ID;
  const organizationId = env.ANTHROPIC_ORGANIZATION_ID;
  const serviceAccountId = env.ANTHROPIC_SERVICE_ACCOUNT_ID;
  if (!federationRuleId || !organizationId || !serviceAccountId) return null;

  const audience = env.FLY_OIDC_AUDIENCE ?? 'https://api.anthropic.com';
  return {
    method: 'federation',
    options: {
      credentials: oidcFederationProvider({
        identityTokenProvider: () => identityToken(audience),
        federationRuleId,
        organizationId,
        serviceAccountId,
        workspaceId: env.ANTHROPIC_WORKSPACE_ID || undefined,
        baseURL: env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com',
        fetch,
      }),
    },
  };
}
