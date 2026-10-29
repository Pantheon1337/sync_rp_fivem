'use strict';

import { describe, expect, it, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createEconomyRepo } = require('./economyRepo.js');

function createMemoryDb() {
  /** @type {Map<string, { id: number, character_id: number, type: string, balance: number }>} */
  const accounts = new Map();
  /** @type {Map<string, object>} */
  const ledger = new Map();
  let nextAcc = 1;
  let nextLed = 1;
  /** @type {{ cash: number, bank: number }} */
  const characterSeed = { cash: 5000, bank: 10000 };

  function accKey(cid, type) {
    return `${cid}:${type}`;
  }

  async function query(sql, params = []) {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('INSERT IGNORE INTO economy_accounts')) {
      const cid = Number(params[0]);
      for (const type of ['cash', 'bank']) {
        const k = accKey(cid, type);
        if (!accounts.has(k)) {
          accounts.set(k, { id: nextAcc++, character_id: cid, type, balance: 0 });
        }
      }
      return { insertId: 0, affectedRows: 2 };
    }

    if (s.startsWith('SELECT cash, bank FROM characters')) {
      return [{ cash: characterSeed.cash, bank: characterSeed.bank }];
    }

    if (s.startsWith('SELECT id, character_id, type, balance FROM economy_accounts WHERE character_id = ? AND type')) {
      const row = accounts.get(accKey(params[0], params[1]));
      return row ? [row] : [];
    }

    if (s.startsWith('SELECT id, character_id, type, balance FROM economy_accounts WHERE character_id = ?')) {
      return [...accounts.values()].filter((a) => a.character_id === Number(params[0]));
    }

    if (s.startsWith('SELECT id, from_account_id')) {
      const row = ledger.get(params[0]);
      return row ? [row] : [];
    }

    if (s.startsWith('SELECT l.id')) {
      return [...ledger.values()]
        .filter((l) => {
          const fa = [...accounts.values()].find((a) => a.id === l.from_account_id);
          const ta = [...accounts.values()].find((a) => a.id === l.to_account_id);
          return (
            (fa && fa.character_id === Number(params[0])) ||
            (ta && ta.character_id === Number(params[0]))
          );
        })
        .sort((a, b) => b.id - a.id);
    }

    throw new Error(`memory db: unhandled query ${s.slice(0, 80)}`);
  }

  async function transaction(steps) {
    const results = [];
    const snapshotAcc = new Map([...accounts.entries()].map(([k, v]) => [k, { ...v }]));
    const snapshotLed = new Map([...ledger.entries()].map(([k, v]) => [k, { ...v }]));
    try {
      for (const step of steps) {
        const s = step.sql.replace(/\s+/g, ' ').trim();
        const params = step.params || [];

        if (s.startsWith('INSERT INTO economy_ledger')) {
          const key = params[params.length - 2];
          if (ledger.has(key)) {
            const err = new Error('Duplicate');
            err.code = 'ER_DUP_ENTRY';
            throw err;
          }
          let fromId;
          let toId;
          let amount;
          let reason;
          let meta;
          if (params.length === 6 && params[0] == null) {
            // shouldn't happen
          }
          if (step.sql.includes('VALUES (NULL,')) {
            fromId = null;
            toId = params[0];
            amount = params[1];
            reason = params[3];
            meta = params[5];
          } else if (step.sql.includes('VALUES (?, NULL,')) {
            fromId = params[0];
            toId = null;
            amount = params[1];
            reason = params[3];
            meta = params[5];
          } else {
            fromId = params[0];
            toId = params[1];
            amount = params[2];
            reason = params[4];
            meta = params[6];
          }
          const row = {
            id: nextLed++,
            from_account_id: fromId,
            to_account_id: toId,
            amount,
            currency: 'RUB',
            reason_code: reason,
            idempotency_key: key,
            created_at: new Date().toISOString(),
            meta_json: meta,
          };
          ledger.set(key, row);
          results.push({ insertId: row.id, affectedRows: 1 });
          continue;
        }

        if (s.startsWith('UPDATE economy_accounts SET balance = balance +')) {
          const amt = Number(params[0]);
          const id = Number(params[1]);
          const acc = [...accounts.values()].find((a) => a.id === id);
          if (!acc) throw Object.assign(new Error('missing'), { code: 'CREDIT_FAIL' });
          acc.balance += amt;
          const res = { insertId: 0, affectedRows: 1 };
          if (step.minAffectedRows && res.affectedRows < step.minAffectedRows) {
            throw Object.assign(new Error(step.failMessage), { code: step.failCode });
          }
          results.push(res);
          continue;
        }

        if (s.startsWith('UPDATE economy_accounts SET balance = balance -')) {
          const amt = Number(params[0]);
          const id = Number(params[1]);
          const need = Number(params[2]);
          const acc = [...accounts.values()].find((a) => a.id === id);
          let affected = 0;
          if (acc && acc.balance >= need) {
            acc.balance -= amt;
            affected = 1;
          }
          const res = { insertId: 0, affectedRows: affected };
          if (step.minAffectedRows && res.affectedRows < step.minAffectedRows) {
            throw Object.assign(new Error(step.failMessage), { code: step.failCode });
          }
          results.push(res);
          continue;
        }

        if (s.startsWith('UPDATE economy_accounts SET balance = ? WHERE id = ? AND balance = 0')) {
          const amt = Number(params[0]);
          const id = Number(params[1]);
          const acc = [...accounts.values()].find((a) => a.id === id);
          let affected = 0;
          if (acc && acc.balance === 0) {
            acc.balance = amt;
            affected = 1;
          }
          const res = { insertId: 0, affectedRows: affected };
          if (step.minAffectedRows && res.affectedRows < step.minAffectedRows) {
            throw Object.assign(new Error(step.failMessage), { code: step.failCode });
          }
          results.push(res);
          continue;
        }

        throw new Error(`memory txn: ${s.slice(0, 60)}`);
      }
      return results;
    } catch (err) {
      accounts.clear();
      for (const [k, v] of snapshotAcc) accounts.set(k, v);
      ledger.clear();
      for (const [k, v] of snapshotLed) ledger.set(k, v);
      throw err;
    }
  }

  return { query, transaction, accounts, ledger, characterSeed };
}

