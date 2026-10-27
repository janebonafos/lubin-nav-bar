import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { followUpDates, followUpStatus, followUpTotal } from './followUp';
describe('provider-booked follow-up rules', () => {
  test('free appointments confirm automatically', () => assert.equal(followUpStatus(0), 'confirmed'));
  test('paid appointments wait for client payment', () => assert.equal(followUpStatus(1500), 'awaiting-payment'));
  test('available promo reduces the amount due', () => assert.equal(followUpTotal(1500, 'FOLLOWUP20'), 1200));
  test('client promo covering the full fee needs no payment', () => assert.equal(followUpTotal(1500, 'CARE100'), 0));
  test('unrecognized promo never discounts the fee', () => assert.equal(followUpTotal(1500, 'invalid'), 1500));
  test('weekly series includes the first visit and repeats every seven calendar days', () => assert.deepEqual(followUpDates('2026-11-03', 'weekly', 3), ['2026-11-03', '2026-11-10', '2026-11-17']));
  test('fortnightly visits repeat every fourteen calendar days', () => assert.deepEqual(followUpDates('2026-11-03', 'fortnightly', 3), ['2026-11-03', '2026-11-17', '2026-12-01']));
  test('monthly visits handle short months without drifting from the original day', () => assert.deepEqual(followUpDates('2027-01-31', 'monthly', 3), ['2027-01-31', '2027-02-28', '2027-03-31']));
  test('non-recurring booking creates only one visit', () => assert.deepEqual(followUpDates('2026-11-03', 'once', 4), ['2026-11-03']));
});