import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ScanCounter } from '../src/limits.ts';

const day1 = new Date('2026-10-28T10:00:00Z');
const day2 = new Date('2026-10-29T10:00:00Z');

test('limits each install per day, and resets the next day', () => {
  const counter = new ScanCounter(':memory:');
  const limits = { perInstall: 2, total: 100 };
  assert.equal(counter.take('a', limits, day1), 'ok');
  assert.equal(counter.take('a', limits, day1), 'ok');
  assert.equal(counter.take('a', limits, day1), 'install');
  assert.equal(counter.take('b', limits, day1), 'ok');
  assert.equal(counter.take('a', limits, day2), 'ok');
});

test('limits the total across installs', () => {
  const counter = new ScanCounter(':memory:');
  const limits = { perInstall: 5, total: 2 };
  assert.equal(counter.take('a', limits, day1), 'ok');
  assert.equal(counter.take('b', limits, day1), 'ok');
  assert.equal(counter.take('c', limits, day1), 'total');
});
