import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Stage 0 sanity: architecture artifacts exist.
 * Not a FiveM integration test — FXServer is not required here.
 */
describe('Stage 0 artifacts', () => {
  const root = resolve(import.meta.dirname, '..');

  const required = [
    'README.md',
    'AGENTS.md',
    'docs/ARCHITECTURE.md',
    'docs/DATABASE.md',
    'docs/MODULE_CONTRACTS.md',
    'docs/SECURITY.md',
    'docs/ROADMAP.md',
    'docs/TESTING.md',
    'docs/UI_DESIGN_SYSTEM.md',
    'docs/SPRINT1.md',
    'docker/docker-compose.yml',
    '.cursor/rules/synccore-architecture.mdc',
  ];

  it.each(required)('has %s', (rel) => {
    const body = readFileSync(resolve(root, rel), 'utf8');
    expect(body.length).toBeGreaterThan(20);
  });

  it('declares SyncCore (not QB/ESX foundation) in AGENTS.md', () => {
    const agents = readFileSync(resolve(root, 'AGENTS.md'), 'utf8');
    expect(agents).toMatch(/SyncCore/i);
    expect(agents).toMatch(/QBCore|ESX|Qbox/);
  });
});
