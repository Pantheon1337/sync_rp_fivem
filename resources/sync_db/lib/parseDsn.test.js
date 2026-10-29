import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { parseDsn } = require('./parseDsn.js');

describe('parseDsn', () => {
  it('parses mysql URL', () => {
    expect(parseDsn('mysql://u:p@127.0.0.1:3307/syncrp')).toEqual({
      host: '127.0.0.1',
      port: 3307,
      user: 'u',
      password: 'p',
      database: 'syncrp',
    });
  });
});
