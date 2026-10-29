import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createCharactersRepo } = require('./charactersRepo.js');

describe('charactersRepo.savePosition', () => {
  it('writes position columns', async () => {
    const query = vi.fn(async () => ({ affectedRows: 1 }));
    const repo = createCharactersRepo(
      { query, transaction: vi.fn() },
      { maxSlots: 3 },
    );
    const ok = await repo.savePosition(7, { x: 100.5, y: -200, z: 30.25, h: 90 });
    expect(ok).toBe(true);
    expect(query).toHaveBeenCalledOnce();
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/position_x/);
    expect(params).toEqual([100.5, -200, 30.25, 90, 7]);
  });

  it('rejects invalid coords', async () => {
    const repo = createCharactersRepo(
      { query: vi.fn(), transaction: vi.fn() },
      { maxSlots: 3 },
    );
    await expect(repo.savePosition(1, { x: NaN, y: 0, z: 0 })).rejects.toThrow(/позиция/);
  });
});
