/**
 * Scan credit. People buy credit packs in the app; each scan that the server
 * reads costs a fixed price, after a few free scans a month.
 *
 * Balances belong to a wallet: a random UUID the app keeps in the iPhone's
 * keychain and passes to Apple as the purchase's `appAccountToken`. There are
 * no accounts, so knowing a wallet ID is what lets you spend from it.
 *
 * Money moves only by appending to the ledger; a wallet's balance is the sum
 * of its entries. Each entry's `ref` is unique, so a purchase can't be
 * credited twice however often the app sends it. Free scans are counted per
 * install (by attested key), since wallets cost nothing to make.
 */
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import { openDb } from './db.ts';

/** The packs on sale, by App Store product ID, and the credit each adds. */
export const PACKS: Record<string, number> = {
  'com.bitcli.mealz.credit.199': 199,
  'com.bitcli.mealz.credit.499': 499,
  'com.bitcli.mealz.credit.999': 999,
};

export const WALLET_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** What a scan costs. A price of 0 turns billing off: every scan is free. */
export type Pricing = { priceCents: number; freePerMonth: number };

/** A scan's charge, kept so it can be given back if the scan fails. */
export type Charge =
  { kind: 'free'; payer: string; month: string } | { kind: 'paid'; wallet: string; ref: string };

/** What the app shows: the price, free scans left, and the wallet's balance. */
export type CreditSummary = { priceCents: number; freeScansLeft: number; balanceCents: number };

type Kind = 'purchase' | 'scan' | 'release' | 'refund' | 'grant';

const month = (now: Date) => now.toISOString().slice(0, 7);

export class Ledger {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = openDb(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY,
        wallet TEXT NOT NULL,
        cents INTEGER NOT NULL,
        kind TEXT NOT NULL,
        ref TEXT NOT NULL UNIQUE,
        at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ledger_wallet ON ledger (wallet);
      CREATE TABLE IF NOT EXISTS free_scans (
        month TEXT NOT NULL,
        payer TEXT NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (month, payer)
      )`);
  }

  balance(wallet: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(SUM(cents), 0) AS cents FROM ledger WHERE wallet = ?')
      .get(wallet) as { cents: number };
    return row.cents;
  }

  freeScansLeft(payer: string, pricing: Pricing, now = new Date()): number {
    const row = this.db
      .prepare('SELECT count FROM free_scans WHERE month = ? AND payer = ?')
      .get(month(now), payer) as { count: number } | undefined;
    return Math.max(0, pricing.freePerMonth - (row?.count ?? 0));
  }

  summary(payer: string, wallet: string | null, pricing: Pricing, now = new Date()): CreditSummary {
    return {
      priceCents: pricing.priceCents,
      freeScansLeft: this.freeScansLeft(payer, pricing, now),
      balanceCents: wallet ? this.balance(wallet) : 0,
    };
  }

  /**
   * Adds an entry unless one with this `ref` exists. Returns false for a
   * repeat, so callers can treat a resent purchase as already done.
   */
  add(wallet: string, cents: number, kind: Kind, ref: string, now = new Date()): boolean {
    const result = this.db
      .prepare(
        `INSERT INTO ledger (wallet, cents, kind, ref, at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (ref) DO NOTHING`,
      )
      .run(wallet, cents, kind, ref, now.toISOString());
    return result.changes > 0;
  }

  /**
   * Charges one scan: a free scan while the payer has some left this month,
   * otherwise the price from the wallet. Node runs this synchronously, so two
   * scans can't both spend the same credit.
   */
  charge(
    payer: string,
    wallet: string | null,
    pricing: Pricing,
    now = new Date(),
  ): Charge | 'no_credit' {
    if (this.freeScansLeft(payer, pricing, now) > 0) {
      this.db
        .prepare(
          `INSERT INTO free_scans (month, payer, count) VALUES (?, ?, 1)
           ON CONFLICT (month, payer) DO UPDATE SET count = count + 1`,
        )
        .run(month(now), payer);
      return { kind: 'free', payer, month: month(now) };
    }
    if (!wallet || this.balance(wallet) < pricing.priceCents) return 'no_credit';
    const ref = `scan:${randomUUID()}`;
    this.add(wallet, -pricing.priceCents, 'scan', ref, now);
    return { kind: 'paid', wallet, ref };
  }

  /** Gives a failed scan's charge back. */
  release(charge: Charge, now = new Date()) {
    if (charge.kind === 'free') {
      this.db
        .prepare(
          'UPDATE free_scans SET count = count - 1 WHERE month = ? AND payer = ? AND count > 0',
        )
        .run(charge.month, charge.payer);
      return;
    }
    const row = this.db.prepare('SELECT cents FROM ledger WHERE ref = ?').get(charge.ref) as
      { cents: number } | undefined;
    if (row) this.add(charge.wallet, -row.cents, 'release', `release:${charge.ref}`, now);
  }

  /** Drops free-scan counts from before last month. The ledger is kept for good. */
  prune(now = new Date()) {
    const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    this.db.prepare('DELETE FROM free_scans WHERE month < ?').run(month(last));
  }
}
