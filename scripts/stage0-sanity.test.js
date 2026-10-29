import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Artifact sanity. Not a FiveM integration test.
 */
describe('repo artifacts', () => {
  const root = resolve(import.meta.dirname, '..');

  const required = [
    'README.md',
    'AGENTS.md',
    'docs/ARCHITECTURE.md',
    'docs/FXSERVER_TEST_RUNBOOK.md',
    'docs/SPRINT1.md',
    'resources/sync_db/fxmanifest.lua',
    'resources/sync_core/fxmanifest.lua',
    'resources/sync_identity/fxmanifest.lua',
    'resources/sync_sessions/fxmanifest.lua',
    'database/migrations/001_accounts_sessions.sql',
  ];

  it.each(required)('has %s', (rel) => {
    expect(existsSync(resolve(root, rel))).toBe(true);
    const body = readFileSync(resolve(root, rel), 'utf8');
    expect(body.length).toBeGreaterThan(20);
  });

  it('declares SyncCore (not QB/ESX foundation) in AGENTS.md', () => {
    const agents = readFileSync(resolve(root, 'AGENTS.md'), 'utf8');
    expect(agents).toMatch(/SyncCore/i);
    expect(agents).toMatch(/QBCore|ESX|Qbox/);
  });
});
