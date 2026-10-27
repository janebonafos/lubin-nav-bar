import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { followUpStatus, followUpTotal } from './followUp';
describe('provider-booked follow-up rules', () => {
  test('free appointments confirm automatically', () => assert.equal(followUpStatus(0), 'confirmed'));
  test('paid appointments wait for client payment', () => assert.equal(followUpStatus(1500), 'awaiting-payment'));
  test('available promo reduces the amount due', () => assert.equal(followUpTotal(1500, 'FOLLOWUP20'), 1200));
  test('client promo covering the full fee needs no payment', () => assert.equal(followUpTotal(1500, 'CARE100'), 0));
  test('unrecognized promo never discounts the fee', () => assert.equal(followUpTotal(1500, 'invalid'), 1500));
});