describe('economyRepo', () => {
  /** @type {ReturnType<typeof createMemoryDb>} */
  let mem;
  /** @type {ReturnType<typeof createEconomyRepo>} */
  let repo;

  beforeEach(() => {
    mem = createMemoryDb();
    repo = createEconomyRepo(mem);
  });

  it('ensures cash/bank and seeds from characters once', async () => {
    const bal = await repo.ensurePlayerAccounts(1);
    expect(bal.cash).toBe(5000);
    expect(bal.bank).toBe(10000);
    const again = await repo.ensurePlayerAccounts(1);
    expect(again.cash).toBe(5000);
  });

  it('credits idempotently', async () => {
    await repo.ensurePlayerAccounts(2);
    mem.characterSeed.cash = 0;
    mem.characterSeed.bank = 0;
    // reset balances for clean credit test
    for (const a of mem.accounts.values()) a.balance = 0;

    const a = await repo.credit(2, 'cash', 100, {
      reasonCode: 'admin_grant',
      idempotencyKey: 'grant-test-0001',
    });
    expect(a.duplicate).toBe(false);
    expect(a.balances.cash).toBe(100);

    const b = await repo.credit(2, 'cash', 100, {
      reasonCode: 'admin_grant',
      idempotencyKey: 'grant-test-0001',
    });
    expect(b.duplicate).toBe(true);
    expect(b.balances.cash).toBe(100);
  });

  it('rejects debit when insufficient funds', async () => {
    await repo.ensurePlayerAccounts(3);
    for (const a of mem.accounts.values()) a.balance = 50;
    await expect(
      repo.debit(3, 'cash', 100, {
        reasonCode: 'shop',
        idempotencyKey: 'shop-debit-0001',
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT' });
  });

  it('transfers cash → bank without dupe on retry', async () => {
    await repo.ensurePlayerAccounts(4);
    for (const a of mem.accounts.values()) {
      if (a.character_id === 4 && a.type === 'cash') a.balance = 1000;
      if (a.character_id === 4 && a.type === 'bank') a.balance = 0;
    }
    const opts = { reasonCode: 'bank_deposit', idempotencyKey: 'dep-0001-aaaa' };
    const first = await repo.transfer(
      { characterId: 4, type: 'cash' },
      { characterId: 4, type: 'bank' },
      400,
      opts,
    );
    expect(first.duplicate).toBe(false);
    expect(first.balances.cash).toBe(600);
    expect(first.balances.bank).toBe(400);

    const second = await repo.transfer(
      { characterId: 4, type: 'cash' },
      { characterId: 4, type: 'bank' },
      400,
      opts,
    );
    expect(second.duplicate).toBe(true);
    expect(second.balances.cash).toBe(600);
    expect(second.balances.bank).toBe(400);
  });
});
